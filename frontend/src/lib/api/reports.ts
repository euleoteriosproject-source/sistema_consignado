import { apiDownload } from "./client";

export const reportsApi = {
  resellers: () => apiDownload("/api/v1/reports/resellers"),
  consignments: () => apiDownload("/api/v1/reports/consignments"),
  financial: () => apiDownload("/api/v1/reports/financial"),
  ranking: () => apiDownload("/api/v1/reports/ranking"),
};

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
