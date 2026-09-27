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
import SkeletonLoader from './components/SkeletonLoader';
import { TosModal, PrivacyModal } from './components/LegalModals';

function BuilderFlow({ onGoHome }) {
  const { state, dispatch } = useBuilder();
  const [showTos, setShowTos] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

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
        <button 
          onClick={onGoHome} 
          className="btn btn-ghost" 
          style={{ 
            fontFamily: 'var(--font-heading)', 
            fontSize: '1.15rem', 
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            padding: '0.3rem 0.6rem'
          }}
        >
          Resume Builder: <span style={{ color: 'var(--color-accent)' }}>NSUT</span>
        </button>

        <StepIndicator />

        {state.step > 1 ? (
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem', fontFamily: 'var(--font-mono)' }}
            onClick={() => {
              if (state.step === 3 && state.resumeData) {
                dispatch({ type: 'SET_RESUME_DATA', payload: null });
              } else {
                dispatch({ type: 'PREV_STEP' });
              }
            }}
          >
            [ Back ]
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
              padding: '0.85rem 1.25rem',
              background: 'var(--color-error-bg)',
              border: '1px solid var(--color-error)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-error)',
              maxWidth: '640px',
              width: '100%',
              fontSize: '0.88rem',
              textAlign: 'center',
            }}
          >
            [ ERROR ] {state.error}
          </div>
        )}
      </main>

      {/* Real Architectural Skeleton Loader when state.isLoading is true */}
      {state.isLoading && (
        <div className="loading-overlay">
          <div className="loading-modal">
            <SkeletonLoader message={state.loadingMessage || 'Processing LaTeX compilation...'} />
          </div>
        </div>
      )}

      {/* Builder Footer */}
      <footer className="app-footer">
        <div className="footer-container">
          <div>
            <span>Resume Builder: NSUT | Placement & Career Verification Engine</span>
          </div>
          <div className="footer-links">
            <button type="button" onClick={() => setShowTos(true)}>
              Terms of Service
            </button>
            <button type="button" onClick={() => setShowPrivacy(true)}>
              Privacy Policy
            </button>
          </div>
        </div>
      </footer>

      <TosModal isOpen={showTos} onClose={() => setShowTos(false)} />
      <PrivacyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </div>
  );
}

function MainApp() {
  const [view, setView] = useState('landing'); // 'landing' | 'builder'
  const { dispatch } = useBuilder();

  const handleStartWithSample = (sampleData, template) => {
    dispatch({ type: 'SET_TEMPLATE', payload: template });
    dispatch({ type: 'SET_INPUT_METHOD', payload: 'chat' });
    dispatch({ type: 'SET_RESUME_DATA', payload: sampleData });
    dispatch({ type: 'SET_VIEW_MODE', payload: 'original' });
    // Go directly to review step
    dispatch({ type: 'NEXT_STEP' }); // step 2
    dispatch({ type: 'NEXT_STEP' }); // step 3 (DataReview)
    setView('builder');
  };

  return (
    <>
      {view === 'landing' ? (
        <LandingPage 
          onStart={() => setView('builder')} 
          onStartWithSample={handleStartWithSample}
        />
      ) : (
        <BuilderFlow onGoHome={() => setView('landing')} />
      )}
    </>
  );
}

export default function App() {
  return (
    <BuilderProvider>
      <MainApp />
    </BuilderProvider>
  );
}
