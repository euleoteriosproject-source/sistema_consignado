import { apiFetch } from "./client";

export const productCategoriesApi = {
  list: () => apiFetch<{ id: string; name: string }[]>("/api/v1/product-categories"),
  listNames: () => apiFetch<string[]>("/api/v1/product-categories/names"),
  create: (name: string) => apiFetch<{ id: string; name: string }>("/api/v1/product-categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  }),
  delete: (id: string) => apiFetch<void>(`/api/v1/product-categories/${id}`, { method: "DELETE" }),
};
