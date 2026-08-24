import React from 'react';
import { useBuilder } from '../context/BuilderContext';

export default function StepIndicator() {
  const { state } = useBuilder();
  const steps = [1, 2, 3, 4];
  const labels = ['Template', 'Input', 'Data', 'Download'];

  return (
    <div className="step-indicator">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div
            className={`step-dot ${state.step === s ? 'active' : ''} ${
              state.step > s ? 'completed' : ''
            }`}
            title={labels[i]}
          />
          {i < steps.length - 1 && (
            <div className={`step-connector ${state.step > s ? 'active' : ''}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
