/**
 * LaTeX.Online API Compiler
 * 
 * Sends raw .tex content to latexonline.cc and receives compiled PDF.
 * No local TeX installation required.
 * 
 * API: GET https://latexonline.cc/compile?text=<url-encoded-tex>&command=pdflatex
 * Returns: PDF binary on HTTP 2xx, error log on HTTP 4xx
 */

const LATEX_ONLINE_URL = "https://latexonline.cc/compile";
const COMPILE_TIMEOUT = 60000; // 60 seconds

export interface CompileResult {
  success: boolean;
  pdf?: Buffer;
  error?: string;
}

export async function compileLatex(texContent: string): Promise<CompileResult> {
  try {
    // URL-encode the LaTeX content
    const encodedContent = encodeURIComponent(texContent);
    const url = `${LATEX_ONLINE_URL}?text=${encodedContent}&command=pdflatex`;

    // If the URL is too long (>8000 chars), the GET may fail.
    // In that case, we might need to chunk or use a different approach.
    // For typical resumes, this should be well within limits.

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), COMPILE_TIMEOUT);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return {
        success: true,
        pdf: Buffer.from(arrayBuffer),
      };
    } else {
      const errorText = await response.text();
      return {
        success: false,
        error: `Compilation failed (HTTP ${response.status}): ${errorText.substring(0, 500)}`,
      };
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        error: "Compilation timed out. The LaTeX document may be too complex.",
      };
    }
    return {
      success: false,
      error: `Compilation error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
