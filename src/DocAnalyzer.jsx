import React, { useState, useRef } from 'react';
import { groqService, notificationService } from './services.js';

const ACCEPTED_TYPES = '.pdf,.txt,.doc,.docx,.md,.csv';

export default function DocAnalyzer() {
  const [file, setFile]         = useState(null);
  const [fileText, setFileText] = useState('');
  const [question, setQuestion] = useState('');
  const [result, setResult]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const readFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult('');
    const reader = new FileReader();
    reader.onload = (e) => setFileText(e.target.result || '');
    reader.onerror = () => notificationService.error('Error al leer el archivo.');
    if (f.type === 'application/pdf') {
      // PDF: leer como texto plano (limitado sin pdfjs)
      reader.readAsText(f);
    } else {
      reader.readAsText(f, 'UTF-8');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) readFile(f);
  };

  const handleAnalyze = async (e) => {
    e?.preventDefault();
    if (!fileText.trim()) {
      notificationService.error('Sube un documento primero.');
      return;
    }
    setLoading(true);
    setResult('');
    try {
      const q = question.trim() || '¿Cuáles son los puntos estratégicos más importantes de este documento?';
      const analysis = await groqService.analyzeDocument(fileText, q);
      setResult(analysis);
    } catch (err) {
      notificationService.error('Error al analizar: ' + err.message);
      setResult('⚠️ Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    '¿Cuáles son los puntos principales?',
    'Resume en 5 puntos clave',
    '¿Qué riesgos identifica?',
    '¿Qué acciones recomienda?',
    'Extrae los KPIs mencionados',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current?.click()}
        style={{
          border: '2px dashed ' + (dragOver ? 'var(--primary)' : 'var(--border)'),
          borderRadius: 14, padding: '32px 20px', textAlign: 'center',
          background: dragOver ? 'var(--primary-light)' : 'var(--bg2)',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 8 }}>{file ? '📄' : '📂'}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
          {file ? file.name : 'Arrastra tu documento aquí o haz clic para seleccionar'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>
          {file
            ? (fileText ? '✅ Listo para analizar — ' + Math.round(fileText.length / 1000) + 'K caracteres' : 'Leyendo...')
            : 'PDF, TXT, DOCX, MD, CSV'
          }
        </div>
        <input ref={fileRef} type="file" accept={ACCEPTED_TYPES} style={{ display: 'none' }}
          onChange={e => readFile(e.target.files[0])} />
      </div>

      {/* Pregunta */}
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
          Pregunta o instrucción
        </label>
        <textarea
          className="sp-input"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="¿Cuáles son los puntos estratégicos más importantes?"
          rows={2}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14, resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }}
        />
        {/* Preguntas rápidas */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {quickQuestions.map(q => (
            <button key={q} onClick={() => setQuestion(q)}
              style={{ padding: '4px 10px', borderRadius: 16, fontSize: 11, cursor: 'pointer', background: 'var(--bg2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Botón analizar */}
      <button onClick={handleAnalyze} disabled={loading || !fileText}
        className="sp-btn sp-btn-primary"
        style={{ padding: '13px', borderRadius: 10, fontWeight: 700, fontSize: 14, width: '100%' }}>
        {loading ? '🤖 Analizando con Groq IA...' : '🔍 Analizar Documento'}
      </button>

      {/* Resultado */}
      {result && (
        <div style={{ padding: 20, borderRadius: 12, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 10, textTransform: 'uppercase' }}>
            🤖 Análisis de Xtratia AI
          </div>
          <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {result}
          </div>
          <button onClick={() => { navigator.clipboard.writeText(result); notificationService.success('Copiado al portapapeles.'); }}
            style={{ marginTop: 12, padding: '6px 12px', borderRadius: 8, fontSize: 12, background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text3)' }}>
            📋 Copiar análisis
          </button>
        </div>
      )}
    </div>
  );
}
