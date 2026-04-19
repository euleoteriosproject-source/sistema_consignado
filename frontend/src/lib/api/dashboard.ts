import { apiFetch } from "./client";
import type { DashboardSummary, DashboardAlert, DashboardChartData, DashboardTree } from "@/types";

export const dashboardApi = {
  summary: () => apiFetch<DashboardSummary>("/api/v1/dashboard/summary"),
  tree: () => apiFetch<DashboardTree>("/api/v1/dashboard/tree"),
  alerts: () => apiFetch<DashboardAlert[]>("/api/v1/dashboard/alerts"),
  charts: (period: string = "6m") =>
    apiFetch<DashboardChartData>(`/api/v1/dashboard/charts?period=${period}`),
};
