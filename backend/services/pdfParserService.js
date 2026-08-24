const pdf = require("pdf-parse");

/**
 * Extract raw text from uploaded PDF resume buffer
 */
async function extractTextFromPdf(pdfBuffer) {
  try {
    const data = await pdf(pdfBuffer);
    let text = data.text;

    // Clean whitespace and encoding issues
    text = text.replace(/\s+/g, " ");
    text = text.replace(/ﬁ/g, "fi").replace(/ﬂ/g, "fl").replace(/ﬀ/g, "ff");
    text = text.replace(/\n{3,}/g, "\n\n");
    text = text.trim();

    return text;
  } catch (error) {
    throw new Error(`Failed to parse PDF file: ${error.message}`);
  }
}

module.exports = {
  extractTextFromPdf,
};
