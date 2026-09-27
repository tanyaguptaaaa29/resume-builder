import React, { useState } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { generateLatexApi, enhanceApi, tailorResumeApi } from '../services/api';

export default function DataReview() {
  const { state, dispatch } = useBuilder();
  const [showJdInput, setShowJdInput] = useState(false);
  const data = state.resumeData;

  if (!data) return null;

  const handleGenerate = async () => {
    dispatch({
      type: 'SET_LOADING',
      payload: { isLoading: true, message: 'Compiling LaTeX source and generating PDF artifact...' },
    });

    try {
      const result = await generateLatexApi(state.resumeData, state.template);
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate PDF document.');
      }

      const binaryString = window.atob(result.pdfBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const pdfBlob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);
      
      dispatch({ type: 'SET_PDF_URL', payload: url });
      dispatch({ type: 'SET_LATEX_CODE', payload: result.latex });

      // If user optionally pasted a JD on this review page, tailor it as well
      if (state.jobDescription && state.jobDescription.trim().length >= 20) {
        dispatch({
          type: 'SET_LOADING',
          payload: { isLoading: true, message: 'Calibrating resume points against target job description...' },
        });

        const tailoredResult = await tailorResumeApi({
          data: state.resumeData,
          jobDescription: state.jobDescription,
          targetRole: state.targetRole,
          template: state.template,
          compile: true,
        });

        if (tailoredResult.success && tailoredResult.pdfBase64) {
          const tBinary = window.atob(tailoredResult.pdfBase64);
          const tBytes = new Uint8Array(tBinary.length);
          for (let i = 0; i < tBinary.length; i++) {
            tBytes[i] = tBinary.charCodeAt(i);
          }
          const tPdfBlob = new Blob([tBytes], { type: 'application/pdf' });
          const tUrl = URL.createObjectURL(tPdfBlob);

          dispatch({
            type: 'SET_TAILORED_RESULT',
            payload: {
              data: tailoredResult.data,
              pdfUrl: tUrl,
              latex: tailoredResult.latex,
              adaptationsSummary: tailoredResult.adaptationsSummary,
              judgeAudit: tailoredResult.judgeAudit,
            },
          });
        }
      }

      dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
      dispatch({ type: 'NEXT_STEP' });
    } catch (err) {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
      dispatch({
        type: 'SET_ERROR',
        payload: err.response?.data?.error || err.message || 'Failed to compile PDF document.',
      });
    }
  };

  const handleEnhance = async (section) => {
    dispatch({
      type: 'SET_LOADING',
      payload: { isLoading: true, message: `Refining ${section} phrasing via Gemini model...` },
    });

    try {
      const result = await enhanceApi(state.resumeData, section);
      if (result.success && result.data) {
        dispatch({ type: 'SET_RESUME_DATA', payload: result.data });
      }
      dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
    } catch {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <span className="mono-tag">STEP 03: VERIFICATION</span>
        <h2 style={{ marginTop: '0.4rem', marginBottom: '0.4rem' }}>
          Review Ingested Schema
        </h2>
        <p>
          Verify extracted fields and section assignments prior to executing pdfLaTeX compilation.
        </p>
      </div>

      {/* Target Job Description Optional Box */}
      <div 
        className="solid-panel" 
        style={{ 
          width: '100%', 
          maxWidth: '1000px', 
          marginBottom: '2rem', 
          padding: '1.25rem 1.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="mono-tag">[ OPTIONAL CALIBRATION ]</span>
              <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                Target Job Description
              </h4>
            </div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              Paste target job requirements now, or fine-tune phrasing on the final output page.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', fontFamily: 'var(--font-mono)' }}
            onClick={() => setShowJdInput(!showJdInput)}
          >
            {showJdInput ? '[ Hide JD Panel ]' : '[ + Attach Job Description ]'}
          </button>
        </div>

        {showJdInput && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                Target Role / Title
              </label>
              <input
                type="text"
                placeholder="e.g. Systems Software Engineer, Backend Infrastructure"
                value={state.targetRole || ''}
                onChange={(e) => dispatch({ type: 'SET_TARGET_ROLE', payload: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                Job Description Requirements
              </label>
              <textarea
                rows={4}
                placeholder="Paste the target job description or core qualifications here..."
                value={state.jobDescription || ''}
                onChange={(e) => dispatch({ type: 'SET_JOB_DESCRIPTION', payload: e.target.value })}
                className="input"
                style={{ resize: 'vertical', lineHeight: '1.5' }}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.5rem 0 0 0', fontFamily: 'var(--font-mono)' }}>
              NOTE: Algorithmic alignment prioritizes genuine candidate experience without synthesizing unverified claims.
            </p>
          </div>
        )}
      </div>

      <div className="review-grid">
        {/* Personal Info */}
        <div className="solid-panel">
          <div className="mono-tag" style={{ marginBottom: '0.5rem' }}>[ SECTION 01 ]</div>
          <h4 style={{ marginBottom: '0.75rem' }}>Personal Information</h4>
          <p><strong>Name:</strong> {data.personalInfo.fullName || data.personalInfo.name}</p>
          <p><strong>Email:</strong> {data.personalInfo.email}</p>
          <p><strong>Phone:</strong> {data.personalInfo.phone || 'N/A'}</p>
          {data.personalInfo.linkedin && <p><strong>LinkedIn:</strong> {data.personalInfo.linkedin}</p>}
          {data.personalInfo.github && <p><strong>GitHub:</strong> {data.personalInfo.github}</p>}
        </div>

        {/* Education */}
        <div className="solid-panel">
          <div className="mono-tag" style={{ marginBottom: '0.5rem' }}>[ SECTION 02 ]</div>
          <h4 style={{ marginBottom: '0.75rem' }}>Education & Academics</h4>
          {data.education.map((edu, i) => (
            <div key={i} style={{ marginBottom: '0.75rem', borderBottom: i < data.education.length - 1 ? '1px solid var(--color-border)' : 'none', paddingBottom: '0.5rem' }}>
              <p><strong>{edu.institution || edu.school}</strong></p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                {edu.degree} ({edu.field || edu.major}) {edu.cgpa || edu.gpa ? `| CGPA: ${edu.cgpa || edu.gpa}` : ''}
              </p>
            </div>
          ))}
        </div>

        {/* Skills */}
        <div className="solid-panel">
          <div className="mono-tag" style={{ marginBottom: '0.5rem' }}>[ SECTION 03 ]</div>
          <h4 style={{ marginBottom: '0.75rem' }}>Technical Competencies</h4>
          {data.skills?.map((skill, i) => (
            skill.category && skill.items && (
              <p key={i} style={{ marginBottom: '0.35rem', fontSize: '0.88rem' }}>
                <strong>{skill.category}:</strong> {skill.items}
              </p>
            )
          ))}
        </div>

        {/* Projects */}
        {data.projects?.length > 0 && (
          <div className="solid-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <div className="mono-tag">[ SECTION 04 ]</div>
                <h4 style={{ margin: '0.2rem 0 0 0' }}>Projects</h4>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', fontFamily: 'var(--font-mono)' }} 
                onClick={() => handleEnhance('projects')}
              >
                [ Refine via Gemini ]
              </button>
            </div>
            {data.projects.map((proj, i) => (
              <div key={i} style={{ marginBottom: '0.85rem', borderBottom: i < data.projects.length - 1 ? '1px solid var(--color-border)' : 'none', paddingBottom: '0.5rem' }}>
                <p>
                  <strong>{proj.name}</strong> ({proj.techStack?.join(', ')})
                  {proj.link && <span style={{ marginLeft: '0.5rem' }}><a href={proj.link} target="_blank" rel="noreferrer">[Source]</a></span>}
                  {proj.liveLink && <span style={{ marginLeft: '0.5rem' }}><a href={proj.liveLink} target="_blank" rel="noreferrer">[Deployment]</a></span>}
                </p>
                {proj.bullets?.map((b, j) => (
                  <p key={j} style={{ fontSize: '0.82rem', paddingLeft: '0.5rem', color: 'var(--color-text-secondary)', margin: '0.2rem 0' }}>
                    - {b}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Experience */}
        {data.experience?.length > 0 && (
          <div className="solid-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <div className="mono-tag">[ SECTION 05 ]</div>
                <h4 style={{ margin: '0.2rem 0 0 0' }}>Work Experience</h4>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', fontFamily: 'var(--font-mono)' }} 
                onClick={() => handleEnhance('experience')}
              >
                [ Refine via Gemini ]
              </button>
            </div>
            {data.experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: '0.85rem', borderBottom: i < data.experience.length - 1 ? '1px solid var(--color-border)' : 'none', paddingBottom: '0.5rem' }}>
                <p><strong>{exp.role || exp.position}</strong> @ {exp.company}</p>
                {exp.bullets?.map((b, j) => (
                  <p key={j} style={{ fontSize: '0.82rem', paddingLeft: '0.5rem', color: 'var(--color-text-secondary)', margin: '0.2rem 0' }}>
                    - {b}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: '2.5rem' }}>
        <button 
          className="btn btn-primary btn-xl" 
          onClick={handleGenerate}
          disabled={state.isLoading}
        >
          {state.isLoading ? '[ Executing Compilation... ]' : '[ Compile LaTeX Document ]'}
        </button>
      </div>
    </div>
  );
}
