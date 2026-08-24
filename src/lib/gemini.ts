import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini client
// API key is read from GOOGLE_API_KEY environment variable
const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || "",
});

// -- Phase 1: Data Extraction (Gemma 4 — lightweight, low cost) --
export async function extractResumeData(
  resumeText: string
): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemma-4-26b-a4b-it",
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
- Dates should be in "Month Year" or "Year" format.

Resume text:
${resumeText}`,
  });

  return response.text || "{}";
}

// -- Phase 1: Guided Chat (Gemma 4) --
export async function chatWithUser(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const chatHistory = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const response = await ai.models.generateContent({
    model: "gemma-4-26b-a4b-it",
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
- If the user provides vague answers, ask follow-up questions for clarity.

CONVERSATION SO FAR:
${chatHistory}

Respond as the Assistant:`,
  });

  return response.text || "";
}

// -- Phase 2: LaTeX Generation (Gemini 2.5 Flash) --
export async function generateLatex(
  resumeData: string,
  template: "college" | "offcampus"
): Promise<string> {
  const templateInstructions =
    template === "college"
      ? `TEMPLATE: College/University Resume (for campus placements)
SECTION ORDER: Education → Technical Skills → Projects → Experience → Achievements → Positions of Responsibility → Certifications
STYLE: Clean single-column, compact, optimized for Indian college placement format.
- Header: Name centered, contact info on one line below (email | phone | LinkedIn | GitHub)
- Education section should prominently show CGPA`
      : `TEMPLATE: Off-Campus/Industry Resume
SECTION ORDER: Professional Summary (1-2 lines) → Experience → Projects → Technical Skills → Education → Certifications → Achievements
STYLE: Professional corporate format, ATS-optimized.
- Header: Name left-aligned, contact info right-aligned
- Experience section should be most prominent with quantified achievements`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `You are an expert LaTeX resume generator. Generate a COMPLETE, COMPILABLE LaTeX document for a resume using the data provided.

${templateInstructions}

LATEX REQUIREMENTS:
1. Use \\documentclass[letterpaper,11pt]{article}
2. Required packages: latexsym, fullpage, titlesec, marvosym, enumitem, hyperref, fancyhdr, tabularx, fontenc, inputenc, geometry
3. Set margins to 0.5in on all sides using geometry package
4. Use \\pagestyle{fancy} with empty header/footer, no head separator
5. Custom commands for resume sections:
   - \\resumeSubheading{title}{dates}{subtitle}{location}
   - \\resumeItem{description}
   - \\resumeSubItem{description}
   - \\resumeProjectHeading{name | tech stack}{dates}
6. Section headings should use \\titlerule with uppercase text
7. Use itemize with [leftmargin=0.15in, label={}] for clean formatting
8. All special LaTeX characters in the data MUST be properly escaped (%, &, $, #, _, {, }, ~, ^)
9. Use \\href for links (LinkedIn, GitHub, portfolio, project links)
10. Do NOT include any comments or explanations — output ONLY the complete .tex file content.
11. The document MUST compile without errors using pdflatex.

RESUME DATA (JSON):
${resumeData}

Generate the complete .tex file now:`,
  });

  return response.text || "";
}

// -- Premium: AI Content Enhancement --
export async function enhanceContent(
  resumeData: string,
  section: string
): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `You are a professional resume writer specializing in ATS-optimized content for tech roles.

Enhance the ${section} section of this resume data. For each bullet point:
1. Start with a strong action verb (Developed, Implemented, Architected, Optimized, etc.)
2. Include quantified achievements where possible (%, numbers, scale)
3. Mention specific technologies used
4. Keep each bullet point to 1-2 lines maximum
5. Focus on IMPACT and RESULTS, not just responsibilities

Return the COMPLETE resume JSON with ONLY the ${section} section enhanced. Keep all other sections unchanged.

RESUME DATA:
${resumeData}

Return ONLY valid JSON, no markdown blocks:`,
  });

  return response.text || "{}";
}
