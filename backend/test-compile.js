const fs = require('fs');

async function testLatexOnline() {
  const texContent = fs.readFileSync('test.tex', 'utf-8');
  console.log("Testing POST /data?command=pdflatex with FormData...");

  try {
    const formData = new FormData();
    const blob = new Blob([texContent], { type: 'text/plain' });
    formData.append('file', blob, 'test.tex');

    const response = await fetch('https://latexonline.cc/data?command=pdflatex', {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(10000)
    });

    console.log("Status:", response.status);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      console.log("PDF length:", arrayBuffer.byteLength);
    } else {
      console.log("Error:", await response.text());
    }
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}

testLatexOnline();
