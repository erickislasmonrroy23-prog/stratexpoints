import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { notificationService } from './services.js';
import { useStore } from './store.js';
import { Modal } from './SharedUI.jsx';
import BrandLogo from './BrandLogo.jsx';
import { BRAND } from './brand.js';
import { Evidencias } from './PruebasControl.jsx';
import { activarExpediente } from './ModuloExpedientes.jsx';
import { generarInformeRiesgos } from './informeRiesgosPDF.js';

/* ─────────────────────────────────────────────────────────────
   Portal del cliente — vista simplificada para usuarios de la empresa
   · Semáforo general del expediente
   · Mis planes de acción: avance, evidencia y envío a validación
   · Principales riesgos con su indicador (KRI)
   · Descarga del informe ejecutivo
   ───────────────────────────────────────────────────────────── */

const NIVEL = (v) => (v == null ? null : v <= 4 ? ['Bajo', '#248A3D', '#E3F5E8'] : v <= 9 ? ['Moderado', '#9A6400', '#FFF4D1'] : v <= 16 ? ['Alto', '#C93400', '#FFE9D6'] : ['Crítico', '#D70015', '#FDE4E6']);
const ESTADO = {
  abierto: ['Abierto', 'var(--bg3)', 'var(--text2)'], en_progreso: ['En progreso', '#E8F1FC', '#0071E3'],
  en_validacion: ['En validación por C&C', '#FFF4D1', '#9A6400'], cerrado: ['Cerrado', '#E3F5E8', '#248A3D'], vencido: ['Vencido', '#FDE4E6', '#D70015'],
};
const SEM_KRI = { verde: ['En rango', '#34C759'], amarillo: ['En alerta', '#FFCC00'], rojo: ['Fuera de límite', '#FF3B30'] };
export function estadoKRI(valor, dir, aviso, limite) {
  if (valor == null || (aviso == null && limite == null)) return null;
  const v = Number(valor);
  if (dir === 'menor_peor') return limite != null && v <= limite ? 'rojo' : aviso != null && v <= aviso ? 'amarillo' : 'verde';
  return limite != null && v >= limite ? 'rojo' : aviso != null && v >= aviso ? 'amarillo' : 'verde';
}
const fecha = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin fecha');
const diasPara = (d) => (d ? Math.round((new Date(d + 'T12:00:00') - new Date(new Date().toDateString())) / 86400000) : null);

function TarjetaPlan({ p, riesgo, mio, onAbrir }) {
  const [t, bg, c] = ESTADO[p.status] || ESTADO.abierto;
  const dias = diasPara(p.due_date);
  const urg = p.status !== 'cerrado' && p.status !== 'en_validacion' && dias != null ? (dias < 0 ? `Venció hace ${-dias} día(s)` : dias === 0 ? 'Vence hoy' : `Faltan ${dias} día(s)`) : null;
  return (
    <button onClick={onAbrir} className="sp-card" style={{ textAlign: 'left', padding: 18, cursor: 'pointer', border: mio ? '1.5px solid var(--primary)' : '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg2)', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em', color: 'var(--text)' }}>{p.title}</div>
        <span className="sp-badge" style={{ background: bg, color: c, fontWeight: 600, whiteSpace: 'nowrap' }}>{t}</span>
      </div>
      {riesgo && <div style={{ fontSize: 12.5, color: 'var(--text3)' }}>Riesgo: {riesgo.code ? riesgo.code + ' · ' : ''}{riesgo.name}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span style={{ color: 'var(--text2)' }}>{fecha(p.due_date)}</span>
        {urg && <span style={{ fontWeight: 600, color: dias < 0 ? '#D70015' : dias <= 7 ? '#C93400' : 'var(--text3)' }}>{urg}</span>}
      </div>
    </button>
  );
}

function DetallePlan({ plan, riesgo, onCerrar, onCambio }) {
  const yo = useStore((s) => s.profile);
  const [notas, setNotas] = useState(plan.client_notes || '');
  const [nEvid, setNEvid] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const esResponsable = plan.responsible_id === yo?.id;
  const editable = esResponsable && !['cerrado', 'en_validacion'].includes(plan.status);

  const avance = async () => {
    const { error } = await supabase.rpc('fn_avance_plan', { p_plan: plan.id });
    if (error) return notificationService.error(error.message);
    notificationService.success('Plan marcado en progreso.'); onCambio();
  };
  const enviar = async () => {
    if (!nEvid) return notificationService.error('Adjunta al menos un archivo de evidencia.');
    setEnviando(true);
    const { error } = await supabase.rpc('fn_enviar_cierre_plan', { p_plan: plan.id, p_notas: notas });
    setEnviando(false);
    if (error) return notificationService.error(error.message);
    notificationService.success('Evidencia enviada. Cabrera & Consultores validará el cierre.');
    onCambio(); onCerrar();
  };

  const [t, bg, c] = ESTADO[plan.status] || ESTADO.abierto;
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <span className="sp-badge" style={{ background: bg, color: c, fontWeight: 600 }}>{t}</span>
        <span style={{ fontSize: 13, color: 'var(--text3)' }}>Fecha compromiso: {fecha(plan.due_date)}</span>
      </div>
      {riesgo && <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 10px' }}><strong>Riesgo:</strong> {riesgo.name}</p>}
      {plan.description && <p style={{ fontSize: 14, lineHeight: 1.55, margin: '0 0 12px' }}>{plan.description}</p>}
      {plan.proposed_control_activity && (
        <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: 14, fontSize: 13.5, marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>Acción acordada</div>{plan.proposed_control_activity}
        </div>
      )}
      {plan.evidence_notes && plan.status !== 'cerrado' && (
        <div style={{ background: '#FDE4E6', color: '#D70015', borderRadius: 12, padding: 12, fontSize: 13, marginBottom: 14 }}>Comentarios de C&amp;C: {plan.evidence_notes}</div>
      )}

      <label className="sp-label">Evidencia</label>
      <Evidencias plan={plan} bloqueada={!editable} onCambio={setNEvid} />

      {editable && (
        <div style={{ marginTop: 16 }}>
          <label className="sp-label">Comentarios para Cabrera &amp; Consultores</label>
          <textarea className="sp-input" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Describe lo implementado y qué demuestra la evidencia" />
        </div>
      )}
      {!esResponsable && plan.status !== 'cerrado' && <p style={{ fontSize: 12.5, color: 'var(--text3)', marginTop: 12 }}>Solo el responsable asignado puede cargar evidencia y enviar el cierre.</p>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
        <button className="sp-btn" onClick={onCerrar} style={{ background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border)' }}>Cerrar</button>
        {editable && ['abierto', 'vencido'].includes(plan.status) && <button className="sp-btn" onClick={avance} style={{ background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)' }}>Marcar en progreso</button>}
        {editable && <button className="sp-btn" onClick={enviar} disabled={enviando} style={{ background: 'var(--primary)', color: '#fff' }}>{enviando ? 'Enviando…' : 'Enviar evidencia para cierre'}</button>}
      </div>
    </div>
  );
}

export default function PortalCliente({ onLogout }) {
  const yo = useStore((s) => s.profile);
  const cliente = useStore((s) => s.currentClient);
  const clientes = useStore((s) => s.clients) || [];
  const [d, setD] = useState({ planes: [], riesgos: [], kpis: [], controles: [], vinculos: [], areas: [], personas: [] });
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [p, r, k, c, v, a, pe] = await Promise.all([
      supabase.from('action_plans').select('*').order('due_date'),
      supabase.from('risks').select('*'),
      supabase.from('kpis').select('id, name, value, unit'),
      supabase.from('controls').select('*'),
      supabase.from('risk_controls').select('*'),
      supabase.from('areas').select('*'),
      supabase.from('profiles').select('id, full_name, email'),
    ]);
    setD({ planes: p.data || [], riesgos: r.data || [], kpis: k.data || [], controles: c.data || [], vinculos: v.data || [], areas: a.data || [], personas: pe.data || [] });
    setCargando(false);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const activos = d.riesgos.filter((r) => r.status === 'activo');
  const res = (r) => r.residual_risk ?? r.inherent_risk;
  const apetito = cliente?.risk_appetite ?? 9;
  const fuera = activos.filter((r) => res(r) > apetito).length;
  const abiertos = d.planes.filter((p) => p.status !== 'cerrado');
  const vencidos = abiertos.filter((p) => p.status === 'vencido' || (p.due_date && diasPara(p.due_date) < 0 && p.status !== 'en_validacion')).length;
  const mios = abiertos.filter((p) => p.responsible_id === yo?.id);
  const otros = abiertos.filter((p) => p.responsible_id !== yo?.id);
  const semaforo = vencidos || activos.some((r) => res(r) >= 17) ? ['Requiere atención', '#FF3B30'] : fuera ? ['En vigilancia', '#FFCC00'] : ['Bajo control', '#34C759'];
  const top = [...activos].sort((a, b) => res(b) - res(a)).slice(0, 6);
  const riesgoDe = (id) => d.riesgos.find((r) => r.id === id);

  const descargar = async () => {
    try {
      const st = useStore.getState();
      await generarInformeRiesgos({
        datos: { riesgos: d.riesgos, controles: d.controles, vinculos: d.vinculos, planes: d.planes, personas: d.personas, areas: d.areas },
        organizacion: st.currentOrganization, cliente, autor: BRAND.legalName,
      });
    } catch (e) { notificationService.error('No se pudo generar el informe: ' + e.message); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header className="barra-superior" style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {cliente?.logo_url ? <img src={cliente.logo_url} alt="" style={{ height: 34, maxWidth: 120, objectFit: 'contain' }} />
            : <span style={{ width: 34, height: 34, borderRadius: 10, background: cliente?.color || 'var(--primary)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{(cliente?.name || '?').charAt(0)}</span>}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: '-0.01em' }}>{cliente?.name}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>Portal de seguimiento · {BRAND.name}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {clientes.length > 1 && (
            <select className="sp-input" value={cliente?.id || ''} onChange={(e) => activarExpediente(e.target.value)} style={{ width: 'auto', padding: '7px 34px 7px 12px', fontSize: 13 }} aria-label="Cambiar de empresa">
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button className="header-action" onClick={onLogout}>Salir</button>
        </div>
      </header>

      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 20px 60px' }}>
        <h1 className="page-title">Hola, {(yo?.full_name || '').split(' ')[0] || 'bienvenido'}</h1>
        <p className="page-subtitle" style={{ marginBottom: 22 }}>Este es el estado de control interno y riesgos de {cliente?.name}.</p>

        {cargando ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Cargando…</div> : <>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', marginBottom: 26 }}>
            <div className="sp-card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 14, height: 14, borderRadius: 99, background: semaforo[1], boxShadow: `0 0 0 5px ${semaforo[1]}22` }} />
              <div><div style={{ fontSize: 12, color: 'var(--text3)' }}>Estado general</div><div style={{ fontWeight: 700, fontSize: 17 }}>{semaforo[0]}</div></div>
            </div>
            {[['Mis pendientes', mios.length, mios.length ? 'var(--primary)' : null], ['Planes abiertos', abiertos.length], ['Planes vencidos', vencidos, vencidos ? '#D70015' : null], ['Riesgos fuera de apetito', fuera, fuera ? '#C93400' : null]].map(([t, v, c]) => (
              <div key={t} className="sp-card" style={{ padding: 18 }}>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{t}</div>
                <div style={{ fontWeight: 700, fontSize: 28, color: c || 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
              </div>
            ))}
          </div>

          <section style={{ marginBottom: 30 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12 }}>Mis planes de acción</h2>
            {mios.length === 0 ? <div className="sp-card" style={{ padding: 22, color: 'var(--text3)', fontSize: 14 }}>No tienes planes de acción pendientes. ✓</div> : (
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))' }}>
                {mios.map((p) => <TarjetaPlan key={p.id} p={p} riesgo={riesgoDe(p.risk_id)} mio onAbrir={() => setAbierto(p)} />)}
              </div>
            )}
          </section>

          {otros.length > 0 && (
            <section style={{ marginBottom: 30 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 12, color: 'var(--text2)' }}>Otros planes de la empresa</h2>
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))' }}>
                {otros.map((p) => <TarjetaPlan key={p.id} p={p} riesgo={riesgoDe(p.risk_id)} onAbrir={() => setAbierto(p)} />)}
              </div>
            </section>
          )}

          <section style={{ marginBottom: 30 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>Principales riesgos</h2>
              <button className="sp-btn" onClick={descargar} disabled={!d.riesgos.length} style={{ background: 'var(--primary)', color: '#fff' }}>Descargar informe PDF</button>
            </div>
            {top.length === 0 ? <div className="sp-card" style={{ padding: 22, color: 'var(--text3)', fontSize: 14 }}>Aún no hay riesgos evaluados.</div> : (
              <div className="sp-card" style={{ padding: 6 }}>
                {top.map((r) => {
                  const n = NIVEL(res(r)); const kri = d.kpis.find((k) => k.id === r.kri_id);
                  const sk = kri ? estadoKRI(kri.value, r.kri_direction, r.kri_warning, r.kri_limit) : null;
                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      <span className="sp-badge" style={{ background: n[2], color: n[1], fontWeight: 700, minWidth: 82, justifyContent: 'center' }}>{n[0]}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{r.name}</div>
                        {kri && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {sk && <span style={{ width: 8, height: 8, borderRadius: 99, background: SEM_KRI[sk][1] }} />}
                          Indicador: {kri.name} = {kri.value ?? '—'}{kri.unit ? ' ' + kri.unit : ''}{sk ? ` · ${SEM_KRI[sk][0]}` : ''}
                        </div>}
                      </div>
                      {res(r) > apetito && <span style={{ fontSize: 11.5, color: '#D70015', fontWeight: 600, whiteSpace: 'nowrap' }}>Fuera de apetito</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <footer style={{ display: 'flex', justifyContent: 'center', marginTop: 40, opacity: 0.8 }}>
            <BrandLogo size={22} />
          </footer>
        </>}
      </main>

      <Modal isOpen={!!abierto} onClose={() => setAbierto(null)} title={abierto?.title} maxWidth={680}>
        {abierto && <DetallePlan plan={abierto} riesgo={riesgoDe(abierto.risk_id)} onCerrar={() => setAbierto(null)} onCambio={cargar} />}
      </Modal>
    </div>
  );
}
