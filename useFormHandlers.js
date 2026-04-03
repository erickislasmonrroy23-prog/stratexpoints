import { okrService, kpiService, initiativeService, notificationService } from '../services.js';

/**
 * Hook personalizado para manejar las operaciones de guardar (crear/actualizar) OKRs, KPIs e Iniciativas.
 * @param {Function} checkPaymentStatus - Función para verificar el estado de pago antes de guardar.
 * @param {Function} setModal - Función para cerrar el modal.
 * @param {Function} setEditingItem - Función para limpiar el item en edición.
 * @returns {{handleSaveOKR: (form: object) => Promise<void>, handleSaveKPI: (form: object) => Promise<void>, handleSaveInitiative: (form: object) => Promise<void>}}
 */
export function useFormHandlers(checkPaymentStatus, setModal, setEditingItem) {
  const handleSaveOKR = async (form) => {
    if (!checkPaymentStatus()) return;
    try {
      const payload = { ...form };
      if (!payload.objective_id || payload.objective_id === "") {
        delete payload.objective_id; // Elimina la columna del envío si está vacía
      }
      if (payload.id) {
        const id = payload.id;
        delete payload.id; // No enviamos el ID en el cuerpo a Supabase
        await okrService.update(id, payload);
        notificationService.success("OKR actualizado exitosamente.");
      } else {
        await okrService.create(payload);
        notificationService.success("OKR creado exitosamente.");
      }
      setModal(null);
      setEditingItem(null);
    } catch(e) { notificationService.error("Error al guardar OKR: " + e.message); }
  };

  const handleSaveKPI = async (form) => {
    if (!checkPaymentStatus()) return;
    try {
      const payload = { ...form };
      if (payload.id) {
        const id = payload.id;
        delete payload.id;
        await kpiService.update(id, payload);
        notificationService.success("KPI actualizado exitosamente.");
      } else {
        await kpiService.create(payload);
        notificationService.success("KPI creado exitosamente.");
      }
      setModal(null);
      setEditingItem(null);
    } catch(e) { notificationService.error("Error al guardar KPI: " + e.message); }
  };

  const handleSaveInitiative = async (form) => {
    if (!checkPaymentStatus()) return;
    try {
      await initiativeService.create(form);
      setModal(null);
      notificationService.success("Iniciativa creada exitosamente.");
    } catch(e) { notificationService.error("Error al guardar Iniciativa: " + e.message); }
  };

  return { handleSaveOKR, handleSaveKPI, handleSaveInitiative };
}