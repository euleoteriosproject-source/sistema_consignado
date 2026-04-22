import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: string | null;
  tenantId: string | null;
  tenantName: string | null;
  userName: string | null;
  setSession: (session: Session | null) => void;
  setRole: (role: string) => void;
  setTenantName: (name: string) => void;
  setUserName: (name: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  role: null,
  tenantId: null,
  tenantName: null,
  userName: null,
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
    }),
  setRole: (role) => set({ role }),
  setTenantName: (name) => set({ tenantName: name }),
  setUserName: (name) => set({ userName: name }),
  clearSession: () => set({ session: null, user: null, role: null, tenantId: null, tenantName: null, userName: null }),
}));
