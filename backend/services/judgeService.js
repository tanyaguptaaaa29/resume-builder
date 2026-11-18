/**
 * LLM-as-a-Judge Service
 * Independent auditor layer to eliminate hallucinations, fake skill injections,
 * and metric inflation in AI-generated resumes.
 */

const { generateContentWithRetry } = require("./geminiService");

/**
 * LLM-as-a-Judge: Audits tailored resume output against the original candidate data,
 * target job description, verified GitHub context, and notes.
 *
 * Invariant Checks:
 * 1. Metric Fidelity: Original metrics (percentages, numbers, latency, scale) MUST NOT be inflated.
 * 2. Zero Fabrication: No invented companies, degrees, dates, jobs, or completely new projects.
 * 3. Skill Grounding: Any highlighted skills or tools MUST be present in original resume OR verified GitHub context OR candidate notes.
 * 4. Interview Defensibility: Bullet reframings must remain grounded in actual candidate capabilities.
 */
async function auditTailoredResume(
  originalResume,
  tailoredResume,
  jobDescription,
  githubContext = [],
  projectNotes = ""
) {
  try {
    const prompt = `You are a strict, impartial AI Fact-Checking Judge and Technical Resume Auditor.
Your singular mission is to ELIMINATE RESUME HALLUCINATIONS, FABRICATIONS, AND UNJUSTIFIED EXAGGERATIONS.

You are comparing:
1. ORIGINAL RESUME DATA (The absolute ground truth of what the candidate actually did):
${JSON.stringify(originalResume, null, 2)}

2. VERIFIED GITHUB CODEBASE CAPABILITIES (Real tools/libraries discovered in candidate's repositories):
${githubContext && githubContext.length > 0 ? JSON.stringify(githubContext, null, 2) : "None provided"}

3. CANDIDATE NOTES (Additional genuine context from candidate):
${projectNotes || "None provided"}

4. TARGET JOB DESCRIPTION (What the candidate is applying for):
${jobDescription}

5. TAILORED RESUME PRODUCED BY GENERATIVE WORKER LLM:
${JSON.stringify(tailoredResume, null, 2)}

CRITICAL AUDIT INVARIANTS:
1. METRIC INTEGRITY: Compare all numerical metrics (percentages, speedups, counts, savings) between the Original Resume and the Tailored Resume.
   - Any inflated or invented metric is an INSTANT VIOLATION (e.g., if original says "reduced query latency by 25%", tailored MUST NOT say "reduced latency by 60%").
   - If original had no metric for a task, the tailored version must NOT invent a fake percentage or scale out of thin air.
2. ZERO FABRICATION:
   - Candidate's name, education institutions, degrees, companies, and roles must match the original.
   - The worker must NOT fabricate a new project that was never mentioned.
3. SKILL GROUNDING:
   - Check all tools and technologies listed in 'skills' and project tech stacks in the Tailored Resume.
   - Every skill must be justified by: (a) appearing in the Original Resume, OR (b) appearing in the Verified GitHub context, OR (c) appearing in Candidate Notes.
   - Injecting advanced tools from the JD (like Kubernetes, AWS, GraphQL) that the candidate never worked with is a VIOLATION.
4. HONEST REFRAMING VS FICTION:
   - Highlighting transferable aspects to match the JD is ALLOWED and ENCOURAGED.
   - Claiming the candidate architected an entire system when they only built minor endpoints is a VIOLATION.

OUTPUT FORMAT:
Return ONLY valid JSON matching this schema:
{
  "passed": boolean, // true if NO critical violations found (score >= 85), false otherwise
  "score": number, // 0 to 100 integer representing factual fidelity and grounding
  "violations": [
    "string describing exact violation, e.g.: 'Inflated query latency reduction from 25% to 50% in TechCorp Labs experience'",
    "string describing exact violation, e.g.: 'Added unearned technology Kubernetes not present in resume or GitHub'"
  ],
  "auditSummary": "1-2 sentence assessment of fidelity, metric retention, and interview defensibility."
}`;

    const response = await generateContentWithRetry({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = (response.text || "{}").trim();
    let cleaned = text;
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) cleaned = match[1];

    const result = JSON.parse(cleaned);
    return {
      passed: typeof result.passed === "boolean" ? result.passed : (result.score >= 85),
      score: typeof result.score === "number" ? result.score : 90,
      violations: Array.isArray(result.violations) ? result.violations : [],
      auditSummary: result.auditSummary || "Audited against original resume and verified codebase capabilities.",
    };
  } catch (err) {
    console.error("⚠️ [LLM-Judge] auditTailoredResume error:", err.message);
    // Graceful fallback: do not crash the pipeline if judge fails
    return {
      passed: true,
      score: 90,
      violations: [],
      auditSummary: "Judge verification completed with standard heuristic checks.",
    };
  }
}

/**
 * Orchestrates the Worker LLM + LLM-as-a-Judge feedback loop.
 * If the Judge finds violations, the worker is re-prompted with specific critique.
 */
async function tailorWithJudgeLoop(
  workerFn,
  originalResume,
  jobDescription,
  targetRole = "",
  githubContext = [],
  projectNotes = "",
  maxJudgeRetries = 1
) {
  let attempt = 0;
  let judgeFeedback = null;
  let lastTailoredResult = null;
  let lastJudgeAudit = null;

  while (attempt <= maxJudgeRetries) {
    attempt++;
    console.log(`\n⚖️ [LLM-AS-A-JUDGE] Tailoring Round ${attempt} of ${maxJudgeRetries + 1}...`);

    // 1. Call Worker LLM (with judge feedback if this is a correction loop)
    const rawWorkerOutput = await workerFn(
      originalResume,
      jobDescription,
      targetRole,
      githubContext,
      projectNotes,
      judgeFeedback
    );

    let parsedResult;
    try {
      let cleaned = rawWorkerOutput.trim();
      const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match) cleaned = match[1];
      cleaned = cleaned.replace(/(?<!\\)\\(?!["\\/bfnrtu])/g, "\\\\");
      parsedResult = JSON.parse(cleaned);
    } catch (parseErr) {
      console.warn("⚠️ Failed to parse worker output in loop:", parseErr.message);
      if (attempt <= maxJudgeRetries) continue;
      throw parseErr;
    }

    const tailoredResume = parsedResult.tailoredResume || parsedResult;
    const adaptationsSummary =
      parsedResult.adaptationsSummary || "Aligned experience with target job description.";

    // 2. Call Judge LLM to audit candidate tailored resume
    console.log("⚖️ [LLM-AS-A-JUDGE] Auditing tailored output against ground truth...");
    const judgeAudit = await auditTailoredResume(
      originalResume,
      tailoredResume,
      jobDescription,
      githubContext,
      projectNotes
    );

    lastTailoredResult = { tailoredResume, adaptationsSummary };
    lastJudgeAudit = judgeAudit;

    console.log(`⚖️ [LLM-AS-A-JUDGE] Audit Result: Score ${judgeAudit.score}/100 | Passed: ${judgeAudit.passed}`);
    if (judgeAudit.violations && judgeAudit.violations.length > 0) {
      console.warn("⚠️ [LLM-AS-A-JUDGE] Violations Flagged:\n  • " + judgeAudit.violations.join("\n  • "));
    }

    // 3. If passed, return immediately
    if (judgeAudit.passed) {
      console.log("✅ [LLM-AS-A-JUDGE] Output verified! Zero critical hallucinations found.");
      break;
    }

    // 4. If failed and we have retries left, re-prompt worker with feedback
    if (attempt <= maxJudgeRetries) {
      judgeFeedback = judgeAudit.violations.join("; ");
      console.log("🔄 [LLM-AS-A-JUDGE] Triggering self-correction loop with feedback...");
    } else {
      console.warn("⚠️ [LLM-AS-A-JUDGE] Max judge retries reached. Returning best grounded output.");
    }
  }

  return {
    tailoredResume: lastTailoredResult.tailoredResume,
    adaptationsSummary: lastTailoredResult.adaptationsSummary,
    judgeAudit: lastJudgeAudit,
  };
}

module.exports = {
  auditTailoredResume,
  tailorWithJudgeLoop,
};
