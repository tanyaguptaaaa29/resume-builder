import React, { useState, useEffect } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { tailorResumeApi, analyzeGithubApi } from '../services/api';
import SkeletonLoader from './SkeletonLoader';

export default function PreviewDownload() {
  const { state, dispatch } = useBuilder();

  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorError, setTailorError] = useState(null);

  // GitHub Codebase Inspection & Extra Context State
  const [showProjectContext, setShowProjectContext] = useState(false);
  const [githubAnalyses, setGithubAnalyses] = useState({});
  const [projectNotes, setProjectNotes] = useState('');

  // Active preview based on toggle mode
  const isTailoredActive = state.activeViewMode === 'tailored' && !!state.tailoredPdfUrl;
  const activePdfUrl = isTailoredActive ? state.tailoredPdfUrl : state.generatedPdfUrl;
  const activeLatex = isTailoredActive ? state.tailoredLatex : state.generatedLatex;

  // Pre-fill GitHub links from candidate's projects
  useEffect(() => {
    if (state.resumeData?.projects) {
      setGithubAnalyses((prev) => {
        const updated = { ...prev };
        state.resumeData.projects.forEach((proj, idx) => {
          if (!updated[idx]) {
            const link = proj.link || proj.liveLink || '';
            const isGh = link.includes('github.com');
            updated[idx] = {
              repoUrl: isGh ? link : '',
              isAnalyzing: false,
              analysis: null,
              error: null,
            };
          }
        });
        return updated;
      });
    }
  }, [state.resumeData]);

  const handleDownload = () => {
    if (!activePdfUrl) {
      console.error("No active PDF URL available!");
      return;
    }

    setIsDownloading(true);
    try {
      const a = document.createElement('a');
      a.href = activePdfUrl;
      const modeSuffix = isTailoredActive ? 'tailored' : 'baseline';
      a.download = `resume-${state.template || 'output'}-${modeSuffix}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error triggering download:", err);
    } finally {
      setTimeout(() => setIsDownloading(false), 1000);
    }
  };

  const handleCopyLatex = () => {
    if (activeLatex) {
      navigator.clipboard.writeText(activeLatex)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        })
        .catch((err) => console.error("Failed to copy LaTeX code: ", err));
    }
  };

  const handleDownloadLatex = () => {
    if (activeLatex) {
      const blob = new Blob([activeLatex], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const modeSuffix = isTailoredActive ? 'tailored' : 'baseline';
      a.download = `resume-${state.template || 'output'}-${modeSuffix}.tex`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleInspectRepo = async (idx, urlToUse) => {
    const url = urlToUse || githubAnalyses[idx]?.repoUrl;
    if (!url || !url.trim()) return;

    setGithubAnalyses((prev) => ({
      ...prev,
      [idx]: { ...(prev[idx] || {}), repoUrl: url, isAnalyzing: true, error: null },
    }));

    try {
      const result = await analyzeGithubApi(url.trim());
      if (result.success && result.analysis) {
        setGithubAnalyses((prev) => ({
          ...prev,
          [idx]: {
            ...(prev[idx] || {}),
            repoUrl: url,
            isAnalyzing: false,
            analysis: result.analysis,
            error: null,
          },
        }));
      } else {
        throw new Error(result.error || 'Failed to inspect repository');
      }
    } catch (err) {
      setGithubAnalyses((prev) => ({
        ...prev,
        [idx]: {
          ...(prev[idx] || {}),
          repoUrl: url,
          isAnalyzing: false,
          error: err.response?.data?.error || err.message,
        },
      }));
    }
  };

  const handleTailorSubmit = async (e) => {
    e.preventDefault();
    if (!state.jobDescription || state.jobDescription.trim().length < 20) {
      setTailorError('Please enter a job description of at least 20 characters.');
      return;
    }
    setTailorError(null);
    setIsTailoring(true);

    const githubContext = Object.values(githubAnalyses)
      .filter((item) => item && item.analysis)
      .map((item) => item.analysis);

    try {
      const result = await tailorResumeApi({
        data: state.resumeData,
        jobDescription: state.jobDescription,
        targetRole: state.targetRole,
        githubContext,
        projectNotes,
        template: state.template,
        compile: true,
      });

      if (result.success && result.pdfBase64) {
        const binaryString = window.atob(result.pdfBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const pdfBlob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(pdfBlob);

        dispatch({
          type: 'SET_TAILORED_RESULT',
          payload: {
            data: result.data,
            pdfUrl: url,
            latex: result.latex,
            adaptationsSummary: result.adaptationsSummary,
            judgeAudit: result.judgeAudit,
          },
        });
      } else {
        throw new Error(result.error || 'Failed to tailor resume to job description.');
      }
    } catch (err) {
      console.error('Tailor error:', err);
      setTailorError(
        err.response?.data?.error || err.message || 'Failed to tailor resume.'
      );
    } finally {
      setIsTailoring(false);
    }
  };

  const handleStartOver = () => {
    if (state.generatedPdfUrl) URL.revokeObjectURL(state.generatedPdfUrl);
    if (state.tailoredPdfUrl) URL.revokeObjectURL(state.tailoredPdfUrl);
    dispatch({ type: 'RESET' });
  };

  const inspectedCount = Object.values(githubAnalyses).filter((a) => a && a.analysis).length;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '980px' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <span className="mono-tag">STEP 04: OUTPUT VERIFICATION</span>
        <h2 style={{ marginTop: '0.4rem', marginBottom: '0.4rem' }}>
          Resume Compilation Artifacts
        </h2>
        <p>
          Inspect the compiled vector PDF and optionally align technical points with specific job descriptions.
        </p>
      </div>

      {/* Mode Switcher Pill (if tailored version exists) */}
      {state.tailoredPdfUrl && (
        <div className="mode-toggle-container" style={{ marginBottom: '1.5rem' }}>
          <div className="mode-toggle">
            <button
              type="button"
              className={`mode-toggle-btn ${state.activeViewMode === 'original' ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'original' })}
            >
              [ Standard Compilation ]
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${state.activeViewMode === 'tailored' ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'tailored' })}
            >
              [ Calibrated for Target JD ] <span className="badge-pulse">ATS Match</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Adaptation Summary Banner */}
      {isTailoredActive && state.adaptationsSummary && (
        <div 
          className="solid-panel"
          style={{
            width: '100%',
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            borderLeft: '2px solid var(--color-accent)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="mono-tag" style={{ color: 'var(--color-accent)' }}>
              [ ADAPTATIONS SUMMARY ]
            </span>
            {state.judgeAudit && (
              <span
                className="mono-tag"
                style={{
                  color: state.judgeAudit.passed ? '#10b981' : '#f59e0b',
                  borderColor: state.judgeAudit.passed ? '#10b981' : '#f59e0b',
                  fontSize: '0.72rem',
                }}
              >
                [ AI JUDGE: {state.judgeAudit.passed ? `VERIFIED (${state.judgeAudit.score}/100)` : 'REVIEWED'} ]
              </span>
            )}
          </div>
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.88rem', color: 'var(--color-text-primary)' }}>
            {state.adaptationsSummary}
          </p>
          {state.judgeAudit?.auditSummary && (
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.4rem' }}>
              <strong style={{ color: 'var(--color-text-secondary)' }}>Audit Verdict:</strong> {state.judgeAudit.auditSummary}
            </p>
          )}
        </div>
      )}

      {/* Tailoring In-Progress Skeleton Loader State */}
      {isTailoring && (
        <div style={{ width: '100%', marginBottom: '2rem' }}>
          <SkeletonLoader message="Calibrating bullet points and compiling tailored LaTeX output..." />
        </div>
      )}

      {/* PDF Preview Iframe */}
      {!isTailoring && activePdfUrl && (
        <div className="pdf-viewer" style={{ marginBottom: '2rem', width: '100%' }}>
          <iframe src={activePdfUrl} title="Resume Preview" />
        </div>
      )}

      {/* Primary Download & Copy Actions */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2.5rem' }}>
        <button 
          className="btn btn-primary btn-xl" 
          onClick={handleDownload}
          disabled={isDownloading || !activePdfUrl}
        >
          {isDownloading ? '[ Executing Download... ]' : `[ Download ${isTailoredActive ? 'Tailored' : 'Standard'} PDF ]`}
        </button>
        
        <button 
          className="btn btn-secondary btn-xl" 
          onClick={handleDownloadLatex}
          disabled={!activeLatex}
        >
          [ Download LaTeX Source (.tex) ]
        </button>

        <button 
          className="btn btn-secondary btn-xl" 
          onClick={handleCopyLatex}
          disabled={!activeLatex}
        >
          {isCopied ? '[ LaTeX Copied to Clipboard ]' : '[ Copy LaTeX Source ]'}
        </button>
      </div>

      {/* Target Job Description Studio */}
      <div 
        className="solid-panel jd-studio-card"
        style={{
          width: '100%',
          padding: '2rem',
          marginBottom: '2.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <span className="mono-tag">[ POST-PROCESSING PIPELINE ]</span>
            <h3 style={{ margin: '0.3rem 0 0.35rem 0', fontSize: '1.3rem' }}>
              Job Description Calibration Studio
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--color-text-secondary)', maxWidth: '680px' }}>
              Paste target job requirements below. Optionally inspect public GitHub repositories to extract architectural traits matching the role.
            </p>
          </div>

          {state.tailoredPdfUrl && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
              onClick={() => dispatch({ type: 'RESET_TAILORED' })}
            >
              [ Clear Tailored Output ]
            </button>
          )}
        </div>

        <form onSubmit={handleTailorSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
              Target Job Title / Organization (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Distributed Systems Engineer at Stripe"
              value={state.targetRole || ''}
              onChange={(e) => dispatch({ type: 'SET_TARGET_ROLE', payload: e.target.value })}
              className="input"
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                Target Job Description / Requirements
              </label>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                {(state.jobDescription || '').length} characters
              </span>
            </div>
            <textarea
              rows={5}
              placeholder="Paste the target job qualifications, tech stack requirements, and responsibilities here..."
              value={state.jobDescription || ''}
              onChange={(e) => dispatch({ type: 'SET_JOB_DESCRIPTION', payload: e.target.value })}
              className="input"
              style={{ resize: 'vertical', lineHeight: '1.5' }}
            />
          </div>

          {/* GitHub Codebase Context Accordion (Optional) */}
          <div 
            style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              onClick={() => setShowProjectContext(!showProjectContext)}
            >
              <div>
                <strong style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                  Deepen Project Context from GitHub Repositories
                </strong>
                <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  (Optional: No access token required for public repos)
                </span>
                {inspectedCount > 0 && (
                  <span 
                    style={{
                      marginLeft: '0.5rem',
                      fontSize: '0.72rem',
                      padding: '0.15rem 0.45rem',
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--color-success-bg)',
                      color: 'var(--color-success)',
                    }}
                  >
                    [{inspectedCount} Codebase{inspectedCount > 1 ? 's' : ''} Inspected]
                  </span>
                )}
              </div>

              <button type="button" className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem', fontFamily: 'var(--font-mono)' }}>
                {showProjectContext ? '[ Hide Inspector ]' : '[ Open Repo Inspector ]'}
              </button>
            </div>

            {showProjectContext && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                  The engine reads package manifests and project structure to surface genuine technical dependencies matching the job description.
                </p>

                {state.resumeData?.projects?.map((proj, idx) => {
                  const item = githubAnalyses[idx] || { repoUrl: '', isAnalyzing: false, analysis: null, error: null };
                  return (
                    <div 
                      key={idx}
                      style={{
                        padding: '0.75rem',
                        marginBottom: '0.75rem',
                        background: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                          Project: {proj.name}
                        </span>
                        {item.analysis && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
                            [ Codebase Verified ]
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="https://github.com/username/repository"
                          value={item.repoUrl}
                          onChange={(e) => {
                            const val = e.target.value;
                            setGithubAnalyses((prev) => ({
                              ...prev,
                              [idx]: { ...(prev[idx] || {}), repoUrl: val },
                            }));
                          }}
                          className="input"
                          style={{ flex: 1, minWidth: '220px', padding: '0.45rem 0.65rem', fontSize: '0.82rem' }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleInspectRepo(idx, item.repoUrl)}
                          disabled={item.isAnalyzing || !item.repoUrl || !item.repoUrl.trim()}
                          style={{ fontSize: '0.78rem', padding: '0.45rem 0.75rem', fontFamily: 'var(--font-mono)' }}
                        >
                          {item.isAnalyzing ? '[ Scanning Tree... ]' : item.analysis ? '[ Re-Inspect ]' : '[ Inspect Repository ]'}
                        </button>
                      </div>

                      {item.error && (
                        <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: 'var(--color-error)', fontFamily: 'var(--font-mono)' }}>
                          [ ERROR ] {item.error}
                        </p>
                      )}

                      {/* Display Detected Capabilities */}
                      {item.analysis && (
                        <div style={{ marginTop: '0.6rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
                          <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                            <strong>Architecture Detected:</strong> {item.analysis.summary}
                          </p>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {item.analysis.techStack?.slice(0, 10).map((tech, tIdx) => (
                              <span 
                                key={tIdx}
                                className="badge-outline"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Additional Freeform Notes Box for Non-GitHub work */}
                <div style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                    Supplemental Project Details (Optional: for private repositories or unlinked implementations)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Configured distributed caching via Redis, rate limiting algorithms, and Kubernetes deployments..."
                    value={projectNotes}
                    onChange={(e) => setProjectNotes(e.target.value)}
                    className="input"
                    style={{ fontSize: '0.82rem' }}
                  />
                </div>
              </div>
            )}
          </div>

          {tailorError && (
            <div 
              style={{
                marginBottom: '1rem',
                padding: '0.75rem 1rem',
                background: 'var(--color-error-bg)',
                border: '1px solid var(--color-error)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-error)',
                fontSize: '0.85rem',
              }}
            >
              [ ERROR ] {tailorError}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={isTailoring || !(state.jobDescription && state.jobDescription.trim().length >= 20)}
              style={{ minWidth: '240px' }}
            >
              {isTailoring ? (
                '[ Compiling Tailored Version... ]'
              ) : state.tailoredPdfUrl ? (
                '[ Re-calibrate with Updated JD ]'
              ) : (
                '[ Align & Recompile for JD ]'
              )}
            </button>

            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              FIDELITY GUARANTEE: Phrasing is adjusted to match JD keywords without generating unearned experience.
            </span>
          </div>
        </form>
      </div>

      {/* Start Over Button */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button className="btn btn-ghost" onClick={handleStartOver} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
          [ Reset Session & Return Home ]
        </button>
      </div>
    </div>
  );
}
