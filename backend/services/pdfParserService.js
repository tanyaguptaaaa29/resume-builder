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
 * Escapes special LaTeX characters in a URL so the compiler won't crash.
 */
function escapeLatexUrl(url) {
  if (!url) return "";
  return url
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/\#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/&/g, "\\&")
    .replace(/\$/g, "\\$")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\^/g, "\\^")
    .replace(/~/g, "\\~");
}

/**
 * Checks if a text bounding box intersects with a link annotation bounding box.
 * pdf.js rects are typically [xMin, yMin, xMax, yMax].
 */
function checkIntersection(textRect, linkRect) {
  const [tXmin, tYmin, tXmax, tYmax] = textRect;
  const [lXmin, lYmin, lXmax, lYmax] = linkRect;

  // Simple AABB intersection check
  return !(
    tXmax < lXmin ||
    tXmin > lXmax ||
    tYmax < lYmin ||
    tYmin > lYmax
  );
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

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      
      const textContent = await page.getTextContent();
      const annotations = await page.getAnnotations();
      
      // Filter out only link annotations with URLs
      const linkAnnotations = annotations.filter(
        (a) => a.subtype === "Link" && a.url && a.rect
      );
      
      let pageText = "";
      let currentY = null;

      for (const item of textContent.items) {
        if (!item.str || item.str.trim() === "") {
          pageText += item.str; 
          continue;
        }

        // item.transform is [scaleX, skewY, skewX, scaleY, translateX, translateY]
        const xMin = item.transform[4];
        const yMin = item.transform[5];
        const xMax = xMin + item.width;
        const yMax = yMin + item.height;
        const textRect = [xMin, yMin, xMax, yMax];

        let matchedUrl = null;
        for (const link of linkAnnotations) {
          // pdfjs-dist link.rect might need some padding/adjustment, but standard AABB usually works
          if (checkIntersection(textRect, link.rect)) {
            matchedUrl = link.url;
            break; // take first match
          }
        }

        let textToWrite = item.str;
        if (matchedUrl) {
          const safeUrl = escapeLatexUrl(matchedUrl);
          // Only wrap if the text isn't empty space
          if (textToWrite.trim().length > 0) {
              textToWrite = `\\href{${safeUrl}}{${textToWrite}}`;
          }
        }

        // Add newline if Y changed significantly (e.g. moving to next line)
        if (currentY !== null && Math.abs(currentY - yMin) > 4) {
          pageText += "\n";
        }
        
        pageText += textToWrite;
        currentY = yMin;
      }
      
      fullText += pageText + "\n\n";
    }

    // Clean whitespace and encoding issues
    let text = fullText;
    text = text.replace(/ﬁ/g, "fi").replace(/ﬂ/g, "fl").replace(/ﬀ/g, "ff");
    text = text.replace(/\n{3,}/g, "\n\n");
    text = text.trim();

    return text;
  } catch (error) {
    throw new Error(`Failed to parse PDF file with advanced extractor: ${error.message}`);
  }
}

module.exports = {
  extractTextFromPdf,
};
