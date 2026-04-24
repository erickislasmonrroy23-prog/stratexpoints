import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { claudeService, organizationService, notificationService } from './services.js';
import { useStore } from './store.js';

export default function CommandCenter({ globalPeriod }) {
  const [quickInsight, setQuickInsight] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  const [identity, setIdentity] = useState({ mission: '', vision: '', values: '' });
  const [flashInsightText, setFlashInsightText] = useState('');
  const [flashLoading, setFlashLoading] = useState(false);

  const handleFlashInsight = async () => {
    setFlashLoading(true);
    try {
      const data = { okrsCount: okrs.length, kpisCount: kpis.length, orgName: currentOrganization?.name };
      const insight = await claudeService.chat([
        { role: 'system', content: 'Asesor ejecutivo. Da 3 insights estratégicos accionables en máximo 5 oraciones. Español.' },
        { role: 'user', content: 'Datos: ' + JSON.stringify(data) }
      ]);
      setFlashInsightText(insight);
    } catch (e) {
      setFlashInsightText('Error: ' + e.message);
    } finally { setFlashLoading(false); }
  };

  const okrs = useStore(state => state.okrs);
  const kpis = useStore(state => state.kpis);
  const initiatives = useStore(state => state.initiatives);
  const alerts = useStore(state => state.alerts);
  const profile = useStore.use.profile();
  const currentOrganization = useStore(state => state.currentOrganization);
  const onNavigate = useStore.use.setActiveModule();
  const loadAllData = useStore.use.loadAllData();
  
  // Cargar los datos de la empresa cuando se abre la pantalla
  useEffect(() => {
    if (profile?.organizations) {
      setIdentity(prev => {
        const mission = profile.organizations.mission || '';
        const vision = profile.organizations.vision || '';
        const values = profile.organizations.values || '';
        if (prev.mission === mission && prev.vision === vision && prev.values === values) return prev;
        return { mission, vision, values };
      });
    }
  }, [profile]);

  const okrsCount = okrs?.length || 0;
  const kpisCount = kpis?.length || 0;
  const initiativesCount = initiatives?.length || 0;

  // Cálculos para la Alta Dirección
  const avgOkrProgress = okrsCount > 0 
    ? Math.round(okrs.reduce((acc, okr) => acc + (okr.progress || 0), 0) / okrsCount) 
    : 0;
  
  const initiativesCompleted = initiatives?.filter(i => i.status === 'completed').length || 0;
  const initiativesInProgress = initiatives?.filter(i => i.status === 'in_progress' || i.status === 'at_risk').length || 0;

  const unreadAlerts = alerts?.filter(a => !a.is_read) || [];
  const criticalAlerts = unreadAlerts.filter(a => a.severity === 'critical');

  // Scores Predictivos simulados por IA basados en velocidad de ejecución
  const pred30 = Math.min(100, Math.round(avgOkrProgress + (initiativesInProgress * 2)));
  const pred90 = Math.min(100, Math.round(avgOkrProgress + (initiativesCompleted * 5)));

  const generateQuickInsight = async () => {
    setLoadingInsight(true);
    const prompt = `Actúa como Asistente de Dirección. En máximo 3 líneas directas, da un diagnóstico rápido: OKRs en ${avgOkrProgress}%, ${initiativesCompleted} proyectos completados y ${criticalAlerts.length} alertas críticas activas. Dime exactamente a qué le debo dar prioridad hoy.`;
    try {
      const res = await claudeService.chat([{ role: 'user', content: prompt }]);
      setQuickInsight(res);
    } catch (e) {
      setQuickInsight("Error al conectar con el cerebro de IA.");
    }
    setLoadingInsight(false);
  };

  const handleSaveIdentity = async () => {
    try {
      await organizationService.update(profile.organization_id, identity);
      setIsEditingIdentity(false);
      loadAllData(); // Recargar para que el perfil se actualice en el store y en toda la app.
      notificationService.success("Identidad corporativa guardada con éxito.");
    } catch (e) {
      notificationService.error("Error al guardar la identidad: " + e.message);
    }
  };

  const handleTestPush = async () => {
    // Push notifications no disponibles aún (requiere columna push_subscription en BD)
    notificationService.info("Las notificaciones push están en desarrollo. Próximamente disponibles.");
  };

  return (
    <div className="fade-up">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div>
          <div className="page-title">Bienvenido, {profile?.full_name || 'Líder Estratégico'}</div>
          <div className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span>Command Center Ejecutivo • Período Activo: <strong style={{color:'var(--primary)'}}>{globalPeriod}</strong></span>
            <span className="sp-badge" style={{ background: (profile?.role === 'Admin' || profile?.role === 'Super Admin') ? 'var(--primary-light)' : 'var(--bg3)', color: (profile?.role === 'Admin' || profile?.role === 'Super Admin') ? 'var(--primary)' : 'var(--text2)', border: '1px solid var(--border)' }}>
              📍 Entorno: {(profile?.role === 'Admin' || profile?.role === 'Super Admin') ? 'Vista Global (Corporativo)' : `Dirección de ${profile?.department || 'Operaciones'}`}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="sp-btn" onClick={handleTestPush} style={{ background: 'var(--violet)', color: '#fff', border: 'none', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)' }}>
            🔔 Probar Notificación
          </button>
          <button className="sp-btn" onClick={() => onNavigate('reportes')} style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            📥 Descargar Reporte
          </button>
        </div>
      </div>

      <div className="sp-card scale-in" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}><span>🏛️</span> Identidad Estratégica</h3>
          {(!profile || profile.role === 'Admin' || profile.role === 'Super Admin') && (
            isEditingIdentity ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setIsEditingIdentity(false)} className="sp-btn" style={{ padding: '6px 14px', fontSize: 12, background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 99 }}>Cancelar</button>
                <button onClick={handleSaveIdentity} className="sp-btn" style={{ padding: '6px 14px', fontSize: 12, background: 'var(--primary)', color: '#fff', borderRadius: 99 }}>💾 Guardar</button>
              </div>
            ) : (
              <button onClick={() => setIsEditingIdentity(true)} className="sp-btn" style={{ padding: '6px 14px', fontSize: 12, background: 'var(--bg3)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 99 }}>✏️ Editar Textos</button>
            )
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
          <div style={{ background: 'var(--bg3)', padding: 20, borderRadius: 16, border: '1px solid var(--border)', borderTop: '4px solid var(--primary)' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Nuestra Misión</div>
            {isEditingIdentity ? <textarea className="sp-input" style={{ minHeight: 80, fontSize: 13, resize: 'vertical' }} value={identity.mission} onChange={e => setIdentity({...identity, mission: e.target.value})} placeholder="¿Cuál es el propósito de la empresa?" /> : <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{identity.mission || <span style={{color:'var(--text3)', fontStyle:'italic'}}>Define la misión de tu organización aquí...</span>}</div>}
          </div>
          <div style={{ background: 'var(--bg3)', padding: 20, borderRadius: 16, border: '1px solid var(--border)', borderTop: '4px solid var(--teal)' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Nuestra Visión</div>
            {isEditingIdentity ? <textarea className="sp-input" style={{ minHeight: 80, fontSize: 13, resize: 'vertical' }} value={identity.vision} onChange={e => setIdentity({...identity, vision: e.target.value})} placeholder="¿A dónde queremos llegar en el futuro?" /> : <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{identity.vision || <span style={{color:'var(--text3)', fontStyle:'italic'}}>Define la visión a futuro aquí...</span>}</div>}
          </div>
          <div style={{ background: 'var(--bg3)', padding: 20, borderRadius: 16, border: '1px solid var(--border)', borderTop: '4px solid var(--violet)' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Nuestros Valores</div>
            {isEditingIdentity ? <textarea className="sp-input" style={{ minHeight: 80, fontSize: 13, resize: 'vertical' }} value={identity.values} onChange={e => setIdentity({...identity, values: e.target.value})} placeholder="Ej: Innovación, Excelencia, Compromiso..." /> : <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{identity.values || <span style={{color:'var(--text3)', fontStyle:'italic'}}>Define los valores corporativos aquí...</span>}</div>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="stat-card" onClick={() => onNavigate('okrs')} style={{ cursor: 'pointer', borderTop: '4px solid var(--primary)' }}>
          <h3 style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Salud Global OKRs</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{avgOkrProgress}%</div>
            <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, marginBottom: 6 }}>{okrsCount} Activos</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => onNavigate('kpis')} style={{ cursor: 'pointer', borderTop: '4px solid var(--teal)' }}>
          <h3 style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>KPIs Monitoreados</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{kpisCount}</div>
            <div style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 600, marginBottom: 6 }}>Indicadores</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => onNavigate('alertas')} style={{ cursor: 'pointer', borderTop: `4px solid ${criticalAlerts.length > 0 ? 'var(--red)' : 'var(--green)'}` }}>
          <h3 style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Estado de Alertas</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: criticalAlerts.length > 0 ? 'var(--red)' : 'var(--green)', lineHeight: 1 }}>{criticalAlerts.length}</div>
            <div style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 600, marginBottom: 6 }}>Críticas</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        <div className="sp-card" style={{ padding: 24, background: 'linear-gradient(135deg, var(--bg2), var(--primary-light))' }}>
          <h3 style={{ fontSize: 15, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><span>🔮</span> FASE D: Score Predictivo (IA)</h3>
          
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
            <div style={{ height: 120, width: 140, position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{value: pred30, color: 'var(--primary)'}, {value: 100-pred30, color: 'var(--border)'}]} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={45} outerRadius={60} dataKey="value" stroke="none">
                    {[{value: pred30, color: 'var(--primary)'}, {value: 100-pred30, color: 'var(--border)'}].map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', bottom: 10, left: 0, width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{pred30}%</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700 }}>PROY. 30 DÍAS</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, paddingBottom: 8, borderBottom: '1px dashed var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Progreso Actual:</span>
                <strong style={{ fontSize: 13, color: 'var(--text)' }}>{avgOkrProgress}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>Proyección 90 Días:</span>
                <strong style={{ fontSize: 13, color: 'var(--teal)' }}>{pred90}%</strong>
              </div>
            </div>
          </div>
          <div style={{ background: 'var(--bg)', padding: 16, borderRadius: 8, border: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--red)' }}>⚡ Acciones Recomendadas (Prioridad Alta):</h4>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>
              {criticalAlerts.length > 0 ? criticalAlerts.map(a => <li key={a.id}>{a.title}</li>) : <li>Acelerar iniciativas "Sin Iniciar" para mejorar la proyección a 30 días.</li>}
            </ul>
          </div>
        </div>

        <div className="sp-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, marginBottom: 20 }}>Balance de Ejecución (Iniciativas)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}><span style={{ color: 'var(--text2)', fontWeight: 500 }}>Completadas</span><strong style={{ color: 'var(--text)' }}>{initiativesCompleted}</strong></div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${initiativesCount ? (initiativesCompleted/initiativesCount)*100 : 0}%`, background: 'var(--green)' }} /></div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}><span style={{ color: 'var(--text2)', fontWeight: 500 }}>En Progreso / Riesgo</span><strong style={{ color: 'var(--text)' }}>{initiativesInProgress}</strong></div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${initiativesCount ? (initiativesInProgress/initiativesCount)*100 : 0}%`, background: 'var(--teal)' }} /></div>
            </div>
          </div>
        </div>

        <div className="sp-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'linear-gradient(135deg, var(--bg3), var(--bg2))', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
          <h3 style={{ fontSize: 15, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Asistente de Dirección (IA)
          </h3>
          {!quickInsight ? (
            <>
              <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>El motor estratégico monitorea {okrsCount + kpisCount} métricas. ¿Deseas un resumen ejecutivo en tiempo real?</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="sp-btn" onClick={generateQuickInsight} disabled={loadingInsight} style={{ background: 'var(--primary)', alignSelf: 'flex-start' }}>{loadingInsight ? 'Analizando...' : '⚡ Flash Insight'}</button>
                <button className="sp-btn" onClick={() => onNavigate('ia')} style={{ background: 'var(--bg2)', color: 'var(--text2)', border: '1px solid var(--border)', alignSelf: 'flex-start' }}>Módulo Completo</button>
              </div>
            </>
          ) : (
            <div className="scale-in" style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, background: 'var(--bg)', padding: 12, borderRadius: 8, border: '1px solid var(--primary-light)' }}>
              <strong style={{color:'var(--primary)', display:'block', marginBottom:4}}>Diagnóstico Rápido:</strong>
              {quickInsight}
              <button onClick={() => setQuickInsight(null)} style={{ display: 'block', marginTop: 12, fontSize: 11, color: 'var(--text3)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>← Cerrar resumen</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
