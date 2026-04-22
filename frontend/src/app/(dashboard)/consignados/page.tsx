"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { consignmentsApi } from "@/lib/api/consignments";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ConsignmentFormModal } from "@/components/consignments/ConsignmentFormModal";
import type { PageResponse, ConsignmentSummary } from "@/types";

const statusConfig: Record<string, { label: string; variant: "default" | "outline" | "secondary" | "destructive" }> = {
  open: { label: "Aberto", variant: "default" },
  partially_settled: { label: "Parcial", variant: "outline" },
  settled: { label: "Encerrado", variant: "secondary" },
  overdue: { label: "Atrasado", variant: "destructive" },
};

export default function ConsignadosPage() {
  const router = useRouter();
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const params: Record<string, string> = { page: String(page), size: "20" };
  if (status !== "all") params.status = status;

  const { data, isLoading } = useQuery<PageResponse<ConsignmentSummary>>({
    queryKey: ["consignments", params],
    queryFn: () => consignmentsApi.list(params),
  });

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Consignados</h1>
          <p className="text-muted-foreground text-sm">Gerencie os lotes enviados para revendedoras</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="sm:w-auto w-full">
          <Plus className="h-4 w-4 mr-2" />
          Novo lote
        </Button>
      </div>

      <Card>
        <CardHeader>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="partially_settled">Parcialmente acertado</SelectItem>
              <SelectItem value="overdue">Atrasado</SelectItem>
              <SelectItem value="settled">Encerrado</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Revendedora</TableHead>
                <TableHead>Gestor(a)</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Retorno Prev.</TableHead>
                <TableHead className="text-right">Itens totais</TableHead>
                <TableHead className="text-right">Itens restantes</TableHead>
                <TableHead className="text-right">Val. Estimado</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : data?.content.map((c) => {
                    const cfg = statusConfig[c.status] ?? { label: c.status, variant: "secondary" };
                    return (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/consignados/${c.id}`)}
                      >
                        <TableCell className="font-medium">{c.resellerName}</TableCell>
                        <TableCell>{c.managerName}</TableCell>
                        <TableCell>{formatDate(c.deliveredAt)}</TableCell>
                        <TableCell>{c.expectedReturnAt ? formatDate(c.expectedReturnAt) : "—"}</TableCell>
                        <TableCell className="text-right">{c.totalItems}</TableCell>
                        <TableCell className="text-right font-medium">
                          {c.totalItems - c.totalSold - c.totalReturned - c.totalLost}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(c.totalValue ?? 0)}</TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              {!isLoading && data?.content.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    Nenhum lote encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
          {data && data.totalPages > 1 && (
            <div className="flex justify-between items-center p-4">
              <span className="text-sm text-muted-foreground">{data.totalElements} lotes</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground flex items-center">{page + 1} / {data.totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages - 1} onClick={() => setPage(page + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ConsignmentFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
