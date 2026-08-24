"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useBuilder } from "@/context/BuilderContext";
import type { ChatMessage, ResumeData } from "@/lib/schemas/resume";

// ============================================================
// STEP INDICATOR
// ============================================================
function StepIndicator() {
  const { state } = useBuilder();
  const steps = [1, 2, 3, 4] as const;
  const labels = ["Template", "Input", "Data", "Download"];

  return (
    <div className="step-indicator">
      {steps.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            className={`step-dot ${state.step === s ? "active" : ""} ${
              state.step > s ? "completed" : ""
            }`}
            title={labels[i]}
          />
          {i < steps.length - 1 && (
            <div
              className={`step-connector ${state.step > s ? "active" : ""}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// STEP 1: TEMPLATE SELECTOR
// ============================================================
function TemplateSelector() {
  const { state, dispatch } = useBuilder();

  const select = (template: "college" | "offcampus") => {
    dispatch({ type: "SET_TEMPLATE", payload: template });
    setTimeout(() => dispatch({ type: "NEXT_STEP" }), 400);
  };

  return (
    <div className="animate-fade-in-up" style={{ width: "100%" }}>
      <h2 className="builder-step-title">
        Choose Your <span className="text-gradient">Template</span>
      </h2>
      <p className="builder-step-subtitle">
        Select the resume format that matches your target role.
      </p>

      <div className="selector-grid">
        <div
          id="template-college"
          className={`selector-card ${
            state.template === "college" ? "selected" : ""
          }`}
          onClick={() => select("college")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && select("college")}
        >
          <div className="selector-icon">🎓</div>
          <h3>College Resume</h3>
          <p>
            Tailored for university placements. Education-first layout with
            emphasis on CGPA, projects, and skills.
          </p>
        </div>

        <div
          id="template-offcampus"
          className={`selector-card ${
            state.template === "offcampus" ? "selected" : ""
          }`}
          onClick={() => select("offcampus")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && select("offcampus")}
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

// ============================================================
// STEP 2: INPUT METHOD SELECTOR
// ============================================================
function InputMethodSelector() {
  const { state, dispatch } = useBuilder();

  const select = (method: "upload" | "chat") => {
    dispatch({ type: "SET_INPUT_METHOD", payload: method });
    setTimeout(() => dispatch({ type: "NEXT_STEP" }), 400);
  };

  return (
    <div className="animate-fade-in-up" style={{ width: "100%" }}>
      <h2 className="builder-step-title">
        How Would You Like to <span className="text-gradient">Start</span>?
      </h2>
      <p className="builder-step-subtitle">
        Upload an existing resume or tell us about yourself from scratch.
      </p>

      <div className="selector-grid">
        <div
          id="input-upload"
          className={`selector-card ${
            state.inputMethod === "upload" ? "selected" : ""
          }`}
          onClick={() => select("upload")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && select("upload")}
        >
          <div className="selector-icon">📤</div>
          <h3>Upload Resume</h3>
          <p>
            Have an existing resume? Upload it and we&apos;ll extract your
            information automatically.
          </p>
        </div>

        <div
          id="input-chat"
          className={`selector-card ${
            state.inputMethod === "chat" ? "selected" : ""
          }`}
          onClick={() => select("chat")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && select("chat")}
        >
          <div className="selector-icon">💬</div>
          <h3>Tell Us About Yourself</h3>
          <p>
            No resume yet? Our AI assistant will guide you through each section
            step by step.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 3A: RESUME UPLOADER
// ============================================================
function ResumeUploader() {
  const { dispatch } = useBuilder();
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      dispatch({ type: "SET_ERROR", payload: "Please upload a PDF file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      dispatch({ type: "SET_ERROR", payload: "File must be under 5MB." });
      return;
    }

    setFileName(file.name);
    dispatch({
      type: "SET_LOADING",
      payload: { isLoading: true, message: "Extracting data from your resume..." },
    });
    dispatch({ type: "SET_ERROR", payload: null });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-resume", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (result.success && result.data) {
        dispatch({ type: "SET_RESUME_DATA", payload: result.data });
        dispatch({ type: "SET_LOADING", payload: { isLoading: false } });
        dispatch({ type: "NEXT_STEP" });
      } else {
        dispatch({ type: "SET_LOADING", payload: { isLoading: false } });
        dispatch({
          type: "SET_ERROR",
          payload: result.error || "Failed to extract data. Please try again.",
        });
      }
    } catch {
      dispatch({ type: "SET_LOADING", payload: { isLoading: false } });
      dispatch({
        type: "SET_ERROR",
        payload: "Network error. Please check your connection and try again.",
      });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="animate-fade-in-up" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h2 className="builder-step-title">
        Upload Your <span className="text-gradient">Resume</span>
      </h2>
      <p className="builder-step-subtitle">
        Drop your PDF resume below and our AI will extract your information.
      </p>

      <div
        className={`upload-zone ${dragActive ? "drag-active" : ""}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleChange}
          style={{ display: "none" }}
          id="resume-upload-input"
        />
        <div className="upload-zone-icon">
          {fileName ? "✅" : "📄"}
        </div>
        <h4>{fileName || "Drop your resume here"}</h4>
        <p>{fileName ? "File ready — processing..." : "PDF only, max 5MB"}</p>
      </div>
    </div>
  );
}

// ============================================================
// STEP 3B: GUIDED CHAT
// ============================================================
function GuidedChat() {
  const { state, dispatch } = useBuilder();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Send initial greeting
  const initChat = useCallback(async () => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    setIsTyping(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      });
      const result = await res.json();
      if (result.success) {
        dispatch({
          type: "ADD_CHAT_MESSAGE",
          payload: { role: "assistant", content: result.reply },
        });
      }
    } catch {
      dispatch({
        type: "ADD_CHAT_MESSAGE",
        payload: {
          role: "assistant",
          content: "Hi! 👋 I'm your resume building assistant. Let's start with your full name — what should I put at the top of your resume?",
        },
      });
    }
    setIsTyping(false);
  }, [dispatch]);

  // Initialize on mount
  useState(() => {
    initChat();
  });

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const updatedMessages = [...state.chatHistory, userMessage];

    dispatch({ type: "ADD_CHAT_MESSAGE", payload: userMessage });
    setInput("");
    setIsTyping(true);

    setTimeout(scrollToBottom, 100);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const result = await res.json();

      if (result.success) {
        dispatch({
          type: "ADD_CHAT_MESSAGE",
          payload: { role: "assistant", content: result.reply },
        });

        if (result.isComplete && result.data) {
          dispatch({ type: "SET_RESUME_DATA", payload: result.data });
          setTimeout(() => dispatch({ type: "NEXT_STEP" }), 1500);
        }
      }
    } catch {
      dispatch({
        type: "ADD_CHAT_MESSAGE",
        payload: {
          role: "assistant",
          content: "Sorry, I encountered an error. Could you try again?",
        },
      });
    }

    setIsTyping(false);
    setTimeout(scrollToBottom, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="animate-fade-in-up" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h2 className="builder-step-title">
        Tell Us About <span className="text-gradient">Yourself</span>
      </h2>
      <p className="builder-step-subtitle">
        Chat with our AI assistant — we&apos;ll guide you through each section.
      </p>

      <div className="chat-container">
        <div className="chat-messages">
          {state.chatHistory.map((msg, i) => (
            <div key={i} className={`chat-bubble ${msg.role}`}>
              {msg.content}
            </div>
          ))}
          {isTyping && (
            <div className="typing-indicator">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <input
            id="chat-input"
            className="input"
            type="text"
            placeholder="Type your answer..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
          />
          <button
            className="btn btn-primary"
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 3 (DATA REVIEW) — shown after upload/chat when we have data
// ============================================================
function DataReview() {
  const { state, dispatch } = useBuilder();
  const data = state.resumeData;

  if (!data) return null;

  const generateResume = async () => {
    dispatch({
      type: "SET_LOADING",
      payload: { isLoading: true, message: "Generating your LaTeX resume..." },
    });

    try {
      const res = await fetch("/api/generate-latex", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: state.resumeData,
          template: state.template,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        dispatch({ type: "SET_PDF_URL", payload: url });
        dispatch({ type: "SET_LOADING", payload: { isLoading: false } });
        dispatch({ type: "NEXT_STEP" });
      } else {
        const error = await res.json();
        dispatch({ type: "SET_LOADING", payload: { isLoading: false } });
        dispatch({
          type: "SET_ERROR",
          payload: error.error || "Failed to generate resume. Please try again.",
        });
      }
    } catch {
      dispatch({ type: "SET_LOADING", payload: { isLoading: false } });
      dispatch({
        type: "SET_ERROR",
        payload: "Network error. Please check your connection.",
      });
    }
  };

  const enhanceSection = async (section: string) => {
    if (!state.isPremium) {
      dispatch({
        type: "SET_ERROR",
        payload: "Premium enhancement is available with the premium tier. Toggle premium mode to use this feature.",
      });
      return;
    }

    dispatch({
      type: "SET_LOADING",
      payload: { isLoading: true, message: `Enhancing ${section}...` },
    });

    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: state.resumeData,
          section,
        }),
      });

      const result = await res.json();
      if (result.success) {
        dispatch({ type: "SET_RESUME_DATA", payload: result.data });
      }
      dispatch({ type: "SET_LOADING", payload: { isLoading: false } });
    } catch {
      dispatch({ type: "SET_LOADING", payload: { isLoading: false } });
    }
  };

  return (
    <div className="animate-fade-in-up" style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <h2 className="builder-step-title">
        Review Your <span className="text-gradient">Information</span>
      </h2>
      <p className="builder-step-subtitle">
        Make sure everything looks good before we generate your resume.
      </p>

      {/* Premium Toggle */}
      <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={state.isPremium}
            onChange={(e) => dispatch({ type: "SET_PREMIUM", payload: e.target.checked })}
            style={{ width: "18px", height: "18px", accentColor: "#f59e0b" }}
            id="premium-toggle"
          />
          <span className="badge badge-premium">✨ Premium Mode</span>
        </label>
      </div>

      <div className="review-grid">
        {/* Personal Info */}
        <div className="glass-card review-section">
          <h4>👤 Personal Information</h4>
          <div className="review-item">
            <div className="review-label">Name</div>
            <div className="review-value">{data.personalInfo.fullName}</div>
          </div>
          <div className="review-item">
            <div className="review-label">Email</div>
            <div className="review-value">{data.personalInfo.email}</div>
          </div>
          <div className="review-item">
            <div className="review-label">Phone</div>
            <div className="review-value">{data.personalInfo.phone}</div>
          </div>
          {data.personalInfo.linkedin && (
            <div className="review-item">
              <div className="review-label">LinkedIn</div>
              <div className="review-value">{data.personalInfo.linkedin}</div>
            </div>
          )}
          {data.personalInfo.github && (
            <div className="review-item">
              <div className="review-label">GitHub</div>
              <div className="review-value">{data.personalInfo.github}</div>
            </div>
          )}
        </div>

        {/* Education */}
        <div className="glass-card review-section">
          <h4>🎓 Education</h4>
          {data.education.map((edu, i) => (
            <div key={i} style={{ marginBottom: "0.75rem" }}>
              <div className="review-value" style={{ fontWeight: 600 }}>
                {edu.institution}
              </div>
              <div className="review-value" style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                {edu.degree} in {edu.field}
                {edu.cgpa ? ` — CGPA: ${edu.cgpa}` : ""}
              </div>
              <div className="review-value" style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                {edu.startDate} — {edu.endDate}
              </div>
            </div>
          ))}
        </div>

        {/* Skills */}
        <div className="glass-card review-section">
          <h4>🛠 Technical Skills</h4>
          {data.skills.languages?.length ? (
            <div className="review-item">
              <div className="review-label">Languages</div>
              <div className="review-value">{data.skills.languages.join(", ")}</div>
            </div>
          ) : null}
          {data.skills.frameworks?.length ? (
            <div className="review-item">
              <div className="review-label">Frameworks</div>
              <div className="review-value">{data.skills.frameworks.join(", ")}</div>
            </div>
          ) : null}
          {data.skills.tools?.length ? (
            <div className="review-item">
              <div className="review-label">Tools</div>
              <div className="review-value">{data.skills.tools.join(", ")}</div>
            </div>
          ) : null}
          {data.skills.databases?.length ? (
            <div className="review-item">
              <div className="review-label">Databases</div>
              <div className="review-value">{data.skills.databases.join(", ")}</div>
            </div>
          ) : null}
        </div>

        {/* Projects */}
        {data.projects && data.projects.length > 0 && (
          <div className="glass-card review-section">
            <h4 style={{ justifyContent: "space-between" }}>
              <span>🚀 Projects</span>
              {state.isPremium && (
                <button
                  className="btn btn-ghost"
                  onClick={() => enhanceSection("projects")}
                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                >
                  ✨ Enhance
                </button>
              )}
            </h4>
            {data.projects.map((proj, i) => (
              <div key={i} style={{ marginBottom: "0.75rem" }}>
                <div className="review-value" style={{ fontWeight: 600 }}>
                  {proj.name}
                </div>
                <div className="review-value" style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                  {proj.techStack.join(", ")}
                </div>
                {proj.bullets.map((b, j) => (
                  <div key={j} className="review-value" style={{ fontSize: "0.875rem", paddingLeft: "0.75rem" }}>
                    • {b}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Experience */}
        {data.experience && data.experience.length > 0 && (
          <div className="glass-card review-section">
            <h4 style={{ justifyContent: "space-between" }}>
              <span>💼 Experience</span>
              {state.isPremium && (
                <button
                  className="btn btn-ghost"
                  onClick={() => enhanceSection("experience")}
                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                >
                  ✨ Enhance
                </button>
              )}
            </h4>
            {data.experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: "0.75rem" }}>
                <div className="review-value" style={{ fontWeight: 600 }}>
                  {exp.role} @ {exp.company}
                </div>
                <div className="review-value" style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                  {exp.startDate} — {exp.endDate}
                </div>
                {exp.bullets.map((b, j) => (
                  <div key={j} className="review-value" style={{ fontSize: "0.875rem", paddingLeft: "0.75rem" }}>
                    • {b}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Achievements */}
        {data.achievements && data.achievements.length > 0 && (
          <div className="glass-card review-section">
            <h4>🏆 Achievements</h4>
            {data.achievements.map((a, i) => (
              <div key={i} className="review-item">
                <div className="review-value">{a.title}</div>
                {a.description && (
                  <div className="review-value" style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                    {a.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Button */}
      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <button
          id="generate-resume-btn"
          className="btn btn-primary btn-xl"
          onClick={generateResume}
        >
          📄 Generate Resume
        </button>
      </div>
    </div>
  );
}

// ============================================================
// STEP 4: PDF PREVIEW & DOWNLOAD
// ============================================================
function PreviewDownload() {
  const { state, dispatch } = useBuilder();

  const handleDownload = () => {
    if (!state.generatedPdfUrl) return;
    const a = document.createElement("a");
    a.href = state.generatedPdfUrl;
    a.download = `resume-${state.template || "output"}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleStartOver = () => {
    if (state.generatedPdfUrl) {
      URL.revokeObjectURL(state.generatedPdfUrl);
    }
    dispatch({ type: "RESET" });
  };

  return (
    <div className="animate-fade-in-up preview-container">
      <h2 className="builder-step-title">
        Your Resume is <span className="text-gradient">Ready</span>! 🎉
      </h2>
      <p className="builder-step-subtitle">
        Preview your ATS-perfect resume below and download it.
      </p>

      {state.generatedPdfUrl && (
        <div className="pdf-viewer">
          <iframe
            src={state.generatedPdfUrl}
            title="Resume Preview"
          />
        </div>
      )}

      <div className="download-actions">
        <button
          id="download-resume-btn"
          className="btn btn-primary btn-xl"
          onClick={handleDownload}
        >
          ⬇️ Download Resume
        </button>
        <button
          className="btn btn-secondary btn-lg"
          onClick={handleStartOver}
        >
          🔄 Build Another
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MAIN BUILDER PAGE
// ============================================================
export default function BuilderPage() {
  const { state, dispatch } = useBuilder();

  const renderStep = () => {
    switch (state.step) {
      case 1:
        return <TemplateSelector />;
      case 2:
        return <InputMethodSelector />;
      case 3:
        if (state.resumeData) return <DataReview />;
        if (state.inputMethod === "upload") return <ResumeUploader />;
        if (state.inputMethod === "chat") return <GuidedChat />;
        return <InputMethodSelector />;
      case 4:
        return <PreviewDownload />;
      default:
        return <TemplateSelector />;
    }
  };

  return (
    <div className="builder-page">
      {/* Header */}
      <header className="builder-header">
        <Link href="/" className="builder-logo">
          Resume Builder — <span className="text-gradient">NSUT</span>
        </Link>

        <StepIndicator />

        {state.step > 1 && (
          <button
            className="back-button"
            onClick={() => {
              if (state.step === 3 && state.resumeData && state.inputMethod) {
                // If reviewing data, go back to input method step
                dispatch({ type: "SET_RESUME_DATA", payload: null as unknown as ResumeData });
              } else {
                dispatch({ type: "PREV_STEP" });
              }
            }}
          >
            ← Back
          </button>
        )}

        {state.step === 1 && <div style={{ width: "60px" }} />}
      </header>

      {/* Content */}
      <main className="builder-content">
        {renderStep()}

        {state.error && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem 1.5rem",
              background: "var(--color-error-bg)",
              border: "1px solid rgba(248, 113, 113, 0.3)",
              borderRadius: "var(--radius-lg)",
              color: "var(--color-error)",
              maxWidth: "600px",
              textAlign: "center",
              animation: "fadeInUp 0.3s ease-out",
            }}
          >
            {state.error}
          </div>
        )}
      </main>

      {/* Loading Overlay */}
      {state.isLoading && (
        <div className="loading-overlay">
          <div className="spinner spinner-lg" />
          <p>{state.loadingMessage || "Processing..."}</p>
        </div>
      )}
    </div>
  );
}
