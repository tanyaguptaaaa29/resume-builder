const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

// Initialize Gemini client with API key from environment variable
const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || "",
});

const DEFAULT_PRIMARY_MODEL = process.env.GEMINI_PRIMARY_MODEL || "gemini-3.5-flash-lite";
const DEFAULT_FALLBACK_MODELS = process.env.GEMINI_FALLBACK_MODELS
  ? process.env.GEMINI_FALLBACK_MODELS.split(",").map((m) => m.trim()).filter(Boolean)
  : ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.1-flash-lite", "gemma-4-31b-it"];

/**
 * Resilient multi-tier wrapper around Gemini generateContent with automatic model fallback cascade
 * Handles 503 high demand / 429 rate limit spikes with exponential backoff & randomized jitter.
 */
async function generateContentWithRetry(params, options = {}) {
  const maxRetriesPerModel = typeof options === "number" ? options : (options.maxRetriesPerModel || 2);
  const initialModel = params.model || DEFAULT_PRIMARY_MODEL;
  
  // Build deduplicated candidate model cascade starting with the requested model, followed by the rest of the pool
  const candidateModels = [
    initialModel,
    ...DEFAULT_FALLBACK_MODELS.filter((m) => m !== initialModel),
  ];
  
  let lastError = null;

  for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
    const currentModel = candidateModels[mIdx];
    const nextModel = candidateModels[mIdx + 1];

    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model: currentModel,
        });
        if (mIdx > 0) {
          console.log(`✅ [Gemini Fallback] Request succeeded using fallback model: "${currentModel}"`);
        }
        return response;
      } catch (err) {
        lastError = err;
        const errMsg = err.message || "";
        const isTransient =
          err.status === 503 ||
          err.status === 429 ||
          errMsg.includes("503") ||
          errMsg.includes("429") ||
          errMsg.includes("high demand") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("fetch failed") ||
          errMsg.includes("socket hang up");

        // Non-transient errors (e.g. 400 Bad Request, schema/syntax error) fail immediately
        if (!isTransient) {
          throw err;
        }

        if (attempt < maxRetriesPerModel) {
          const jitter = Math.floor(Math.random() * 500);
          const delayMs = attempt * 1200 + jitter;
          console.warn(
            `⚠️ [Gemini] Transient error on "${currentModel}" (${err.status || 503}). Retrying in ${(delayMs / 1000).toFixed(1)}s (Attempt ${attempt}/${maxRetriesPerModel})...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    if (nextModel) {
      console.warn(
        `➡️ [Gemini Fallback] Model "${currentModel}" unavailable after ${maxRetriesPerModel} attempts (503/transient). Cascading to fallback model "${nextModel}"...`
      );
    }
  }

  throw lastError;
}

/**
 * Phase 1: Extract structured JSON from raw resume text using Gemma 4
 */
async function extractResumeData(resumeText, links = []) {
  const response = await generateContentWithRetry({
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

  const response = await generateContentWithRetry({
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
5. CRITICAL: When inserting email addresses or URLs that contain underscores (_), you MUST escape them as \\_ in the visible display text. However, inside the \\href{URL} parameter itself, do NOT escape the underscore. Example: \\href{mailto:first_last@email.com}{first\\_last@email.com}

RESUME DATA (JSON):
${resumeData}

Generate the complete .tex file now:`,
  });

  let latexCode = response.text || "";
  
  // Post-processing: Remove any empty sections the AI failed to omit (prevents LaTeX "missing \item" errors)
  const docStart = latexCode.indexOf('\\begin{document}');
  if (docStart !== -1) {
    let preamble = latexCode.substring(0, docStart);
    let body = latexCode.substring(docStart);
    // Matches \resheading{...} or \section{...} followed by an itemize/highlights block that DOES NOT contain an \item
    body = body.replace(/(?:\\resheading\{.*?\}|\\section\{.*?\})\s*\\begin\{(itemize|highlights|highlightsforbulletentries)\}(?:(?!\\item)[\s\S])*?\\end\{\1\}/g, "");
    // Matches any standalone empty itemize/highlights blocks that have no \item
    body = body.replace(/\\begin\{(itemize|highlights|highlightsforbulletentries)\}(?:(?!\\item)[\s\S])*?\\end\{\1\}/g, "");
    latexCode = preamble + body;
  } else {
    latexCode = latexCode.replace(/(?:\\resheading\{.*?\}|\\section\{.*?\})\s*\\begin\{(itemize|highlights|highlightsforbulletentries)\}(?:(?!\\item)[\s\S])*?\\end\{\1\}/g, "");
    latexCode = latexCode.replace(/\\begin\{(itemize|highlights|highlightsforbulletentries)\}(?:(?!\\item)[\s\S])*?\\end\{\1\}/g, "");
  }
  
  return latexCode;
}

/**
 * Premium Tier: Enhance bullet points with action verbs and quantified metrics
 */
async function enhanceContent(resumeData, section) {
  const response = await generateContentWithRetry({
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

  const response = await generateContentWithRetry({
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

/**
 * Tailor candidate resume data to a target Job Description (JD) without drastic exaggeration
 */
async function tailorResumeToJD(
  resumeData,
  jobDescription,
  targetRole = "",
  githubContext = [],
  projectNotes = "",
  judgeFeedback = null
) {
  const resumeJson = typeof resumeData === "string" ? resumeData : JSON.stringify(resumeData, null, 2);

  const githubSection =
    Array.isArray(githubContext) && githubContext.length > 0
      ? `\nVERIFIED GITHUB CODEBASE CAPABILITIES (GENUINE WORK FROM REAL CODE FILES):
The candidate provided public GitHub repositories for their projects. We inspected their code files, dependencies, and architecture:
${JSON.stringify(githubContext, null, 2)}
AUTHORIZATION: You are explicitly AUTHORIZED to weave in and spotlight these verified technical capabilities, tools, and libraries in the project bullet points when they match the requirements of the target Job Description. This is verified real work, NOT hallucination.\n`
      : "";

  const notesSection =
    projectNotes && typeof projectNotes === "string" && projectNotes.trim().length > 0
      ? `\nCANDIDATE'S ADDITIONAL PROJECT CONTEXT & HIDDEN FEATURES:
The candidate provided additional technical context regarding their projects:
${projectNotes.trim()}
You may incorporate these genuine details into relevant bullet points to align with the JD.\n`
      : "";

  const feedbackSection =
    judgeFeedback && typeof judgeFeedback === "string" && judgeFeedback.trim().length > 0
      ? `\n⚠️ CRITICAL CORRECTION REQUIRED FROM LLM-AS-A-JUDGE AUDITOR:
Your previous attempt was REJECTED due to the following factual violations or hallucinations:
${judgeFeedback.trim()}
YOU MUST FIX THESE VIOLATIONS:
- Remove any unverified tools, libraries, or claims mentioned above.
- Strictly keep all candidate metrics identical to the original resume.
- Ensure all content is 100% truthful and interview-defensible.\n`
      : "";

  const response = await generateContentWithRetry({
    model: "gemini-3.5-flash-lite",
    contents: `You are an elite career strategist and technical resume consultant specializing in tailored, ATS-optimized resumes.

A candidate wants to tailor their resume for a target Job Description (JD). 

CRITICAL PHILOSOPHY — SUBTLE, GROUNDED REFRAMING (NO DRASTIC EXAGGERATION):
Most AI tools ruin resumes by hallucinating fake achievements or blindly copying every keyword from the JD. That gets candidates rejected during interviews.
YOUR GOAL is the opposite: Subtle, believable, and grounded alignment. Keep the candidate's true voice and background intact, while reframing their existing experience to spotlight what the hiring manager cares most about.

STRICT RULES:
1. ZERO FABRICATION: NEVER invent companies, degrees, dates, jobs, or completely new projects.
2. METRIC INTEGRITY: NEVER inflate or alter existing numbers, percentages, or scale. If the candidate wrote "saved 10 hours", keep "saved 10 hours".
3. TERMINOLOGY & REFRAMING:
   - Match industry terms from the JD where appropriate (e.g. if JD emphasizes "high-throughput APIs" and candidate wrote "made backend faster", reframe to "Optimized backend throughput and response times").
   - Emphasize transferable aspects of their existing projects/roles that directly address the JD's responsibilities.
   - If verified codebase capabilities or project notes are provided below, you may bring those genuine implementations into the bullet points.
   - Ensure bullet points read naturally and easily during an interview. The candidate must be able to comfortably talk about every single point.
4. SKILLS REORDERING:
   - Within each skills category (Languages, Frameworks, Tools/Platforms), reorder existing skills so that tools/technologies mentioned in the JD appear FIRST in the comma-separated list.
   - If a tool is verified in their GitHub codebase manifest (e.g. Docker, Redis, Socket.io), you may also include it in the relevant skills category!
   - Do NOT add random advanced tools the candidate hasn't worked with.
5. CONCISE ATS BULLETS:
   - 1-2 lines per bullet point. Start with strong action verbs.
6. ADAPTATIONS SUMMARY:
   - Include a concise 1-2 sentence field "adaptationsSummary" explaining exactly what subtle adjustments and verified codebase features were highlighted to align with the JD.

TARGET JOB DESCRIPTION:
${jobDescription}
${targetRole ? `\nTARGET ROLE/TITLE:\n${targetRole}` : ""}
${githubSection}
${notesSection}
${feedbackSection}
CANDIDATE CURRENT RESUME JSON:
${resumeJson}

OUTPUT FORMAT:
Return a JSON object with:
{
  "adaptationsSummary": "1-2 sentence summary of what was highlighted or reframed",
  "tailoredResume": {
    // Full resumeData matching the exact schema (personalInfo, education, experience, projects, skills, achievements, certifications, positionsOfResponsibility)
  }
}

Return ONLY valid JSON:`,
    config: {
      responseMimeType: "application/json",
    },
  });

  return response.text || "{}";
}

module.exports = {
  extractResumeData,
  generateLatex,
  enhanceContent,
  truncateLatex,
  tailorResumeToJD,
  generateContentWithRetry,
  ai,
  DEFAULT_PRIMARY_MODEL,
  DEFAULT_FALLBACK_MODELS,
};
