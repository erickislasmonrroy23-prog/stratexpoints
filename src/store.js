import { create } from 'zustand';
import { createUISlice } from './uiSlice.js';
import { createAuthSlice } from './authSlice.js';
import { createDataSlice } from './dataSlice.js';
import { createNotificationSlice } from './notificationSlice.js';

// Función Helper oficial de Zustand para crear selectores automáticamente
const createSelectors = (_store) => {
  let store = _store;
  store.use = {};
  for (let k of Object.keys(store.getState())) {
    store.use[k] = () => store((s) => s[k]);
  }
  return store;
};

// --- STORE PRINCIPAL (Combinación de Slices) ---
const useStoreBase = create((...a) => ({
  ...createUISlice(...a),
  ...createAuthSlice(...a),
  ...createDataSlice(...a),
  ...createNotificationSlice(...a),
}));

export const useStore = createSelectors(useStoreBase);