// pdfParserService.js

// We use dynamic import for pdfjs-dist since it's distributed as an ES module (.mjs)
let pdfjsLibPromise = null;
function getPdfJs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  return pdfjsLibPromise;
}

// Ensure the worker is configured properly for Node.js
async function configurePdfJs() {
  const pdfjsLib = await getPdfJs();
  const workerUrl = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.mjs",
    "file://" + require.resolve("pdfjs-dist/package.json")
  );
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.href;
  return pdfjsLib;
}


/**
 * Extract raw text from uploaded PDF resume buffer, including hyperlink annotations mapped to text.
 */
async function extractTextFromPdf(pdfBuffer) {
  try {
    const pdfjsLib = await getPdfJs();
    const data = new Uint8Array(pdfBuffer);
    
    // Disable font face evaluation to speed up parsing and avoid canvas requirements in Node
    const loadingTask = pdfjsLib.getDocument({ 
      data, 
      disableFontFace: true,
      standardFontDataUrl: "node_modules/pdfjs-dist/standard_fonts/"
    });
    
    const pdfDocument = await loadingTask.promise;
    
    let fullText = "";
    const allLinks = new Set();

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      
      const textContent = await page.getTextContent();
      const annotations = await page.getAnnotations();
      
      // Collect all valid URLs from this page
      annotations.forEach(a => {
        if (a.subtype === "Link" && a.url) {
          allLinks.add(a.url);
        }
      });
      
      let pageText = "";
      let currentY = null;

      for (const item of textContent.items) {
        if (!item.str || item.str.trim() === "") {
          pageText += item.str; 
          continue;
        }

        const yMin = item.transform[5];

        // Add newline if Y changed significantly (e.g. moving to next line)
        if (currentY !== null && Math.abs(currentY - yMin) > 4) {
          pageText += "\n";
        }
        
        pageText += item.str;
        currentY = yMin;
      }
      
      fullText += pageText + "\n\n";
    }

    // Clean whitespace and encoding issues
    let text = fullText;
    text = text.replace(/ﬁ/g, "fi").replace(/ﬂ/g, "fl").replace(/ﬀ/g, "ff");
    text = text.replace(/\n{3,}/g, "\n\n");
    text = text.trim();

    return { rawText: text, links: Array.from(allLinks) };
  } catch (error) {
    throw new Error(`Failed to parse PDF file with advanced extractor: ${error.message}`);
  }
}

module.exports = {
  extractTextFromPdf,
};
