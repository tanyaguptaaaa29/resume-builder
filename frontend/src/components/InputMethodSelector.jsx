import React from 'react';
import { useBuilder } from '../context/BuilderContext';

export default function InputMethodSelector() {
  const { state, dispatch } = useBuilder();

  const select = (method) => {
    dispatch({ type: 'SET_INPUT_METHOD', payload: method });
    setTimeout(() => dispatch({ type: 'NEXT_STEP' }), 300);
  };

  return (
    <div style={{ width: '100%' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
        How Would You Like to <span className="text-gradient">Start</span>?
      </h2>
      <p style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        Upload an existing resume or tell us about yourself from scratch.
      </p>

      <div className="selector-grid">
        <div
          className={`selector-card ${state.inputMethod === 'upload' ? 'selected' : ''}`}
          onClick={() => select('upload')}
        >
          <div className="selector-icon">📤</div>
          <h3>Upload Resume</h3>
          <p>
            Have an existing resume? Upload it and we&apos;ll extract your
            information automatically.
          </p>
        </div>

        <div
          className={`selector-card ${state.inputMethod === 'chat' ? 'selected' : ''}`}
          onClick={() => select('chat')}
        >
          <div className="selector-icon">📝</div>
          <h3>Fill the Form</h3>
          <p>
            No resume yet? Manually fill out a structured form with your details.
          </p>
        </div>
      </div>
    </div>
  );
}
