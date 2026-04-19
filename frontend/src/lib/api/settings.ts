import { apiFetch } from "./client";
import type { TenantSettings, Manager } from "@/types";

export const settingsApi = {
  get: () => apiFetch<TenantSettings>("/api/v1/settings"),
  update: (data: unknown) =>
    apiFetch<TenantSettings>("/api/v1/settings", { method: "PUT", body: JSON.stringify(data) }),
  managers: () => apiFetch<Manager[]>("/api/v1/settings/managers"),
  createManager: (data: unknown) =>
    apiFetch<Manager>("/api/v1/settings/managers", { method: "POST", body: JSON.stringify(data) }),
  updateManagerStatus: (id: string, active: boolean) =>
    apiFetch<void>(`/api/v1/settings/managers/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ active }),
    }),
};
