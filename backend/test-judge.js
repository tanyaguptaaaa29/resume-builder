require('dotenv').config();
const { auditTailoredResume, tailorWithJudgeLoop } = require('./services/judgeService');
const { tailorResumeToJD } = require('./services/geminiService');

const sampleOriginalResume = {
  personalInfo: {
    fullName: "Rohan Sharma",
    email: "rohan.sharma@nsut.ac.in",
    phone: "+91 9876543210",
  },
  education: [
    {
      institution: "Netaji Subhas University of Technology",
      degree: "B.Tech (ECE)",
      cgpa: "8.65",
      startDate: "2022",
      endDate: "2026",
    },
  ],
  experience: [
    {
      company: "TechCorp Labs",
      role: "Software Engineering Intern",
      bullets: [
        "Built backend microservices using Node.js and Express.",
        "Optimized MongoDB queries and reduced query latency by 25%.",
      ],
    },
  ],
  projects: [
    {
      name: "DevCollab Platform",
      techStack: ["React", "Node.js", "Socket.io", "MongoDB"],
      bullets: [
        "Developed real-time markdown editor with live peer collaboration.",
        "Implemented WebSocket synchronization supporting 50+ concurrent users per room.",
      ],
    },
  ],
  skills: [
    {
      category: "Programming Languages",
      items: "Python, C++, JavaScript, TypeScript, SQL",
    },
    {
      category: "Frameworks & Tools",
      items: "Docker, React, Express, Node.js, MongoDB, Git",
    },
  ],
};

const sampleJobDescription = `
We are looking for a Full Stack Software Engineer at Zomato.
Requirements:
- Strong proficiency with TypeScript, React, and Node.js.
- Experience architecting high-throughput REST APIs and real-time event-driven systems.
- Hands-on database optimization and caching strategies (MongoDB/Redis).
`;

async function runJudgeTests() {
  console.log("=================================================");
  console.log("TEST 1: Testing LLM-as-a-Judge on a Hallucinated Resume");
  console.log("=================================================");

  // Deliberately hallucinate:
  // 1. Metric inflated: 25% -> 85%
  // 2. Unearned skills: Kubernetes, AWS Lambda (neither in resume nor GitHub)
  // 3. Fake project claims: Built distributed Kafka cluster
  const hallucinatedResume = JSON.parse(JSON.stringify(sampleOriginalResume));
  hallucinatedResume.experience[0].bullets[1] = "Optimized MongoDB queries and reduced query latency by 85%.";
  hallucinatedResume.skills[1].items += ", Kubernetes, AWS Lambda";
  hallucinatedResume.projects[0].bullets.push("Engineered high-scale distributed Kafka message broker across 12 clusters.");

  const hallucinationAudit = await auditTailoredResume(
    sampleOriginalResume,
    hallucinatedResume,
    sampleJobDescription
  );

  console.log("Audit Result on Hallucinated Resume:", hallucinationAudit);

  if (hallucinationAudit.passed) {
    console.error("❌ FAILED: Judge should have caught hallucinations!");
    process.exit(1);
  } else {
    console.log("✅ SUCCESS: Judge accurately caught violations:");
    hallucinationAudit.violations.forEach((v) => console.log("   🚩", v));
  }

  console.log("\n=================================================");
  console.log("TEST 2: Testing Full tailorWithJudgeLoop (Live)");
  console.log("=================================================");

  const loopResult = await tailorWithJudgeLoop(
    tailorResumeToJD,
    sampleOriginalResume,
    sampleJobDescription,
    "Full Stack Engineer",
    [],
    ""
  );

  console.log("\n✅ Loop Execution Finished!");
  console.log("Judge Score:", loopResult.judgeAudit.score, "/ 100");
  console.log("Judge Passed:", loopResult.judgeAudit.passed);
  console.log("Judge Summary:", loopResult.judgeAudit.auditSummary);
  console.log("Adaptations Summary:", loopResult.adaptationsSummary);

  if (loopResult.judgeAudit.passed) {
    console.log("\n🎉 ALL TESTS PASSED! LLM-AS-A-JUDGE IS WORKING LIVE.");
  } else {
    console.warn("⚠️ Tailored resume had violations on first pass but was caught by judge.");
  }
}

runJudgeTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
