"use client";
import { useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function tryAutoRegister(token: string, email: string, fullName: string) {
  const res = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ storeName: fullName, ownerName: fullName, email }),
  });
  return res.ok || res.status === 409; // 409 = já existe, tudo certo
}

type TenantInfo = {
  tenantName: string | null;
  userName: string | null;
  role: string | null;
};

function extractInfo(settingsJson: Record<string, unknown> | null, meJson: Record<string, unknown> | null): TenantInfo {
  const data = meJson?.data as Record<string, unknown> | undefined;
  return {
    tenantName: ((settingsJson?.data as Record<string, unknown>)?.name ?? settingsJson?.name) as string | null,
    userName: (data?.name ?? meJson?.name) as string | null,
    role: (data?.role ?? meJson?.role) as string | null,
  };
}

async function fetchTenantInfo(
  token: string,
  email?: string | null,
  fullName?: string | null,
): Promise<TenantInfo> {
  const headers = { Authorization: `Bearer ${token}` };
  try {
    const [settingsRes, meRes] = await Promise.all([
      fetch(`${API_URL}/api/v1/settings`, { headers }),
      fetch(`${API_URL}/api/v1/auth/validate-token`, { method: "POST", headers }),
    ]);

    // Usuário autenticado no Supabase mas não cadastrado no backend → auto-registrar
    if ((meRes.status === 401 || meRes.status === 403) && email) {
      const name = fullName || email.split("@")[0];
      const registered = await tryAutoRegister(token, email, name);
      if (registered) {
        const [s2, m2] = await Promise.all([
          fetch(`${API_URL}/api/v1/settings`, { headers }),
          fetch(`${API_URL}/api/v1/auth/validate-token`, { method: "POST", headers }),
        ]);
        return extractInfo(
          s2.ok ? await s2.json() : null,
          m2.ok ? await m2.json() : null,
        );
      }
      return { tenantName: null, userName: null, role: null };
    }

    return extractInfo(
      settingsRes.ok ? await settingsRes.json() : null,
      meRes.ok ? await meRes.json() : null,
    );
  } catch {
    return { tenantName: null, userName: null, role: null };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const setTenantName = useAuthStore((s) => s.setTenantName);
  const setUserName = useAuthStore((s) => s.setUserName);
  const setRole = useAuthStore((s) => s.setRole);

  async function applyInfo(token: string, email?: string | null, fullName?: string | null) {
    const { tenantName, userName, role } = await fetchTenantInfo(token, email, fullName);
    if (tenantName) setTenantName(tenantName);
    if (userName) setUserName(userName);
    if (role) setRole(role);
  }

  useEffect(() => {
    const supabase = createBrowserClient();

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.access_token) {
        await applyInfo(
          session.access_token,
          session.user?.email,
          session.user?.user_metadata?.full_name as string | undefined,
        );
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setSession(session);
        await applyInfo(
          session.access_token,
          session.user?.email,
          session.user?.user_metadata?.full_name as string | undefined,
        );
      } else {
        clearSession();
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
