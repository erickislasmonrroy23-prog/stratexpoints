import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase.js';
import { notificationService } from './services.js';
import { useStore } from './store.js';
import { Modal } from './SharedUI.jsx';

/* ─────────────────────────────────────────────────────────────
   Documentos del expediente — PDF, imágenes, Word, Excel y más
   Arrastra y suelta · carpetas · vista previa · búsqueda · descarga
   Almacenamiento privado por empresa (enlaces temporales).
   ───────────────────────────────────────────────────────────── */

export const CARPETAS = ['General', 'Contratos y legal', 'Políticas y manuales', 'Información financiera', 'Evidencias', 'Reportes y entregables', 'Actas y minutas'];
const MAX = 50 * 1024 * 1024;

const icono = (m = '', n = '') => {
  const e = n.split('.').pop().toLowerCase();
  if (m.startsWith('image/')) return '🖼️';
  if (m === 'application/pdf' || e === 'pdf') return '📕';
  if (['xls', 'xlsx', 'csv'].includes(e)) return '📗';
  if (['doc', 'docx'].includes(e)) return '📘';
  if (['ppt', 'pptx'].includes(e)) return '📙';
  if (['zip', 'rar', '7z'].includes(e)) return '🗜️';
  if (m.startsWith('video/')) return '🎞️';
  return '📄';
};
const peso = (b) => (!b ? '' : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
const fecha = (d) => new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

export default function ModuloDocumentos({ compacto = false }) {
  const cliente = useStore((s) => s.currentClient);
  const yo = useStore((s) => s.profile);
  const can = useStore.use.can();
  const [docs, setDocs] = useState([]);
  const [personas, setPersonas] = useState({});
  const [carpeta, setCarpeta] = useState('Todas');
  const [destino, setDestino] = useState('General');
  const [busca, setBusca] = useState('');
  const [subiendo, setSubiendo] = useState(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [vista, setVista] = useState(null);
  const [miniaturas, setMiniaturas] = useState({});
  const input = useRef(null);

  const cargar = useCallback(async () => {
    const [d, p] = await Promise.all([
      supabase.from('documents').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email'),
    ]);
    if (d.error) notificationService.error('No se pudieron cargar los documentos: ' + d.error.message);
    setDocs(d.data || []);
    setPersonas(Object.fromEntries((p.data || []).map((x) => [x.id, x.full_name || x.email])));
    // Miniaturas de imágenes (enlaces temporales de 1 hora)
    const imgs = (d.data || []).filter((x) => x.mime_type?.startsWith('image/')).slice(0, 60);
    if (imgs.length) {
      const { data } = await supabase.storage.from('documentos').createSignedUrls(imgs.map((x) => x.file_path), 3600);
      setMiniaturas(Object.fromEntries((data || []).map((r, i) => [imgs[i].id, r.signedUrl])));
    }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const subir = async (lista) => {
    const archivos = [...lista];
    if (!archivos.length || !cliente?.id) return;
    let ok = 0;
    for (let i = 0; i < archivos.length; i++) {
      const f = archivos[i];
      setSubiendo(`${i + 1} de ${archivos.length}: ${f.name}`);
      if (f.size > MAX) { notificationService.error(`${f.name}: excede 50 MB.`); continue; }
      const ruta = `${cliente.id}/${Date.now()}-${f.name.replace(/[^\w.\-]+/g, '_')}`;
      const up = await supabase.storage.from('documentos').upload(ruta, f, { contentType: f.type || 'application/octet-stream' });
      if (up.error) { notificationService.error(`${f.name}: ${up.error.message}`); continue; }
      const ins = await supabase.from('documents').insert({ name: f.name, category: destino, file_path: ruta, mime_type: f.type || null, size_bytes: f.size });
      if (ins.error) { notificationService.error(`${f.name}: ${ins.error.message}`); continue; }
      ok++;
    }
    setSubiendo(null);
    if (ok) notificationService.success(`${ok} archivo(s) subido(s) a "${destino}".`);
    cargar();
  };

  const abrir = async (d, descargar = false) => {
    const { data, error } = await supabase.storage.from('documentos').createSignedUrl(d.file_path, 600, descargar ? { download: d.name } : undefined);
    if (error) return notificationService.error('No se pudo abrir: ' + error.message);
    if (descargar) { window.location.href = data.signedUrl; return; }
    if (d.mime_type?.startsWith('image/') || d.mime_type === 'application/pdf') setVista({ doc: d, url: data.signedUrl });
    else window.open(data.signedUrl, '_blank', 'noopener');
  };
  const mover = async (d, cat) => {
    const { error } = await supabase.from('documents').update({ category: cat }).eq('id', d.id);
    if (error) return notificationService.error(error.message);
    setDocs((l) => l.map((x) => (x.id === d.id ? { ...x, category: cat } : x)));
  };
  const borrar = async (d) => {
    if (!window.confirm(`¿Eliminar "${d.name}"?`)) return;
    await supabase.storage.from('documentos').remove([d.file_path]);
    const { error } = await supabase.from('documents').delete().eq('id', d.id);
    if (error) return notificationService.error(error.message);
    notificationService.success('Documento eliminado.'); cargar();
  };

  const conteo = (c) => docs.filter((d) => c === 'Todas' || d.category === c).length;
  const visibles = docs.filter((d) => (carpeta === 'Todas' || d.category === carpeta) && d.name.toLowerCase().includes(busca.toLowerCase()));
  const puedeBorrar = (d) => can('admin') || d.uploaded_by === yo?.id;

  return (
    <div className={compacto ? '' : 'fade-up'}>
      {!compacto && (
        <div style={{ marginBottom: 18 }}>
          <h1 className="page-title">Documentos</h1>
          <p className="page-subtitle">{cliente ? `${cliente.name} · ` : ''}PDF, imágenes, Word, Excel y cualquier archivo del expediente</p>
        </div>
      )}

      {/* Zona para soltar archivos */}
      <div
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastrando(false); subir(e.dataTransfer.files); }}
        onClick={() => !subiendo && input.current?.click()}
        role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
        aria-label="Subir archivos"
        style={{ border: `2px dashed ${arrastrando ? 'var(--primary)' : 'var(--border)'}`, background: arrastrando ? 'var(--primary-light)' : 'var(--bg2)',
          borderRadius: 18, padding: compacto ? 20 : 28, textAlign: 'center', cursor: subiendo ? 'wait' : 'pointer', marginBottom: 16, transition: 'all .15s' }}>
        <div style={{ fontSize: 30, marginBottom: 6 }}>⬆️</div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{subiendo ? `Subiendo ${subiendo}…` : 'Arrastra aquí tus archivos o haz clic para elegirlos'}</div>
        <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>PDF, imágenes, Word, Excel, PowerPoint, ZIP… hasta 50 MB por archivo</div>
        <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          Guardar en:
          <select className="sp-input" value={destino} onChange={(e) => setDestino(e.target.value)} style={{ width: 'auto', padding: '6px 34px 6px 12px', fontSize: 13 }}>
            {CARPETAS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <input ref={input} type="file" multiple hidden onChange={(e) => { subir(e.target.files); e.target.value = ''; }} />
      </div>

      {/* Carpetas y búsqueda */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        {['Todas', ...CARPETAS].filter((c) => c === 'Todas' || conteo(c)).map((c) => (
          <button key={c} onClick={() => setCarpeta(c)} className="sp-btn"
            style={{ padding: '6px 14px', fontSize: 13, background: carpeta === c ? 'var(--text)' : 'var(--bg2)', color: carpeta === c ? 'var(--bg2)' : 'var(--text2)', border: '1px solid var(--border)' }}>
            {c} <span style={{ opacity: 0.6 }}>{conteo(c)}</span>
          </button>
        ))}
        <input className="sp-input" placeholder="Buscar archivo" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ marginLeft: 'auto', width: 220 }} />
      </div>

      {/* Lista */}
      {visibles.length === 0 ? (
        <div className="sp-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>{docs.length ? 'Ningún archivo coincide.' : 'Aún no hay documentos en este expediente.'}</div>
      ) : (
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 230px), 1fr))' }}>
          {visibles.map((d) => (
            <div key={d.id} className="sp-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <button onClick={() => abrir(d)} style={{ height: 120, border: 'none', cursor: 'pointer', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} aria-label={`Abrir ${d.name}`}>
                {miniaturas[d.id] ? <img src={miniaturas[d.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 44 }}>{icono(d.mime_type, d.name)}</span>}
              </button>
              <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                <div title={d.name} style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>{peso(d.size_bytes)} · {fecha(d.created_at)}{personas[d.uploaded_by] ? ` · ${personas[d.uploaded_by]}` : ''}</div>
                <select className="sp-input" value={d.category} onChange={(e) => mover(d, e.target.value)} disabled={!can('update') && d.uploaded_by !== yo?.id}
                  style={{ padding: '5px 30px 5px 10px', fontSize: 12 }} aria-label="Carpeta">
                  {CARPETAS.map((c) => <option key={c}>{c}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                  <button className="sp-btn" onClick={() => abrir(d)} style={{ flex: 1, padding: '6px 10px', fontSize: 12.5, background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)' }}>Ver</button>
                  <button className="sp-btn" onClick={() => abrir(d, true)} style={{ flex: 1, padding: '6px 10px', fontSize: 12.5, background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)' }}>Descargar</button>
                  {puedeBorrar(d) && <button className="sp-btn" onClick={() => borrar(d)} aria-label={`Eliminar ${d.name}`} style={{ padding: '6px 10px', fontSize: 12.5, background: 'var(--bg2)', color: 'var(--red)', border: '1px solid var(--border)' }}>🗑</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!vista} onClose={() => setVista(null)} title={vista?.doc.name} maxWidth={980}>
        {vista && (vista.doc.mime_type?.startsWith('image/')
          ? <img src={vista.url} alt={vista.doc.name} style={{ maxWidth: '100%', maxHeight: '75vh', display: 'block', margin: '0 auto', borderRadius: 12 }} />
          : <iframe src={vista.url} title={vista.doc.name} style={{ width: '100%', height: '75vh', border: 'none', borderRadius: 12, background: '#fff' }} />)}
      </Modal>
    </div>
  );
}
