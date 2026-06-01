import { create } from "zustand";

/**
 * Tiny shared store for the open/close state of the dashboard's Aj chat
 * panel. Lives outside `<AjentifyProvider>` because we want the toggle
 * button (`TopBar`) to drive the same panel that's mounted by the layout
 * without React Context prop-drilling.
 */
interface AjChatStore {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useAjChatStore = create<AjChatStore>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
