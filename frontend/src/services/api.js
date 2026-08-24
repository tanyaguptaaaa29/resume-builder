import axios from 'axios';

// Express backend base URL
const API_BASE_URL = '/api';

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
 * Send chat message history → get Gemma response
 */
export async function chatApi(messages) {
  const response = await api.post('/chat', { messages });
  return response.data;
}

/**
 * Generate LaTeX code and compile to PDF → returns Blob URL for preview/download
 */
export async function generateLatexApi(data, template) {
  const response = await api.post(
    '/generate-latex',
    { data, template },
    { responseType: 'blob' }
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
