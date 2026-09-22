require('dotenv').config();
const { tailorResume } = require('./controllers/resumeController');

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

async function testFullRoute() {
  console.log("=== Testing tailorResume Controller with Compilation ===");
  const req = {
    body: {
      data: sampleResumeData,
      jobDescription: sampleJobDescription,
      targetRole: "Full Stack Software Engineer",
      template: "college",
      compile: true,
    }
  };

  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };

  await tailorResume(req, res);

  console.log("Status Code:", statusCode);
  if (statusCode === 200 && responseData && responseData.success) {
    console.log("✅ Tailor controller succeeded!");
    console.log("Summary:", responseData.adaptationsSummary);
    console.log("PDF Base64 length:", responseData.pdfBase64?.length);
    console.log("LaTeX length:", responseData.latex?.length);
    if (responseData.pdfBase64 && responseData.pdfBase64.length > 1000) {
      console.log("🎉 PDF was successfully generated and compiled!");
    } else {
      throw new Error("Missing PDF Base64 in response!");
    }
  } else {
    console.error("❌ Controller error:", responseData);
    process.exit(1);
  }
}

testFullRoute();
