/**
 * LaTeX.Online REST Compiler Service
 * Sends raw .tex content to latexonline.cc and returns compiled PDF buffer
 */

const TEXLIVE_URL = "https://texlive.net/cgi-bin/latexcgi";
const COMPILE_TIMEOUT = 60000; // 60s timeout

async function compileLatex(texContent, extraFiles = []) {
  try {
    const formData = new FormData();
    const texBlob = new Blob([texContent], { type: "text/plain" });
    formData.append("filecontents[]", texBlob, "document.tex");
    formData.append("filename[]", "document.tex");
    formData.append("engine", "pdflatex");
    formData.append("return", "pdf");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), COMPILE_TIMEOUT);

    const response = await fetch(TEXLIVE_URL, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const contentType = response.headers.get("content-type") || "";
      
      if (contentType.includes("application/pdf")) {
        const arrayBuffer = await response.arrayBuffer();
        return {
          success: true,
          pdf: Buffer.from(arrayBuffer),
        };
      } else {
        // texlive.net returns 200 OK with text/plain or text/html if compilation fails
        const errorText = await response.text();
        const fs = require('fs');
        fs.writeFileSync('last_failed.tex', texContent);
        fs.writeFileSync('last_failed.log', errorText);
        return {
          success: false,
          error: `LaTeX Compilation failed with log:\n${errorText.substring(0, 1000)}`,
        };
      }
    } else {
      const errorText = await response.text();
      return {
        success: false,
        error: `API Request failed (HTTP ${response.status}): ${errorText.substring(0, 500)}`,
      };
    }
  } catch (error) {
    if (error.name === "AbortError") {
      return {
        success: false,
        error: "LaTeX Compilation timed out after 60 seconds.",
      };
    }
    return {
      success: false,
      error: `LaTeX Compiler Error: ${error.message}`,
    };
  }
}

module.exports = {
  compileLatex,
};
