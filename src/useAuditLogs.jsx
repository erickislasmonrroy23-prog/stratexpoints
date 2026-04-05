import { useState, useEffect, useCallback } from 'react';
import { notificationService } from './services.js';
import { supabase } from './supabase.js';
import * as XLSX from 'xlsx';

export function useAuditLogs(selectedTenantId) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [exportingLogs, setExportingLogs] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchLogQuery, setSearchLogQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogPages, setTotalLogPages] = useState(1);
  const logsPerPage = 10;

  const loadAuditLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      let query = supabase.from('audit_logs').select('*', { count: 'exact' });

      if (selectedTenantId) {
        query = query.eq('organization_id', selectedTenantId);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate + 'T23:59:59.999Z'); // Include full end day
      }

      if (searchLogQuery) {
        query = query.or(`table_name.ilike.%${searchLogQuery}%,action.ilike.%${searchLogQuery}%,record_id.ilike.%${searchLogQuery}%`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * logsPerPage, currentPage * logsPerPage - 1);

      if (error) throw error;

      setAuditLogs(data);
      setTotalLogPages(Math.ceil(count / logsPerPage));
    } catch (error) {
      console.error("Error loading audit logs:", error);
      notificationService.error("Error al cargar los logs de auditoría: " + error.message);
    } finally {
      setLoadingLogs(false);
    }
  }, [selectedTenantId, startDate, endDate, searchLogQuery, currentPage]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const exportLogsToExcel = useCallback(async () => {
    setExportingLogs(true);
    try {
      let query = supabase.from('audit_logs').select('*');

      if (selectedTenantId) {
        query = query.eq('organization_id', selectedTenantId);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate + 'T23:59:59.999Z');
      }

      if (searchLogQuery) {
        query = query.or(`table_name.ilike.%${searchLogQuery}%,action.ilike.%${searchLogQuery}%,record_id.ilike.%${searchLogQuery}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      if (data.length === 0) {
        notificationService.error("No hay logs para exportar con los filtros actuales.");
        return;
      }

      const rows = [
        ["ID Log", "Organización ID", "Usuario ID", "Acción", "Tabla", "Registro ID", "Cambios", "Fecha"]
      ];

      data.forEach(log => {
        rows.push([
          log.id,
          log.organization_id,
          log.impersonated_user_id,
          log.action,
          log.table_name,
          log.record_id,
          JSON.stringify(log.changes),
          new Date(log.created_at).toLocaleString()
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "AuditLogs");
      XLSX.writeFile(wb, `AuditLogs_${selectedTenantId || 'Global'}_${new Date().toISOString().split('T')[0]}.xlsx`);
      notificationService.success("Logs exportados a Excel.");

    } catch (error) {
      console.error("Error exporting audit logs:", error);
      notificationService.error("Error al exportar los logs: " + error.message);
    } finally {
      setExportingLogs(false);
    }
  }, [selectedTenantId, startDate, endDate, searchLogQuery]);

  return {
    auditLogs,
    loadingLogs,
    exportingLogs,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    searchLogQuery,
    setSearchLogQuery,
    currentPage,
    setCurrentPage,
    totalLogPages,
    exportLogsToExcel,
  };
}