import React from 'react';
import { useBuilder } from '../context/BuilderContext';

export default function InputMethodSelector() {
  const { state, dispatch } = useBuilder();

  const select = (method) => {
    dispatch({ type: 'SET_INPUT_METHOD', payload: method });
    setTimeout(() => dispatch({ type: 'NEXT_STEP' }), 200);
  };

  return (
    <div style={{ width: '100%', maxWidth: '860px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span className="mono-tag">STEP 02: INGESTION PIPELINE</span>
        <h2 style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
          Select Data Ingestion Method
        </h2>
        <p>
          Extract fields from an existing PDF document or construct entries via structured forms.
        </p>
      </div>

      <div className="selector-grid">
        <div
          className={`selector-card ${state.inputMethod === 'upload' ? 'selected' : ''}`}
          onClick={() => select('upload')}
        >
          <div className="selector-index">[ PIPELINE 01 / PARSER ]</div>
          <h3>PDF Document Extraction</h3>
          <p style={{ marginBottom: '1rem' }}>
            Upload an existing PDF. The parser decomposes raw text streams into validated JSON schema entities.
          </p>
          <div style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '0.75rem', 
            color: 'var(--color-text-muted)',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '0.75rem',
            width: '100%'
          }}>
            Parser: pdf-parse + Gemini extraction pipeline
          </div>
        </div>

        <div
          className={`selector-card ${state.inputMethod === 'chat' ? 'selected' : ''}`}
          onClick={() => select('chat')}
        >
          <div className="selector-index">[ PIPELINE 02 / MANUAL ]</div>
          <h3>Structured Manual Entry</h3>
          <p style={{ marginBottom: '1rem' }}>
            Enter education, technical projects, employment history, and skills via tabular input forms.
          </p>
          <div style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '0.75rem', 
            color: 'var(--color-text-muted)',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '0.75rem',
            width: '100%'
          }}>
            Storage: Session-persistent local state
          </div>
        </div>
      </div>
    </div>
  );
}
