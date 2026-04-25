import { apiFetch, apiUpload } from "./client";
import type { SupportTicket } from "@/types";

export const supportApi = {
  list: () => apiFetch<SupportTicket[]>("/api/v1/support/tickets"),
  create: (data: { subject: string; description: string; priority: string; attachmentUrl?: string; attachmentName?: string }) =>
    apiFetch<SupportTicket>("/api/v1/support/tickets", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  uploadAttachment: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiUpload("/api/v1/support/tickets/upload-attachment", fd) as Promise<{ url: string; name: string }>;
  },
  updateStatus: (id: string, status: string) =>
    apiFetch<SupportTicket>(`/api/v1/support/tickets/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
