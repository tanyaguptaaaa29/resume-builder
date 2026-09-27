import React from 'react';
import { useBuilder } from '../context/BuilderContext';

export default function StepIndicator() {
  const { state } = useBuilder();
  const steps = [
    { num: 1, label: 'Template' },
    { num: 2, label: 'Input' },
    { num: 3, label: 'Data Review' },
    { num: 4, label: 'Output' },
  ];

  return (
    <div className="step-indicator">
      {steps.map((s, i) => {
        const isActive = state.step === s.num;
        const isCompleted = state.step > s.num;

        return (
          <React.Fragment key={s.num}>
            <div className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
              <span style={{ 
                borderBottom: isActive ? '2px solid var(--color-accent)' : 'none',
                paddingBottom: '2px',
                color: isActive ? 'var(--color-accent)' : isCompleted ? 'var(--color-text-secondary)' : 'var(--color-text-muted)'
              }}>
                [0{s.num}] {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span className="step-divider" style={{ color: 'var(--color-border)' }}>/</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
