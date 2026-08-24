import React, { useState, useEffect, useRef } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { chatApi } from '../services/api';

export default function GuidedChat() {
  const { state, dispatch } = useBuilder();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function init() {
      setIsTyping(true);
      try {
        const result = await chatApi([]);
        if (result.success) {
          dispatch({
            type: 'ADD_CHAT_MESSAGE',
            payload: { role: 'assistant', content: result.reply },
          });
        }
      } catch {
        dispatch({
          type: 'ADD_CHAT_MESSAGE',
          payload: {
            role: 'assistant',
            content: "Hi! 👋 I'm your resume building assistant. Let's start with your full name — what should I put at the top of your resume?",
          },
        });
      }
      setIsTyping(false);
    }
    init();
  }, [dispatch]);

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = { role: 'user', content: input.trim() };
    const updatedMessages = [...state.chatHistory, userMsg];

    dispatch({ type: 'ADD_CHAT_MESSAGE', payload: userMsg });
    setInput('');
    setIsTyping(true);

    try {
      const result = await chatApi(updatedMessages);
      if (result.success) {
        dispatch({
          type: 'ADD_CHAT_MESSAGE',
          payload: { role: 'assistant', content: result.reply },
        });

        if (result.isComplete && result.data) {
          dispatch({ type: 'SET_RESUME_DATA', payload: result.data });
        }
      }
    } catch {
      dispatch({
        type: 'ADD_CHAT_MESSAGE',
        payload: {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Could you try again?',
        },
      });
    }
    setIsTyping(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatHistory, isTyping]);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
        Tell Us About <span className="text-gradient">Yourself</span>
      </h2>
      <p style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        Chat with our AI assistant — we&apos;ll guide you step by step.
      </p>

      <div className="chat-container">
        <div className="chat-messages">
          {state.chatHistory.map((msg, i) => (
            <div key={i} className={`chat-bubble ${msg.role}`}>
              {msg.content}
            </div>
          ))}
          {isTyping && (
            <div className="chat-bubble assistant">Thinking...</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <input
            className="input"
            type="text"
            placeholder="Type your answer..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            disabled={isTyping}
          />
          <button className="btn btn-primary" onClick={sendMessage} disabled={!input.trim() || isTyping}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
