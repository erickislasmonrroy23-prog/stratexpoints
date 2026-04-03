import { nanoid } from 'nanoid';

/**
 * Slice de Zustand para gestionar un sistema de notificaciones persistente.
 * Reemplaza las llamadas directas a `react-hot-toast` para un control centralizado.
 */
export const createNotificationSlice = (set, get) => ({
  notifications: [],

  addNotification: (notification) => {
    const newNotification = {
      id: nanoid(10), // Genera un ID único
      ...notification, // { message: '...', type: 'success' | 'error' | 'info' }
    };
    set((state) => ({ notifications: [...state.notifications, newNotification] }));

  },

  removeNotification: (id) => {
    set((state) => ({ notifications: state.notifications.filter(n => n.id !== id) }));
  },
});