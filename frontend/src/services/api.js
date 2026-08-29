import axios from 'axios';

// Use environment variable if available, otherwise default to local backend
const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

/**
 * Upload PDF resume file → parse into structured JSON
 */
export async function parseResumeApi(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/parse-resume', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
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

export default api;
