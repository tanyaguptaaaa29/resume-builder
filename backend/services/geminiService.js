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
async function extractResumeData(resumeText) {
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
    "link": "string (optional)"
  }],
  "skills": {
    "languages": ["string"],
    "frameworks": ["string"],
    "tools": ["string"],
    "databases": ["string"],
    "other": ["string"]
  },
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
- EXTRACTION OF URLS: The text may contain links formatted as LaTeX commands (e.g. \href{URL}{Text}). If a JSON field specifically expects a URL (like linkedin, github, portfolio, or a project link), extract ONLY the raw URL string.
- IN-TEXT LINKS: If an \href command appears in the middle of a bullet point, preserve the entire \href{URL}{Text} tag exactly as it is within the bullet point.

Resume text:
${resumeText}`,
  });

  return response.text || "{}";
}

/**
 * Phase 1: Guided conversation turn using Gemma 4
 */
async function chatWithUser(messages) {
  const chatHistory = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: `You are a friendly resume building assistant for NSUT students. You are collecting information to build their resume.

CONVERSATION FLOW — Ask ONE question at a time in this order:
1. Full name
2. Email, phone, LinkedIn, GitHub (collect all contact info)
3. College name, degree, branch/field, CGPA, start year - end year
4. Any other education entries
5. Technical skills: programming languages, frameworks, tools, databases
6. Projects (name, tech stack, description/bullet points, link)
7. Any more projects?
8. Work experience / internships (company, role, dates, bullet points)
9. Any more experience?
10. Achievements, awards, competitive programming ranks
11. Certifications
12. Positions of responsibility (college clubs, organizations)

RULES:
- Ask only ONE question at a time. Keep responses short (1-2 sentences).
- Be encouraging and conversational, but professional.
- When user says they have no more items for a section, move to the next section.
- After collecting ALL information, respond with EXACTLY this format:
  [EXTRACTION_COMPLETE]
  followed by the full structured JSON data (same schema as a resume data extraction).
- DO NOT output the JSON until ALL sections have been covered.

CONVERSATION SO FAR:
${chatHistory}

Respond as the Assistant:`,
  });

  return response.text || "";
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
Fill in the placeholders (like <<FullName>>, <<EducationEntries>>) with the data provided.
Do NOT change the documentclass, margins, spacing, or heading styles. 
Replace the example entries with actual data, repeating the formatting as necessary.

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
3. CRITICAL: The generated resume MUST fit on exactly one page. Truncate, summarize, or omit the least important bullet points if necessary to ensure the content does not overflow to a second page.

RESUME DATA (JSON):
${resumeData}

Generate the complete .tex file now:`,
  });

  return response.text || "";
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
2. Include quantified achievements where possible (%, numbers, scale)
3. Mention specific technologies used
4. Keep each bullet point to 1-2 lines maximum

Return the COMPLETE resume JSON with ONLY the ${section} section enhanced.

RESUME DATA:
${resumeData}

Return ONLY valid JSON:`,
  });

  return response.text || "{}";
}

/**
 * Phase 1.5: ATS Optimization Layer (Tech/SDE focus)
 */
async function optimizeResumeForATS(resumeDataStr) {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: `You are an elite Tech/SDE Resume Writer and ATS Optimization Expert.
Your job is to rewrite the provided resume JSON to achieve the HIGHEST POSSIBLE ATS SCORE for Software Engineering and Tech roles.

OPTIMIZATION RULES:
1. REWRITE ALL BULLET POINTS in "experience", "projects", and "positionsOfResponsibility".
2. Use the XYZ formula: "Accomplished [X] as measured by [Y], by doing [Z]".
3. Start every bullet point with a strong, high-impact action verb (e.g., Architected, Engineered, Designed, Developed, Spearheaded, Optimized).
4. PRESERVE THE EXACT NUMBER OF BULLETS: Do not merge, combine, or summarize bullet points. If a project had 3 bullets in the original JSON, it MUST have exactly 3 bullets in the output. Just rephrase each individual bullet to be stronger.
5. NEVER INVENT OR ADD ARBITRARY NUMBERS OR METRICS. You may rephrase and improve the points, but if the user did not provide specific numbers, DO NOT make them up. Do not generate random points just because they sound good.
6. Emphasize Technical Skills: Naturally weave in languages, frameworks, and cloud technologies into the bullet points.
6. Keep bullet points concise (1-2 lines) but extremely dense with impact and keywords.
7. CRITICAL: Do NOT artificially bloat the resume or invent details out of thin air. Ensure every bullet point strictly follows the XYZ ATS format wherever possible.
8. DO NOT invent entirely new fake jobs or projects, just elevate the existing ones to sound like an elite top-tier candidate.
9. PRESERVE LATEX LINKS: The JSON might contain LaTeX links like \\href{https://...}{Text} inside bullet points. You MUST preserve these exact tags when rephrasing bullet points. Do not break or remove them.

Return the COMPLETE, fully-optimized JSON matching the exact same schema.

RESUME DATA:
${resumeDataStr}

Return ONLY valid JSON:`,
  });

  return response.text || "{}";
}

module.exports = {
  extractResumeData,
  chatWithUser,
  generateLatex,
  enhanceContent,
  optimizeResumeForATS,
};
