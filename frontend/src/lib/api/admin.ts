import { apiFetch } from "./client";

export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  active: boolean;
  managerCount: number;
  trialEndsAt: string | null;
  createdAt: string;
}

export interface AdminTicket {
  id: string;
  tenantName: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  adminResponse: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStats {
  totalTenants: number;
  totalUsers: number;
  openTickets: number;
}

export const adminApi = {
  stats: () => apiFetch<AdminStats>("/api/v1/admin/stats"),
  tenants: () => apiFetch<AdminTenant[]>("/api/v1/admin/tenants"),
  updateTenant: (id: string, data: { name?: string; plan?: string; active?: boolean }) =>
    apiFetch<AdminTenant>(`/api/v1/admin/tenants/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  tickets: () => apiFetch<AdminTicket[]>("/api/v1/admin/support-tickets"),
  updateTicketStatus: (id: string, status: string) =>
    apiFetch<AdminTicket>(`/api/v1/admin/support-tickets/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  respondToTicket: (id: string, response: string, status: string) =>
    apiFetch<AdminTicket>(`/api/v1/admin/support-tickets/${id}/respond`, {
      method: "PATCH",
      body: JSON.stringify({ response, status }),
    }),
};
