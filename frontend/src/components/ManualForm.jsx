import React, { useState, useEffect } from "react";
import { useBuilder } from "../context/BuilderContext";

const INITIAL_FORM_DATA = {
  personalInfo: {
    name: "",
    email: "",
    phone: "",
    location: "",
    github: "",
    linkedin: "",
    portfolio: "",
    leetcode: "",
    codeforces: "",
  },
  education: [],
  experience: [],
  projects: [],
  skills: [
    { id: "s1", category: "Languages", items: "" },
    { id: "s2", category: "Frameworks", items: "" },
    { id: "s3", category: "Tools", items: "" }
  ],
};

export default function ManualForm() {
  const { dispatch } = useBuilder();
  const [formData, setFormData] = useState(() => {
    const saved = sessionStorage.getItem("resumeFormData");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_FORM_DATA;
      }
    }
    return INITIAL_FORM_DATA;
  });

  const [activeTab, setActiveTab] = useState("personal");

  useEffect(() => {
    sessionStorage.setItem("resumeFormData", JSON.stringify(formData));
  }, [formData]);

  const handlePersonalInfoChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [name]: value },
    }));
  };

  const addArrayItem = (field, emptyItem) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], emptyItem],
    }));
  };

  const updateArrayItem = (field, index, key, value) => {
    setFormData((prev) => {
      const arr = [...prev[field]];
      arr[index] = { ...arr[index], [key]: value };
      return { ...prev, [field]: arr };
    });
  };

  const removeArrayItem = (field, index) => {
    setFormData((prev) => {
      const arr = [...prev[field]];
      arr.splice(index, 1);
      return { ...prev, [field]: arr };
    });
  };

  const handleClearForm = () => {
    if (window.confirm("Are you sure you want to clear all form data? This cannot be undone.")) {
      setFormData(INITIAL_FORM_DATA);
      sessionStorage.removeItem("resumeFormData");
      setActiveTab("personal");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.personalInfo.name || !formData.personalInfo.email) {
      dispatch({ type: "SET_ERROR", payload: "Name and Email are required." });
      return;
    }
    if (!formData.education || formData.education.length === 0) {
      dispatch({ type: "SET_ERROR", payload: "At least one Education entry is required." });
      return;
    }
    if (!formData.projects || formData.projects.length === 0) {
      dispatch({ type: "SET_ERROR", payload: "At least one Project entry is required." });
      return;
    }

    dispatch({ type: "SET_ERROR", payload: null });
    
    // Map data to match the expected schema for DataReview and the LaTeX generator
    const mappedData = {
      ...formData,
      personalInfo: {
        ...formData.personalInfo,
        fullName: formData.personalInfo.name
      },
      education: formData.education.map(edu => ({
        ...edu,
        institution: edu.school || edu.institution,
        field: edu.major || edu.field,
        cgpa: edu.gpa || edu.cgpa
      })),
      experience: formData.experience.map(exp => ({
        ...exp,
        role: exp.position || exp.role,
        bullets: exp.description || exp.bullets
      })),
      projects: formData.projects.map(proj => ({
        ...proj,
        name: proj.title || proj.name,
        link: proj.link,
        liveLink: proj.liveLink,
        bullets: proj.description || proj.bullets,
        techStack: typeof proj.technologies === 'string' 
          ? proj.technologies.split(',').map(s => s.trim()).filter(Boolean)
          : (proj.technologies || proj.techStack || [])
      }))
    };

    dispatch({ type: "SET_RESUME_DATA", payload: mappedData });
  };

  const tabs = [
    { id: "personal", label: "Personal Info", icon: "👤" },
    { id: "education", label: "Education", icon: "🎓" },
    { id: "experience", label: "Experience", icon: "💼" },
    { id: "projects", label: "Projects", icon: "🚀" },
    { id: "skills", label: "Skills", icon: "🛠" },
  ];

  return (
    <div className="animate-fade-in-up manual-form-container" style={{ width: "100%", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h2 className="builder-step-title" style={{ marginBottom: 0, textAlign: "left" }}>
          Fill Your <span className="text-gradient">Details</span>
        </h2>
        <button type="button" onClick={handleClearForm} className="btn btn-ghost" style={{ color: "var(--color-error)", fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}>
          🗑 Clear Form
        </button>
      </div>
      <p className="builder-step-subtitle" style={{ textAlign: "left", marginBottom: "2rem" }}>
        All data is auto-saved locally. Education and Projects are required.
      </p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "0.75rem 1.25rem",
              background: activeTab === tab.id ? "var(--color-accent-light)" : "var(--color-bg-glass)",
              color: activeTab === tab.id ? "var(--color-accent)" : "var(--color-text-primary)",
              border: `1px solid ${activeTab === tab.id ? "var(--color-border-accent)" : "var(--color-border)"}`,
              borderRadius: "var(--radius-full)",
              cursor: "pointer",
              fontWeight: activeTab === tab.id ? 600 : 400,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all var(--transition-fast)"
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        
        {activeTab === "personal" && (
          <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", padding: "2rem" }}>
            <h3 style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "0.5rem" }}>Personal Information</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>Full Name *</label>
                <input className="input" name="name" placeholder="John Doe" value={formData.personalInfo.name} onChange={handlePersonalInfoChange} required />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>Email *</label>
                <input className="input" name="email" type="email" placeholder="john@example.com" value={formData.personalInfo.email} onChange={handlePersonalInfoChange} required />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>Phone</label>
                <input className="input" name="phone" placeholder="+1 234 567 890" value={formData.personalInfo.phone} onChange={handlePersonalInfoChange} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>Location</label>
                <input className="input" name="location" placeholder="City, State" value={formData.personalInfo.location} onChange={handlePersonalInfoChange} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>LinkedIn URL</label>
                <input className="input" name="linkedin" placeholder="https://linkedin.com/in/..." value={formData.personalInfo.linkedin} onChange={handlePersonalInfoChange} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>GitHub URL</label>
                <input className="input" name="github" placeholder="https://github.com/..." value={formData.personalInfo.github} onChange={handlePersonalInfoChange} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>Portfolio URL</label>
                <input className="input" name="portfolio" placeholder="https://johndoe.com" value={formData.personalInfo.portfolio} onChange={handlePersonalInfoChange} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>LeetCode URL</label>
                <input className="input" name="leetcode" placeholder="https://leetcode.com/..." value={formData.personalInfo.leetcode} onChange={handlePersonalInfoChange} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>CodeForces URL</label>
                <input className="input" name="codeforces" placeholder="https://codeforces.com/profile/..." value={formData.personalInfo.codeforces} onChange={handlePersonalInfoChange} />
              </div>
            </div>
          </div>
        )}

        {activeTab === "education" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <h3 style={{ margin: 0 }}>Education *</h3>
              <button type="button" className="btn btn-secondary" style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }} onClick={() => addArrayItem("education", { school: "", degree: "", major: "", gpa: "", startDate: "", endDate: "", location: "" })}>+ Add Education</button>
            </div>
            {formData.education.map((edu, idx) => (
              <div key={idx} className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.5rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>School/University *</label>
                    <input className="input" placeholder="e.g. NSUT" value={edu.school} onChange={(e) => updateArrayItem("education", idx, "school", e.target.value)} required />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Degree *</label>
                    <input className="input" placeholder="e.g. B.Tech" value={edu.degree} onChange={(e) => updateArrayItem("education", idx, "degree", e.target.value)} required />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Major/Field *</label>
                    <input className="input" placeholder="e.g. Computer Science" value={edu.major} onChange={(e) => updateArrayItem("education", idx, "major", e.target.value)} required />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>GPA/CGPA</label>
                    <input className="input" placeholder="e.g. 8.5" value={edu.gpa} onChange={(e) => updateArrayItem("education", idx, "gpa", e.target.value)} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Start Date *</label>
                    <input className="input" placeholder="e.g. Aug 2020" value={edu.startDate} onChange={(e) => updateArrayItem("education", idx, "startDate", e.target.value)} required />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>End Date *</label>
                    <input className="input" placeholder="e.g. May 2024" value={edu.endDate} onChange={(e) => updateArrayItem("education", idx, "endDate", e.target.value)} required />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Location</label>
                    <input className="input" placeholder="e.g. New Delhi, India" value={edu.location} onChange={(e) => updateArrayItem("education", idx, "location", e.target.value)} />
                  </div>
                </div>
                <button type="button" onClick={() => removeArrayItem("education", idx)} style={{ alignSelf: "flex-end", color: "var(--color-error)", background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline" }}>Remove</button>
              </div>
            ))}
            {formData.education.length === 0 && <p style={{ color: "var(--color-text-muted)" }}>No education entries added.</p>}
          </div>
        )}

        {activeTab === "experience" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <h3 style={{ margin: 0 }}>Experience (Optional)</h3>
              <button type="button" className="btn btn-secondary" style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }} onClick={() => addArrayItem("experience", { company: "", position: "", startDate: "", endDate: "", location: "", description: [] })}>+ Add Experience</button>
            </div>
            {formData.experience.map((exp, idx) => (
              <div key={idx} className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.5rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Company *</label>
                    <input className="input" placeholder="e.g. Google" value={exp.company} onChange={(e) => updateArrayItem("experience", idx, "company", e.target.value)} required />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Position *</label>
                    <input className="input" placeholder="e.g. Software Engineer" value={exp.position} onChange={(e) => updateArrayItem("experience", idx, "position", e.target.value)} required />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Start Date *</label>
                    <input className="input" placeholder="e.g. June 2023" value={exp.startDate} onChange={(e) => updateArrayItem("experience", idx, "startDate", e.target.value)} required />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>End Date *</label>
                    <input className="input" placeholder="e.g. Present" value={exp.endDate} onChange={(e) => updateArrayItem("experience", idx, "endDate", e.target.value)} required />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", gridColumn: "1 / -1" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Location</label>
                    <input className="input" placeholder="e.g. Bengaluru, India" value={exp.location} onChange={(e) => updateArrayItem("experience", idx, "location", e.target.value)} />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Description (Separate bullet points with new lines) *</label>
                  <textarea className="input" placeholder="Developed..." rows={4} value={exp.description ? exp.description.join("\n") : ""} onChange={(e) => updateArrayItem("experience", idx, "description", e.target.value.split("\n").filter(Boolean))} required />
                </div>
                <button type="button" onClick={() => removeArrayItem("experience", idx)} style={{ alignSelf: "flex-end", color: "var(--color-error)", background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline" }}>Remove</button>
              </div>
            ))}
            {formData.experience.length === 0 && <p style={{ color: "var(--color-text-muted)" }}>No experience entries added.</p>}
          </div>
        )}

        {activeTab === "projects" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <h3 style={{ margin: 0 }}>Projects *</h3>
              <button type="button" className="btn btn-secondary" style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }} onClick={() => addArrayItem("projects", { title: "", link: "", liveLink: "", technologies: "", description: [] })}>+ Add Project</button>
            </div>
            {formData.projects.map((proj, idx) => (
              <div key={idx} className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.5rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Project Title *</label>
                    <input className="input" placeholder="e.g. E-Commerce Platform" value={proj.title} onChange={(e) => updateArrayItem("projects", idx, "title", e.target.value)} required />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Source Code Link (GitHub)</label>
                    <input className="input" placeholder="e.g. https://github.com/..." value={proj.link} onChange={(e) => updateArrayItem("projects", idx, "link", e.target.value)} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Live Link (Deployed Site)</label>
                    <input className="input" placeholder="e.g. https://myproject.com" value={proj.liveLink} onChange={(e) => updateArrayItem("projects", idx, "liveLink", e.target.value)} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Technologies Used *</label>
                    <input className="input" placeholder="e.g. React, Node.js, MongoDB" value={proj.technologies} onChange={(e) => updateArrayItem("projects", idx, "technologies", e.target.value)} required />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Description (Separate bullet points with new lines) *</label>
                  <textarea className="input" placeholder="Architected..." rows={4} value={proj.description ? proj.description.join("\n") : ""} onChange={(e) => updateArrayItem("projects", idx, "description", e.target.value.split("\n").filter(Boolean))} required />
                </div>
                <button type="button" onClick={() => removeArrayItem("projects", idx)} style={{ alignSelf: "flex-end", color: "var(--color-error)", background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline" }}>Remove</button>
              </div>
            ))}
            {formData.projects.length === 0 && <p style={{ color: "var(--color-text-muted)" }}>No projects added.</p>}
          </div>
        )}

        {activeTab === "skills" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <h3 style={{ margin: 0 }}>Technical Skills</h3>
              <button type="button" className="btn btn-secondary" style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }} onClick={() => addArrayItem("skills", { id: Date.now().toString(), category: "", items: "" })}>+ Add Skill Category</button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {formData.skills.map((skill, idx) => (
                <div key={skill.id || idx} className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <input 
                      className="input" 
                      style={{ background: "transparent", border: "none", fontSize: "1.1rem", fontWeight: "bold", padding: 0, boxShadow: "none" }}
                      value={skill.category} 
                      onChange={(e) => updateArrayItem("skills", idx, "category", e.target.value)}
                      placeholder="Category Name (e.g. Languages)"
                    />
                    <button type="button" onClick={() => removeArrayItem("skills", idx)} style={{ color: "var(--color-text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
                  </div>
                  <input 
                    className="input" 
                    value={skill.items} 
                    onChange={(e) => updateArrayItem("skills", idx, "items", e.target.value)}
                    placeholder="Comma-separated skills (e.g. C++, Java, Python)" 
                  />
                </div>
              ))}
              {formData.skills.length === 0 && <p style={{ color: "var(--color-text-muted)" }}>No skills added.</p>}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2rem", borderTop: "1px solid var(--color-border)", paddingTop: "1.5rem" }}>
          <button type="submit" className="btn btn-primary btn-lg">
            Review and Generate ✨
          </button>
        </div>
      </form>
    </div>
  );
}
