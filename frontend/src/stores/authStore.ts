import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: string | null;
  tenantId: string | null;
  setSession: (session: Session | null) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  role: null,
  tenantId: null,
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      role: (session?.user?.app_metadata?.role as string) ?? null,
      tenantId: (session?.user?.app_metadata?.tenant_id as string) ?? null,
    }),
  clearSession: () => set({ session: null, user: null, role: null, tenantId: null }),
}));
