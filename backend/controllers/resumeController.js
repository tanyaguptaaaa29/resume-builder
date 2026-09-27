const { extractTextFromPdf } = require("../services/pdfParserService");
const {
  extractResumeData,
  generateLatex,
  enhanceContent,
  truncateLatex,
  tailorResumeToJD,
} = require("../services/geminiService");
const { compileLatex } = require("../services/latexCompilerService");
const { tailorWithJudgeLoop } = require("../services/judgeService");
const fs = require("fs");
const path = require("path");
const { PDFDocument } = require("pdf-lib");

/**
 * Helper: Compiles resume JSON to LaTeX, runs truncation loop for single-page guarantee,
 * and stamps the NSUT logo if the college template is chosen.
 */
async function compileAndStampResume(parsedData, template) {
  const resumeJson = typeof parsedData === "string" ? parsedData : JSON.stringify(parsedData);

  console.log(`⏳ Step 1: Calling Gemini to generate LaTeX for '${template}'...`);
  let texContent = await generateLatex(resumeJson, template);
  console.log(`✅ Step 1 Complete: Generated LaTeX length: ${texContent.length} chars`);

  let finalPdfBuffer = null;
  let isSinglePage = false;
  let iterations = 0;
  const MAX_ITERATIONS = 4;

  while (!isSinglePage && iterations < MAX_ITERATIONS) {
    iterations++;
    console.log(`⏳ Step 2 (Iteration ${iterations}): Compiling LaTeX...`);

    texContent = texContent.trim();
    if (texContent.startsWith("```")) {
      texContent = texContent.replace(/^```(?:latex|tex)?\n?/, "").replace(/\n?```$/, "");
    }
    texContent = texContent.replace(/\\(begin|end)\{([a-zA-Z]+)[\s]*$/gm, "\\$1{$2}");

    const result = await compileLatex(texContent, []);
    if (!result.success || !result.pdf) {
      console.log(`❌ LaTeX Compilation failed: ${result.error}`);
      const err = new Error(result.error || "Failed to compile LaTeX to PDF");
      err.texContent = texContent;
      throw err;
    }

    finalPdfBuffer = result.pdf;
    const pdfDoc = await PDFDocument.load(finalPdfBuffer);
    const pageCount = pdfDoc.getPageCount();

    if (pageCount === 1) {
      isSinglePage = true;
      console.log("✅ PDF fits on 1 page perfectly.");
      break;
    } else {
      console.log(`❌ PDF is ${pageCount} pages (Overflow).`);
      if (iterations < MAX_ITERATIONS) {
        console.log("⏳ Triggering AI truncation layer to prune least significant points...");
        texContent = await truncateLatex(texContent, iterations, MAX_ITERATIONS);
      } else {
        console.log("⚠️ Reached max iterations. Proceeding with multi-page PDF.");
      }
    }
  }

  // Stamp NSUT Logo for college template
  if (template === "college" && finalPdfBuffer) {
    try {
      console.log("⏳ Step 3: Stamping NSUT Logo using pdf-lib...");
      const logoPath = path.join(__dirname, "../assets/NSUT_logo.png");
      if (fs.existsSync(logoPath)) {
        const logoImageBytes = fs.readFileSync(logoPath);
        const pdfDoc = await PDFDocument.load(finalPdfBuffer);
        const logoImage = await pdfDoc.embedPng(logoImageBytes);

        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { width, height } = firstPage.getSize();

        const marginPts = 0.11 * 72;
        const imgHeightPts = 0.7 * 72;
        const aspectRatio = logoImage.width / logoImage.height;
        const imgWidthPts = imgHeightPts * aspectRatio;

        const x = marginPts;
        const y = height - marginPts - imgHeightPts;

        firstPage.drawImage(logoImage, {
          x,
          y,
          width: imgWidthPts,
          height: imgHeightPts,
        });

        const stampedPdfBytes = await pdfDoc.save();
        finalPdfBuffer = Buffer.from(stampedPdfBytes);
        console.log("✅ Step 3 Complete: Logo stamped successfully.");
      }
    } catch (err) {
      console.error("❌ Failed to stamp NSUT_logo.png:", err);
    }
  }

  return {
    pdfBuffer: finalPdfBuffer,
    texContent,
  };
}

/**
 * Controller: Parse uploaded PDF resume → extract structured JSON
 */
async function parseResume(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No PDF file uploaded" });
    }

    // Extract text and links from PDF buffer
    const { rawText, links } = await extractTextFromPdf(req.file.buffer);

    if (!rawText || rawText.length < 50) {
      return res.status(400).json({
        success: false,
        error: "Could not extract text from PDF. Ensure it is a text-based PDF.",
      });
    }

    // Pass to Gemini for JSON structuring
    const structuredJson = await extractResumeData(rawText, links);

    let data;
    try {
      let cleaned = structuredJson.trim();
      
      // If the LLM included conversational text, extract just the JSON block
      const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        cleaned = jsonBlockMatch[1];
      } else {
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }
      }
      
      // Sanitize unescaped backslashes (e.g. \href generated by Gemini)
      cleaned = cleaned.replace(/(?<!\\)\\(?!["\\/bfnrtu])/g, "\\\\");
      data = JSON.parse(cleaned);
    } catch (err) {
      console.error("JSON Parse Error in parseResume:", err.message);
      console.error("Failed JSON string:", structuredJson);
      return res.status(500).json({
        success: false,
        error: "Failed to parse structured JSON from LLM output",
      });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("parseResume Controller Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Controller: Generate LaTeX via Gemini 2.5 Flash → Compile to PDF via LaTeX.Online
 */
async function generateLatexResume(req, res) {
  console.log("\n=== [GENERATE RESUME] Request Received ===");
  try {
    const { data, template } = req.body;
    
    console.log(`- Template requested: ${template}`);
    console.log(`- Data received: ${data ? "Yes" : "No"}`);

    if (!data) {
      console.log("❌ Error: Resume data required");
      return res.status(400).json({ success: false, error: "Resume data required" });
    }
    if (!template || !["college", "offcampus"].includes(template)) {
      console.log(`❌ Error: Invalid template (${template})`);
      return res.status(400).json({ success: false, error: "Valid template required (college or offcampus)" });
    }

    const parsedData = typeof data === "string" ? JSON.parse(data) : data;
    const { pdfBuffer, texContent } = await compileAndStampResume(parsedData, template);

    console.log(`- PDF Size: ${pdfBuffer.length} bytes`);
    console.log("🚀 Sending PDF and LaTeX back to client...");
    return res.json({
      success: true,
      pdfBase64: pdfBuffer.toString("base64"),
      latex: texContent,
    });
  } catch (error) {
    console.error("❌ generateLatexResume Controller Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to generate and compile resume",
      texContent: error.texContent,
    });
  }
}

/**
 * Controller: Premium AI Content Enhancement
 */
async function enhance(req, res) {
  try {
    const { data, section } = req.body;

    if (!data || !section) {
      return res.status(400).json({ success: false, error: "Data and section required" });
    }

    const resumeJson = typeof data === "string" ? data : JSON.stringify(data);
    const enhancedJson = await enhanceContent(resumeJson, section);

    let enhanced;
    try {
      let cleaned = enhancedJson.trim();
      const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        cleaned = jsonBlockMatch[1];
      } else {
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }
      }
      // Sanitize unescaped backslashes
      cleaned = cleaned.replace(/(?<!\\)\\(?!["\\/bfnrtu])/g, "\\\\");
      enhanced = JSON.parse(cleaned);
    } catch (err) {
      console.error("JSON Parse Error in enhance:", err.message);
      return res.status(500).json({ success: false, error: "Failed to parse enhanced JSON" });
    }

    return res.json({ success: true, data: enhanced });
  } catch (error) {
    console.error("enhance Controller Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Controller: Tailor candidate resume to a specific Job Description (JD)
 */
async function tailorResume(req, res) {
  console.log("\n=== [TAILOR RESUME TO JD] Request Received ===");
  try {
    const {
      data,
      jobDescription,
      targetRole,
      githubContext,
      projectNotes,
      template,
      compile = true,
    } = req.body;

    if (!data) {
      return res.status(400).json({ success: false, error: "Resume data is required" });
    }
    if (!jobDescription || typeof jobDescription !== "string" || jobDescription.trim().length < 20) {
      return res.status(400).json({
        success: false,
        error: "Please provide a job description with at least 20 characters.",
      });
    }

    const parsedData = typeof data === "string" ? JSON.parse(data) : data;
    console.log(`- Job Description length: ${jobDescription.length} characters`);
    console.log(`- Target Role (if specified): ${targetRole || "None"}`);
    if (githubContext && githubContext.length > 0) {
      console.log(`- GitHub Codebase Context: ${githubContext.length} repositories analyzed`);
    }

    const {
      tailoredResume,
      adaptationsSummary,
      judgeAudit,
    } = await tailorWithJudgeLoop(
      tailorResumeToJD,
      parsedData,
      jobDescription,
      targetRole || "",
      githubContext || [],
      projectNotes || ""
    );

    let pdfBase64 = null;
    let latex = null;

    // If requested and valid template provided, compile immediately
    if (compile && template && ["college", "offcampus"].includes(template)) {
      console.log(`⏳ Compiling tailored resume for template '${template}'...`);
      const compiled = await compileAndStampResume(tailoredResume, template);
      pdfBase64 = compiled.pdfBuffer.toString("base64");
      latex = compiled.texContent;
    }

    console.log("✅ Tailor Resume Complete (Audited by AI Judge).");
    return res.json({
      success: true,
      data: tailoredResume,
      adaptationsSummary,
      judgeAudit,
      pdfBase64,
      latex,
    });
  } catch (error) {
    console.error("❌ tailorResume Controller Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to tailor resume to job description",
      texContent: error.texContent,
    });
  }
}

/**
 * Controller: Analyze public GitHub repository codebase architecture
 */
async function analyzeGithub(req, res) {
  console.log("\n=== [ANALYZE GITHUB REPOSITORY] Request Received ===");
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ success: false, error: "GitHub repository URL is required" });
    }

    const { fetchRepoBlueprint, analyzeRepoWithGemini } = require("../services/githubService");
    const blueprint = await fetchRepoBlueprint(repoUrl);
    const analysis = await analyzeRepoWithGemini(blueprint);

    return res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("❌ analyzeGithub Controller Error:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message || "Failed to analyze GitHub repository",
    });
  }
}

module.exports = {
  parseResume,
  generateLatexResume,
  enhance,
  tailorResume,
  analyzeGithub,
};

