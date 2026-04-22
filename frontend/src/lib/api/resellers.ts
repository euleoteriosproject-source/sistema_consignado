import { apiFetch, apiUpload } from "./client";
import type { PageResponse, Reseller, ResellerSummary, ResellerBalance, ConsignmentSummary, ResellerDocument, ResellerCompleteness } from "@/types";

export const resellersApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<PageResponse<ResellerSummary>>(`/api/v1/resellers${q}`);
  },
  get: (id: string) => apiFetch<Reseller>(`/api/v1/resellers/${id}`),
  create: (data: unknown) =>
    apiFetch<Reseller>("/api/v1/resellers", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: unknown) =>
    apiFetch<Reseller>(`/api/v1/resellers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string) =>
    apiFetch<void>(`/api/v1/resellers/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ status }),
    }),
  consignments: (id: string) =>
    apiFetch<ConsignmentSummary[]>(`/api/v1/resellers/${id}/consignments`),
  balance: (id: string) => apiFetch<ResellerBalance>(`/api/v1/resellers/${id}/balance`),
  uploadDocument: (id: string, formData: FormData) =>
    apiUpload(`/api/v1/resellers/${id}/documents`, formData),
  listDocuments: (id: string) => apiFetch<ResellerDocument[]>(`/api/v1/resellers/${id}/documents`),
  deleteDocument: (id: string, docId: string) =>
    apiFetch<void>(`/api/v1/resellers/${id}/documents/${docId}`, { method: "DELETE" }),
  completeness: (id: string) => apiFetch<ResellerCompleteness>(`/api/v1/resellers/${id}/completeness`),
};
