import React, { useState, useEffect } from 'react';
import { supabase } from './supabase.js';
import * as XLSX from 'xlsx';

export default function ReconciliationModule() {
  const [bankMovements, setBankMovements] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [totalAR, setTotalAR] = useState(0);
  const [totalClearing, setTotalClearing] = useState(0);
  const [totalSettled, setTotalSettled] = useState(0);
  const [loading, setLoading] = useState(true);

  const [matchingStatus, setMatchingStatus] = useState(null);
  const [searchBank, setSearchBank] = useState('');
  const [searchTx, setSearchTx] = useState('');
  const [recentMatches, setRecentMatches] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      // Extraemos nombres de las empresas desde el esquema público para cruzar la información
      const { data: orgs } = await supabase.from('organizations').select('id, name');
      const orgMap = {};
      orgs?.forEach(o => orgMap[o.id] = o.name);

      // Llamadas al esquema financiero (Audit-Grade)
      const { data: inv } = await supabase.schema('finance').from('fin_invoices').select('*').eq('status', 'pending');
      const { data: txs } = await supabase.schema('finance').from('fin_transactions').select('*');
      const { data: banks } = await supabase.schema('finance').from('fin_bank_movements').select('*').order('value_date', { ascending: false });
      const { data: matches } = await supabase.schema('finance').from('fin_reconciliation_matches').select('*');

      const matchedTxIds = new Set(matches?.map(m => m.transaction_uetid) || []);

      let tAR = 0; inv?.forEach(i => tAR += Number(i.total_amount || 0));
      let tClear = 0;
      let tSet = 0;

      const formattedTxs = (txs || []).map(t => {
        const isMatched = matchedTxIds.has(t.uetid);
        if (!isMatched) tClear += Number(t.net_amount || 0);
        return { ...t, matched: isMatched, tenantName: orgMap[t.tenant_id] || 'Desconocido' };
      });

      const formattedBanks = (banks || []).map(b => {
        if (b.reconciliation_status === 'matched') tSet += Number(b.amount || 0);
        return b;
      });

      setTotalAR(tAR); setTotalClearing(tClear); setTotalSettled(tSet);
      setTransactions(formattedTxs);
      setBankMovements(formattedBanks);
      setRecentMatches((matches || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (err) {
      console.error("Error cargando motor financiero:", err);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Algoritmo Real: Nivel 1 Exact Match (Cruce determinístico)
  const runSmartMatch = async () => {
    setMatchingStatus('running');
    try {
      let matchedCount = 0;
      const matchesToInsert = [];
      const banksToUpdate = [];
      const unmatchedBanks = bankMovements.filter(b => b.reconciliation_status === 'unmatched');

      transactions.forEach(tx => {
        if (tx.matched) return;
        const bIdx = unmatchedBanks.findIndex(b => Number(b.amount) === Number(tx.net_amount) && b.reconciliation_status === 'unmatched');
        if (bIdx !== -1) {
          const b = unmatchedBanks[bIdx];
          b.reconciliation_status = 'matched'; // Evita doble match en el mismo ciclo
          matchesToInsert.push({ bank_movement_id: b.id, transaction_uetid: tx.uetid, match_type: 'exact_auto', variance_amount: 0 });
          banksToUpdate.push(b.id);
          matchedCount++;
        }
      });

      if (matchesToInsert.length > 0) {
        await supabase.schema('finance').from('fin_reconciliation_matches').insert(matchesToInsert);
        for (const bid of banksToUpdate) await supabase.schema('finance').from('fin_bank_movements').update({ reconciliation_status: 'matched' }).eq('id', bid);
      }

      setMatchingStatus(`success_${matchedCount}`);
      await loadData(); // Refrescar los datos oficiales para recálculo de dashboards
      setTimeout(() => setMatchingStatus(null), 4000);
    } catch (e) { alert("Error ejecutando Smart Match: " + e.message); setMatchingStatus(null); }
  };

  // Algoritmo de Conciliación Manual (Drag & Drop)
  const handleManualMatch = async (bankId, txUetid) => {
    const bank = bankMovements.find(b => b.id === bankId);
    const tx = transactions.find(t => t.uetid === txUetid);
    if (!bank || !tx) return;

    const variance = (Number(bank.amount) - Number(tx.net_amount)).toFixed(2);
    if (variance !== "0.00") {
      if (!confirm(`⚠️ Atención: Existe una diferencia de $${variance} entre el depósito y la transacción.\n\n¿Deseas forzar la conciliación manual y registrar la varianza contable?`)) return;
    }

    setLoading(true);
    try {
      await supabase.schema('finance').from('fin_reconciliation_matches').insert([
        { bank_movement_id: bankId, transaction_uetid: txUetid, match_type: 'manual_override', variance_amount: variance }
      ]);
      await supabase.schema('finance').from('fin_bank_movements').update({ reconciliation_status: 'matched' }).eq('id', bankId);
      await loadData();
    } catch (e) { alert("Error en conciliación manual: " + e.message); setLoading(false); }
  };

  // Algoritmo para Deshacer Conciliación
  const handleUndoMatch = async (matchId, bankId) => {
    if (!confirm("¿Estás seguro de deshacer esta conciliación?\n\nEl cruce contable se eliminará y ambos movimientos volverán a sus respectivas bandejas de pendientes.")) return;
    setLoading(true);
    try {
      await supabase.schema('finance').from('fin_reconciliation_matches').delete().eq('id', matchId);
      await supabase.schema('finance').from('fin_bank_movements').update({ reconciliation_status: 'unmatched' }).eq('id', bankId);
      await loadData();
    } catch (e) { alert("Error al deshacer conciliación: " + e.message); setLoading(false); }
  };

  const filteredBank = bankMovements.filter(b => {
    if (b.reconciliation_status !== 'unmatched') return false;
    if (searchBank && !((b.statement_reference || '').toLowerCase().includes(searchBank.toLowerCase()) || String(b.amount).includes(searchBank))) return false;
    if (startDate && b.value_date < startDate) return false;
    if (endDate && b.value_date > endDate) return false;
    return true;
  });

  const filteredTx = transactions.filter(t => {
    if (t.matched) return false;
    if (searchTx && !((t.tenantName || '').toLowerCase().includes(searchTx.toLowerCase()) || (t.uetid || '').toLowerCase().includes(searchTx.toLowerCase()))) return false;
    const txDate = t.created_at ? t.created_at.substring(0, 10) : '';
    if (startDate && txDate && txDate < startDate) return false;
    if (endDate && txDate && txDate > endDate) return false;
    return true;
  });

  const exportHistoryToExcel = () => {
    if (recentMatches.length === 0) return alert("No hay conciliaciones para exportar.");

    const rows = [
      ["Fecha de Cruce", "Método", "Fecha Depósito", "Referencia Bancaria", "Monto Banco", "Pasarela", "ID Transacción", "Monto Sistema", "Diferencia/Ajuste"]
    ];

    recentMatches.forEach(match => {
      const b = bankMovements.find(x => x.id === match.bank_movement_id) || {};
      const t = transactions.find(x => x.uetid === match.transaction_uetid) || {};

      rows.push([
        new Date(match.created_at).toLocaleString(),
        match.match_type === 'manual_override' ? 'Forzado Manual' : 'Smart Match (IA)',
        b.value_date || 'N/A',
        b.statement_reference || 'N/A',
        b.amount ? `$${Number(b.amount).toFixed(2)}` : '$0.00',
        t.gateway || 'N/A',
        match.transaction_uetid,
        t.net_amount ? `$${Number(t.net_amount).toFixed(2)}` : '$0.00',
        match.variance_amount ? `$${Number(match.variance_amount).toFixed(2)}` : '$0.00'
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{wch: 22}, {wch: 18}, {wch: 15}, {wch: 25}, {wch: 15}, {wch: 15}, {wch: 30}, {wch: 15}, {wch: 15}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial_Conciliaciones");
    XLSX.writeFile(wb, `Conciliaciones_Contables_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Dashboard de Tesorería */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
        <div className="sp-card" style={{ padding: 24, borderTop: '4px solid var(--gold)' }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Cuentas por Cobrar (AR)</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text)', letterSpacing: '-1px' }}>${totalAR.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 8, fontWeight: 600 }}>Facturas emitidas pendientes</div>
        </div>
        <div className="sp-card" style={{ padding: 24, borderTop: '4px solid var(--teal)', background: 'linear-gradient(135deg, var(--bg2), rgba(13, 148, 136, 0.05))' }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>En Tránsito (Clearing)</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--teal)', letterSpacing: '-1px' }}>${totalClearing.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>Pagado en Stripe/PayPal, volando al banco</div>
        </div>
        <div className="sp-card" style={{ padding: 24, borderTop: '4px solid var(--green)', background: 'linear-gradient(135deg, var(--bg2), rgba(34, 197, 94, 0.05))' }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Liquidado en Banco</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--green)', letterSpacing: '-1px' }}>${totalSettled.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>Dinero disponible en cuenta bancaria</div>
        </div>
      </div>

      {/* Mesa de Trabajo de Conciliación (Split-Screen) */}
      <div className="sp-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', background: 'var(--bg3)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(34, 197, 94, 0.15)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚖️</div>
              Mesa de Trabajo de Conciliación
            </h3>
            <p style={{ color: 'var(--text3)', fontSize: 13, margin: '4px 0 0 0' }}>Cruza los depósitos bancarios contra las liquidaciones de pasarelas (UETID).</p>
          </div>
          <button onClick={runSmartMatch} disabled={matchingStatus === 'running'} className="sp-btn" style={{ background: 'var(--primary)', color: '#fff', padding: '10px 20px', borderRadius: 99, boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}>
            {matchingStatus === 'running' ? '⏳ Analizando Algoritmos...' : '⚡ Ejecutar Smart Match (IA)'}
          </button>
        </div>

        <div style={{ padding: '12px 24px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 700 }}>📅 Filtrar Operaciones por Fecha:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>Desde:</span>
            <input type="date" className="sp-input" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '6px 10px', fontSize: 12, width: 'auto', borderRadius: 8, height: 'auto' }} />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>Hasta:</span>
            <input type="date" className="sp-input" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '6px 10px', fontSize: 12, width: 'auto', borderRadius: 8, height: 'auto' }} />
            {(startDate || endDate) && (
              <button onClick={() => { setStartDate(''); setEndDate(''); }} className="sp-btn" style={{ padding: '6px 12px', fontSize: 11, background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text3)' }}>Limpiar Filtro</button>
            )}
          </div>
        </div>

        {matchingStatus && matchingStatus.startsWith('success') && (
          <div className="scale-in" style={{ background: 'var(--green-light)', color: 'var(--green)', padding: '12px 24px', fontSize: 13, fontWeight: 700, borderBottom: '1px solid rgba(34, 197, 94, 0.2)' }}>
            ✅ Conciliación automática completada: Se encontraron {matchingStatus.split('_')[1]} coincidencias exactas.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 400 }}>
          {/* Lado Izquierdo: Banco */}
          <div style={{ borderRight: '1px solid var(--border)', background: 'var(--bg)', padding: 24 }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>🏦 Movimientos Bancarios (Huérfanos)</h4>
            
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text3)' }}>🔍</span>
              <input className="sp-input" value={searchBank} onChange={e => setSearchBank(e.target.value)} placeholder="Buscar por referencia o monto..." style={{ paddingLeft: 30, fontSize: 12, padding: '8px 10px 8px 30px', borderRadius: 10 }} />
            </div>

            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>Sincronizando con el banco...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredBank.map(bank => (
                  <div key={bank.id} draggable onDragStart={e => e.dataTransfer.setData("bank_id", bank.id)} className="sp-card-hover" style={{ padding: 16, background: 'var(--bg2)', borderRadius: 12, border: '1px solid var(--border)', cursor: 'grab' }} title="Arrastra este movimiento hacia una transacción a la derecha">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{bank.value_date}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>+${Number(bank.amount).toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'monospace' }}>Ref: {bank.statement_reference}</div>
                  </div>
                ))}
                {filteredBank.length === 0 && (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 12 }}>{bankMovements.filter(b => b.reconciliation_status === 'unmatched').length === 0 ? 'Todo conciliado.' : 'Sin resultados de búsqueda.'}</div>
                )}
              </div>
            )}
          </div>

          {/* Lado Derecho: Transacciones del Sistema */}
          <div style={{ background: 'var(--bg)', padding: 24 }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>💻 Transacciones en Sistema (Clearing)</h4>
            
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text3)' }}>🔍</span>
              <input className="sp-input" value={searchTx} onChange={e => setSearchTx(e.target.value)} placeholder="Buscar por empresa o ID de pago..." style={{ paddingLeft: 30, fontSize: 12, padding: '8px 10px 8px 30px', borderRadius: 10 }} />
            </div>

            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)' }}>Sincronizando transacciones...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredTx.map(tx => (
                  <div key={tx.uetid} onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-light)'; }} onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.background = 'var(--bg2)'; }} onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.background = 'var(--bg2)'; const bankId = e.dataTransfer.getData("bank_id"); if (bankId) handleManualMatch(bankId, tx.uetid); }} className="sp-card-hover" style={{ padding: 16, background: 'var(--bg2)', borderRadius: 12, border: '1px dashed var(--teal)', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="sp-badge" style={{ background: 'var(--bg3)', color: 'var(--text)', textTransform: 'uppercase' }}>{tx.gateway}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{tx.tenantName}</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--teal)' }}>Neto: ${Number(tx.net_amount).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
                      <span>Bruto: ${Number(tx.gross_amount).toLocaleString()} | Fee: ${Number(tx.fee_amount).toLocaleString()}</span>
                      <span style={{ fontFamily: 'monospace' }}>UETID: {tx.uetid.split('_')[1] || tx.uetid}</span>
                    </div>
                  </div>
                ))}
                {filteredTx.length === 0 && (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 12 }}>{transactions.filter(t => !t.matched).length === 0 ? 'Sin transacciones pendientes.' : 'Sin resultados de búsqueda.'}</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Historial de Conciliaciones y Deshacer */}
        {recentMatches.length > 0 && (
          <div style={{ padding: 24, background: 'var(--bg2)', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⏪</span> Últimas Conciliaciones (Historial)
              </h4>
              <button onClick={exportHistoryToExcel} className="sp-btn" style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 12, padding: '6px 12px' }}>📥 Exportar Historial a Excel</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentMatches.slice(0, 5).map(match => {
                 const b = bankMovements.find(x => x.id === match.bank_movement_id);
                 const t = transactions.find(x => x.uetid === match.transaction_uetid);
                 return (
                   <div key={match.id} className="sp-card-hover" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)' }}>
                     <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                       <span className="sp-badge" style={{ background: match.match_type === 'manual_override' ? 'var(--gold)20' : 'var(--green-light)', color: match.match_type === 'manual_override' ? 'var(--gold)' : 'var(--green)', border: `1px solid ${match.match_type === 'manual_override' ? 'var(--gold)40' : 'var(--green)40'}`, marginRight: 12 }}>{match.match_type === 'manual_override' ? 'Forzado Manual' : 'Smart Match (IA)'}</span>
                       Conciliado: <strong style={{color: 'var(--text)'}}>${b ? Number(b.amount).toLocaleString() : '?'}</strong> (Ref: {b?.statement_reference || '?'}) ↔️ {t?.gateway || 'Sistema'} (UETID: {match.transaction_uetid.split('_')[1] || match.transaction_uetid})
                     </div>
                     <button onClick={() => handleUndoMatch(match.id, match.bank_movement_id)} className="sp-btn" style={{ background: 'var(--red-light)', color: 'var(--red)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px 16px', fontSize: 11, transition: 'all 0.2s' }}>
                       Deshacer Cruce
                     </button>
                   </div>
                 );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}