import { apiFetch, apiUpload } from "./client";
import type { TenantSettings, Manager, UserProfile } from "@/types";

export const settingsApi = {
  branding: () => apiFetch<{ name: string; logoUrl: string | null; primaryColor: string | null }>("/api/v1/settings/branding"),
  get: () => apiFetch<TenantSettings>("/api/v1/settings"),
  update: (data: unknown) =>
    apiFetch<TenantSettings>("/api/v1/settings", { method: "PUT", body: JSON.stringify(data) }),
  profile: () => apiFetch<UserProfile>("/api/v1/settings/profile"),
  updateProfile: (data: { name?: string; phone?: string }) =>
    apiFetch<UserProfile>("/api/v1/settings/profile", { method: "PUT", body: JSON.stringify(data) }),
  managers: () => apiFetch<Manager[]>("/api/v1/settings/managers"),
  createManager: (data: unknown) =>
    apiFetch<Manager>("/api/v1/settings/managers", { method: "POST", body: JSON.stringify(data) }),
  updateManagerStatus: (id: string, active: boolean) =>
    apiFetch<void>(`/api/v1/settings/managers/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ active }),
    }),
  transferResellers: (fromId: string, targetManagerId: string) =>
    apiFetch<void>(`/api/v1/settings/managers/${fromId}/transfer`, {
      method: "POST", body: JSON.stringify({ targetManagerId }),
    }),
  deleteManager: (id: string) =>
    apiFetch<void>(`/api/v1/settings/managers/${id}`, { method: "DELETE" }),
  uploadLogo: (formData: FormData) =>
    apiUpload("/api/v1/settings/logo", formData) as Promise<string>,
};
