import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { groqService, notificationService } from './services.js';
import { useStore } from './store.js';
import { deepEqual } from 'fast-equals';

export default function Benchmark() {
  const [aiInsight, setAiInsight] = useState(null);
  const [loading, setLoading] = useState(false);
  const okrs = useStore(state => state.okrs);

  const avgProgress = okrs?.length > 0
    ? (okrs.reduce((acc, okr) => acc + (okr.progress || 0), 0) / okrs.length)
    : 0;

  const metrics = [
    { name: 'Crecimiento de Ingresos', company: avgProgress + 10, industry: 75 },
    { name: 'Retención de Clientes', company: 85, industry: 80 },
    { name: 'Eficiencia Operativa', company: avgProgress, industry: 65 },
    { name: 'Adopción Tecnológica', company: 90, industry: 70 }
  ];

  const handleAIAnalysis = async () => {
    setLoading(true);
    const prompt = `Actúa como Consultor de Competitividad. Analiza estas métricas de mi empresa frente a la industria: ${JSON.stringify(metrics)}. Dame 2 recomendaciones clave y directas para superar a la competencia en las áreas donde estamos rezagados.`;
    try {
      const res = await groqService.ask([{ role: 'user', content: prompt }]);
      setAiInsight(res);
    } catch (e) {
      notificationService.error("Error de IA: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="fade-up">
      <div className="sp-card" style={{ padding: 24 }}>
        <h3 style={{ marginBottom: 10 }}>🏆 Benchmark Competitivo</h3>
        <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 24 }}>Comparativa del rendimiento estratégico de tu organización frente al promedio de la industria.</p>

        <div style={{ height: 350, marginBottom: 32 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text2)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text2)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip cursor={{ fill: 'var(--bg3)' }} contentStyle={{ background: 'var(--bg2)', borderColor: 'var(--border)', borderRadius: 8, color: 'var(--text)' }} />
              <Legend wrapperStyle={{ fontSize: 13, paddingTop: 10 }} />
              <Bar dataKey="company" name="Tu Empresa" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={40} />
              <Bar dataKey="industry" name="Promedio Industria" fill="var(--border)" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'linear-gradient(135deg, var(--bg3), var(--bg2))', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}><span>🧠</span> Estrategia Competitiva (IA)</h4>
            <button onClick={handleAIAnalysis} disabled={loading} className="sp-btn" style={{ background: 'var(--violet)', padding: '6px 16px', fontSize: 12 }}>
              {loading ? 'Analizando...' : '✨ Generar Insight Competitivo'}
            </button>
          </div>
          
          {aiInsight ? (
            <div className="scale-in" style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {aiInsight}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Solicita a la IA un análisis de brechas competitivas para obtener recomendaciones de crecimiento basadas en los datos de la gráfica superior.</div>
          )}
        </div>
      </div>
    </div>
  );
}