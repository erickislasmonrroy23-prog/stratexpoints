import { nanoid } from 'nanoid';

const AUTO_DISMISS_MS = 5000; // Auto-eliminar notificaciones después de 5s

export const createNotificationSlice = (set, get) => ({
  notifications: [],

  addNotification: (notification) => {
    const id = nanoid(10);
    const newNotification = { id, ...notification };

    set((state) => ({
      notifications: [...state.notifications, newNotification]
    }));

    // Auto-dismiss después de 5 segundos
    setTimeout(() => {
      get().removeNotification(id);
    }, AUTO_DISMISS_MS);
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }));
  },

  clearAllNotifications: () => set({ notifications: [] }),
});
