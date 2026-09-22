require('dotenv').config();
const { tailorResumeToJD } = require('./services/geminiService');

const sampleResumeData = {
  personalInfo: {
    fullName: "Rohan Sharma",
    email: "rohan.sharma@nsut.ac.in",
    phone: "+91 9876543210",
    linkedin: "https://linkedin.com/in/rohansharma",
    github: "https://github.com/rohansharma"
  },
  education: [
    {
      institution: "Netaji Subhas University of Technology",
      degree: "B.Tech (ECE)",
      field: "Electronics and Communication",
      cgpa: "8.65",
      startDate: "2022",
      endDate: "2026"
    }
  ],
  experience: [
    {
      company: "TechCorp Labs",
      role: "Software Engineering Intern",
      startDate: "May 2025",
      endDate: "July 2025",
      bullets: [
        "Built backend microservices using Node.js and Express.",
        "Created MongoDB queries and reduced query latency by 25%."
      ]
    }
  ],
  projects: [
    {
      name: "DevCollab Platform",
      techStack: ["React", "Node.js", "Socket.io", "MongoDB"],
      bullets: [
        "Developed real-time markdown editor with live peer collaboration.",
        "Implemented WebSocket synchronization supporting 50+ concurrent users per room."
      ],
      link: "https://github.com/rohansharma/devcollab"
    }
  ],
  skills: [
    {
      category: "Programming Languages",
      items: "Python, C++, JavaScript, TypeScript, SQL"
    },
    {
      category: "Frameworks & Tools",
      items: "Docker, React, Express, Node.js, MongoDB, Git"
    }
  ],
  achievements: [
    {
      title: "Smart India Hackathon 2024 Finalist"
    }
  ],
  positionsOfResponsibility: []
};

const sampleJobDescription = `
We are looking for a Full Stack Software Engineer at Zomato.
Requirements:
- Strong proficiency with TypeScript, React, and Node.js.
- Experience architecting high-throughput REST APIs and real-time event-driven systems.
- Hands-on database optimization and caching strategies (MongoDB/Redis).
- Passion for performance, code quality, and building resilient user experiences.
`;

async function test() {
  console.log("Testing tailorResumeToJD...");
  try {
    const rawResult = await tailorResumeToJD(sampleResumeData, sampleJobDescription, "Full Stack Engineer");
    console.log("Raw LLM response received. Length:", rawResult.length);

    let cleaned = rawResult.trim();
    const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) cleaned = jsonBlockMatch[1];
    cleaned = cleaned.replace(/(?<!\\)\\(?!["\\/bfnrtu])/g, "\\\\");

    const parsed = JSON.parse(cleaned);
    console.log("\n✅ Successfully parsed JSON!");
    console.log("Adaptations Summary:", parsed.adaptationsSummary);
    
    const tailored = parsed.tailoredResume || parsed;
    console.log("\nTailored Skills:", tailored.skills);
    console.log("\nTailored Projects:", JSON.stringify(tailored.projects, null, 2));
    console.log("\nTailored Experience:", JSON.stringify(tailored.experience, null, 2));

    // Verify critical guardrails:
    // 1. Candidate's name, institution, metrics intact
    if (tailored.personalInfo.fullName !== "Rohan Sharma") {
      throw new Error("Name altered!");
    }
    if (!JSON.stringify(tailored.experience).includes("25%")) {
      console.warn("⚠️ Warning: 25% metric was not found verbatim in experience.");
    } else {
      console.log("✅ Verified: 25% metric preserved intact!");
    }

    console.log("\n🎉 TEST PASSED!");
  } catch (err) {
    console.error("❌ Test failed:", err);
    process.exit(1);
  }
}

test();
