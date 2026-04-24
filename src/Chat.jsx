import React, { useState, useRef, useEffect } from 'react';
import { claudeService } from './services.js';
import { notificationService } from './services.js';
import { useStore } from './store.js';

const SYSTEM_PROMPT = `Eres Xtratia AI, un asistente estratégico experto en OKRs, KPIs, Balanced Scorecard, Hoshin Kanri e iniciativas estratégicas. Ayudas a equipos directivos a tomar mejores decisiones. Responde siempre en español, de forma concisa y accionable. Cuando sea relevante, estructura tu respuesta con puntos clave.`;

export default function Chat() {
  const okrs      = useStore(s => s.okrs      || []);
  const kpis      = useStore(s => s.kpis      || []);
  const org       = useStore(s => s.currentOrganization);

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '¡Hola! Soy Xtratia AI, tu asistente estratégico. Puedo ayudarte a analizar tus OKRs y KPIs, generar recomendaciones y responder preguntas sobre tu estrategia. ¿En qué trabajamos hoy?'
    }
  ]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Contexto de la organización incluido automáticamente
      const contextMsg = {
        role: 'system',
        content: SYSTEM_PROMPT + '\n\nContexto actual de la organización ' + (org?.name || '') + ':\n' +
          'OKRs activos: ' + okrs.length + ' | KPIs monitoreados: ' + kpis.length + '\n' +
          'Plan: ' + (org?.plan || 'basic') + ' | Estado: ' + (org?.status || 'active')
      };

      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const reply = await claudeService.chat([contextMsg, ...history, userMsg]);

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      const errMsg = err.message || 'Error desconocido';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ Error al conectar con la IA: ' + errMsg + '\n\nVerifica que la clave VITE_CLAUDE_API_KEY esté configurada en .env.local'
      }]);
      notificationService.error('Error IA: ' + errMsg);
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    '¿Cuál es la salud de mis OKRs?',
    'Genera recomendaciones estratégicas',
    '¿Qué KPIs están en riesgo?',
    'Sugiere acciones para mejorar el avance',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 500, maxHeight: 700 }}>
      {/* Mensajes */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '80%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg2)',
              color: msg.role === 'user' ? 'white' : 'var(--text)',
              fontSize: 14,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              {msg.role === 'assistant' && (
                <div style={{ fontSize: 11, color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--primary)', fontWeight: 700, marginBottom: 4 }}>
                  🤖 Xtratia AI
                </div>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '12px 16px', borderRadius: '18px 18px 18px 4px', background: 'var(--bg2)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--text3)' }}>
              <span style={{ animation: 'pulse 1s infinite' }}>Analizando...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Preguntas rápidas */}
      {messages.length <= 2 && (
        <div style={{ padding: '0 16px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {quickQuestions.map(q => (
            <button key={q} onClick={() => { setInput(q); }}
              style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', background: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--primary)', fontWeight: 500 }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
        <input
          className="sp-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Pregunta sobre tu estrategia, OKRs, KPIs..."
          disabled={loading}
          style={{ flex: 1, padding: '12px 16px', borderRadius: 12, fontSize: 14 }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
        />
        <button type="submit" disabled={loading || !input.trim()}
          className="sp-btn sp-btn-primary"
          style={{ padding: '12px 20px', borderRadius: 12, fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>
          {loading ? '...' : 'Enviar →'}
        </button>
      </form>
    </div>
  );
}
