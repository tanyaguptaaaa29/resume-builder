import React from 'react';
import { useBuilder } from '../context/BuilderContext';

export default function PreviewDownload() {
  const { state, dispatch } = useBuilder();

  const [isDownloading, setIsDownloading] = React.useState(false);

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

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button 
          className="btn btn-primary btn-xl" 
          onClick={handleDownload}
          disabled={isDownloading || !state.generatedPdfUrl}
          style={{ cursor: isDownloading ? 'wait' : 'pointer' }}
        >
          {isDownloading ? '⏳ Downloading...' : '⬇️ Download Resume PDF'}
        </button>
        <button className="btn btn-secondary btn-lg" onClick={handleStartOver}>
          🔄 Start Over
        </button>
      </div>
    </div>
  );
}
