const { extractTextFromPdf } = require("../services/pdfParserService");
const {
  extractResumeData,
  chatWithUser,
  generateLatex,
  enhanceContent,
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

    let data;
    try {
      let cleaned = structuredJson.trim();
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
          let cleaned = jsonPart;
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

    const resumeJson = typeof data === "string" ? data : JSON.stringify(data);
    
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
    const result = await compileLatex(texContent);

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
    console.log(`- PDF Size: ${result.pdf.length} bytes`);
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="resume.pdf"');
    
    console.log("🚀 Sending PDF back to client...");
    return res.send(result.pdf);
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
