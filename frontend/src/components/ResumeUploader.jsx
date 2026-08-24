import React, { useState, useRef } from 'react';
import { useBuilder } from '../context/BuilderContext';
import { parseResumeApi } from '../services/api';

export default function ResumeUploader() {
  const { dispatch } = useBuilder();
  const [fileName, setFileName] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (file.type !== 'application/pdf') {
      dispatch({ type: 'SET_ERROR', payload: 'Please upload a PDF file.' });
      return;
    }

    setFileName(file.name);
    dispatch({
      type: 'SET_LOADING',
      payload: { isLoading: true, message: 'Extracting and optimizing data for ATS via AI...' },
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
          payload: result.error || 'Failed to extract data.',
        });
      }
    } catch (err) {
      dispatch({ type: 'SET_LOADING', payload: { isLoading: false } });
      dispatch({
        type: 'SET_ERROR',
        payload: err.response?.data?.error || 'Server error. Please ensure backend is running.',
      });
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
        Upload Your <span className="text-gradient">Resume</span>
      </h2>
      <p style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        Drop your PDF resume below and our AI will extract your information.
      </p>

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
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          {fileName ? '✅' : '📄'}
        </div>
        <h4>{fileName || 'Drop your resume here'}</h4>
        <p>{fileName ? 'File ready — processing...' : 'PDF only, max 5MB'}</p>
      </div>
    </div>
  );
}
