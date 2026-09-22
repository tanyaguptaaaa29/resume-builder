require('dotenv').config();
const { parseGithubUrl, fetchRepoBlueprint, analyzeRepoWithGemini } = require('./services/githubService');

async function test() {
  console.log("=== Testing GitHub Service ===");

  // 1. Test URL parsing
  const testUrls = [
    "https://github.com/expressjs/express",
    "https://github.com/expressjs/express.git",
    "github.com/expressjs/express",
    "https://github.com/expressjs/express/tree/master/examples"
  ];

  for (const url of testUrls) {
    const parsed = parseGithubUrl(url);
    console.log(`Parsed '${url}' ->`, parsed);
    if (!parsed || parsed.owner !== "expressjs" || parsed.repo !== "express") {
      throw new Error(`Failed to parse URL: ${url}`);
    }
  }
  console.log("✅ URL parsing tests passed!");

  // 2. Test blueprint fetch
  console.log("\nFetching blueprint for expressjs/express...");
  const blueprint = await fetchRepoBlueprint("https://github.com/expressjs/express");
  console.log("Blueprint fetched successfully!");
  console.log("- Full Name:", blueprint.fullName);
  console.log("- Primary Language:", blueprint.primaryLanguage);
  console.log("- File Tree items (sample):", blueprint.fileTree.slice(0, 5));
  console.log("- Manifest type:", blueprint.manifest?.type);
  console.log("- Dependencies count:", blueprint.manifest?.dependencies?.length);

  // 3. Test Gemini Analysis
  console.log("\nRunning Gemini analysis on blueprint...");
  const analysis = await analyzeRepoWithGemini(blueprint);
  console.log("✅ Analysis complete!");
  console.log("Summary:", analysis.summary);
  console.log("Tech Stack:", analysis.techStack?.slice(0, 8));
  console.log("Features:", analysis.features);

  console.log("\n🎉 ALL GITHUB SERVICE TESTS PASSED!");
}

test().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
