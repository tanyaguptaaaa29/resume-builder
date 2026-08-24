import React from 'react';
import { useBuilder } from '../context/BuilderContext';

export default function TemplateSelector() {
  const { state, dispatch } = useBuilder();

  const select = (template) => {
    dispatch({ type: 'SET_TEMPLATE', payload: template });
    setTimeout(() => dispatch({ type: 'NEXT_STEP' }), 300);
  };

  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
        Choose Your <span className="text-gradient">Template</span>
      </h2>
      <p style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        Select the resume format that matches your target role.
      </p>

      <div className="selector-grid">
        <div
          className={`selector-card ${state.template === 'college' ? 'selected' : ''}`}
          onClick={() => select('college')}
        >
          <div className="selector-icon">🎓</div>
          <h3>College Resume</h3>
          <p>
            Tailored for university placements. Education-first layout with
            emphasis on CGPA, projects, and skills.
          </p>
        </div>

        <div
          className={`selector-card ${state.template === 'offcampus' ? 'selected' : ''}`}
          onClick={() => select('offcampus')}
        >
          <div className="selector-icon">💼</div>
          <h3>Off-Campus Resume</h3>
          <p>
            Corporate & industry-optimized. Experience-first layout with
            professional summary and quantified achievements.
          </p>
        </div>
      </div>
    </div>
  );
}
