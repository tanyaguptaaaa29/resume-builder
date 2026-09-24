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
/**
 * Fetches a lightweight technical blueprint of a public GitHub repository:
 * 1. Repo metadata (description, language, default branch)
 * 2. Recursive file tree (filtered for architecture, infra, models, tests)
 * 3. Dependency manifests (searches root & monorepo subprojects e.g. wandrly-backend, wandrly-frontend)
 * 4. Documentation & architecture guides (README, *_flow.md, architecture docs)
 */
async function fetchRepoBlueprint(repoUrl) {
  const parsed = parseGithubUrl(repoUrl);
  if (!parsed) {
    throw new Error("Invalid GitHub repository URL.");
  }

  const { owner, repo } = parsed;
  const headers = {
    "User-Agent": "ResumeBuilder-CodebaseInspector/1.0",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (process.env.GITHUB_TOKEN) {
    headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  console.log(`🔍 Inspecting GitHub repository: ${owner}/${repo}...`);

  // 1. Fetch basic repository metadata
  let repoData = { default_branch: "main", description: "", language: "", topics: [] };
  let isRateLimited = false;
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
    } else if (metaRes.status === 403) {
      isRateLimited = true;
      console.warn("⚠️ GitHub API 403 rate limit reached on metadata fetch. Falling back to raw content CDN...");
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
  let rawPaths = [];
  try {
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers }
    );

    if (treeRes.ok) {
      const treeData = await treeRes.json();
      rawPaths = (treeData.tree || []).map((t) => t.path);

      // Filter out noise (images, build dirs, node_modules, lock files)
      filteredTree = rawPaths
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
      if (treeRes.status === 403) {
        isRateLimited = true;
        console.warn("⚠️ GitHub API 403 rate limit reached on tree fetch. Activating resilient raw CDN scanner...");
      } else {
        console.warn(`GitHub tree fetch returned HTTP ${treeRes.status}`);
      }
    }
  } catch (err) {
    console.warn("Could not fetch repo tree:", err.message);
  }

  // 3. Fetch dependency manifests (supports single repos AND monorepos like wandrly-backend / wandrly-frontend)
  const manifestMap = {};
  const manifestFilePatterns = [
    "package.json",
    "requirements.txt",
    "pyproject.toml",
    "go.mod",
    "pom.xml",
    "Cargo.toml",
  ];

  // Candidates to probe:
  // If we have fileTree, extract any manifest files from the tree.
  // Otherwise (or in addition), probe root and standard monorepo folder patterns.
  const manifestTargets = new Set();
  
  if (rawPaths.length > 0) {
    for (const p of rawPaths) {
      const base = p.split("/").pop();
      if (manifestFilePatterns.includes(base) && !p.includes("node_modules/") && !p.includes("vendor/")) {
        manifestTargets.add(p);
      }
    }
  }

  // Common fallbacks for monorepos if tree was unavailable or sparse
  const lowerRepo = repo.toLowerCase();
  const commonPrefixes = [
    "",
    `${lowerRepo}-backend/`,
    `${lowerRepo}-frontend/`,
    `${lowerRepo}-server/`,
    `${lowerRepo}-client/`,
    "backend/",
    "frontend/",
    "server/",
    "client/",
    "api/",
    "web/",
    "app/",
  ];

  for (const prefix of commonPrefixes) {
    for (const mFile of manifestFilePatterns) {
      manifestTargets.add(`${prefix}${mFile}`);
    }
  }

  // Fetch candidate manifests via raw.githubusercontent.com (Fastly CDN, no 60 req/hr REST rate limits)
  for (const targetPath of manifestTargets) {
    if (Object.keys(manifestMap).length >= 5) break; // Cap at top 5 subprojects
    try {
      const rawRes = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${targetPath}`
      );
      if (rawRes.ok) {
        const text = await rawRes.text();
        const base = targetPath.split("/").pop();
        const scope = targetPath.includes("/") ? targetPath.replace(`/${base}`, "") : "root";

        if (base === "package.json") {
          try {
            const pkg = JSON.parse(text);
            manifestMap[scope] = {
              type: "npm",
              dependencies: Object.keys(pkg.dependencies || {}),
              devDependencies: Object.keys(pkg.devDependencies || {}),
            };
          } catch {
            manifestMap[scope] = { type: "npm-raw", content: text.substring(0, 800) };
          }
        } else {
          manifestMap[scope] = { type: base, content: text.substring(0, 800) };
        }
      }
    } catch {
      // Continue to next manifest
    }
  }

  let manifest = null;
  const manifestKeys = Object.keys(manifestMap);
  if (manifestKeys.length === 1 && manifestMap.root) {
    manifest = manifestMap.root;
  } else if (manifestKeys.length > 0) {
    manifest = manifestMap;
  }

  // 4. Fetch documentation & architecture notes (README, backend_flow.md, architecture docs)
  const docTargets = new Set(["README.md"]);
  if (rawPaths.length > 0) {
    for (const p of rawPaths) {
      const lower = p.toLowerCase();
      if (
        (lower.endsWith(".md") || lower.endsWith(".txt")) &&
        (lower.includes("flow") ||
          lower.includes("arch") ||
          lower.includes("design") ||
          lower.includes("guide") ||
          lower.endsWith("readme.md")) &&
        !lower.includes("node_modules/")
      ) {
        docTargets.add(p);
      }
    }
  }

  // Fallback doc candidates for monorepos if tree was blocked
  docTargets.add("backend_flow.md");
  docTargets.add("frontend_flow.md");
  docTargets.add("ARCHITECTURE.md");
  docTargets.add(`${lowerRepo}-frontend/README.md`);
  docTargets.add(`${lowerRepo}-backend/README.md`);
  docTargets.add("frontend/README.md");
  docTargets.add("backend/README.md");

  let accumulatedDocs = "";
  for (const docFile of docTargets) {
    if (accumulatedDocs.length >= 3500) break;
    try {
      const docRes = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${docFile}`
      );
      if (docRes.ok) {
        let text = await docRes.text();
        // Clean null bytes and UTF-16 artifacts
        text = text.replace(/\x00/g, "").trim();
        // Ignore files that are essentially empty (e.g. just a heading title)
        if (text.length > 40) {
          accumulatedDocs += `\n\n--- [DOC: ${docFile}] ---\n` + text.substring(0, 1500);
        }
      }
    } catch {
      // Doc file is optional
    }
  }

  if (isRateLimited) {
    console.info(
      "💡 Tip: Set GITHUB_TOKEN in your environment to increase GitHub REST API limits from 60 to 5,000 requests/hour."
    );
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
    readmeSnippet: accumulatedDocs.trim(),
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
