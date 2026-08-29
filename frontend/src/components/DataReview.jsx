import React from 'react';
import { useBuilder } from '../context/BuilderContext';
import { generateLatexApi, enhanceApi } from '../services/api';

export default function DataReview() {
  const { state, dispatch } = useBuilder();
  const data = state.resumeData;

  if (!data) return null;

  const handleGenerate = async () => {
    dispatch({
      type: 'SET_LOADING',
      payload: { isLoading: true, message: 'Generating LaTeX & compiling PDF...' },
    });

    try {
      const result = await generateLatexApi(state.resumeData, state.template);
      if (result.success) {
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
        dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
        dispatch({ type: 'NEXT_STEP' });
      } else {
        throw new Error(result.error || 'Failed to generate PDF.');
      }
    } catch (err) {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
      dispatch({
        type: 'SET_ERROR',
        payload: err.response?.data?.error || 'Failed to generate PDF.',
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
