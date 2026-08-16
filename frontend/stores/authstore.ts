import { create } from "zustand";

interface AuthState {
  signedIn: boolean;
  signOut: () => void;
  signIn: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  signedIn: true,
  signOut: () => set({ signedIn: false }),
  signIn: () => set({ signedIn: true }),
}));
