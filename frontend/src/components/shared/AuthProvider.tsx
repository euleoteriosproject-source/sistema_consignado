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
  logoUrl: string | null;
  primaryColor: string | null;
};

function hexToHsl(hex: string): string | null {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return null;
  let ri = parseInt(r[1], 16) / 255, gi = parseInt(r[2], 16) / 255, bi = parseInt(r[3], 16) / 255;
  const max = Math.max(ri, gi, bi), min = Math.min(ri, gi, bi);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case ri: h = ((gi - bi) / d + (gi < bi ? 6 : 0)) / 6; break;
      case gi: h = ((bi - ri) / d + 2) / 6; break;
      case bi: h = ((ri - gi) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyPrimaryColor(hex: string) {
  const hsl = hexToHsl(hex);
  if (!hsl) return;
  const root = document.documentElement;
  root.style.setProperty('--primary', hsl);
  root.style.setProperty('--ring', hsl);
  root.style.setProperty('--sidebar-primary', hsl);
  root.style.setProperty('--sidebar-ring', hsl);
}

function extractInfo(settingsJson: Record<string, unknown> | null, meJson: Record<string, unknown> | null): TenantInfo {
  const data = meJson?.data as Record<string, unknown> | undefined;
  const settings = settingsJson?.data as Record<string, unknown> | undefined;
  return {
    tenantName: (settings?.name ?? settingsJson?.name) as string | null,
    userName: (data?.name ?? meJson?.name) as string | null,
    role: (data?.role ?? meJson?.role) as string | null,
    logoUrl: (settings?.logoUrl ?? null) as string | null,
    primaryColor: (settings?.primaryColor ?? null) as string | null,
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
  const setBranding = useAuthStore((s) => s.setBranding);

  async function applyInfo(token: string, email?: string | null, fullName?: string | null) {
    const { tenantName, userName, role, logoUrl, primaryColor } = await fetchTenantInfo(token, email, fullName);
    if (tenantName) setTenantName(tenantName);
    if (userName) setUserName(userName);
    if (role) setRole(role);
    setBranding(logoUrl, primaryColor);
    if (primaryColor) applyPrimaryColor(primaryColor);
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
