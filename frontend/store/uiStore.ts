import { create } from "zustand";

interface UiState {
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;
  isSearchOpen: boolean;
  theme: "dark" | "light";
  toggleSidebarCollapse: () => void;
  toggleMobileSidebar: () => void;
  setMobileSidebar: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  toggleTheme: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarCollapsed: false,
  isMobileSidebarOpen: false,
  isSearchOpen: false,
  theme: "light",
  toggleSidebarCollapse: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  toggleMobileSidebar: () =>
    set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
  setMobileSidebar: (open) => set({ isMobileSidebarOpen: open }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        const root = window.document.documentElement;
        if (nextTheme === "dark") {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }
      return { theme: nextTheme };
    }),
}));
