import React, { createContext, useContext, useReducer } from 'react';

const initialState = {
  step: 1, // 1: Template, 2: Input Method, 3: Upload/Chat/Review, 4: Preview/Download
  template: null, // 'college' | 'offcampus'
  inputMethod: null, // 'upload' | 'chat'
  resumeData: null,
  chatHistory: [],
  generatedPdfUrl: null,
  generatedLatex: null,
  // Job Description (JD) Tailoring State
  jobDescription: '',
  targetRole: '',
  tailoredData: null,
  tailoredPdfUrl: null,
  tailoredLatex: null,
  adaptationsSummary: '',
  activeViewMode: 'original', // 'original' | 'tailored'
  isLoading: false,
  loadingMessage: '',
  error: null,
  isPremium: false,
};

function builderReducer(state, action) {
  switch (action.type) {
    case 'SET_TEMPLATE':
      return { ...state, template: action.payload };
    case 'SET_INPUT_METHOD':
      return { ...state, inputMethod: action.payload };
    case 'SET_RESUME_DATA':
      return { ...state, resumeData: action.payload };
    case 'SET_CHAT_HISTORY':
      return { ...state, chatHistory: action.payload };
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatHistory: [...state.chatHistory, action.payload] };
    case 'SET_PDF_URL':
      return { ...state, generatedPdfUrl: action.payload };
    case 'SET_LATEX_CODE':
      return { ...state, generatedLatex: action.payload };
    case 'SET_JOB_DESCRIPTION':
      return { ...state, jobDescription: action.payload };
    case 'SET_TARGET_ROLE':
      return { ...state, targetRole: action.payload };
    case 'SET_TAILORED_RESULT':
      return {
        ...state,
        tailoredData: action.payload.data,
        tailoredPdfUrl: action.payload.pdfUrl,
        tailoredLatex: action.payload.latex,
        adaptationsSummary: action.payload.adaptationsSummary || '',
        activeViewMode: 'tailored',
      };
    case 'SET_VIEW_MODE':
      return { ...state, activeViewMode: action.payload };
    case 'RESET_TAILORED':
      if (state.tailoredPdfUrl) {
        URL.revokeObjectURL(state.tailoredPdfUrl);
      }
      return {
        ...state,
        tailoredData: null,
        tailoredPdfUrl: null,
        tailoredLatex: null,
        adaptationsSummary: '',
        activeViewMode: 'original',
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload.isLoading,
        loadingMessage: action.payload.message || '',
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_PREMIUM':
      return { ...state, isPremium: action.payload };
    case 'NEXT_STEP':
      return { ...state, step: Math.min(state.step + 1, 4), error: null };
    case 'PREV_STEP':
      return { ...state, step: Math.max(state.step - 1, 1), error: null };
    case 'RESET':
      if (state.generatedPdfUrl) URL.revokeObjectURL(state.generatedPdfUrl);
      if (state.tailoredPdfUrl) URL.revokeObjectURL(state.tailoredPdfUrl);
      return initialState;
    default:
      return state;
  }
}

const BuilderContext = createContext(null);

export function BuilderProvider({ children }) {
  const [state, dispatch] = useReducer(builderReducer, initialState);

  return (
    <BuilderContext.Provider value={{ state, dispatch }}>
      {children}
    </BuilderContext.Provider>
  );
}

export function useBuilder() {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error('useBuilder must be used within a BuilderProvider');
  }
  return context;
}
