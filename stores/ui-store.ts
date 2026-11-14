import { create } from "zustand";

export interface ToastItem {
  id: string;
  title?: string;
  message: string;
  type?: "info" | "success" | "error" | "warning";
  duration?: number;
}

type UiState = {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  toasts: ToastItem[];
  addToast: (toast: {
    title?: string;
    message: string;
    type?: "info" | "success" | "error" | "warning";
    duration?: number;
  }) => void;
  removeToast: (id: string) => void;
};

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed: boolean) =>
    set({ sidebarCollapsed: collapsed }),
  mobileNavOpen: false,
  setMobileNavOpen: (open: boolean) => set({ mobileNavOpen: open }),
  toggleMobileNav: () => set((state) => ({ mobileNavOpen: !state.mobileNavOpen })),
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const item: ToastItem = {
      id,
      ...toast,
      type: toast.type || "info",
    };
    set((state) => ({ toasts: [...state.toasts, item] }));
    if (toast.duration !== 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, toast.duration || 4000);
    }
  },
  removeToast: (id: string) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
