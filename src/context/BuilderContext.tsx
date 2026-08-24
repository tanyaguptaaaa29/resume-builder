"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
} from "react";
import type {
  ResumeData,
  ChatMessage,
  TemplateType,
  InputMethod,
  BuilderStep,
} from "@/lib/schemas/resume";

// --- State ---
export interface BuilderState {
  step: BuilderStep;
  template: TemplateType | null;
  inputMethod: InputMethod | null;
  resumeData: ResumeData | null;
  chatHistory: ChatMessage[];
  generatedPdfUrl: string | null;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  isPremium: boolean;
}

const initialState: BuilderState = {
  step: 1,
  template: null,
  inputMethod: null,
  resumeData: null,
  chatHistory: [],
  generatedPdfUrl: null,
  isLoading: false,
  loadingMessage: "",
  error: null,
  isPremium: false,
};

// --- Actions ---
type BuilderAction =
  | { type: "SET_TEMPLATE"; payload: TemplateType }
  | { type: "SET_INPUT_METHOD"; payload: InputMethod }
  | { type: "SET_RESUME_DATA"; payload: ResumeData }
  | { type: "SET_CHAT_HISTORY"; payload: ChatMessage[] }
  | { type: "ADD_CHAT_MESSAGE"; payload: ChatMessage }
  | { type: "SET_PDF_URL"; payload: string }
  | { type: "SET_LOADING"; payload: { isLoading: boolean; message?: string } }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_PREMIUM"; payload: boolean }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "GO_TO_STEP"; payload: BuilderStep }
  | { type: "RESET" };

function builderReducer(
  state: BuilderState,
  action: BuilderAction
): BuilderState {
  switch (action.type) {
    case "SET_TEMPLATE":
      return { ...state, template: action.payload };
    case "SET_INPUT_METHOD":
      return { ...state, inputMethod: action.payload };
    case "SET_RESUME_DATA":
      return { ...state, resumeData: action.payload };
    case "SET_CHAT_HISTORY":
      return { ...state, chatHistory: action.payload };
    case "ADD_CHAT_MESSAGE":
      return {
        ...state,
        chatHistory: [...state.chatHistory, action.payload],
      };
    case "SET_PDF_URL":
      return { ...state, generatedPdfUrl: action.payload };
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload.isLoading,
        loadingMessage: action.payload.message || "",
      };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "NEXT_STEP":
      return {
        ...state,
        step: Math.min(state.step + 1, 4) as BuilderStep,
        error: null,
      };
    case "PREV_STEP":
      return {
        ...state,
        step: Math.max(state.step - 1, 1) as BuilderStep,
        error: null,
      };
    case "GO_TO_STEP":
      return { ...state, step: action.payload, error: null };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

// --- Context ---
interface BuilderContextType {
  state: BuilderState;
  dispatch: React.Dispatch<BuilderAction>;
}

const BuilderContext = createContext<BuilderContextType | null>(null);

export function BuilderProvider({ children }: { children: ReactNode }) {
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
    throw new Error("useBuilder must be used within a BuilderProvider");
  }
  return context;
}
