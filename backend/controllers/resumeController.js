const { extractTextFromPdf } = require("../services/pdfParserService");
const {
  extractResumeData,
  chatWithUser,
  generateLatex,
  enhanceContent,
  optimizeResumeForATS,
} = require("../services/geminiService");
const { compileLatex } = require("../services/latexCompilerService");

/**
 * Controller: Parse uploaded PDF resume → extract structured JSON
 */
async function parseResume(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No PDF file uploaded" });
    }

    // Extract text from PDF buffer
    const rawText = await extractTextFromPdf(req.file.buffer);

    if (!rawText || rawText.length < 50) {
      return res.status(400).json({
        success: false,
        error: "Could not extract text from PDF. Ensure it is a text-based PDF.",
      });
    }

    // Pass to Gemma 4 for JSON structuring
    const structuredJson = await extractResumeData(rawText);

    // ATS Optimization Layer
    const optimizedJsonStr = await optimizeResumeForATS(structuredJson);

    let data;
    try {
      let cleaned = optimizedJsonStr.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      data = JSON.parse(cleaned);
    } catch {
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
 * Controller: Handle guided chat turn with Gemma 4
 */
async function chat(req, res) {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: "Messages array required" });
    }

    const reply = await chatWithUser(messages);
    const isComplete = reply.includes("[EXTRACTION_COMPLETE]");

    let data = null;
    let cleanReply = reply;

    if (isComplete) {
      const jsonPart = reply.split("[EXTRACTION_COMPLETE]")[1]?.trim();
      if (jsonPart) {
        try {
          // ATS Optimization Layer
          const optimizedJsonStr = await optimizeResumeForATS(jsonPart);
          
          let cleaned = optimizedJsonStr.trim();
          if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
          }
          data = JSON.parse(cleaned);
        } catch {
          cleanReply = "I have collected your information! Preparing your review...";
        }
      }
      cleanReply = reply.split("[EXTRACTION_COMPLETE]")[0]?.trim() ||
        "Great! I have all your information. Generating your resume now...";
    }

    return res.json({ success: true, reply: cleanReply, isComplete, data });
  } catch (error) {
    console.error("chat Controller Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Helper: Trims resume data to strictly fit on one page using a line estimation heuristic.
 */
function trimResumeDataToFitOnePage(data) {
  const MAX_LINES = 75; // Standard 11pt font on 0.11in margins holds ~75 lines
  const CHARS_PER_LINE = 115;
  
  const estimateLines = (d) => {
    let lines = 5; // Header
    
    if (d.education && d.education.length > 0) {
      lines += 2; // Section header
      lines += d.education.length * 2;
    }
    if (d.experience && d.experience.length > 0) {
      lines += 2;
      d.experience.forEach(exp => {
        lines += 2;
        if (exp.bullets) {
          exp.bullets.forEach(b => {
            lines += Math.max(1, Math.ceil(b.length / CHARS_PER_LINE));
          });
        }
      });
    }
    if (d.projects && d.projects.length > 0) {
      lines += 2;
      d.projects.forEach(proj => {
        lines += 2;
        if (proj.bullets) {
          proj.bullets.forEach(b => {
            lines += Math.max(1, Math.ceil(b.length / CHARS_PER_LINE));
          });
        }
      });
    }
    if (d.skills) {
      lines += 2;
      Object.values(d.skills).forEach(arr => {
        if (arr && arr.length > 0) lines += 1;
      });
    }
    if (d.achievements && d.achievements.length > 0) {
      lines += 2;
      d.achievements.forEach(a => {
        const text = (a.title || "") + " " + (a.description || "");
        lines += Math.max(1, Math.ceil(text.length / CHARS_PER_LINE));
      });
    }
    if (d.positionsOfResponsibility && d.positionsOfResponsibility.length > 0) {
      lines += 2;
      d.positionsOfResponsibility.forEach(por => {
        lines += 1;
        if (por.bullets) {
          por.bullets.forEach(b => {
            lines += Math.max(1, Math.ceil(b.length / CHARS_PER_LINE));
          });
        }
      });
    }
    if (d.certifications && d.certifications.length > 0) {
      lines += 2;
      d.certifications.forEach(c => lines += 1);
    }
    return lines;
  };

  let currentLines = estimateLines(data);
  let iterationCount = 0;
  
  while (currentLines > MAX_LINES && iterationCount < 50) {
    let removedSomething = false;
    
    // 1. Try trimming the last project bullet if it has > 1 bullets
    if (data.projects && data.projects.length > 0) {
      for (let i = data.projects.length - 1; i >= 0; i--) {
        if (data.projects[i].bullets && data.projects[i].bullets.length > 1) {
          data.projects[i].bullets.pop();
          removedSomething = true;
          break;
        }
      }
    }
    
    // 2. Try trimming an experience bullet
    if (!removedSomething && data.experience && data.experience.length > 0) {
      for (let i = data.experience.length - 1; i >= 0; i--) {
        if (data.experience[i].bullets && data.experience[i].bullets.length > 1) {
          data.experience[i].bullets.pop();
          removedSomething = true;
          break;
        }
      }
    }

    // 3. Try trimming a POR bullet
    if (!removedSomething && data.positionsOfResponsibility && data.positionsOfResponsibility.length > 0) {
       for (let i = data.positionsOfResponsibility.length - 1; i >= 0; i--) {
        if (data.positionsOfResponsibility[i].bullets && data.positionsOfResponsibility[i].bullets.length > 0) {
          data.positionsOfResponsibility[i].bullets.pop();
          removedSomething = true;
          break;
        }
      }
    }

    // 4. Try completely removing the oldest project if still stuck
    if (!removedSomething && data.projects && data.projects.length > 1) {
      data.projects.pop();
      removedSomething = true;
    }

    // 5. Try completely removing the oldest experience
    if (!removedSomething && data.experience && data.experience.length > 1) {
      data.experience.pop();
      removedSomething = true;
    }
    
    if (!removedSomething) break; 
    
    currentLines = estimateLines(data);
    iterationCount++;
  }
  
  return data;
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

    // Trim data to fit one page precisely before sending to LaTeX
    const parsedData = typeof data === "string" ? JSON.parse(data) : data;
    const trimmedData = trimResumeDataToFitOnePage(parsedData);
    const resumeJson = JSON.stringify(trimmedData);
    
    console.log("⏳ Step 1: Calling Gemini to generate LaTeX...");
    let texContent = await generateLatex(resumeJson, template);
    console.log("✅ Step 1 Complete: Gemini generated LaTeX successfully.");
    console.log(`- Generated LaTeX length: ${texContent.length} characters`);

    texContent = texContent.trim();
    if (texContent.startsWith("```")) {
      texContent = texContent.replace(/^```(?:latex|tex)?\n?/, "").replace(/\n?```$/, "");
      console.log("- Removed markdown code block formatting.");
    }

    // Auto-fix common Gemini hallucination where it forgets the closing brace
    texContent = texContent.replace(/\\(begin|end)\{([a-zA-Z]+)[\s]*$/gm, "\\$1{$2}");
    console.log("- Applied LaTeX syntax auto-fixes.");

    // Compile to PDF
    console.log("⏳ Step 2: Compiling LaTeX to PDF via Latex.Online...");
    
    // We do NOT send extraFiles to latexCompilerService because the remote compiler corrupts binary files
    const result = await compileLatex(texContent, []);

    if (!result.success || !result.pdf) {
      console.log("❌ Error: Failed to compile LaTeX to PDF");
      console.log(`- Reason: ${result.error}`);
      return res.status(500).json({
        success: false,
        error: result.error || "Failed to compile LaTeX to PDF",
        texContent,
      });
    }

    console.log("✅ Step 2 Complete: PDF compiled successfully.");
    
    let finalPdfBuffer = result.pdf;
    
    if (template === "college") {
      try {
        console.log("⏳ Step 3: Stamping NSUT Logo using pdf-lib...");
        const fs = require("fs");
        const path = require("path");
        const { PDFDocument } = require("pdf-lib");
        
        const logoPath = path.join(__dirname, "../assets/NSUT_logo.png");
        if (fs.existsSync(logoPath)) {
          const logoImageBytes = fs.readFileSync(logoPath);
          const pdfDoc = await PDFDocument.load(finalPdfBuffer);
          const logoImage = await pdfDoc.embedPng(logoImageBytes);
          
          const pages = pdfDoc.getPages();
          const firstPage = pages[0];
          
          // Geometry settings from college.tex: 
          // margin=0.11in, image height=0.7in
          // In pdf-lib, 72 points = 1 inch, origin is bottom-left
          const { width, height } = firstPage.getSize();
          
          const marginPts = 0.11 * 72;
          const imgHeightPts = 0.7 * 72;
          const aspectRatio = logoImage.width / logoImage.height;
          const imgWidthPts = imgHeightPts * aspectRatio;
          
          // Calculate X and Y
          const x = marginPts;
          const y = height - marginPts - imgHeightPts;
          
          firstPage.drawImage(logoImage, {
            x: x,
            y: y,
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

    console.log(`- PDF Size: ${finalPdfBuffer.length} bytes`);
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="resume.pdf"');
    
    console.log("🚀 Sending PDF back to client...");
    return res.send(finalPdfBuffer);
  } catch (error) {
    console.error("❌ generateLatexResume Controller Error:", error);
    return res.status(500).json({ success: false, error: error.message });
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
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      enhanced = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ success: false, error: "Failed to parse enhanced JSON" });
    }

    return res.json({ success: true, data: enhanced });
  } catch (error) {
    console.error("enhance Controller Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  parseResume,
  chat,
  generateLatexResume,
  enhance,
};
