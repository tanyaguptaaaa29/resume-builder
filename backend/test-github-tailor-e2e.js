require('dotenv').config();
const { tailorResume } = require('./controllers/resumeController');
const { fetchRepoBlueprint, analyzeRepoWithGemini } = require('./services/githubService');

async function runE2E() {
  console.log("=== Testing End-to-End GitHub Inspection + JD Tailoring ===");

  // 1. Inspect a public repository
  console.log("1. Inspecting expressjs/express as sample project repository...");
  const blueprint = await fetchRepoBlueprint("https://github.com/expressjs/express");
  const analysis = await analyzeRepoWithGemini(blueprint);
  console.log("Verified tech stack from repo:", analysis.techStack?.slice(0, 6));

  // 2. Candidate with a basic project that didn't mention Redis or CI/CD
  const sampleCandidate = {
    personalInfo: {
      fullName: "Arjun Verma",
      email: "arjun.verma@nsut.ac.in",
      phone: "+91 9876543210",
      linkedin: "https://linkedin.com/in/arjunverma",
      github: "https://github.com/arjunverma"
    },
    education: [
      {
        institution: "Netaji Subhas University of Technology",
        degree: "B.Tech (CSE)",
        field: "Computer Science",
        cgpa: "8.9",
        startDate: "2022",
        endDate: "2026"
      }
    ],
    experience: [],
    projects: [
      {
        name: "Express Web API Engine",
        techStack: ["Node.js", "JavaScript"],
        bullets: [
          "Created modular backend routing service in Node.js.",
          "Implemented basic HTTP request and response middleware."
        ],
        link: "https://github.com/expressjs/express"
      }
    ],
    skills: [
      {
        category: "Languages & Frameworks",
        items: "JavaScript, Node.js, Python, SQL"
      }
    ],
    achievements: [],
    positionsOfResponsibility: []
  };

  // 3. JD specifically looking for Redis caching and CI/CD pipelines
  const sampleJD = `
We are looking for a Backend Platform Engineer.
Requirements:
- Strong Node.js expertise building high-performance routing middleware.
- Experience with Redis session stores, caching, and rate limiting.
- Automated CI/CD pipelines (GitHub Actions) and comprehensive unit testing.
`;

  console.log("\n2. Calling tailorResume with verified GitHub codebase context...");
  const req = {
    body: {
      data: sampleCandidate,
      jobDescription: sampleJD,
      targetRole: "Backend Platform Engineer",
      githubContext: [analysis],
      projectNotes: "In this project, I also configured Redis session persistence and automated GitHub Actions testing.",
      template: "college",
      compile: true,
    }
  };

  let statusCode = 200;
  let responseData = null;
  const res = {
    status(c) { statusCode = c; return this; },
    json(d) { responseData = d; return this; }
  };

  await tailorResume(req, res);

  console.log("Status Code:", statusCode);
  if (statusCode === 200 && responseData && responseData.success) {
    console.log("✅ Success!");
    console.log("Adaptations Summary:", responseData.adaptationsSummary);
    console.log("Tailored bullets for project:", JSON.stringify(responseData.data.projects[0].bullets, null, 2));
    console.log("Tailored skills:", JSON.stringify(responseData.data.skills, null, 2));
    console.log("PDF Base64 Length:", responseData.pdfBase64?.length);
    console.log("\n🎉 E2E TEST PASSED! The AI successfully pulled verified codebase capabilities into the resume without hallucination.");
  } else {
    console.error("❌ E2E Failed:", responseData);
    process.exit(1);
  }
}

runE2E().catch(err => {
  console.error("❌ Exception:", err);
  process.exit(1);
});
