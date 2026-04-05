export const createUISlice = (set) => ({
  loadingData: true,
  activeModule: "home",
  globalError: null,
  tourActive: false,
  setActiveModule: (module) => set({ activeModule: module }),
  setLoadingData: (status) => set({ loadingData: status }),
  clearError: () => set({ globalError: null }),
  startTour: () => set({ tourActive: true }),
  stopTour: () => set({ tourActive: false }),
});