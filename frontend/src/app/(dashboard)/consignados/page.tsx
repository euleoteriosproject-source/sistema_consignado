"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { consignmentsApi } from "@/lib/api/consignments";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PageResponse, ConsignmentSummary } from "@/types";

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  open: { label: "Aberto", variant: "success" },
  partially_settled: { label: "Parcial", variant: "warning" },
  settled: { label: "Encerrado", variant: "secondary" },
  overdue: { label: "Atrasado", variant: "destructive" },
};

export default function ConsignadosPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);

  const params: Record<string, string> = { page: String(page), size: "20" };
  if (status) params.status = status;

  const { data, isLoading } = useQuery<PageResponse<ConsignmentSummary>>({
    queryKey: ["consignments", params],
    queryFn: () => consignmentsApi.list(params),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Consignados</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Lote
        </Button>
      </div>

      <Card>
        <CardHeader>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="partially_settled">Parcial</SelectItem>
              <SelectItem value="overdue">Atrasado</SelectItem>
              <SelectItem value="settled">Encerrado</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Revendedora</TableHead>
                  <TableHead>Gestora</TableHead>
                  <TableHead>Entrega</TableHead>
                  <TableHead>Retorno Prev.</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.content.map((c) => {
                  const cfg = statusConfig[c.status] ?? { label: c.status, variant: "secondary" };
                  return (
                    <TableRow key={c.id} className="cursor-pointer">
                      <TableCell className="font-medium">{c.resellerName}</TableCell>
                      <TableCell>{c.managerName}</TableCell>
                      <TableCell>{formatDate(c.deliveredAt)}</TableCell>
                      <TableCell>{c.expectedReturnAt ? formatDate(c.expectedReturnAt) : "—"}</TableCell>
                      <TableCell>{c.totalItems}</TableCell>
                      <TableCell>{formatCurrency(c.totalValue)}</TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {data?.content.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum consignado encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">{data.totalElements} lotes</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages - 1} onClick={() => setPage(page + 1)}>Próxima</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
