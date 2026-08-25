import React, { useState } from "react";
import { useBuilder } from "../context/BuilderContext";

export default function ManualForm() {
  const { dispatch } = useBuilder();
  const [formData, setFormData] = useState({
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
    skills: {
      languages: [],
      frameworks: [],
      tools: [],
    },
  });

  const [activeTab, setActiveTab] = useState("personal");

  const handlePersonalInfoChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [name]: value },
    }));
  };

  const handleSkillChange = (category, value) => {
    setFormData((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [category]: value.split(",").map((s) => s.trim()).filter(Boolean),
      },
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
    dispatch({ type: "SET_RESUME_DATA", payload: formData });
  };

  return (
    <div className="animate-fade-in-up" style={{ width: "100%", maxWidth: "800px", margin: "0 auto" }}>
      <h2 className="builder-step-title">
        Fill Your <span className="text-gradient">Details</span>
      </h2>
      <p className="builder-step-subtitle">
        Please fill out the sections below. Education and Projects are required.
      </p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {["personal", "education", "experience", "projects", "skills"].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "0.5rem 1rem",
              background: activeTab === tab ? "var(--color-primary)" : "var(--color-bg-secondary)",
              color: activeTab === tab ? "#000" : "var(--color-text)",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              textTransform: "capitalize",
              fontWeight: activeTab === tab ? 600 : 400,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        
        {activeTab === "personal" && (
          <div className="form-section" style={{ display: "flex", flexDirection: "column", gap: "1rem", background: "var(--color-bg-secondary)", padding: "1.5rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)" }}>
            <h3>Personal Information</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <input className="input-field" name="name" placeholder="Full Name *" value={formData.personalInfo.name} onChange={handlePersonalInfoChange} required />
              <input className="input-field" name="email" type="email" placeholder="Email *" value={formData.personalInfo.email} onChange={handlePersonalInfoChange} required />
              <input className="input-field" name="phone" placeholder="Phone" value={formData.personalInfo.phone} onChange={handlePersonalInfoChange} />
              <input className="input-field" name="location" placeholder="Location (e.g. City, State)" value={formData.personalInfo.location} onChange={handlePersonalInfoChange} />
              <input className="input-field" name="github" placeholder="GitHub URL" value={formData.personalInfo.github} onChange={handlePersonalInfoChange} />
              <input className="input-field" name="linkedin" placeholder="LinkedIn URL" value={formData.personalInfo.linkedin} onChange={handlePersonalInfoChange} />
              <input className="input-field" name="portfolio" placeholder="Portfolio URL" value={formData.personalInfo.portfolio} onChange={handlePersonalInfoChange} />
              <input className="input-field" name="leetcode" placeholder="LeetCode URL" value={formData.personalInfo.leetcode} onChange={handlePersonalInfoChange} />
              <input className="input-field" name="codeforces" placeholder="CodeForces URL" value={formData.personalInfo.codeforces} onChange={handlePersonalInfoChange} />
            </div>
          </div>
        )}

        {activeTab === "education" && (
          <div className="form-section" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>Education *</h3>
              <button type="button" className="btn btn-secondary" style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }} onClick={() => addArrayItem("education", { school: "", degree: "", major: "", gpa: "", startDate: "", endDate: "", location: "" })}>+ Add</button>
            </div>
            {formData.education.map((edu, idx) => (
              <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "1rem", background: "var(--color-bg-secondary)", padding: "1.5rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <input className="input-field" placeholder="School/University" value={edu.school} onChange={(e) => updateArrayItem("education", idx, "school", e.target.value)} required />
                  <input className="input-field" placeholder="Degree (e.g. B.Tech)" value={edu.degree} onChange={(e) => updateArrayItem("education", idx, "degree", e.target.value)} required />
                  <input className="input-field" placeholder="Major (e.g. Computer Science)" value={edu.major} onChange={(e) => updateArrayItem("education", idx, "major", e.target.value)} required />
                  <input className="input-field" placeholder="GPA/CGPA" value={edu.gpa} onChange={(e) => updateArrayItem("education", idx, "gpa", e.target.value)} />
                  <input className="input-field" placeholder="Start Date (e.g. Aug 2020)" value={edu.startDate} onChange={(e) => updateArrayItem("education", idx, "startDate", e.target.value)} required />
                  <input className="input-field" placeholder="End Date (e.g. May 2024)" value={edu.endDate} onChange={(e) => updateArrayItem("education", idx, "endDate", e.target.value)} required />
                  <input className="input-field" placeholder="Location" value={edu.location} onChange={(e) => updateArrayItem("education", idx, "location", e.target.value)} />
                </div>
                <button type="button" onClick={() => removeArrayItem("education", idx)} style={{ alignSelf: "flex-end", color: "var(--color-error)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Remove</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "experience" && (
          <div className="form-section" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>Experience (Optional)</h3>
              <button type="button" className="btn btn-secondary" style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }} onClick={() => addArrayItem("experience", { company: "", position: "", startDate: "", endDate: "", location: "", description: [] })}>+ Add</button>
            </div>
            {formData.experience.map((exp, idx) => (
              <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "1rem", background: "var(--color-bg-secondary)", padding: "1.5rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <input className="input-field" placeholder="Company" value={exp.company} onChange={(e) => updateArrayItem("experience", idx, "company", e.target.value)} required />
                  <input className="input-field" placeholder="Position" value={exp.position} onChange={(e) => updateArrayItem("experience", idx, "position", e.target.value)} required />
                  <input className="input-field" placeholder="Start Date" value={exp.startDate} onChange={(e) => updateArrayItem("experience", idx, "startDate", e.target.value)} required />
                  <input className="input-field" placeholder="End Date" value={exp.endDate} onChange={(e) => updateArrayItem("experience", idx, "endDate", e.target.value)} required />
                  <input className="input-field" placeholder="Location" value={exp.location} onChange={(e) => updateArrayItem("experience", idx, "location", e.target.value)} />
                </div>
                <textarea className="input-field" placeholder="Description (Separate bullet points with new lines)" rows={4} value={exp.description ? exp.description.join("\n") : ""} onChange={(e) => updateArrayItem("experience", idx, "description", e.target.value.split("\n").filter(Boolean))} required />
                <button type="button" onClick={() => removeArrayItem("experience", idx)} style={{ alignSelf: "flex-end", color: "var(--color-error)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Remove</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "projects" && (
          <div className="form-section" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3>Projects *</h3>
              <button type="button" className="btn btn-secondary" style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }} onClick={() => addArrayItem("projects", { title: "", link: "", technologies: "", description: [] })}>+ Add</button>
            </div>
            {formData.projects.map((proj, idx) => (
              <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "1rem", background: "var(--color-bg-secondary)", padding: "1.5rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <input className="input-field" placeholder="Project Title" value={proj.title} onChange={(e) => updateArrayItem("projects", idx, "title", e.target.value)} required />
                  <input className="input-field" placeholder="Project Link (Optional)" value={proj.link} onChange={(e) => updateArrayItem("projects", idx, "link", e.target.value)} />
                </div>
                <input className="input-field" placeholder="Technologies Used (e.g. React, Node.js)" value={proj.technologies} onChange={(e) => updateArrayItem("projects", idx, "technologies", e.target.value)} required />
                <textarea className="input-field" placeholder="Description (Separate bullet points with new lines)" rows={4} value={proj.description ? proj.description.join("\n") : ""} onChange={(e) => updateArrayItem("projects", idx, "description", e.target.value.split("\n").filter(Boolean))} required />
                <button type="button" onClick={() => removeArrayItem("projects", idx)} style={{ alignSelf: "flex-end", color: "var(--color-error)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Remove</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "skills" && (
          <div className="form-section" style={{ display: "flex", flexDirection: "column", gap: "1rem", background: "var(--color-bg-secondary)", padding: "1.5rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--color-border)" }}>
            <h3>Skills</h3>
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>Separate multiple items with commas.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input className="input-field" placeholder="Languages (e.g. C++, Java, Python)" value={formData.skills.languages ? formData.skills.languages.join(", ") : ""} onChange={(e) => handleSkillChange("languages", e.target.value)} />
              <input className="input-field" placeholder="Frameworks (e.g. React, Next.js, Express)" value={formData.skills.frameworks ? formData.skills.frameworks.join(", ") : ""} onChange={(e) => handleSkillChange("frameworks", e.target.value)} />
              <input className="input-field" placeholder="Tools (e.g. Git, Docker, AWS)" value={formData.skills.tools ? formData.skills.tools.join(", ") : ""} onChange={(e) => handleSkillChange("tools", e.target.value)} />
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button type="submit" className="btn btn-primary btn-lg">
            Review and Generate
          </button>
        </div>
      </form>
    </div>
  );
}
