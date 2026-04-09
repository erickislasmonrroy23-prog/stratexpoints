import React, { useState, useEffect, useMemo } from 'react';
import { getQuarterFromDate } from './utils.js'; // Asumiendo que crearás este util
import { useStore } from '@store/store.js'; // Ajuste de importación para seguir el patrón de alias
import { useForm } from 'react-hook-form'; // Asumiendo react-hook-form
import { zodResolver } from '@hookform/resolvers/zod'; // Asumiendo zod
import { PREDEFINED_DEPTS } from './constants.js'; // Asegúrate de que este archivo exista y contenga el array de departamentos

export function Modal({ children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
      <div className="scale-in" style={{ background: 'var(--bg)', borderRadius: 20, width: '100%', maxWidth: 700, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        {children}
      </div>
    </div>
  );
}

export function OKRForm({ onSave, onCancel, objectives = [], initialData = null }) {
  const storePerspectives = useStore(state => state.perspectives);
  // El estado del formulario se inicializa vacío y se puebla con un efecto
  // para manejar correctamente la re-apertura del modal para creación vs. edición.
  const [form, setForm] = useState({ objective: '', status: 'not_started', progress: 0, period: getQuarterFromDate(new Date()), objective_id: null, department: '', owner: '', confidence_level: 8, krs: [] });  
  // Estado para la selección explícita del usuario en el primer dropdown.
  const [userSelectedPerspectiveId, setUserSelectedPerspectiveId] = useState(null);

  // Robustez: Proporciona una lista de perspectivas por defecto si la del store está vacía.
  const perspectives = (storePerspectives && storePerspectives.length > 0) ? storePerspectives : [
    { id: 1, name: 'Financiera' },
    { id: 2, name: 'Clientes' },
    { id: 3, name: 'Procesos Internos' },
    { id: 4, name: 'Aprendizaje y Crecimiento' }
  ];

  // EFECTO 1: Poblar/resetear el formulario cuando se abre/cierra el modal.
  // Este efecto se encarga únicamente de sincronizar el 'form' con 'initialData'.
  useEffect(() => {
    if (initialData) {
      setForm({
        ...initialData,
        objective_id: initialData.objective_id != null ? String(initialData.objective_id) : null,
      });
      // Resetea la selección manual del usuario. La perspectiva se derivará de los datos.
      setUserSelectedPerspectiveId(null);
    } else {
      // Si estamos creando, reseteamos todo el estado.
      setForm({ objective: '', status: 'not_started', progress: 0, period: getQuarterFromDate(new Date()), objective_id: null, department: '', owner: '', confidence_level: 8, krs: [] });
      setUserSelectedPerspectiveId(null);
    }
  }, [initialData]);

  // ESTADO DERIVADO: La perspectiva se calcula a partir del objetivo actualmente vinculado en el formulario.
  // `useMemo` asegura que este cálculo solo se rehaga si cambian el objetivo o la lista de objetivos.
  const derivedPerspectiveId = useMemo(() => {
    if (!form.objective_id || !objectives || objectives.length === 0) {
      return null;
    }
    const linkedObjective = objectives.find(o => String(o.id) === String(form.objective_id));
    // FIX: Convertir a Number para que coincida con el tipo esperado por el select de perspectivas
    return linkedObjective ? Number(linkedObjective.perspective_id) : null;
  }, [form.objective_id, objectives]);

  // La perspectiva final que se muestra en la UI es la que el usuario seleccionó manualmente,
  // o si no ha seleccionado ninguna, la que se deriva de los datos.
  // Este patrón soluciona la condición de carrera de forma definitiva y robusta.
  const selectedPerspectiveId = userSelectedPerspectiveId ?? derivedPerspectiveId;
  
  const predefinedDepts = PREDEFINED_DEPTS; // Usar la constante importada
  const isCustomDept = form.department === 'Otro' || (form.department !== '' && !predefinedDepts.includes(form.department));
  const selectDeptVal = isCustomDept ? 'Otro' : form.department;

  const krProgress = useMemo(() => {
    if (!form.krs || form.krs.length === 0) {
      return null; // Indica que el progreso manual está permitido
    }
    const completedCount = form.krs.reduce((count, kr) => count + (kr?.completed ? 1 : 0), 0);
    return Math.round((completedCount / form.krs.length) * 100);
  }, [form.krs]);

  useEffect(() => {
    // Si el progreso se deriva de los KRs, actualiza el valor del progreso en el formulario.
    if (krProgress !== null && form.progress !== krProgress) {
      setForm(f => ({ ...f, progress: krProgress }));
    }
  }, [krProgress, form.progress]);

  return (
    <>
      <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)' }}>
        <h3 style={{ fontSize: 20, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 2px 4px rgba(37,99,235,0.1)' }}>🎯</div>
          {initialData ? 'Editar OKR Estratégico' : 'Registrar Nuevo OKR'}
        </h3>
        <button type="button" onClick={onCancel} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: 28, cursor: 'pointer', outline: 'none', lineHeight: 1 }}>×</button>
      </div>
      
      <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label className="sp-label">Resultado Clave / Objetivo Táctico</label>
            <input className="sp-input" style={{ fontSize: 16, fontWeight: 700, padding: '14px 16px' }} value={form.objective} onChange={e => setForm({...form, objective: e.target.value})} placeholder="Ej: Expandir la retención de usuarios en un 20%..." />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            <div>
              <label className="sp-label" style={{ color: 'var(--primary)' }}>1. Selecciona Perspectiva</label>
              <select 
                className="sp-input" 
                // FIX: El valor del select debe ser string para coincidir con el valor de las opciones.
                // `selectedPerspectiveId` es un número, lo convertimos a string antes de pasarlo.
                value={selectedPerspectiveId !== null ? String(selectedPerspectiveId) : ''} 
                onChange={e => {
                  const newPerspId = e.target.value ? Number(e.target.value) : null;
                  setUserSelectedPerspectiveId(newPerspId);
                  setForm(prevForm => ({...prevForm, objective_id: null})); // Al cambiar de perspectiva, se desvincula el objetivo.
              }}>
                <option value="">-- Ninguna --</option>
                {perspectives.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="sp-label" style={{ color: selectedPerspectiveId ? 'var(--primary)' : 'var(--text3)' }}>2. Vincula Objetivo</label>
              {(() => {
                // FIX: Comparación robusta convirtiendo ambos lados a String para evitar fallos
                // cuando Supabase devuelve perspective_id como string y selectedPerspectiveId es Number.
                const filteredObjs = selectedPerspectiveId === null ? [] : objectives
                  .filter(obj => String(obj.perspective_id) === String(selectedPerspectiveId))
                  .sort((a, b) => (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' }));

                const noObjectivesForPerspective = selectedPerspectiveId !== null && filteredObjs.length === 0;

                return (
                  <>
                    <select
                      className="sp-input"
                      style={{ fontWeight: 600, borderColor: noObjectivesForPerspective ? 'var(--gold)' : undefined }}
                      value={form.objective_id || ''}
                      onChange={e => setForm({...form, objective_id: e.target.value || null})}
                      disabled={selectedPerspectiveId === null}
                    >
                      <option value="">-- Sin vincular --</option>
                      {filteredObjs.map(obj => (
                        <option key={obj.id} value={String(obj.id)}>
                          [{obj.code || '?'}] {obj.name}
                        </option>
                      ))}
                    </select>
                    {noObjectivesForPerspective && (
                      <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        ⚠️ Sin objetivos para esta perspectiva. Créalos primero en Mapa Estratégico.
                      </div>
                    )}
                    {selectedPerspectiveId === null && objectives.length === 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                        Selecciona una perspectiva para ver los objetivos disponibles.
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <div>
              <label className="sp-label">Período (Trimestre / Semestre)</label>
              <input className="sp-input" value={form.period} onChange={e => setForm({...form, period: e.target.value})} placeholder="Ej: Q1 2024" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label className="sp-label">📂 Área / Dirección</label>
              <select className="sp-input" value={selectDeptVal} onChange={e => setForm({...form, department: e.target.value})}>
                <option value="">Seleccionar área...</option>
                {predefinedDepts.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
                <option value="Otro">Otro</option>
              </select>
              {isCustomDept && (
                <input className="sp-input scale-in" style={{ marginTop: 8, borderColor: 'var(--primary)', background: 'var(--primary-light)' }} autoFocus placeholder="Escribe el nombre del área..." value={form.department === 'Otro' ? '' : form.department} onChange={e => setForm({...form, department: e.target.value})} />
              )}
            </div>
            <div>
              <label className="sp-label">👤 Líder General (Dueño)</label>
              <input className="sp-input" value={form.owner} onChange={e => setForm({...form, owner: e.target.value})} placeholder="Ej: Juan Pérez" />
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, background: 'var(--bg3)', padding: 20, borderRadius: 16, border: '1px solid var(--border)' }}>
            <div>
              <label className="sp-label">Estado de Ejecución</label>
              <select className="sp-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                <option value="not_started">Sin iniciar</option>
                <option value="on_track">En curso</option>
                <option value="at_risk">En riesgo</option>
                <option value="completed">Completado</option>
              </select>
            </div>
            <div>
              <label className="sp-label">Progreso Real (%)</label>
              <input 
                className="sp-input" 
                type="number" min="0" max="100" 
                style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)' }} 
                value={form.progress} 
                onChange={e => { if (krProgress === null) setForm({...form, progress: Number(e.target.value)})}} 
                disabled={krProgress !== null} title={krProgress !== null ? "El progreso se calcula automáticamente desde los KRs." : "Progreso manual"} />
            </div>
            <div>
              <label className="sp-label">Nivel de Confianza (1-10)</label>
              <input className="sp-input" type="number" min="1" max="10" style={{ fontSize: 16, fontWeight: 700 }} value={form.confidence_level} onChange={e => setForm({...form, confidence_level: Number(e.target.value)})} />
            </div>
          </div>
          
          <div style={{ paddingTop: 24, borderTop: '1px solid var(--border)' }}>
            <label className="sp-label" style={{ marginBottom: 16, color: 'var(--text)' }}>Desglose de Actividades (KRs)</label>
            {(form.krs || []).map((kr, i) => (
              <div key={i} className="scale-in" style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', background: 'var(--bg3)', padding: '6px', borderRadius: 12, border: '1px solid var(--border)' }}>
                <input 
                  type="checkbox"
                  style={{ marginLeft: 8, marginRight: 4, width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }}
                  checked={!!kr?.completed}
                  onChange={() => {
                    const newKrs = [...(form.krs || [])];
                    const currentKr = newKrs[i];
                    if (typeof currentKr === 'string') newKrs[i] = { title: currentKr, owner: '', completed: true, deadline: '' };
                    else newKrs[i] = { ...currentKr, completed: !currentKr.completed };
                    setForm({...form, krs: newKrs});
                  }}
                />
                <input className="sp-input" style={{ border: 'none', background: 'transparent', boxShadow: 'none', padding: '8px 12px', fontSize: 13, flex: 2 }} value={kr.title || kr} onChange={e => {
                  const newKrs = [...(form.krs || [])];
                  if(typeof newKrs[i] === 'string') newKrs[i] = { title: e.target.value, owner: '', completed: false, deadline: '' };
                  else newKrs[i] = { ...newKrs[i], title: e.target.value };
                  setForm({...form, krs: newKrs});
                }} placeholder="Describir actividad clave..." />
                <div style={{ width: 1, height: 24, background: 'var(--border)' }}></div>
                <input className="sp-input" style={{ border: 'none', background: 'transparent', boxShadow: 'none', padding: '8px 12px', width: 130, fontSize: 13 }} value={kr.owner || ''} onChange={e => {
                  const newKrs = [...(form.krs || [])];
                  if(typeof newKrs[i] === 'string') newKrs[i] = { title: newKrs[i], owner: e.target.value, completed: false, deadline: '' };
                  else newKrs[i] = { ...newKrs[i], owner: e.target.value };
                  setForm({...form, krs: newKrs});
                }} placeholder="👤 Dueño" />
                <div style={{ width: 1, height: 24, background: 'var(--border)' }}></div>
                <input className="sp-input" type="date" style={{ border: 'none', background: 'transparent', boxShadow: 'none', padding: '8px 12px', width: 130, fontSize: 12, color: 'var(--text2)' }} value={kr.deadline || ''} onChange={e => {
                  const newKrs = [...(form.krs || [])];
                  if(typeof newKrs[i] === 'string') newKrs[i] = { title: newKrs[i], owner: '', completed: false, deadline: e.target.value };
                  else newKrs[i] = { ...newKrs[i], deadline: e.target.value };
                  setForm({...form, krs: newKrs});
                }} title="Fecha límite" />
                <button type="button" onClick={() => {
                  const newKrs = form.krs.filter((_, idx) => idx !== i);
                  setForm({...form, krs: newKrs});
                }} className="icon-btn" style={{ width: 34, height: 34, color: 'var(--red)', background: 'var(--red-light)', border: 'none', borderRadius: 8, marginRight: 4 }} title="Eliminar KR">×</button>
              </div>
            ))}
            <button type="button" onClick={() => setForm({...form, krs: [...(form.krs || []), { title: '', owner: '', completed: false, deadline: '' }]})} className="sp-btn" style={{ background: 'var(--bg)', color: 'var(--text)', border: '2px dashed var(--border)', width: '100%', justifyContent: 'center', marginTop: 8, padding: '14px', fontSize: 13 }}>+ Añadir Tarea o Actividad (KR)</button>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
        <button className="sp-btn" onClick={onCancel} style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', padding: '12px 24px' }}>Cancelar</button>
        <button className="sp-btn" onClick={() => onSave(form)} style={{ background: 'var(--primary)', color: '#fff', padding: '12px 32px', boxShadow: '0 4px 16px rgba(37,99,235,0.3)', fontSize: 14 }}>💾 {initialData ? 'Actualizar OKR' : 'Guardar OKR'}</button>
      </div>
    </>
  );
}

// --- Esquemas Zod para validación de formularios ---
// Nota: Estos son esquemas básicos. Deberías expandirlos con tus reglas de validación específicas.
import { z } from 'zod';

const kpiFormSchema = z.object({
  name: z.string().min(1, "El nombre del indicador es obligatorio"),
  target: z.number().min(0, "La meta no puede ser negativa"),
  value: z.number().min(0, "El valor actual no puede ser negativo"),
  unit: z.string().min(1, "La unidad es obligatoria"),
  owner: z.string().min(1, "El responsable es obligatorio"),
  department: z.string().min(1, "El área/dirección es obligatoria"),
});

const initiativeFormSchema = z.object({
  title: z.string().min(1, "El título de la iniciativa es obligatorio"),
  status: z.enum(['not_started', 'in_progress', 'at_risk', 'completed']),
  progress: z.number().min(0).max(100, "El progreso debe estar entre 0 y 100"),
  owner: z.string().min(1, "El responsable es obligatorio"),
  end_date: z.string().min(1, "La fecha límite es obligatoria"),
});

export function KPIForm({ onSave, onCancel, initialData = null }) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(kpiFormSchema),
    defaultValues: initialData || { name: '', target: 0, value: 0, unit: '%', owner: '', department: '' },
  });
  const form = watch(); // Observa el estado del formulario gestionado por react-hook-form
  const predefinedDepts = PREDEFINED_DEPTS; // Usar la constante importada
  const isCustomDept = form.department === 'Otro' || (form.department !== '' && !predefinedDepts.includes(form.department));
  const selectDeptVal = isCustomDept ? 'Otro' : (form.department || '');

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)' }}>
        <h3 style={{ fontSize: 20, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(13,148,136,0.15)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 2px 4px rgba(13,148,136,0.1)' }}>📊</div>
          {initialData ? 'Editar Indicador (KPI)' : 'Crear Nuevo Indicador (KPI)'}
        </h3>
        <button type="button" onClick={onCancel} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: 28, cursor: 'pointer', outline: 'none', lineHeight: 1 }}>×</button>
      </div>

      <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label className="sp-label">Nombre del Indicador Analítico</label>
            <input {...register("name")} className="sp-input" style={{ fontSize: 16, fontWeight: 700, padding: '14px 16px' }} placeholder="Ej: Margen de Utilidad Bruta" autoFocus />
            {errors.name && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>{errors.name.message}</p>}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label className="sp-label">📂 Área / Dirección</label>
              <select {...register("department")} className="sp-input" value={selectDeptVal}>
                <option value="">Seleccionar área...</option>
                {PREDEFINED_DEPTS.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
                <option value="Otro">Otro</option>
              </select>
              {selectDeptVal === 'Otro' && (
                <input {...register("department")} className="sp-input scale-in" style={{ marginTop: 8, borderColor: 'var(--primary)', background: 'var(--primary-light)' }} placeholder="Escribe el nombre del área..." />
              )}
            </div>
            <div>
              <label className="sp-label">👤 Responsable / Dueño del Dato (DRI)</label>
              <input {...register("owner")} className="sp-input" placeholder="Ej: Director Financiero" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 16, background: 'var(--bg3)', padding: 20, borderRadius: 16, border: '1px solid var(--border)' }}>
            <div>
              <label className="sp-label">Meta Esperada (Target)</label>
              <input {...register("target", { valueAsNumber: true })} type="number" className="sp-input" style={{ fontSize: 18, fontWeight: 800 }} />
              {errors.target && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>{errors.target.message}</p>}
            </div>
            <div>
              <label className="sp-label">Valor Actual (Real)</label>
              <input {...register("value", { valueAsNumber: true })} type="number" className="sp-input" style={{ fontSize: 18, fontWeight: 800, color: 'var(--teal)' }} step="any" />
              {errors.value && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>{errors.value.message}</p>}
            </div>
            <div>
              <label className="sp-label">Unidad</label>
              <input {...register("unit")} className="sp-input" style={{ textAlign: 'center', fontWeight: 800, fontSize: 18 }} placeholder="%, $, #" />
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
        <button type="button" className="sp-btn" onClick={() => onCancel()} style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', padding: '12px 24px' }}>Cancelar</button>
        <button type="submit" className="sp-btn" disabled={isSubmitting} style={{ background: 'var(--teal)', color: '#fff', padding: '12px 32px', boxShadow: '0 4px 16px rgba(13,148,136,0.3)', fontSize: 14 }}>
          {isSubmitting ? 'Guardando...' : `💾 ${initialData ? 'Actualizar KPI' : 'Guardar KPI'}`}
        </button>
      </div>
    </form>
  );
}

export function InitiativeForm({ onSave, onCancel, initialData = null }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(initiativeFormSchema),
    defaultValues: initialData ? { ...initialData, end_date: initialData.end_date ? new Date(initialData.end_date).toISOString().split('T')[0] : '' } : { title: '', status: 'not_started', progress: 0, owner: '', end_date: '' },
  });

  // COMMENT: Esta función recibe los datos validados por react-hook-form y los pasa al manejador onSave del componente padre.
  const onSubmit = (data) => {
    onSave(data);
  };

  return (
    // COMMENT: El formulario ahora utiliza el manejador `handleSubmit` para validar antes de llamar a `onSubmit`.
    <form onSubmit={handleSubmit(onSubmit)}>
      <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)' }}>
        <h3 style={{ fontSize: 20, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(124,58,237,0.15)', color: 'var(--violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 2px 4px rgba(124,58,237,0.1)' }}>🚀</div>
          {initialData ? 'Editar Iniciativa' : 'Nueva Iniciativa Operativa'}
        </h3>
        <button type="button" onClick={onCancel} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', fontSize: 28, cursor: 'pointer', outline: 'none', lineHeight: 1 }} title="Cerrar modal">×</button>
      </div>

      <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label className="sp-label">Título de la Iniciativa (Proyecto)</label>
            {/* FIX: Se registra el campo y se corrige la sintaxis para mostrar el error. */}
            <input {...register("title")} className="sp-input" style={{ fontSize: 16, fontWeight: 700, padding: '14px 16px' }} placeholder="Ej: Lanzar nueva campaña de marketing digital" autoFocus />
            {errors.title && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>{errors.title.message}</p>}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label className="sp-label">👤 Responsable de Ejecución</label>
              {/* FIX: Se registra el campo, se corrige el placeholder y se añade el manejo de errores. */}
              <input {...register("owner")} className="sp-input" placeholder="Ej: Gerente de Marketing" />
              {errors.owner && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>{errors.owner.message}</p>}
            </div>
            <div>
              <label className="sp-label">⏰ Fecha Límite de Entrega</label>
              {/* FIX: Se registra el campo, se corrige el typo 'fontSiz' y se añade el manejo de errores. */}
              <input {...register("end_date")} className="sp-input" type="date" />
              {errors.end_date && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>{errors.end_date.message}</p>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, background: 'var(--bg3)', padding: 20, borderRadius: 16, border: '1px solid var(--border)' }}>
            <div>
              <label className="sp-label">Fase de Trabajo Actual</label>
              {/* FIX: Se registra el campo en lugar de usar estado local. */}
              <select {...register("status")} className="sp-input">
                <option value="not_started">Sin iniciar (Backlog)</option>
                <option value="in_progress">En progreso (Activa)</option>
                <option value="at_risk">En riesgo (Alerta)</option>
                <option value="completed">Completada (Cerrada)</option>
              </select>
              {errors.status && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>{errors.status.message}</p>}
            </div>
            <div>
              <label className="sp-label">Porcentaje de Avance (%)</label>
              {/* FIX: Se registra el campo en lugar de usar estado local. Se convierte a número. */}
              <input {...register("progress", { valueAsNumber: true })} className="sp-input" type="number" min="0" max="100" style={{ fontSize: 16, fontWeight: 700, color: 'var(--violet)' }} />
              {errors.progress && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>{errors.progress.message}</p>}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 32px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
        <button type="button" className="sp-btn" onClick={onCancel} style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', padding: '12px 24px' }}>Cancelar</button>
        {/* FIX: El botón ahora es de tipo 'submit' para activar la validación y el envío del formulario. */}
        <button type="submit" className="sp-btn" disabled={isSubmitting} style={{ background: 'var(--violet)', color: '#fff', padding: '12px 32px', boxShadow: '0 4px 16px rgba(124,58,237,0.3)', fontSize: 14 }}>
          {isSubmitting ? 'Guardando...' : `💾 ${initialData ? 'Actualizar Proyecto' : 'Crear Iniciativa'}`}
        </button>
      </div>
    </form>
  );
}