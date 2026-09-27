import React from 'react';
import { useBuilder } from '../context/BuilderContext';

export default function TemplateSelector() {
  const { state, dispatch } = useBuilder();

  const select = (template) => {
    dispatch({ type: 'SET_TEMPLATE', payload: template });
    setTimeout(() => dispatch({ type: 'NEXT_STEP' }), 200);
  };

  return (
    <div style={{ width: '100%', maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span className="mono-tag">STEP 01: TYPESETTING SPECIFICATION</span>
        <h2 style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
          Select LaTeX Layout Template
        </h2>
        <p>
          Choose the structural hierarchy required by your target evaluation committee.
        </p>
      </div>

      <div className="selector-grid">
        <div
          className={`selector-card ${state.template === 'college' ? 'selected' : ''}`}
          onClick={() => select('college')}
        >
          <div className="selector-index">[ FORMAT 01 / UNIVERSITY ]</div>
          <h3>University Placement Format</h3>
          <p style={{ marginBottom: '1rem' }}>
            Structured specifically for campus recruitment and academic committees.
          </p>
          <div style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '0.75rem', 
            color: 'var(--color-text-muted)',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '0.75rem',
            width: '100%'
          }}>
            Order: Education + CGPA &gt; Technical Skills &gt; Projects &gt; Experience
          </div>
        </div>

        <div
          className={`selector-card ${state.template === 'offcampus' ? 'selected' : ''}`}
          onClick={() => select('offcampus')}
        >
          <div className="selector-index">[ FORMAT 02 / CORPORATE ]</div>
          <h3>Off-Campus Engineering Format</h3>
          <p style={{ marginBottom: '1rem' }}>
            Calibrated for direct corporate applications, startups, and international recruiting.
          </p>
          <div style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '0.75rem', 
            color: 'var(--color-text-muted)',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '0.75rem',
            width: '100%'
          }}>
            Order: Experience &gt; Quantified Projects &gt; Technical Skills &gt; Education
          </div>
        </div>
      </div>
    </div>
  );
}
