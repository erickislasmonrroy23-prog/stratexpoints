import { useStore } from '../store.js';
import { notificationService } from './services.js';

/**
 * Hook personalizado para gestionar el estado de pago y el modo de solo lectura.
 * @returns {{isBlocked: boolean, isInGracePeriod: boolean, checkPaymentStatus: () => boolean}}
 */
export function usePaymentStatus() {
  const profile = useStore.use.profile();
  const impersonatedProfile = useStore.use.impersonatedProfile();
  const activeProfile = impersonatedProfile || profile;

  const todayObj = new Date();
  const currentMonthStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}`;
  const org = activeProfile?.organizations;
  const isPaidThisMonth = org?.modules?.lastPaymentMonth === currentMonthStr;
  const isInGracePeriod = !isPaidThisMonth && todayObj.getDate() <= 10;
  const isBlocked = !isPaidThisMonth && todayObj.getDate() > 10; // No se considera isGlobalView aquí, ya que es una restricción de pago.

  const checkPaymentStatus = () => {
    if (isBlocked) {
      notificationService.error("⛔ Acción Bloqueada: Periodo de gracia expirado. Sistema en Modo Solo Lectura.");
      return false;
    }
    return true;
  };

  return { isBlocked, isInGracePeriod, checkPaymentStatus };
}