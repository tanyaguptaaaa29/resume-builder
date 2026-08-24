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
      const pdfBlob = await generateLatexApi(state.resumeData, state.template);
      const url = URL.createObjectURL(pdfBlob);
      dispatch({ type: 'SET_PDF_URL', payload: url });
      dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
      dispatch({ type: 'NEXT_STEP' });
    } catch (err) {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
      dispatch({
        type: 'SET_ERROR',
        payload: err.response?.data?.error || 'Failed to generate PDF.',
      });
    }
  };

  const handleEnhance = async (section) => {
    if (!state.isPremium) {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Premium enhancement is unlocked in Premium Mode. Check the toggle above!',
      });
      return;
    }

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

      {/* Premium Toggle */}
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={state.isPremium}
            onChange={(e) => dispatch({ type: 'SET_PREMIUM', payload: e.target.checked })}
            style={{ width: '18px', height: '18px', accentColor: '#f59e0b' }}
          />
          <span className="badge badge-premium">✨ Premium Mode</span>
        </label>
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
          {data.skills.languages?.length > 0 && <p><strong>Languages:</strong> {data.skills.languages.join(', ')}</p>}
          {data.skills.frameworks?.length > 0 && <p><strong>Frameworks:</strong> {data.skills.frameworks.join(', ')}</p>}
          {data.skills.tools?.length > 0 && <p><strong>Tools:</strong> {data.skills.tools.join(', ')}</p>}
        </div>

        {/* Projects */}
        {data.projects?.length > 0 && (
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ color: 'var(--color-accent)' }}>🚀 Projects</h4>
              {state.isPremium && (
                <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => handleEnhance('projects')}>
                  ✨ Enhance
                </button>
              )}
            </div>
            {data.projects.map((proj, i) => (
              <div key={i} style={{ marginBottom: '0.75rem' }}>
                <p><strong>{proj.name}</strong> ({proj.techStack?.join(', ')})</p>
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
              {state.isPremium && (
                <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => handleEnhance('experience')}>
                  ✨ Enhance
                </button>
              )}
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
