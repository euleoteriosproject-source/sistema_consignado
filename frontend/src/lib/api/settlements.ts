import { apiFetch } from "./client";
import type { PageResponse, Settlement, SettlementsSummary } from "@/types";

export const settlementsApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<PageResponse<Settlement>>(`/api/v1/settlements${q}`);
  },
  create: (data: unknown) =>
    apiFetch<Settlement>("/api/v1/settlements", { method: "POST", body: JSON.stringify(data) }),
  summary: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<SettlementsSummary>(`/api/v1/settlements/summary${q}`);
  },
};
