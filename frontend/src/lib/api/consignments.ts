import { apiFetch } from "./client";
import type { PageResponse, Consignment, ConsignmentSummary } from "@/types";

export const consignmentsApi = {
  list: (params?: Record<string, string | undefined>) => {
    const clean = Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined)) as Record<string, string>;
    const q = Object.keys(clean).length ? "?" + new URLSearchParams(clean).toString() : "";
    return apiFetch<PageResponse<ConsignmentSummary>>(`/api/v1/consignments${q}`);
  },
  get: (id: string) => apiFetch<Consignment>(`/api/v1/consignments/${id}`),
  create: (data: unknown) =>
    apiFetch<Consignment>("/api/v1/consignments", { method: "POST", body: JSON.stringify(data) }),
  move: (id: string, data: unknown) =>
    apiFetch<Consignment>(`/api/v1/consignments/${id}/movements`, {
      method: "POST", body: JSON.stringify(data),
    }),
  settle: (id: string, notes?: string) =>
    apiFetch<Consignment>(`/api/v1/consignments/${id}/settle`, {
      method: "POST", body: JSON.stringify({ notes }),
    }),
  revert: (id: string) =>
    apiFetch<void>(`/api/v1/consignments/${id}`, { method: "DELETE" }),
};
