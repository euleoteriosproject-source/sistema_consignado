import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// Cache token para evitar chamar getSession() em cada request paralelo
let cachedToken: string | null = null;
let tokenExpiresAt = 0;
let tokenInflight: Promise<string | null> | null = null;

async function getToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) return cachedToken;
  if (tokenInflight) return tokenInflight;

  tokenInflight = (async () => {
    const { data } = await createClient().auth.getSession();
    cachedToken = data.session?.access_token ?? null;
    // Expira 5 min antes do token real (tokens Supabase duram 1h)
    tokenExpiresAt = now + 55 * 60 * 1000;
    tokenInflight = null;
    return cachedToken;
  })();

  return tokenInflight;
}

// Invalida o cache quando o auth mudar (logout, refresh, etc.)
if (typeof window !== "undefined") {
  createClient().auth.onAuthStateChange(() => {
    cachedToken = null;
    tokenExpiresAt = 0;
  });
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error?.message ?? `HTTP ${res.status}`);
  }

  const body = await res.json();
  return body.data ?? body;
}

export async function apiUpload(path: string, formData: FormData): Promise<unknown> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error?.message ?? `HTTP ${res.status}`);
  }
  const body = await res.json();
  return body.data ?? body;
}

export async function apiDownload(path: string): Promise<Blob> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}
