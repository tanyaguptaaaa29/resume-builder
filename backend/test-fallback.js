require("dotenv").config();
const {
  generateContentWithRetry,
  extractResumeData,
  DEFAULT_PRIMARY_MODEL,
  DEFAULT_FALLBACK_MODELS,
} = require("./services/geminiService");

async function runTests() {
  console.log("=========================================");
  console.log("TEST 1: Configuration Verification");
  console.log("Primary Model:", DEFAULT_PRIMARY_MODEL);
  console.log("Fallback Models:", DEFAULT_FALLBACK_MODELS);
  console.log("=========================================\n");

  console.log("TEST 2: Direct Generation via Primary / Cascade");
  try {
    const res = await generateContentWithRetry({
      contents: "Return only the word: VERIFIED_SUCCESS",
    });
    console.log("Result:", res.text.trim());
    console.log("✅ TEST 2 PASSED\n");
  } catch (err) {
    console.error("❌ TEST 2 FAILED:", err.message);
    process.exit(1);
  }

  console.log("TEST 3: Simulated 503 Cascade Starting from gemini-3.8-flash");
  try {
    const cascadeRes = await generateContentWithRetry(
      {
        model: "gemini-3.8-flash", // We test cascade starting from gemini-3.8-flash
        contents: "Return only: CASCADE_SUCCESS",
      },
      { maxRetriesPerModel: 1 }
    );
    console.log("Result:", cascadeRes.text.trim());
    console.log("✅ TEST 3 PASSED\n");
  } catch (err) {
    console.error("❌ TEST 3 FAILED:", err.message);
    process.exit(1);
  }

  console.log("TEST 4: Resume Data Extraction Test (extractResumeData)");
  try {
    const rawResumeText = `
    Rohan Sharma
    rohan.sharma@nsut.ac.in | +91 9876543210 | New Delhi, India
    github.com/rohansharma | linkedin.com/in/rohansharma

    EDUCATION
    Netaji Subhas University of Technology (NSUT), Delhi
    Bachelor of Technology in Computer Science, CGPA: 8.9 (2022 - 2026)

    EXPERIENCE
    Software Engineering Intern at Zomato (May 2024 - July 2024)
    - Engineered high-throughput Node.js microservices reducing latency by 35%.
    - Implemented Redis caching layers handling 50k requests per second.

    PROJECTS
    Real-Time Code Collab
    - Built with React, WebSockets, and Express.
    - Supported multi-user concurrent editing with Operational Transformation.
    `;

    const extractedJson = await extractResumeData(rawResumeText, [
      "https://github.com/rohansharma",
      "https://linkedin.com/in/rohansharma",
    ]);

    const parsed = JSON.parse(extractedJson);
    if (!parsed.personalInfo || !parsed.personalInfo.fullName) {
      throw new Error("Missing personalInfo.fullName in parsed result");
    }
    console.log("Extracted Candidate Name:", parsed.personalInfo.fullName);
    console.log("Extracted Email:", parsed.personalInfo.email);
    console.log("Extracted Education:", parsed.education?.[0]?.institution);
    console.log("Extracted Projects:", parsed.projects?.[0]?.name);
    console.log("✅ TEST 4 PASSED\n");
  } catch (err) {
    console.error("❌ TEST 4 FAILED:", err.message);
    process.exit(1);
  }

  console.log("=========================================");
  console.log("ALL TESTS COMPLETED SUCCESSFULLY! 🎉");
  console.log("=========================================");
}

runTests();
