import React from 'react';

/**
 * Architectural Skeleton Loader for resume compilation,
 * data parsing, and PDF rendering states.
 * Simulates a structured LaTeX document wireframe.
 */
export default function SkeletonLoader({ message = 'Compiling LaTeX document...' }) {
  return (
    <div className="skeleton-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div style={{ width: '60%' }}>
          <div className="skeleton-shimmer skeleton-line skeleton-line-title" style={{ marginBottom: '8px' }} />
          <div className="skeleton-shimmer skeleton-line" style={{ width: '40%', height: '10px' }} />
        </div>
        <div style={{ width: '25%', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
          <div className="skeleton-shimmer skeleton-line" style={{ width: '100%', height: '10px' }} />
          <div className="skeleton-shimmer skeleton-line" style={{ width: '80%', height: '10px' }} />
        </div>
      </div>

      <div className="skeleton-divider" />

      {/* Section 1: Education */}
      <div style={{ marginTop: '0.5rem' }}>
        <div className="skeleton-shimmer skeleton-line" style={{ width: '25%', height: '14px', marginBottom: '10px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className="skeleton-shimmer skeleton-line" style={{ width: '90%', height: '10px' }} />
          <div className="skeleton-shimmer skeleton-line" style={{ width: '75%', height: '10px' }} />
        </div>
      </div>

      <div className="skeleton-divider" />

      {/* Section 2: Experience / Projects */}
      <div style={{ marginTop: '0.5rem' }}>
        <div className="skeleton-shimmer skeleton-line" style={{ width: '30%', height: '14px', marginBottom: '10px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="skeleton-shimmer skeleton-line" style={{ width: '95%', height: '10px' }} />
          <div className="skeleton-shimmer skeleton-line" style={{ width: '88%', height: '10px' }} />
          <div className="skeleton-shimmer skeleton-line" style={{ width: '92%', height: '10px' }} />
        </div>
      </div>

      <div className="skeleton-divider" />

      {/* Section 3: Skills */}
      <div style={{ marginTop: '0.5rem' }}>
        <div className="skeleton-shimmer skeleton-line" style={{ width: '20%', height: '14px', marginBottom: '10px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className="skeleton-shimmer skeleton-line" style={{ width: '80%', height: '10px' }} />
          <div className="skeleton-shimmer skeleton-line" style={{ width: '65%', height: '10px' }} />
        </div>
      </div>

      {message && (
        <div style={{ 
          marginTop: '1.25rem', 
          paddingTop: '1rem', 
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8rem',
          color: 'var(--color-text-secondary)'
        }}>
          <span>STATUS: RUNNING</span>
          <span style={{ color: 'var(--color-accent)' }}>{message}</span>
        </div>
      )}
    </div>
  );
}
