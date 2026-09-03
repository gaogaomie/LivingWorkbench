import { create } from "zustand";

interface UiState {
  mobileDrawerOpen: boolean;
  sidebarCollapsed: boolean;
  setMobileDrawerOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  mobileDrawerOpen: false,
  sidebarCollapsed: false,
  setMobileDrawerOpen: (mobileDrawerOpen) => set({ mobileDrawerOpen }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
}));
