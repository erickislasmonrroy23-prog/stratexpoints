import { useState, useCallback } from 'react';

/**
 * Hook personalizado para gestionar el modo Zen (pantalla completa y sidebar colapsado).
 * @returns {{zenMode: boolean, sidebarCollapsed: boolean, toggleZenMode: () => void}}
 */
export function useZenMode() {
  const [zenMode, setZenMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleZenMode = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.log(e));
      setSidebarCollapsed(true);
      setZenMode(true);
    } else {
      document.exitFullscreen();
      setZenMode(false);
      setSidebarCollapsed(false); // Asegurarse de que la sidebar se muestre al salir de pantalla completa
    }
  }, []);

  return { zenMode, sidebarCollapsed, setSidebarCollapsed, toggleZenMode };
}