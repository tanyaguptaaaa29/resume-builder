const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

// Initialize Gemini client with API key from environment variable
const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || "",
});

/**
 * Phase 1: Extract structured JSON from raw resume text using Gemma 4
 */
async function extractResumeData(resumeText, links = []) {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: `You are a resume data extraction expert. Extract ALL structured information from the following resume text and return it as a valid JSON object.

The JSON must follow this exact schema:
{
  "personalInfo": {
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "linkedin": "string (optional)",
    "github": "string (optional)",
    "portfolio": "string (optional)",
    "leetcode": "string (optional)",
    "codeforces": "string (optional)",
    "location": "string (optional)"
  },
  "education": [{
    "institution": "string",
    "degree": "string",
    "field": "string",
    "cgpa": "string (optional)",
    "startDate": "string",
    "endDate": "string",
    "coursework": ["string"] (optional)
  }],
  "experience": [{
    "company": "string",
    "role": "string",
    "startDate": "string",
    "endDate": "string",
    "bullets": ["string"],
    "location": "string (optional)"
  }],
  "projects": [{
    "name": "string",
    "description": "string (optional)",
    "techStack": ["string"],
    "bullets": ["string"],
    "link": "string (optional, usually GitHub/Source code)",
    "liveLink": "string (optional, live deployment URL)"
  }],
  "skills": [{
    "category": "string (e.g. Languages, Frameworks, Tools)",
    "items": "string (comma-separated list)"
  }],
  "achievements": [{
    "title": "string",
    "description": "string (optional)",
    "date": "string (optional)"
  }],
  "certifications": [{
    "name": "string",
    "issuer": "string (optional)",
    "date": "string (optional)"
  }],
  "positionsOfResponsibility": [{
    "role": "string",
    "organization": "string",
    "bullets": ["string"],
    "startDate": "string (optional)",
    "endDate": "string (optional)"
  }]
}

IMPORTANT:
- Return ONLY valid JSON, no markdown code blocks, no explanations.
- If a section is not present in the resume, omit it or use an empty array.
- Ensure all bullet points are extracted verbatim from the resume.
- SEMANTIC LINK MATCHING: You are provided with a separate array of 'Extracted URLs' found in the document. You MUST intelligently deduce which URL belongs to which field. For example, if a URL contains 'github.com', it likely belongs to a project 'link' or the main 'github' field. If a URL contains 'linkedin', it goes to 'linkedin'. If a URL looks like a live deployment (e.g., vercel, render, custom domain) and contextually matches a project, map it to that project's 'liveLink'. DO NOT put raw URLs inside the bullet points.

Extracted URLs:
${JSON.stringify(links, null, 2)}

Resume text:
${resumeText}`,
    config: {
      responseMimeType: "application/json"
    }
  });

  return response.text || "{}";
}

/**
 * Phase 2: Generate syntax-valid LaTeX code using Gemini 2.5 Flash
 */
async function generateLatex(resumeData, template) {
  let templateContent = "";
  try {
    const templatePath = path.join(__dirname, "..", "templates", `${template}.tex`);
    if (fs.existsSync(templatePath)) {
      templateContent = fs.readFileSync(templatePath, "utf-8");
    }
  } catch (error) {
    console.warn(`Could not read template ${template}.tex:`, error);
  }

  const templateInstructions = templateContent
    ? `You MUST use the exact LaTeX template structure provided below. 
Fill in the placeholders (like <<FullName>>, <<EducationEntries>>, <<LeetCode>>, <<CodeForces>>) with the data provided.
Do NOT change the documentclass, margins, spacing, or heading styles. 
Replace the example entries with actual data, repeating the formatting as necessary.
CRITICAL: If an optional field like <<LeetCode>> or <<CodeForces>> is not present in the provided JSON data, you MUST cleanly remove its placeholder along with any preceding or trailing separators (like '|' or '\\,') so the header looks natural.
CRITICAL: If an entire section (e.g., Experience, Projects, Achievements, Certifications) is empty or missing in the JSON data, you MUST completely remove that section from the LaTeX output, including its section heading and any associated formatting. Do not write "None" or leave an empty heading.
CRITICAL: For projects, if both a 'link' (Source Code) and 'liveLink' are provided, separate them clearly in the project header (e.g., using |). If only one or none is provided, format the header cleanly without dangling separators.
CRITICAL: For Education entries, ensure the combined length of Course and College/University does not cause text wrapping. Abbreviate aggressively (e.g., use "B.Tech (ECE)" instead of "Bachelor of Technology", "DTU" instead of "Delhi Technological University"). Limit Course to max 30 chars and College to max 35 chars.

TEMPLATE:
${templateContent}`
    : (template === "college"
      ? `TEMPLATE: College/University Resume (for campus placements at NSUT)
SECTION ORDER: Education → Technical Skills → Projects → Experience → Achievements → Positions of Responsibility → Certifications
STYLE: Clean single-column, compact format.
- Header: Name centered, contact info on one line below (email | phone | LinkedIn | GitHub)
- Education section should prominently show CGPA`
      : `TEMPLATE: Off-Campus/Industry Resume
SECTION ORDER: Professional Summary → Experience → Projects → Technical Skills → Education → Certifications → Achievements
STYLE: Professional corporate format, ATS-optimized.
- Header: Name left-aligned, contact info right-aligned
- Experience section should be most prominent with quantified achievements`);

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: `You are an expert LaTeX resume generator. Generate a COMPLETE, COMPILABLE LaTeX document for a resume using the data provided.

${templateInstructions}

LATEX REQUIREMENTS (if not using a strict template above):
1. Use \\documentclass[letterpaper,11pt]{article}
2. Required packages: latexsym, fullpage, titlesec, marvosym, enumitem, hyperref, fancyhdr, tabularx, fontenc, inputenc, geometry
3. Set margins to 0.5in on all sides using geometry package
4. Use \\pagestyle{fancy} with empty header/footer
5. Section headings should use \\titlerule with uppercase text
6. Use itemize with [leftmargin=0.15in, label={}] for clean formatting

COMMON LATEX RULES:
1. All special LaTeX characters MUST be properly escaped (%, &, $, #, _, {, }, ~, ^)
2. Output ONLY the complete .tex file content, no markdown blocks.
3. CRITICAL: Maintain as much of the provided information as possible while writing the LaTeX code. Do not exaggerate or bloat the content, but make sure the user's provided points are kept and rephrased naturally. Do NOT arbitrarily drop bullet points.
4. CRITICAL: If an entire section (e.g., Experience, Projects, Achievements, Certifications) is empty or missing in the JSON data, you MUST completely omit that section from the LaTeX output including its section heading.

RESUME DATA (JSON):
${resumeData}

Generate the complete .tex file now:`,
  });

  let latexCode = response.text || "";
  
  // Post-processing: Remove any empty sections the AI failed to omit (prevents LaTeX "missing \item" errors)
  // Matches \resheading{...} or \section{...} followed by an itemize/highlights block that DOES NOT contain an \item
  latexCode = latexCode.replace(/(?:\\resheading\{.*?\}|\\section\{.*?\})\s*\\begin\{(itemize|highlights|highlightsforbulletentries)\}(?:(?!\\item)[\s\S])*?\\end\{\1\}/g, "");
  // Matches any standalone empty itemize/highlights blocks that have no \item
  latexCode = latexCode.replace(/\\begin\{(itemize|highlights|highlightsforbulletentries)\}(?:(?!\\item)[\s\S])*?\\end\{\1\}/g, "");
  
  return latexCode;
}

/**
 * Premium Tier: Enhance bullet points with action verbs and quantified metrics
 */
async function enhanceContent(resumeData, section) {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: `You are a professional resume writer specializing in ATS-optimized content for tech roles.

Enhance the ${section} section of this resume data. For each bullet point:
1. Start with a strong action verb (Developed, Implemented, Architected, Optimized, etc.)
2. CRITICAL: NEVER remove or dilute any quantified achievements (%, numbers, scale) already provided by the user. If they wrote "saved 10 hours", keep the EXACT numbers.
3. Mention specific technologies used
4. Keep each bullet point to 1-2 lines maximum

Return the COMPLETE resume JSON with ONLY the ${section} section enhanced.

RESUME DATA:
${resumeData}

Return ONLY valid JSON:`,
    config: {
      responseMimeType: "application/json"
    }
  });

  return response.text || "{}";
}


/**
 * Truncates existing LaTeX by removing the least significant bullet points to fit on a page.
 */
async function truncateLatex(texContent, currentIteration = 1, maxIterations = 4) {
  const isLastAttempt = currentIteration === maxIterations - 1;
  const severityPrompt = isLastAttempt
    ? "Your task is to heavily truncate the LaTeX code. You MUST cut out 3-4 bullet points, and even remove the entire least significant project or experience block if necessary. Be extremely ruthless to ensure it fits on one page no matter what."
    : "Your task is to carefully remove the 1 or 2 LEAST significant bullet points (e.g., from older projects, minor responsibilities, or older experience) so that it fits on one page.";

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: `You are an expert LaTeX editor. The following LaTeX resume code compiles to slightly more than one page.
${severityPrompt}

RULES:
1. Do NOT change any document styling, margins, or packages.
2. Ensure the LaTeX syntax remains perfectly valid (do not break \\begin{itemize} or \\end{itemize} tags).
3. ONLY remove 1-2 bullet points (i.e. \\item lines). Do not rewrite or summarize other points.
4. Output ONLY the raw updated LaTeX code, without markdown blocks.

CURRENT LATEX CODE:
${texContent}

Generate the updated LaTeX code now:`,
  });

  return response.text || "";
}

module.exports = {
  extractResumeData,
  generateLatex,
  enhanceContent,
  truncateLatex,
};
