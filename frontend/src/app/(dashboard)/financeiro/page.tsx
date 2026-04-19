"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { settlementsApi } from "@/lib/api/settlements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PageResponse, Settlement, SettlementsSummary } from "@/types";

const paymentLabel: Record<string, string> = {
  cash: "Dinheiro",
  pix: "PIX",
  transfer: "Transferência",
  other: "Outro",
};

export default function FinanceiroPage() {
  const [page, setPage] = useState(0);

  const { data: summary } = useQuery<SettlementsSummary>({
    queryKey: ["settlements-summary"],
    queryFn: () => settlementsApi.summary(),
  });

  const { data, isLoading } = useQuery<PageResponse<Settlement>>({
    queryKey: ["settlements", page],
    queryFn: () => settlementsApi.list({ page: String(page), size: "20" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Acerto
        </Button>
      </div>

      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Vendido</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalSoldValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Comissões Pagas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalCommission)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Líquido Recebido</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.totalNetReceived)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Revendedora</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Total Vendido</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Líquido</TableHead>
                  <TableHead>Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.content.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.resellerName}</TableCell>
                    <TableCell>{formatDate(s.settlementDate)}</TableCell>
                    <TableCell>{formatCurrency(s.totalSoldValue)}</TableCell>
                    <TableCell>{formatCurrency(s.totalCommission)}</TableCell>
                    <TableCell className="text-green-700 font-medium">{formatCurrency(s.netToReceive)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{paymentLabel[s.paymentMethod] ?? s.paymentMethod}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.content.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum acerto encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">{data.totalElements} acertos</p>
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
