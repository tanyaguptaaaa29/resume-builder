import React from 'react';

export function TosModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Terms of Service</h3>
          <button 
            type="button" 
            className="btn btn-ghost" 
            onClick={onClose}
            style={{ padding: '0.25rem 0.5rem', fontFamily: 'var(--font-mono)' }}
          >
            [close]
          </button>
        </div>
        <div className="modal-body">
          <p>
            <strong>Effective Date:</strong> September 2026. This service is provided as an open academic utility and production typesetting tool for engineering students and candidates.
          </p>
          
          <h4>1. Intellectual Property & Ownership</h4>
          <p>
            You retain 100% intellectual property rights over all personal information, project descriptions, education history, and career data submitted to the system. All generated LaTeX source files and compiled PDF documents belong entirely to you.
          </p>

          <h4>2. LaTeX Compilation Environment</h4>
          <p>
            LaTeX generation is executed inside a sandboxed local environment using standard pdfLaTeX/xelatex engines. The service guarantees that templates adhere to standard single-column ATS specifications without arbitrary structural variations.
          </p>

          <h4>3. Artificial Intelligence Enhancements</h4>
          <p>
            Automated bullet optimization and job description tailoring use the Google Gemini API. Recommendations and refinements are deterministic suggestions. You maintain complete responsibility for verifying factual accuracy before job submission.
          </p>

          <h4>4. Availability & Warranty</h4>
          <p>
            The software is provided &quot;as is&quot;, without warranty of any kind, express or implied. The developers shall not be liable for any claims or damages arising from the use of this service.
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Acknowledge & Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export function PrivacyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>Privacy Policy</h3>
          <button 
            type="button" 
            className="btn btn-ghost" 
            onClick={onClose}
            style={{ padding: '0.25rem 0.5rem', fontFamily: 'var(--font-mono)' }}
          >
            [close]
          </button>
        </div>
        <div className="modal-body">
          <p>
            <strong>Core Principle:</strong> Zero data retention, zero third-party advertising, and zero tracking cookies.
          </p>

          <h4>1. Ephemeral In-Memory Processing</h4>
          <p>
            Uploaded PDF documents and entered resume fields are processed exclusively in-memory during your active session. Files are parsed, converted into structured LaTeX tokens, and compiled into PDF buffers without being written to any persistent candidate database.
          </p>

          <h4>2. Local Browser Storage</h4>
          <p>
            Form state is temporarily preserved in your browser&apos;s sessionStorage to prevent data loss upon page reload. This data remains on your local hardware and can be cleared at any time via the &quot;Clear Form Data&quot; function.
          </p>

          <h4>3. Third-Party API Transmissions</h4>
          <p>
            When utilizing optional Gemini AI tailoring or project bullet point enhancement, the specific text snippet is sent via encrypted TLS to Google&apos;s Gemini API for processing and returned immediately. We do not sell, rent, or distribute your resume content to recruiters, advertisers, or third parties.
          </p>

          <h4>4. Telemetry & Analytics</h4>
          <p>
            We do not load third-party analytics trackers, fingerprinting scripts, or advertising pixels. Server logs only record operational HTTP status codes and compilation errors for diagnostic purposes.
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Acknowledge & Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
