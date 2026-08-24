import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* === HERO SECTION === */}
      <section className="landing-hero">
        <div className="hero-badge">
          <span className="badge">⚡ Powered by AI + LaTeX</span>
        </div>

        <h1 className="hero-title">
          ATS-Perfect Resumes
          <br />
          <span className="text-gradient">in 60 Seconds</span>
        </h1>

        <p className="hero-subtitle">
          Generate professional, pixel-perfect resumes compiled from LaTeX.
          Choose your template, input your data, and download — it&apos;s that
          simple.
        </p>

        <div className="hero-actions">
          <Link href="/builder" className="btn btn-primary btn-xl">
            🚀 Build Your Resume
          </Link>
          <a href="#features" className="btn btn-secondary btn-lg">
            Learn More ↓
          </a>
        </div>
      </section>

      {/* === FEATURES SECTION === */}
      <section id="features" className="features-section container">
        <h2>
          Why <span className="text-gradient">Resume Builder</span>?
        </h2>
        <p className="features-subtitle">
          Built for NSUT students and professionals who demand the best — powered
          by cutting-edge AI and typesetting technology.
        </p>

        <div className="features-grid stagger-children">
          <div className="glass-card feature-card animate-fade-in-up">
            <div className="feature-icon">📄</div>
            <h3>LaTeX-Powered PDFs</h3>
            <p>
              Your resume is compiled from real LaTeX source code — the same
              technology used in academic papers. Pixel-perfect typography,
              every time.
            </p>
          </div>

          <div className="glass-card feature-card animate-fade-in-up">
            <div className="feature-icon">🤖</div>
            <h3>AI-Structured Data</h3>
            <p>
              Upload your existing resume or chat with our AI assistant. We
              extract and organize your information into a perfectly structured
              format.
            </p>
          </div>

          <div className="glass-card feature-card animate-fade-in-up">
            <div className="feature-icon">✅</div>
            <h3>ATS-Optimized</h3>
            <p>
              Every resume passes the Applicant Tracking System test. Clean
              single-column layout, standard sections, parsable text — guaranteed.
            </p>
          </div>

          <div className="glass-card feature-card animate-fade-in-up">
            <div className="feature-icon">🎓</div>
            <h3>College & Off-Campus Templates</h3>
            <p>
              Two battle-tested templates: one tailored for on-campus placements
              at universities, another optimized for corporate industry roles.
            </p>
          </div>

          <div className="glass-card feature-card animate-fade-in-up">
            <div className="feature-icon">⚡</div>
            <h3>Ultra-Fast & Free</h3>
            <p>
              Standard resume generation is completely free. Our optimized AI
              pipeline generates your resume in seconds, not minutes.
            </p>
          </div>

          <div className="glass-card feature-card animate-fade-in-up">
            <div className="feature-icon">✨</div>
            <h3>Premium AI Enhancement</h3>
            <p>
              Upgrade to get AI-suggested bullet points with action verbs,
              quantified achievements, and tailored content improvements.
            </p>
          </div>
        </div>
      </section>

      {/* === HOW IT WORKS === */}
      <section className="how-it-works container">
        <h2 style={{ textAlign: "center" }}>
          How It <span className="text-gradient">Works</span>
        </h2>

        <div className="steps-container stagger-children">
          <div className="step-item animate-fade-in-up">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Choose Your Template</h4>
              <p>
                Select between &quot;College Resume&quot; for campus placements
                or &quot;Off-Campus Resume&quot; for industry roles. Each is
                optimized for its target audience.
              </p>
            </div>
          </div>

          <div className="step-item animate-fade-in-up">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Provide Your Information</h4>
              <p>
                Upload your existing resume (PDF) for automatic extraction, or
                chat with our AI assistant who will guide you through each
                section.
              </p>
            </div>
          </div>

          <div className="step-item animate-fade-in-up">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Review & Enhance</h4>
              <p>
                Review your structured data, make edits, and optionally upgrade
                to premium for AI-enhanced bullet points with stronger action
                verbs.
              </p>
            </div>
          </div>

          <div className="step-item animate-fade-in-up">
            <div className="step-number">4</div>
            <div className="step-content">
              <h4>Download Your Resume</h4>
              <p>
                Your data is compiled into a beautiful LaTeX PDF. Preview it
                in-browser and download your ATS-perfect resume instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* === CTA SECTION === */}
      <section className="section container" style={{ textAlign: "center" }}>
        <div
          className="glass-card animate-glow"
          style={{
            maxWidth: "700px",
            margin: "0 auto",
            padding: "3rem",
          }}
        >
          <h2 style={{ marginBottom: "1rem" }}>
            Ready to Build Your <span className="text-gradient">Perfect Resume</span>?
          </h2>
          <p style={{ marginBottom: "2rem", fontSize: "1.1rem" }}>
            Join thousands of NSUT students who have landed their dream roles
            with our LaTeX-powered resumes.
          </p>
          <Link href="/builder" className="btn btn-primary btn-xl">
            🚀 Get Started — It&apos;s Free
          </Link>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="site-footer">
        <div className="container footer-content">
          <div className="footer-brand">
            Resume Builder — <span className="text-gradient">NSUT</span>
          </div>
          <ul className="footer-links">
            <li>
              <a href="#features">Features</a>
            </li>
            <li>
              <Link href="/builder">Build Resume</Link>
            </li>
            <li>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </li>
          </ul>
          <p className="footer-copyright">
            © {new Date().getFullYear()} Resume Builder NSUT. Built with ❤️
            using Next.js, LaTeX & Gemini AI.
          </p>
        </div>
      </footer>
    </>
  );
}
