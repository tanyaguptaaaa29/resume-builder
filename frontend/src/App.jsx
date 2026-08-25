import React, { useState } from 'react';
import { BuilderProvider, useBuilder } from './context/BuilderContext';
import LandingPage from './components/LandingPage';
import StepIndicator from './components/StepIndicator';
import TemplateSelector from './components/TemplateSelector';
import InputMethodSelector from './components/InputMethodSelector';
import ResumeUploader from './components/ResumeUploader';
import ManualForm from './components/ManualForm';
import DataReview from './components/DataReview';
import PreviewDownload from './components/PreviewDownload';

function BuilderFlow({ onGoHome }) {
  const { state, dispatch } = useBuilder();

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return <TemplateSelector />;
      case 2:
        return <InputMethodSelector />;
      case 3:
        if (state.resumeData) return <DataReview />;
        if (state.inputMethod === 'upload') return <ResumeUploader />;
        if (state.inputMethod === 'chat') return <ManualForm />;
        return <InputMethodSelector />;
      case 4:
        return <PreviewDownload />;
      default:
        return <TemplateSelector />;
    }
  };

  return (
    <div className="builder-page">
      <header className="builder-header">
        <button onClick={onGoHome} className="btn btn-ghost" style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
          Resume Builder — <span className="text-gradient">NSUT</span>
        </button>

        <StepIndicator />

        {state.step > 1 ? (
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (state.step === 3 && state.resumeData) {
                dispatch({ type: 'SET_RESUME_DATA', payload: null });
              } else {
                dispatch({ type: 'PREV_STEP' });
              }
            }}
          >
            ← Back
          </button>
        ) : (
          <div style={{ width: '60px' }} />
        )}
      </header>

      <main className="builder-content">
        {renderStep()}

        {state.error && (
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem 1.5rem',
              background: 'var(--color-error-bg)',
              border: '1px solid rgba(248, 113, 113, 0.3)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--color-error)',
              maxWidth: '600px',
              textAlign: 'center',
            }}
          >
            {state.error}
          </div>
        )}
      </main>

      {state.isLoading && (
        <div className="loading-overlay">
          <div className="spinner" />
          <p>{state.loadingMessage || 'Processing...'}</p>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'builder'

  return (
    <BuilderProvider>
      {view === 'landing' ? (
        <LandingPage onStart={() => setView('builder')} />
      ) : (
        <BuilderFlow onGoHome={() => setView('landing')} />
      )}
    </BuilderProvider>
  );
}
