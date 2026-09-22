import axios from 'axios';

// In development, Vite dev server proxies '/api' -> 'http://localhost:5000' (zero CORS issues).
// In production, VITE_API_BASE_URL can override this if backend is hosted on another domain.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

/**
 * Upload PDF resume file → parse into structured JSON
 */
export async function parseResumeApi(file) {
  const formData = new FormData();
  formData.append('file', file);

  // Don't set Content-Type manually — axios auto-detects FormData
  // and sets 'multipart/form-data' with the correct boundary.
  const response = await api.post('/parse-resume', formData);
  return response.data;
}

/**
 * Generate LaTeX code and compile to PDF → returns Blob URL for preview/download
 */
export async function generateLatexApi(data, template) {
  const response = await api.post(
    '/generate-latex',
    { data, template }
  );
  return response.data;
}

/**
 * Premium AI Content Enhancement
 */
export async function enhanceApi(data, section) {
  const response = await api.post('/enhance', { data, section });
  return response.data;
}

/**
 * Tailor Resume to Job Description (JD)
 */
export async function tailorResumeApi({
  data,
  jobDescription,
  targetRole,
  githubContext = [],
  projectNotes = "",
  template,
  compile = true,
}) {
  const response = await api.post('/tailor-resume', {
    data,
    jobDescription,
    targetRole,
    githubContext,
    projectNotes,
    template,
    compile,
  });
  return response.data;
}

/**
 * Inspect Public GitHub Repository Codebase Architecture
 */
export async function analyzeGithubApi(repoUrl) {
  const response = await api.post('/analyze-github', { repoUrl });
  return response.data;
}

export default api;
