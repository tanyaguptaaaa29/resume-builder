import React from 'react';

export default function LandingPage({ onStart }) {
  return (
    <>
      <section className="landing-hero">
        <h1 className="hero-title">
          ATS-Perfect Resumes
          <br />
          <span className="text-gradient">in 60 Seconds</span>
        </h1>

        <p className="hero-subtitle">
          Generate professional, pixel-perfect resumes compiled from LaTeX.
          Choose your template, input your data, and download instantly.
        </p>

        <div className="hero-actions">
          <button onClick={onStart} className="btn btn-primary btn-xl">
            🚀 Build Your Resume
          </button>
          <a href="#features" className="btn btn-secondary btn-lg">
            Learn More ↓
          </a>
        </div>
      </section>

      <section id="features" className="container" style={{ paddingBottom: '6rem' }}>
        <h2 style={{ textAlign: 'center' }}>
          Why <span className="text-gradient">Resume Builder</span>?
        </h2>

        <div className="features-grid">
          <div className="glass-card feature-card">
            <div className="feature-icon">📄</div>
            <h3>LaTeX-Powered PDFs</h3>
            <p>
              Your resume is compiled from real LaTeX source code. Pixel-perfect
              academic & corporate typography, every time.
            </p>
          </div>

          <div className="glass-card feature-card">
            <div className="feature-icon">✨</div>
            <h3>AI-Powered Enhancements</h3>
            <p>
              Instantly rewrite and polish your resume bullet points using the Gemini model to maximize your impact.
            </p>
          </div>

          <div className="glass-card feature-card">
            <div className="feature-icon">✅</div>
            <h3>ATS-Optimized</h3>
            <p>
              Guaranteed single-column layout, standard headers, and readable
              typography built specifically for ATS parsers.
            </p>
          </div>

          <div className="glass-card feature-card">
            <div className="feature-icon">🎓</div>
            <h3>College & Off-Campus</h3>
            <p>
              Choose between university placement formats (NSUT/college) or
              general corporate industry templates.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
