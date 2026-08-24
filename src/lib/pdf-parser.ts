/**
 * PDF text extraction using pdf-parse
 * Extracts raw text from uploaded PDF resumes
 */

export async function extractTextFromPdf(
  pdfBuffer: Buffer
): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdf = require("pdf-parse");
    const data = await pdf(pdfBuffer);

    // Clean the extracted text
    let text = data.text;

    // Normalize whitespace
    text = text.replace(/\s+/g, " ");

    // Fix common encoding issues
    text = text.replace(/ﬁ/g, "fi");
    text = text.replace(/ﬂ/g, "fl");
    text = text.replace(/ﬀ/g, "ff");

    // Remove excessive newlines but preserve paragraph breaks
    text = text.replace(/\n{3,}/g, "\n\n");

    // Trim
    text = text.trim();

    return text;
  } catch (error) {
    throw new Error(
      `Failed to parse PDF: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
