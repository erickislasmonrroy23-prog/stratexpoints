import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useStore } from './store.js';
import { deepEqual } from 'fast-equals';

export default function RadarStrategic() {
  // Mapeo Inteligente: Calculamos la salud real leyendo la base de datos
  const objectives = useStore(state => state.objectives);
  const okrs = useStore(state => state.okrs);
  const perspectivesMap = [
    { id: 1, subject: 'Financiera' },
    { id: 2, subject: 'Clientes' },
    { id: 3, subject: 'Procesos' },
    { id: 4, subject: 'Aprendizaje' }
  ];

  const pHealth = perspectivesMap.map(p => {
    const parentObjs = (objectives || []).filter(o => o.perspective_id === p.id);
    const relatedOkrs = (okrs || []).filter(okr => parentObjs.some(o => o.id === okr.objective_id));
    const score = relatedOkrs.length > 0 ? Math.round(relatedOkrs.reduce((acc, okr) => acc + (okr.progress || 0), 0) / relatedOkrs.length) : 0;
    return { subject: p.subject, score };
  });

  // Análisis Avanzado para el CEO
  const sortedHealth = [...pHealth].sort((a, b) => b.score - a.score);
  const strongest = sortedHealth[0] || { subject: 'N/A', score: 0 };
  const weakest = sortedHealth[sortedHealth.length - 1] || { subject: 'N/A', score: 0 };
  const alignmentGap = strongest.score - weakest.score;
  const isBalanced = alignmentGap <= 20;

  return (
    <div className="fade-up">
      <div className="sp-card" style={{ padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.5px' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📡</div>
              Balance Estratégico (Radar 360°)
            </h3>
            <p style={{ color: 'var(--text3)', fontSize: 14, lineHeight: 1.6 }}>Análisis de simetría organizacional. Un radar desbalanceado indica riesgo de colapso a largo plazo.</p>
          </div>
          <div style={{ textAlign: 'right', background: isBalanced ? 'var(--green-light)' : 'var(--red-light)', padding: '12px 20px', borderRadius: 12, border: `1px solid ${isBalanced ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: isBalanced ? 'var(--green)' : 'var(--red)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Brecha de Alineación</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: isBalanced ? 'var(--green)' : 'var(--red)', lineHeight: 1 }}>{alignmentGap}%</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'center' }}>
          <div style={{ width: '100%', maxWidth: 450, height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={pHealth}>
                <PolarGrid stroke="var(--border)" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text2)', fontSize: 12, fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text3)' }} />
                <Radar name="Salud Perspectiva" dataKey="score" stroke="var(--primary)" strokeWidth={3} fill="var(--primary)" fillOpacity={0.3} />
                <Tooltip cursor={{ fill: 'var(--bg3)' }} contentStyle={{ background: 'var(--bg2)', borderColor: 'var(--border)', borderRadius: 8, color: 'var(--text)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Ranking de Ejecución</h4>
            {sortedHealth.map((p, idx) => (
              <div key={p.subject} className="sp-card-hover" style={{ padding: '14px 20px', background: 'var(--bg2)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: idx === 0 ? 'var(--green)' : idx === sortedHealth.length - 1 ? 'var(--red)' : 'var(--gold)' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{idx + 1}. {p.subject}</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: p.score >= 80 ? 'var(--green)' : p.score >= 60 ? 'var(--gold)' : 'var(--red)' }}>{p.score}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="scale-in" style={{ marginTop: 32, padding: 20, background: 'var(--bg3)', borderRadius: 12, borderLeft: `4px solid ${isBalanced ? 'var(--green)' : 'var(--red)'}`, borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}><span>🧠</span> Diagnóstico del Analista (IA)</h4>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
            {isBalanced 
              ? `La organización mantiene un crecimiento simétrico. La diferencia entre el pilar más fuerte (${strongest.subject}) y el más débil (${weakest.subject}) es de solo ${alignmentGap}%, lo que indica una ejecución madura y controlada.` 
              : <span dangerouslySetInnerHTML={{ __html: `⚠️ <strong>Desbalance Estructural:</strong> La organización está sobre-indexada en <strong>${strongest.subject} (${strongest.score}%)</strong> pero presenta una falla severa en <strong>${weakest.subject} (${weakest.score}%)</strong>. Esta brecha del ${alignmentGap}% estrangulará el crecimiento futuro si no se reasigna capital e iniciativas a la base más débil inmediatamente.` }} />}
          </p>
        </div>
      </div>
    </div>
  );
}