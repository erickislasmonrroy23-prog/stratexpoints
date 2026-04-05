import React, { useState } from 'react';
import { groqService } from './services.js';
import { useStore } from './store.js';
import { shallow } from 'zustand/shallow';

export default function Chat() {
  // Seleccionamos los datos necesarios para evitar re-renders innecesarios.
  // Usamos `shallow` para una comparación eficiente de los datos del store.
  const okrs = useStore(state => state.okrs);
  const kpis = useStore(state => state.kpis);
  const profile = useStore.use.profile();

  // Usamos la forma de "lazy initializer" de useState. La función solo se ejecuta
  // una vez en el montaje inicial, evitando recalcular el mensaje en cada render.
  const [messages, setMessages] = useState(() => [
    { role: 'assistant', content: `¡Hola ${profile?.full_name || 'Líder'}! Soy tu asistente estratégico de IA. Puedo analizar el estatus de tus ${okrs?.length || 0} OKRs y ${kpis?.length || 0} KPIs. ¿En qué te ayudo hoy?` },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    const userMsg = { role: 'user', content: input };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);
    
    const systemMsg = { 
      role: 'system', 
      content: `Eres un consultor experto en estrategia empresarial. Contexto actual de la empresa: OKRs: ${JSON.stringify(okrs || [])}. KPIs: ${JSON.stringify(kpis || [])}. Responde a las consultas basándote en estos datos, de forma profesional, concisa y en español.`
    };

    try {
      const response = await groqService.ask([systemMsg, ...newHistory]);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Lo siento, ocurrió un error al conectar con el motor de IA: ${e.message}` }]);
    }
    setLoading(false);
  };

  return (
    <div className="fade-up" style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
      <div className="sp-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '75%', padding: '14px 18px', borderRadius: 14, background: m.role === 'user' ? 'var(--primary)' : 'var(--bg3)', color: m.role === 'user' ? '#fff' : 'var(--text)', border: m.role === 'user' ? 'none' : '1px solid var(--border)', fontSize: 14, lineHeight: 1.5, boxShadow: 'var(--shadow)', whiteSpace: 'pre-wrap' }}>{m.content}</div>
            </div>
          ))}
          {loading && <div style={{ alignSelf: 'flex-start', color: 'var(--text3)', fontSize: 13 }}>Escribiendo...</div>}
        </div>
        <form onSubmit={handleSend} style={{ padding: 16, borderTop: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', gap: 12 }}>
          <input className="sp-input" value={input} onChange={e => setInput(e.target.value)} placeholder="Ej: Analiza por qué la perspectiva financiera está en riesgo..." style={{ flex: 1 }} />
          <button type="submit" className="sp-btn" style={{ padding: '0 24px' }} disabled={loading}>Enviar</button>
        </form>
      </div>
    </div>
  );
}