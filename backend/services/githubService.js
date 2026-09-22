/**
 * GitHub Codebase Analyzer Service
 * Fetches public GitHub repository trees and manifests to discover genuine capabilities without requiring authentication.
 */

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY || "",
});

/**
 * Resilient wrapper around Gemini generateContent
 */
async function generateContentWithRetry(params, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await ai.models.generateContent(params);
    } catch (err) {
      attempt++;
      const isTransient =
        err.status === 503 ||
        err.status === 429 ||
        (err.message && (err.message.includes("503") || err.message.includes("429") || err.message.includes("high demand")));
      if (isTransient && attempt < maxRetries) {
        const delayMs = attempt * 1500;
        console.warn(`⚠️ Gemini API transient error (${err.status || 503}). Retrying in ${delayMs / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw err;
      }
    }
  }
}

/**
 * Parses any GitHub URL into { owner, repo }
 */
function parseGithubUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;

  const cleaned = rawUrl.trim().replace(/\.git$/, "");
  const match = cleaned.match(/github\.com[/:]([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i);

  if (match) {
    return {
      owner: match[1],
      repo: match[2].replace(/\/.*$/, ""), // strip trailing paths like /tree/main
    };
  }
  return null;
}

/**
 * Fetches a lightweight technical blueprint of a public GitHub repository:
 * 1. Repo metadata (description, language, default branch)
 * 2. Recursive file tree (filtered for architecture, infra, models, tests)
 * 3. Dependency manifests (package.json, requirements.txt, etc.)
 * 4. Truncated README if available
 */
async function fetchRepoBlueprint(repoUrl) {
  const parsed = parseGithubUrl(repoUrl);
  if (!parsed) {
    throw new Error("Invalid GitHub repository URL.");
  }

  const { owner, repo } = parsed;
  const headers = {
    "User-Agent": "ResumeBuilder-CodebaseInspector/1.0",
    Accept: "application/vnd.github.v3+json",
  };

  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  console.log(`🔍 Inspecting GitHub repository: ${owner}/${repo}...`);

  // 1. Fetch basic repository metadata
  let repoData = { default_branch: "main", description: "", language: "" };
  try {
    const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (metaRes.ok) {
      const data = await metaRes.json();
      repoData = {
        default_branch: data.default_branch || "main",
        description: data.description || "",
        language: data.language || "",
        topics: data.topics || [],
      };
    } else if (metaRes.status === 404) {
      throw new Error(`Repository '${owner}/${repo}' not found or is private.`);
    } else {
      console.warn(`GitHub meta fetch returned HTTP ${metaRes.status}`);
    }
  } catch (err) {
    if (err.message.includes("not found")) throw err;
    console.warn("Could not fetch repo metadata:", err.message);
  }

  const branch = repoData.default_branch || "main";

  // 2. Fetch recursive file tree
  let filteredTree = [];
  try {
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers }
    );

    if (treeRes.ok) {
      const treeData = await treeRes.json();
      const allPaths = (treeData.tree || []).map((t) => t.path);

      // Filter out noise (images, build dirs, node_modules, lock files)
      filteredTree = allPaths
        .filter((filePath) => {
          const lower = filePath.toLowerCase();
          if (
            lower.includes("node_modules/") ||
            lower.includes(".git/") ||
            lower.includes("dist/") ||
            lower.includes("build/") ||
            lower.includes(".vscode/") ||
            lower.includes("vendor/") ||
            lower.endsWith(".png") ||
            lower.endsWith(".jpg") ||
            lower.endsWith(".jpeg") ||
            lower.endsWith(".svg") ||
            lower.endsWith(".lock") ||
            lower.endsWith("-lock.json")
          ) {
            return false;
          }
          return true;
        })
        .slice(0, 150); // Keep top 150 relevant paths
    } else {
      console.warn(`GitHub tree fetch returned HTTP ${treeRes.status}`);
    }
  } catch (err) {
    console.warn("Could not fetch repo tree:", err.message);
  }

  // 3. Fetch dependency manifest (Node package.json, Python requirements, etc.)
  let manifest = null;
  const manifestCandidates = [
    "package.json",
    "requirements.txt",
    "pyproject.toml",
    "go.mod",
    "pom.xml",
    "Cargo.toml",
  ];

  for (const mFile of manifestCandidates) {
    try {
      const rawRes = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${mFile}`
      );
      if (rawRes.ok) {
        const text = await rawRes.text();
        if (mFile === "package.json") {
          try {
            const pkg = JSON.parse(text);
            manifest = {
              type: "npm",
              dependencies: Object.keys(pkg.dependencies || {}),
              devDependencies: Object.keys(pkg.devDependencies || {}),
            };
          } catch {
            manifest = { type: "npm-raw", content: text.substring(0, 1000) };
          }
        } else {
          manifest = { type: mFile, content: text.substring(0, 1000) };
        }
        break; // Stop at first found manifest
      }
    } catch {
      // Continue to next candidate
    }
  }

  // 4. Fetch README (optional)
  let readmeSnippet = "";
  try {
    const readmeRes = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`
    );
    if (readmeRes.ok) {
      const text = await readmeRes.text();
      readmeSnippet = text.substring(0, 2000);
    }
  } catch {
    // README is optional
  }

  return {
    owner,
    repo,
    fullName: `${owner}/${repo}`,
    description: repoData.description,
    primaryLanguage: repoData.language,
    topics: repoData.topics || [],
    manifest,
    fileTree: filteredTree,
    readmeSnippet,
  };
}

/**
 * Uses Gemini to synthesize real capabilities and architecture from the repository blueprint
 */
async function analyzeRepoWithGemini(blueprint) {
  const prompt = `You are an elite code architect analyzing a public GitHub repository blueprint.
Even if the student wrote a minimal or empty README, analyze the actual file structure, dependencies, and infrastructure files to discover the REAL technical features they built.

REPOSITORY:
Name: ${blueprint.fullName}
Primary Language: ${blueprint.primaryLanguage || "Unknown"}
Description: ${blueprint.description || "None"}
Topics: ${(blueprint.topics || []).join(", ") || "None"}

DEPENDENCY MANIFEST:
${JSON.stringify(blueprint.manifest, null, 2)}

FILE STRUCTURE (TOP ARCHITECTURAL PATHS):
${blueprint.fileTree.slice(0, 100).join("\n")}

README (if available):
${blueprint.readmeSnippet || "No README provided"}

YOUR GOAL:
Extract verified technical capabilities, architectural patterns, tools, and databases actually present in this codebase.
Look for:
- Database & ORMs (e.g. Prisma, Mongoose, PostgreSQL, SQLite, MongoDB)
- Caching & Queues (e.g. Redis, Bull, Celery, RabbitMQ)
- Real-time or Networking (e.g. WebSockets, Socket.io, gRPC, REST APIs)
- Containerization & CI/CD (e.g. Docker, Docker Compose, GitHub Actions)
- Testing (e.g. Jest, Pytest, Cypress, Playwright)
- State management & UI (e.g. Redux Toolkit, Tailwind, Material-UI)

RULES:
1. ONLY list tools and capabilities supported by the file tree and dependencies. Do NOT hallucinate unearned claims.
2. Formulate 3-5 concise, high-impact feature bullet points summarizing what was built.

OUTPUT FORMAT:
Return ONLY valid JSON in this schema:
{
  "repoName": "${blueprint.fullName}",
  "techStack": ["string", "string"],
  "features": [
    "string (e.g. Implemented real-time bidirectional messaging via Socket.io with rooms)",
    "string (e.g. Containerized microservices using Docker Compose with PostgreSQL)"
  ],
  "summary": "1-2 sentence technical summary of the project architecture"
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

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to parse Gemini repo analysis:", err.message, text);
    return {
      repoName: blueprint.fullName,
      techStack: blueprint.manifest?.dependencies || [blueprint.primaryLanguage].filter(Boolean),
      features: [`Built with ${blueprint.primaryLanguage || "code"} and custom architecture.`],
      summary: blueprint.description || `Repository ${blueprint.fullName}`,
    };
  }
}

module.exports = {
  parseGithubUrl,
  fetchRepoBlueprint,
  analyzeRepoWithGemini,
};
