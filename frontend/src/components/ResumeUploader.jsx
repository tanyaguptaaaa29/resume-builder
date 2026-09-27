import React, { useState, useRef } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { parseResumeApi } from '../services/api';

export default function ResumeUploader() {
  const { dispatch } = useBuilder();
  const [fileName, setFileName] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (file.type !== 'application/pdf') {
      dispatch({ type: 'SET_ERROR', payload: 'Please upload a valid PDF document.' });
      return;
    }

    setFileName(file.name);
    dispatch({
      type: 'SET_LOADING',
      payload: { isLoading: true, message: 'Parsing PDF text stream and structuring JSON schema entities...' },
    });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const result = await parseResumeApi(file);
      if (result.success && result.data) {
        dispatch({ type: 'SET_RESUME_DATA', payload: result.data });
        dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
      } else {
        dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
        dispatch({
          type: 'SET_ERROR',
          payload: result.error || 'Failed to extract data from document.',
        });
      }
    } catch (err) {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
      dispatch({
        type: 'SET_ERROR',
        payload: err.response?.data?.error || 'Server connection error. Ensure the backend daemon is operational.',
      });
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <span className="mono-tag">DOCUMENT INGESTION</span>
        <h2 style={{ marginTop: '0.4rem', marginBottom: '0.4rem' }}>
          Upload Source Resume
        </h2>
        <p>
          Single or multi-page PDF documents are parsed in-memory without persistent database storage.
        </p>
      </div>

      <div
        className="upload-zone"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          style={{ display: 'none' }}
        />
        
        <div style={{ 
          fontFamily: 'var(--font-mono)', 
          fontSize: '0.8rem', 
          color: 'var(--color-accent)',
          marginBottom: '1rem'
        }}>
          {fileName ? '[ FILE DETECTED ]' : '[ DRAG & DROP OR CLICK TO BROWSE ]'}
        </div>

        <h4 style={{ marginBottom: '0.4rem' }}>
          {fileName || 'Select PDF Document'}
        </h4>
        
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          {fileName ? 'Processing binary stream...' : 'Format: PDF / Maximum size: 5MB'}
        </p>
      </div>
    </div>
  );
}
