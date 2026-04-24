import React, { useState, useEffect } from 'react';
import { claudeService, okrService, notificationService } from './services.js';
import { useStore } from './store.js';
import { deepEqual } from 'fast-equals';
import { PREDEFINED_DEPTS } from './constants.js';
import { getQuarterFromDate } from './utils.js'; // Asumiendo que crearás este util

export default function OKRGenerator() {
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [savingAll, setSavingAll] = useState(false);
  const objectives = useStore(state => state.objectives);
  const perspectives = useStore(state => state.perspectives);

  useEffect(() => {
    // This effect ensures that if objectives load after the AI results,
    // the perspective dropdown is correctly pre-selected.
    if (results && objectives.length > 0) {
        const newResults = results.map(res => {
            if (res.objective_id && !res.ui_perspective_id) {
                const linkedObjective = objectives.find(o => String(o.id) === String(res.objective_id));
                if (linkedObjective) {
                    return { ...res, ui_perspective_id: linkedObjective.perspective_id };
                }
            }
            return res;
        });
        if (!deepEqual(results, newResults)) setResults(newResults);
    }
  }, [results, objectives]);

  const processGeneratedResults = (parsedResults) => {
    return (Array.isArray(parsedResults) ? parsedResults : (parsedResults.okrs || [])).map(res => {
        const validId = getValidObjectiveId(res.objective_id);
        let perspectiveId = null;
        if (validId) {
            const linkedObjective = (objectives || []).find(o => String(o.id) === String(validId));
            if (linkedObjective) {
                perspectiveId = linkedObjective.perspective_id;
            }
        }
        return { ...res, ui_perspective_id: perspectiveId };
    });
  };

  const handleGenerate = async () => {
    setLoading(true);
    setGeneratedOKRs([]);
    try {
      const prompt = [
        {
          role: 'system',
          content: 'Eres experto en OKRs. Genera ' + (numOKRs || 3) + ' OKRs estratégicos para la perspectiva "' + (selectedPerspective || 'Financiera') + '" basados en el contexto dado. Responde SOLO con JSON válido: [{"objective": "...", "keyResults": ["...", "...", "..."]}]. Sin texto adicional.'
        },
        {
          role: 'user',
          content: 'Empresa: ' + (orgName || 'nuestra empresa') + '. Industria: ' + (industry || 'general') + '. Visión: ' + (vision || 'crecer sustentablemente') + '. Período: ' + (period || 'Q2 2026') + '.'
        }
      ];
      
      const raw = await claudeService.chat(prompt);
      
      // Parsear JSON de la respuesta
      const jsonMatch = raw.match(/\[.*\]/s);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setGeneratedOKRs(parsed);
      } else {
        // Fallback: mostrar texto crudo formateado
        setGeneratedOKRs([{ objective: raw, keyResults: [] }]);
      }
    } catch (e) {
      notificationService.error('Error generando OKRs: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoGenerate = async () => {
    const mapObjectives = objectives?.map(o => ({ id: o.id, name: o.name })) || [];
    if (mapObjectives.length === 0) {
      return notificationService.error("No hay objetivos en tu Mapa Estratégico para auto-generar OKRs.");
    }
    setLoading(true);
    
    const prompt = `Actúa como un experto en OKRs. Tengo estos Objetivos Estratégicos en mi mapa: ${JSON.stringify(mapObjectives)}.
    Genera exactamente 1 OKR táctico y detallado para CADA UNO de estos objetivos.
    Asigna un departamento (department) y un puesto responsable (owner) lógicos. Vincúlalos obligatoriamente usando su "objective_id" correspondiente.
    Devuelve ÚNICAMENTE un JSON válido: [{"obj": "Texto OKR", "department": "Área", "owner": "Dueño", "objective_id": "ID", "krs": ["KR 1", "KR 2"]}]`;
    
    try {
      const response = await claudeService.chat(
        [{ role: 'system', content: 'Eres un generador de OKRs que solo responde con JSON válido.' }, { role: 'user', content: prompt }]
      );
      const parsed = JSON.parse(response);
      setResults(processGeneratedResults(parsed));
    } catch (err) {
      console.error("Error auto-generando:", err);
      notificationService.error("Error de IA: " + err.message);
    }
    setLoading(false);
  };

  // Función de seguridad y saneamiento de datos.
  // Previene que IDs inválidos o maliciosos provenientes de la IA se intenten guardar en la BD,
  // lo que podría causar errores de integridad referencial.
  // Filtro purificador estricto para base de datos
  const getValidObjectiveId = (id) => {
    if (!id) return null;
    const strId = String(id).trim();
    if (strId === "" || strId.toLowerCase() === "null" || strId.toLowerCase() === "undefined") return null;
    const exists = (objectives || []).find(o => String(o.id) === strId);
    return exists ? exists.id : null;
  };

  // Función unificada para crear el payload de un OKR, evitando duplicación de código.
  const createOkrPayload = (okrData) => {
    const validId = getValidObjectiveId(okrData.objective_id);
    const payload = {
      objective: okrData.obj || okrData.objective || 'Nuevo OKR',
      department: okrData.department || 'Generales',
      owner: okrData.owner || 'Sin asignar',
      status: 'not_started',
      progress: 0, // El progreso inicial siempre es 0
      period: getQuarterFromDate(new Date()), // Usar el trimestre actual dinámicamente
      krs: okrData.krs || [],
      confidence_level: 8
    };
    if (validId) payload.objective_id = validId;
    return payload;
  };

  const handleSave = async (idx, okrData) => {
    try {
      const payload = createOkrPayload(okrData);
      await okrService.create(payload);
      notificationService.success(`OKR "${payload.objective.substring(0, 20)}..." guardado.`);
      setResults(currentResults => currentResults.map((res, i) => i === idx ? { ...res, saved: true } : res));
    } catch (err) {
      notificationService.error("Error al guardar: " + err.message);
    }
  };

  const handleSaveAll = async () => {
    if (!results) return;
    setSavingAll(true);
    const promises = results
      .filter(r => !r.saved)
      .map(r => okrService.create(createOkrPayload(r)));
    
    try {
      await Promise.all(promises);
      setResults(currentResults => currentResults.map(res => ({ ...res, saved: true })));
      notificationService.success(`${promises.length} OKRs han sido importados a la plataforma.`);
    } catch (err) {
      notificationService.error("Error al guardar múltiples OKRs: " + err.message);
    } finally {
      setSavingAll(false);
    }
  };

  const handleEditResult = (index, field, value) => {
    const newResults = [...results];
    newResults[index][field] = value;
    if (field === 'ui_perspective_id') {
        newResults[index]['objective_id'] = null;
    }
    setResults(newResults);
  };

  const handleAddKR = (index) => {
    const newResults = [...results];
    if (!newResults[index].krs) newResults[index].krs = [];
    newResults[index].krs.push("");
    setResults(newResults);
  };

  const handleRemoveKR = (index, krIndex) => {
    const newResults = [...results];
    newResults[index].krs.splice(krIndex, 1);
    setResults(newResults);
  };

  return (
    <div className="fade-up">
      <div className="sp-card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ marginBottom: 10 }}>✨ Generador de OKRs (Asistente IA)</h3>
        <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 20 }}>Escribe una meta general o auto-genera OKRs para todos los objetivos de tu Mapa Estratégico. Edítalos directamente aquí antes de guardarlos.</p>
        
        <textarea className="sp-input" value={idea} onChange={e => setIdea(e.target.value)} placeholder="Ej: Quiero mejorar las ventas de la empresa este año..." style={{ minHeight: 80, marginBottom: 16, resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="sp-btn" onClick={handleGenerate} disabled={loading} style={{ background: 'var(--violet)' }}>
            {loading ? 'Procesando...' : '⚡ Generar a partir de Idea'}
          </button>
          <button className="sp-btn" onClick={handleAutoGenerate} disabled={loading} style={{ background: 'var(--teal)', border: '1px solid var(--border)' }}>
            {loading ? 'Escaneando Mapa...' : '🤖 Auto-generar para todo mi Mapa'}
          </button>
        </div>
      </div>

      {results && (
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: 14, color: 'var(--text2)', margin: 0 }}>Sugerencias Generadas:</h4>
            {results.some(r => !r.saved) && (
              <button className="sp-btn" onClick={handleSaveAll} disabled={savingAll} style={{ background: 'var(--teal)', padding: '6px 16px' }}>
                {savingAll ? '⏳ Importando...' : '📥 Guardar Todos los OKRs'}
              </button>
            )}
          </div>
          {results.map((r, i) => {
            const predefinedDepts = ["Dirección General", "Comercial y Ventas", "Administración y Finanzas", "Operaciones y Logística", "Recursos Humanos", "Tecnología e Innovación", "Marketing y Diseño", "Legal"];
            const isCustomDept = r.department === 'Otro' || (r.department !== '' && !PREDEFINED_DEPTS.includes(r.department));
            return (
            <div key={i} className="scale-in" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderLeft: '4px solid var(--violet)', padding: 20, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <input className="sp-input" style={{ fontWeight: 800, fontSize: 15, flex: 1, border: '1px dashed transparent', background: 'transparent' }} onFocus={e => e.target.style.border='1px dashed var(--violet)'} onBlur={e => e.target.style.border='1px dashed transparent'} value={r.obj || ''} onChange={e => handleEditResult(i, 'obj', e.target.value)} placeholder="Escribe el OKR aquí..." />
                <button className="sp-btn" onClick={() => handleSave(i, r)} disabled={r.saved} style={{ padding: '8px 16px', fontSize: 12, background: r.saved ? 'var(--green)' : 'var(--primary)', flexShrink: 0 }}>
                  {r.saved ? '✅ Guardado' : '+ Guardar OKR'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <div style={{display: 'flex', alignItems: 'center', background: 'var(--bg2)', borderRadius: 6, border: '1px solid var(--border)', overflow: 'hidden', flex: 1, minWidth: 150}}>
                  <span style={{fontSize: 13, padding: '0 10px', background: 'var(--border)', color: 'var(--text2)'}}>📂 Área</span>
                  <select className="sp-input" style={{ border: 'none', padding: '6px 10px', fontSize: 12, borderRadius: 0, height: '100%', flex: isCustomDept ? '0 0 auto' : 1, width: isCustomDept ? 100 : 'auto' }} value={isCustomDept ? 'Otro' : (r.department || '')} onChange={e => handleEditResult(i, 'department', e.target.value)}>
                    <option value="">Seleccionar área...</option>
                    {PREDEFINED_DEPTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                    <option value="Otro">Otro</option>
                  </select>
                  {isCustomDept && (
                    <input className="sp-input" style={{ border: 'none', borderLeft: '1px dashed var(--border)', padding: '6px 10px', fontSize: 12, borderRadius: 0, height: '100%', flex: 1, background: 'var(--primary-light)' }} autoFocus placeholder="Escribir..." value={r.department === 'Otro' ? '' : r.department} onChange={e => handleEditResult(i, 'department', e.target.value)} />
                  )}
                </div>
                <div style={{display: 'flex', alignItems: 'center', background: 'var(--bg2)', borderRadius: 6, border: '1px solid var(--border)', overflow: 'hidden', flex: 1, minWidth: 150}}>
                  <span style={{fontSize: 13, padding: '0 10px', background: 'var(--border)', color: 'var(--text2)'}}>👤 Dueño</span>
                  <input className="sp-input" style={{ border: 'none', padding: '6px 10px', fontSize: 12, borderRadius: 0, height: '100%' }} value={r.owner || ''} onChange={e => handleEditResult(i, 'owner', e.target.value)} placeholder="Responsable" />
                </div>
                <div style={{display: 'flex', alignItems: 'center', background: 'var(--primary-light)', borderRadius: 6, border: '1px solid rgba(37,99,235,0.2)', overflow: 'hidden', flex: 1, minWidth: 220}}>
                  <span style={{fontSize: 13, padding: '0 10px', color: 'var(--primary)', fontWeight: 600}}>🔗</span>
                  <select className="sp-input" style={{ border: 'none', background: 'transparent', color: 'var(--primary)', fontWeight: 600, padding: '6px 10px', fontSize: 12, borderRadius: 0, height: '100%', borderRight: '1px solid rgba(37,99,235,0.2)' }} value={r.ui_perspective_id || ''} onChange={e => handleEditResult(i, 'ui_perspective_id', e.target.value ? Number(e.target.value) : null)}>
                    <option value="">Perspectiva</option>
                    {(perspectives || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <select className="sp-input" style={{ border: 'none', background: 'transparent', color: 'var(--primary)', fontWeight: 600, padding: '6px 10px', fontSize: 12, borderRadius: 0, height: '100%', flex: 1 }} value={getValidObjectiveId(r.objective_id) || ''} onChange={e => handleEditResult(i, 'objective_id', e.target.value)} disabled={!r.ui_perspective_id}>
                    <option value="">Objetivo</option>
                    {(objectives || [])
                      .filter(obj => Number(obj.perspective_id) === Number(r.ui_perspective_id))
                      .sort((a, b) => {
                        const codeA = a.code || '';
                        const codeB = b.code || '';
                        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
                      })
                      .map(o => <option key={o.id} value={o.id}>[{o.code || '?'}] {o.name}</option>)
                    }
                  </select>
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>Resultados Clave (KRs)</div>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(r.krs || []).map((kr, j) => (
                  <li key={j} style={{ display: 'flex', gap: 8 }}>
                    <span style={{ background: 'var(--border)', color: 'var(--text2)', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>KR {j + 1}</span>
                    <input className="sp-input" style={{ fontSize: 13, padding: '6px 12px', flex: 1 }} value={kr} onChange={e => {
                      const newResults = [...results];
                      newResults[i].krs[j] = e.target.value;
                      setResults(newResults);
                    }} placeholder="Definir Resultado Clave..." />
                    <button onClick={() => handleRemoveKR(i, j)} style={{ background: 'transparent', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18, padding: '0 8px', outline: 'none' }} title="Eliminar KR">×</button>
                  </li>
                ))}
              </ul>
              <button className="sp-btn" onClick={() => handleAddKR(i)} style={{ marginTop: 12, background: 'var(--bg2)', color: 'var(--text2)', border: '1px dashed var(--border)', fontSize: 11, padding: '6px 12px' }}>+ Añadir otro KR</button>
            </div>
          )})}
        </div>
      )}
    </div>
  );
}
