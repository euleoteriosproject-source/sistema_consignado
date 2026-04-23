import { apiFetch } from "./client";
import type { SupportTicket } from "@/types";

export const supportApi = {
  list: () => apiFetch<SupportTicket[]>("/api/v1/support/tickets"),
  create: (data: { subject: string; description: string; priority: string }) =>
    apiFetch<SupportTicket>("/api/v1/support/tickets", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
