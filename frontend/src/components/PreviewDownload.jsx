import React from 'react';
import { useBuilder } from '../context/BuilderContext';

export default function PreviewDownload() {
  const { state, dispatch } = useBuilder();

  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isCopied, setIsCopied] = React.useState(false);

  const handleDownload = () => {
    console.log("Download button clicked. URL:", state.generatedPdfUrl);
    if (!state.generatedPdfUrl) {
      console.error("No PDF URL available!");
      return;
    }
    
    setIsDownloading(true);
    try {
      const a = document.createElement('a');
      a.href = state.generatedPdfUrl;
      a.download = `resume-${state.template || 'output'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      console.log("Download triggered successfully.");
    } catch (err) {
      console.error("Error triggering download:", err);
    } finally {
      setTimeout(() => setIsDownloading(false), 1000); // Visual feedback
    }
  };

  const handleStartOver = () => {
    if (state.generatedPdfUrl) {
      URL.revokeObjectURL(state.generatedPdfUrl);
    }
    dispatch({ type: 'RESET' });
  };

  const handleCopyLatex = () => {
    if (state.generatedLatex) {
      navigator.clipboard.writeText(state.generatedLatex)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        })
        .catch(err => console.error("Failed to copy LaTeX code: ", err));
    }
  };

  const handleDownloadLatex = () => {
    if (state.generatedLatex) {
      const blob = new Blob([state.generatedLatex], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume-${state.template || 'output'}.tex`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '900px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
        Your Resume is <span className="text-gradient">Ready</span>! 🎉
      </h2>
      <p style={{ textAlign: 'center', marginBottom: '2rem' }}>
        Preview your compiled ATS-perfect resume below and download the PDF.
      </p>

      {state.generatedPdfUrl && (
        <div className="pdf-viewer" style={{ marginBottom: '2rem' }}>
          <iframe src={state.generatedPdfUrl} title="Resume Preview" />
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <button 
          className="btn btn-primary btn-xl" 
          onClick={handleDownload}
          disabled={isDownloading || !state.generatedPdfUrl}
          style={{ cursor: isDownloading ? 'wait' : 'pointer' }}
        >
          {isDownloading ? '⏳ Downloading...' : '⬇️ Download Resume PDF'}
        </button>
        
        <button 
          className="btn btn-secondary btn-xl" 
          onClick={handleDownloadLatex}
          disabled={!state.generatedLatex}
        >
          📝 Download LaTeX Code
        </button>

        <button 
          className="btn btn-secondary btn-xl" 
          onClick={handleCopyLatex}
          disabled={!state.generatedLatex}
        >
          {isCopied ? '✅ Copied!' : '📋 Copy LaTeX Code'}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button className="btn btn-ghost btn-lg" onClick={handleStartOver}>
          🔄 Start Over
        </button>
      </div>
    </div>
  );
}
