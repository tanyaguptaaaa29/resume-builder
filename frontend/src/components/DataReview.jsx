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
      payload: { isLoading: true, message: 'Generating LaTeX & compiling baseline PDF...' },
    });

    try {
      const result = await generateLatexApi(state.resumeData, state.template);
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate PDF.');
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
          payload: { isLoading: true, message: 'Tailoring resume to your target JD...' },
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
        payload: err.response?.data?.error || err.message || 'Failed to generate PDF.',
      });
    }
  };

  const handleEnhance = async (section) => {
    dispatch({
      type: 'SET_LOADING',
      payload: { isLoading: true, message: `Enhancing ${section} via Gemini...` },
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
      <h2 style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
        Review Your <span className="text-gradient">Information</span>
      </h2>
      <p style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        Make sure everything looks good before we compile your resume.
      </p>

      {/* Target Job Description Teaser & Optional Early Entry */}
      <div 
        className="glass-card" 
        style={{ 
          width: '100%', 
          maxWidth: '1000px', 
          marginBottom: '1.5rem', 
          background: 'linear-gradient(135deg, rgba(129, 140, 248, 0.08) 0%, rgba(99, 102, 241, 0.03) 100%)',
          borderColor: 'rgba(129, 140, 248, 0.25)',
          padding: '1.25rem 1.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🎯</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-text-primary)' }}>
                  Targeting a Specific Job Description?
                </h4>
                <span className="badge-new" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '12px', background: 'var(--gradient-primary)', color: '#fff', fontWeight: 600 }}>NEW</span>
              </div>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                You can fine-tune and align your points on the final preview page, or paste your target JD here to generate a tailored version right away.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }}
            onClick={() => setShowJdInput(!showJdInput)}
          >
            {showJdInput ? 'Hide JD Box ▲' : '+ Target a Job (Optional) ▼'}
          </button>
        </div>

        {showJdInput && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                Target Role / Title (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. SDE-1, Full Stack Developer, Frontend Engineer"
                value={state.targetRole || ''}
                onChange={(e) => dispatch({ type: 'SET_TARGET_ROLE', payload: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.9rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                Paste Job Description / Key Requirements
              </label>
              <textarea
                rows={4}
                placeholder="Paste the target job description or requirements here..."
                value={state.jobDescription || ''}
                onChange={(e) => dispatch({ type: 'SET_JOB_DESCRIPTION', payload: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.85rem',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  lineHeight: '1.4',
                }}
              />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0.5rem 0 0 0' }}>
              💡 <em>Our AI will subtly align your bullet points and highlight relevant skills without inventing unearned experience or exaggerating metrics.</em>
            </p>
          </div>
        )}
      </div>

      <div className="review-grid">
        {/* Personal Info */}
        <div className="glass-card">
          <h4 style={{ color: 'var(--color-accent)', marginBottom: '1rem' }}>👤 Personal Info</h4>
          <p><strong>Name:</strong> {data.personalInfo.fullName}</p>
          <p><strong>Email:</strong> {data.personalInfo.email}</p>
          <p><strong>Phone:</strong> {data.personalInfo.phone}</p>
          {data.personalInfo.linkedin && <p><strong>LinkedIn:</strong> {data.personalInfo.linkedin}</p>}
          {data.personalInfo.github && <p><strong>GitHub:</strong> {data.personalInfo.github}</p>}
        </div>

        {/* Education */}
        <div className="glass-card">
          <h4 style={{ color: 'var(--color-accent)', marginBottom: '1rem' }}>🎓 Education</h4>
          {data.education.map((edu, i) => (
            <div key={i} style={{ marginBottom: '0.75rem' }}>
              <p><strong>{edu.institution}</strong></p>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                {edu.degree} ({edu.field}) {edu.cgpa ? `| CGPA: ${edu.cgpa}` : ''}
              </p>
            </div>
          ))}
        </div>

        {/* Skills */}
        <div className="glass-card">
          <h4 style={{ color: 'var(--color-accent)', marginBottom: '1rem' }}>🛠 Technical Skills</h4>
          {data.skills?.map((skill, i) => (
            skill.category && skill.items && (
              <p key={i}><strong>{skill.category}:</strong> {skill.items}</p>
            )
          ))}
        </div>

        {/* Projects */}
        {data.projects?.length > 0 && (
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ color: 'var(--color-accent)' }}>🚀 Projects</h4>
              <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => handleEnhance('projects')}>
                ✨ Enhance
              </button>
            </div>
            {data.projects.map((proj, i) => (
              <div key={i} style={{ marginBottom: '0.75rem' }}>
                <p>
                  <strong>{proj.name}</strong> ({proj.techStack?.join(', ')})
                  {proj.link && <span style={{ marginLeft: '0.5rem' }}><a href={proj.link} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>[Source]</a></span>}
                  {proj.liveLink && <span style={{ marginLeft: '0.5rem' }}><a href={proj.liveLink} target="_blank" rel="noreferrer" style={{ color: 'var(--color-accent)' }}>[Live]</a></span>}
                </p>
                {proj.bullets?.map((b, j) => (
                  <p key={j} style={{ fontSize: '0.85rem', paddingLeft: '0.5rem' }}>• {b}</p>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Experience */}
        {data.experience?.length > 0 && (
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ color: 'var(--color-accent)' }}>💼 Experience</h4>
              <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => handleEnhance('experience')}>
                ✨ Enhance
              </button>
            </div>
            {data.experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: '0.75rem' }}>
                <p><strong>{exp.role}</strong> @ {exp.company}</p>
                {exp.bullets?.map((b, j) => (
                  <p key={j} style={{ fontSize: '0.85rem', paddingLeft: '0.5rem' }}>• {b}</p>
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
          style={{ cursor: state.isLoading ? 'wait' : 'pointer' }}
        >
          {state.isLoading ? '⏳ Generating...' : '📄 Generate & Compile Resume'}
        </button>
      </div>
    </div>
  );
}
