import { apiFetch } from "./client";
import type { PageResponse, Product, ProductSummary, ProductTracking } from "@/types";

export const productsApi = {
  list: (params?: Record<string, string>) => {
    const q = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<PageResponse<ProductSummary>>(`/api/v1/products${q}`);
  },
  get: (id: string) => apiFetch<Product>(`/api/v1/products/${id}`),
  create: (data: unknown) =>
    apiFetch<Product>("/api/v1/products", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: unknown) =>
    apiFetch<Product>(`/api/v1/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  updateStatus: (id: string, active: boolean) =>
    apiFetch<void>(`/api/v1/products/${id}/status`, {
      method: "PATCH", body: JSON.stringify({ active }),
    }),
  tracking: (id: string) => apiFetch<ProductTracking>(`/api/v1/products/${id}/tracking`),
};
