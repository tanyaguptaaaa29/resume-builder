import React, { useState, useEffect } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { tailorResumeApi, analyzeGithubApi } from '../services/api';

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
      const res = await analyzeGithubApi(url.trim());
      if (res.success && res.analysis) {
        setGithubAnalyses((prev) => ({
          ...prev,
          [idx]: {
            ...(prev[idx] || {}),
            repoUrl: url,
            isAnalyzing: false,
            analysis: res.analysis,
            error: null,
          },
        }));
      } else {
        throw new Error(res.error || "Failed to inspect repository");
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
      setTailorError("Please enter a job description of at least 20 characters.");
      return;
    }

    setTailorError(null);
    setIsTailoring(true);

    // Collect verified GitHub codebase analyses
    const githubContext = Object.values(githubAnalyses)
      .filter((item) => item && item.analysis)
      .map((item) => item.analysis);

    try {
      const response = await tailorResumeApi({
        data: state.resumeData,
        jobDescription: state.jobDescription,
        targetRole: state.targetRole,
        githubContext,
        projectNotes,
        template: state.template,
        compile: true,
      });

      if (response.success && response.pdfBase64) {
        // Convert Base64 to Blob URL
        const binaryString = window.atob(response.pdfBase64);
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
            data: response.data,
            pdfUrl: url,
            latex: response.latex,
            adaptationsSummary: response.adaptationsSummary,
          },
        });
      } else {
        throw new Error(response.error || "Failed to tailor resume to job description.");
      }
    } catch (err) {
      console.error("Tailor error:", err);
      setTailorError(err.response?.data?.error || err.message || "Failed to tailor resume.");
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
      <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
        Your Resume is <span className="text-gradient">Ready</span>! 🎉
      </h2>
      <p style={{ textAlign: 'center', marginBottom: '1.75rem', color: 'var(--color-text-secondary)' }}>
        Preview your compiled ATS-perfect resume below and tailor it for target job descriptions.
      </p>

      {/* Mode Switcher Pill (if tailored version exists) */}
      {state.tailoredPdfUrl && (
        <div className="mode-toggle-container" style={{ marginBottom: '1.5rem' }}>
          <div className="mode-toggle">
            <button
              type="button"
              className={`mode-toggle-btn ${state.activeViewMode === 'original' ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'original' })}
            >
              📄 Baseline Resume
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${state.activeViewMode === 'tailored' ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'tailored' })}
            >
              🎯 Tailored for Job <span className="badge-pulse">ATS Match</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Adaptation Summary Banner */}
      {isTailoredActive && state.adaptationsSummary && (
        <div 
          className="adaptations-card glass-card"
          style={{
            width: '100%',
            marginBottom: '1.5rem',
            padding: '1rem 1.25rem',
            background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%, rgba(129, 140, 248, 0.05) 100%)',
            borderColor: 'rgba(52, 211, 153, 0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.25rem', lineHeight: '1' }}>⚡</span>
          <div>
            <strong style={{ color: 'var(--color-success)', fontSize: '0.9rem', display: 'block', marginBottom: '0.2rem' }}>
              Tailored Adaptations Summary:
            </strong>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
              {state.adaptationsSummary}
            </p>
          </div>
        </div>
      )}

      {/* PDF Preview Iframe */}
      {activePdfUrl && (
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
          style={{ cursor: isDownloading ? 'wait' : 'pointer' }}
        >
          {isDownloading ? '⏳ Downloading...' : `⬇️ Download ${isTailoredActive ? 'Tailored' : 'Baseline'} PDF`}
        </button>
        
        <button 
          className="btn btn-secondary btn-xl" 
          onClick={handleDownloadLatex}
          disabled={!activeLatex}
        >
          📝 Download LaTeX Code
        </button>

        <button 
          className="btn btn-secondary btn-xl" 
          onClick={handleCopyLatex}
          disabled={!activeLatex}
        >
          {isCopied ? '✅ Copied!' : '📋 Copy LaTeX Code'}
        </button>
      </div>

      {/* ========================================================= */}
      {/* 🎯 The Job Description & GitHub Codebase Studio on the Last Page */}
      {/* ========================================================= */}
      <div 
        className="glass-card jd-studio-card"
        style={{
          width: '100%',
          padding: '2rem',
          marginBottom: '2.5rem',
          background: 'linear-gradient(135deg, rgba(129, 140, 248, 0.07) 0%, rgba(99, 102, 241, 0.02) 100%)',
          borderColor: 'rgba(129, 140, 248, 0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🎯</span>
              <h3 style={{ margin: 0, fontSize: '1.35rem', color: 'var(--color-text-primary)' }}>
                Tailor for a Specific <span className="text-gradient">Job Description</span>
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)', maxWidth: '680px' }}>
              Paste a target job description below. Optionally connect your public GitHub repositories to let AI discover genuine architectural features you actually built (even without a detailed README).
            </p>
          </div>

          {state.tailoredPdfUrl && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ fontSize: '0.85rem' }}
              onClick={() => dispatch({ type: 'RESET_TAILORED' })}
            >
              🔄 Clear Tailored Version
            </button>
          )}
        </div>

        <form onSubmit={handleTailorSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.4rem' }}>
              Target Job Title / Company (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Full Stack Software Engineer @ Stripe"
              value={state.targetRole || ''}
              onChange={(e) => dispatch({ type: 'SET_TARGET_ROLE', payload: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                fontSize: '0.95rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Target Job Description / Requirements
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                {(state.jobDescription || '').length} characters
              </span>
            </div>
            <textarea
              rows={5}
              placeholder="Paste the target job description, core duties, and tech requirements here..."
              value={state.jobDescription || ''}
              onChange={(e) => dispatch({ type: 'SET_JOB_DESCRIPTION', payload: e.target.value })}
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                fontSize: '0.9rem',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: '1.45',
              }}
            />
          </div>

          {/* ========================================================= */}
          {/* 📂 GitHub Codebase Inspection Accordion (Optional)        */}
          {/* ========================================================= */}
          <div 
            style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              onClick={() => setShowProjectContext(!showProjectContext)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🐙</span>
                <div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>
                    Deepen Project Context from GitHub
                  </strong>
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    (Optional — No tokens needed for public repos)
                  </span>
                  {inspectedCount > 0 && (
                    <span 
                      style={{
                        marginLeft: '0.5rem',
                        fontSize: '0.75rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        background: 'rgba(52, 211, 153, 0.2)',
                        color: 'var(--color-success)',
                        fontWeight: 600,
                      }}
                    >
                      ✓ {inspectedCount} Codebase{inspectedCount > 1 ? 's' : ''} Inspected
                    </span>
                  )}
                </div>
              </div>

              <button type="button" className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
                {showProjectContext ? 'Hide ▲' : 'Inspect Repos ▼'}
              </button>
            </div>

            {showProjectContext && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                  Even if your repository has an empty README, our AI reads your package manifests, Dockerfiles, and directory structure to surface genuine real-world tools that match the JD.
                </p>

                {state.resumeData?.projects?.map((proj, idx) => {
                  const item = githubAnalyses[idx] || { repoUrl: '', isAnalyzing: false, analysis: null, error: null };
                  return (
                    <div 
                      key={idx}
                      style={{
                        padding: '0.85rem',
                        marginBottom: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(0, 0, 0, 0.25)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>
                          🚀 {proj.name}
                        </span>
                        {item.analysis && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>
                            ✓ Codebase Verified
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
                          style={{
                            flex: 1,
                            minWidth: '220px',
                            padding: '0.5rem 0.75rem',
                            borderRadius: 'var(--radius-md)',
                            background: 'rgba(0, 0, 0, 0.3)',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-primary)',
                            fontSize: '0.85rem',
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleInspectRepo(idx, item.repoUrl)}
                          disabled={item.isAnalyzing || !item.repoUrl || !item.repoUrl.trim()}
                          style={{ fontSize: '0.8rem', padding: '0.5rem 0.9rem' }}
                        >
                          {item.isAnalyzing ? (
                            <>
                              <span className="spinner-sm" style={{ marginRight: '0.4rem' }} />
                              Scanning Codebase...
                            </>
                          ) : item.analysis ? (
                            '🔄 Re-Inspect'
                          ) : (
                            '🔍 Inspect Codebase'
                          )}
                        </button>
                      </div>

                      {item.error && (
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.78rem', color: 'var(--color-error)' }}>
                          ⚠️ {item.error}
                        </p>
                      )}

                      {/* Display Detected Capabilities */}
                      {item.analysis && (
                        <div style={{ marginTop: '0.75rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                            <strong>Detected Architecture:</strong> {item.analysis.summary}
                          </p>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            {item.analysis.techStack?.slice(0, 10).map((tech, tIdx) => (
                              <span 
                                key={tIdx}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '4px',
                                  background: 'rgba(129, 140, 248, 0.15)',
                                  color: 'var(--color-accent)',
                                  border: '1px solid rgba(129, 140, 248, 0.3)',
                                }}
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
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.35rem' }}>
                    📝 Extra Project Details / Hidden Features (For private repos or unlinked work):
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. In my payment service, I also configured Redis rate limiting, Docker Compose, and automated GitHub Actions CI tests..."
                    value={projectNotes}
                    onChange={(e) => setProjectNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.85rem',
                      fontFamily: 'inherit',
                    }}
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
                border: '1px solid rgba(248, 113, 113, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-error)',
                fontSize: '0.85rem',
              }}
            >
              {tailorError}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={isTailoring || !(state.jobDescription && state.jobDescription.trim().length >= 20)}
              style={{ minWidth: '260px' }}
            >
              {isTailoring ? (
                <>
                  <span className="spinner-sm" style={{ marginRight: '0.5rem' }} />
                  Synthesizing & Compiling...
                </>
              ) : state.tailoredPdfUrl ? (
                '✨ Re-tailor with Updated JD'
              ) : (
                '✨ Reframe & Align with JD'
              )}
            </button>

            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              🔒 <strong>Grounded Guarantee:</strong> Only reframes phrasing; never exaggerates or hallucinates facts.
            </span>
          </div>
        </form>
      </div>

      {/* Start Over Button */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button className="btn btn-ghost btn-lg" onClick={handleStartOver}>
          🔄 Start Over
        </button>
      </div>
    </div>
  );
}
