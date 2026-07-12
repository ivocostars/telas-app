import { create } from 'zustand';

interface AppState {
  token: string | null;
  scannerName: string | null;
  setToken: (token: string | null) => void;
  setScannerName: (name: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  token: null,
  scannerName: null,
  setToken: (token) => set({ token }),
  setScannerName: (scannerName) => set({ scannerName }),
}));
