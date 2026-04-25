"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { resellersApi } from "@/lib/api/resellers";
import { consignmentsApi } from "@/lib/api/consignments";
import { settlementsApi } from "@/lib/api/settlements";
import { reportsApi, downloadBlob } from "@/lib/api/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Users, ShoppingBag, DollarSign, Trophy, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { PageResponse, ResellerSummary, ConsignmentSummary, Settlement } from "@/types";

const statusLabel: Record<string, string> = {
  active: "Ativa", inactive: "Inativa", blocked: "Bloqueada",
  open: "Aberto", partially_settled: "Parcial", settled: "Encerrado", overdue: "Atrasado",
};
const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default", inactive: "secondary", blocked: "destructive",
  open: "default", partially_settled: "outline", settled: "secondary", overdue: "destructive",
};

export default function RelatoriosPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const download = async (key: "resellers" | "consignments" | "financial" | "ranking", filename: string) => {
    setDownloading(key);
    try {
      const blob = await reportsApi[key]();
      downloadBlob(blob, filename);
      toast.success("Relatório exportado com sucesso");
    } catch {
      toast.error("Erro ao exportar relatório");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>

      <Tabs defaultValue="resellers">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="resellers" className="gap-1.5"><Users className="h-3.5 w-3.5" />Revendedores(as)</TabsTrigger>
          <TabsTrigger value="consignments" className="gap-1.5"><ShoppingBag className="h-3.5 w-3.5" />Consignados</TabsTrigger>
          <TabsTrigger value="financial" className="gap-1.5"><DollarSign className="h-3.5 w-3.5" />Financeiro</TabsTrigger>
          <TabsTrigger value="ranking" className="gap-1.5"><Trophy className="h-3.5 w-3.5" />Ranking</TabsTrigger>
        </TabsList>

        <TabsContent value="resellers">
          <ResellersReport downloading={downloading} onDownload={() => download("resellers", "revendedoras.xlsx")} />
        </TabsContent>
        <TabsContent value="consignments">
          <ConsignmentsReport downloading={downloading} onDownload={() => download("consignments", "consignados.xlsx")} />
        </TabsContent>
        <TabsContent value="financial">
          <FinancialReport downloading={downloading} onDownload={() => download("financial", "financeiro.xlsx")} />
        </TabsContent>
        <TabsContent value="ranking">
          <RankingReport downloading={downloading} onDownload={() => download("ranking", "ranking.xlsx")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExportButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-1.5" />}
      Exportar Excel
    </Button>
  );
}

function ResellersReport({ downloading, onDownload }: { downloading: string | null; onDownload: () => void }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");

  const { data, isLoading } = useQuery<PageResponse<ResellerSummary>>({
    queryKey: ["report-resellers"],
    queryFn: () => resellersApi.list({ size: "200" }),
  });

  const allResellers = useMemo(() => data?.content ?? [], [data]);

  const managers = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string }[] = [];
    for (const r of allResellers) {
      if (!seen.has(r.managerId)) {
        seen.add(r.managerId);
        result.push({ id: r.managerId, name: r.managerName });
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [allResellers]);

  const resellers = useMemo(() => allResellers.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (managerFilter !== "all" && r.managerId !== managerFilter) return false;
    return true;
  }), [allResellers, statusFilter, managerFilter]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div>
          <CardTitle>Revendedores(as)</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "..." : `${resellers.length} exibidos de ${allResellers.length} total`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
              <SelectItem value="blocked">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
          {managers.length > 0 && (
            <Select value={managerFilter} onValueChange={setManagerFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Gestor(a)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos gestores(as)</SelectItem>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <ExportButton loading={downloading === "resellers"} onClick={onDownload} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Gestor(a)</TableHead>
                <TableHead className="text-right">Lotes Abertos</TableHead>
                <TableHead className="text-right">Valor Aberto</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resellers.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum resultado</TableCell></TableRow>
              ) : resellers.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.phone}</TableCell>
                  <TableCell>{r.managerName}</TableCell>
                  <TableCell className="text-right">{r.openConsignments}</TableCell>
                  <TableCell className="text-right">{formatCurrency(r.openValue ?? 0)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[r.status] ?? "secondary"}>{statusLabel[r.status] ?? r.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConsignmentsReport({ downloading, onDownload }: { downloading: string | null; onDownload: () => void }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [resellerFilter, setResellerFilter] = useState("all");

  const { data, isLoading } = useQuery<PageResponse<ConsignmentSummary>>({
    queryKey: ["report-consignments"],
    queryFn: () => consignmentsApi.list({ size: "200" }),
  });

  const all = useMemo(() => data?.content ?? [], [data]);

  const managers = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string }[] = [];
    for (const c of all) {
      if (!seen.has(c.managerId)) {
        seen.add(c.managerId);
        result.push({ id: c.managerId, name: c.managerName });
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [all]);

  const resellers = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string }[] = [];
    for (const c of all) {
      if (c.resellerId && !seen.has(c.resellerId)) {
        seen.add(c.resellerId);
        result.push({ id: c.resellerId, name: c.resellerName });
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [all]);

  const consignments = useMemo(() => all.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (managerFilter !== "all" && c.managerId !== managerFilter) return false;
    if (resellerFilter !== "all" && c.resellerId !== resellerFilter) return false;
    return true;
  }), [all, statusFilter, managerFilter, resellerFilter]);

  const statusCounts = consignments.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Consignados</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {isLoading ? "..." : `${consignments.length} lotes — ${statusCounts.open ?? 0} abertos, ${statusCounts.overdue ?? 0} atrasados, ${statusCounts.settled ?? 0} encerrados`}
            </p>
          </div>
          <ExportButton loading={downloading === "consignments"} onClick={onDownload} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="partially_settled">Parcial</SelectItem>
              <SelectItem value="overdue">Atrasado</SelectItem>
              <SelectItem value="settled">Encerrado</SelectItem>
            </SelectContent>
          </Select>
          {managers.length > 0 && (
            <Select value={managerFilter} onValueChange={setManagerFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Gestor(a)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos gestores(as)</SelectItem>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {resellers.length > 0 && (
            <Select value={resellerFilter} onValueChange={setResellerFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Revendedor(a)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos revendedores(as)</SelectItem>
                {resellers.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Revendedor(a)</TableHead>
                <TableHead>Gestor(a)</TableHead>
                <TableHead>Retirada</TableHead>
                <TableHead>Retorno Prev.</TableHead>
                <TableHead className="text-right">Enviadas</TableHead>
                <TableHead className="text-right text-green-700">Vendidas</TableHead>
                <TableHead className="text-right text-blue-700">Devolvidas</TableHead>
                <TableHead className="text-right text-red-700">Perdidas</TableHead>
                <TableHead className="text-right">Pendentes</TableHead>
                <TableHead className="text-right">Val. Pendente</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consignments.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Nenhum resultado</TableCell></TableRow>
              ) : consignments.map((c) => {
                const pending = (c.totalItems ?? 0) - (c.totalSold ?? 0) - (c.totalReturned ?? 0) - (c.totalLost ?? 0);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.resellerName}</TableCell>
                    <TableCell>{c.managerName}</TableCell>
                    <TableCell>{formatDate(c.deliveredAt)}</TableCell>
                    <TableCell>{c.expectedReturnAt ? formatDate(c.expectedReturnAt) : "—"}</TableCell>
                    <TableCell className="text-right">{c.totalItems ?? 0}</TableCell>
                    <TableCell className="text-right text-green-700 font-medium">{c.totalSold ?? 0}</TableCell>
                    <TableCell className="text-right text-blue-700">{c.totalReturned ?? 0}</TableCell>
                    <TableCell className="text-right text-red-700">{c.totalLost ?? 0}</TableCell>
                    <TableCell className="text-right font-medium">{pending}</TableCell>
                    <TableCell className="text-right">{formatCurrency(c.totalValue ?? 0)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[c.status] ?? "secondary"}>{statusLabel[c.status] ?? c.status}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function FinancialReport({ downloading, onDownload }: { downloading: string | null; onDownload: () => void }) {
  const { data: summary } = useQuery({
    queryKey: ["report-financial-summary"],
    queryFn: () => settlementsApi.summary(),
  });
  const { data, isLoading } = useQuery<PageResponse<Settlement>>({
    queryKey: ["report-financial-list"],
    queryFn: () => settlementsApi.list({ size: "200", sort: "settlementDate,desc" }),
  });

  const settlements = data?.content ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Financeiro</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Histórico de acertos e comissões</p>
        </div>
        <ExportButton loading={downloading === "financial"} onClick={onDownload} />
      </CardHeader>
      <CardContent>
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Acertos</p>
              <p className="text-xl font-bold">{summary.totalSettlements}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Total Vendido</p>
              <p className="text-xl font-bold">{formatCurrency(summary.totalSoldValue)}</p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Comissões</p>
              <p className="text-xl font-bold">{formatCurrency(summary.totalCommission)}</p>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <p className="text-xs text-muted-foreground">Líquido Recebido</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalNetReceived)}</p>
            </div>
          </div>
        )}
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Revendedor(a)</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead className="text-right">Vendido</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
                <TableHead className="text-right">Líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlements.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{formatDate(s.settlementDate)}</TableCell>
                  <TableCell className="font-medium">{s.resellerName}</TableCell>
                  <TableCell className="capitalize">{s.paymentMethod}</TableCell>
                  <TableCell className="text-right">{formatCurrency(s.totalSoldValue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(s.totalCommission)}</TableCell>
                  <TableCell className="text-right font-medium text-green-600">{formatCurrency(s.netToReceive)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function RankingReport({ downloading, onDownload }: { downloading: string | null; onDownload: () => void }) {
  const { data, isLoading } = useQuery<PageResponse<ResellerSummary>>({
    queryKey: ["report-ranking"],
    queryFn: () => resellersApi.list({ size: "200" }),
  });
  const { data: settlData } = useQuery<PageResponse<Settlement>>({
    queryKey: ["report-ranking-settlements"],
    queryFn: () => settlementsApi.list({ size: "500" }),
  });

  const resellerMap = Object.fromEntries((data?.content ?? []).map((r) => [r.id, r.name]));
  const rankingMap: Record<string, { name: string; total: number; count: number }> = {};
  (settlData?.content ?? []).forEach((s) => {
    if (!rankingMap[s.resellerId]) {
      rankingMap[s.resellerId] = { name: resellerMap[s.resellerId] ?? s.resellerName, total: 0, count: 0 };
    }
    rankingMap[s.resellerId].total += s.totalSoldValue;
    rankingMap[s.resellerId].count += 1;
  });

  const ranking = Object.entries(rankingMap)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 20);

  const COLORS = ["#FFD700", "#C0C0C0", "#CD7F32", "#6366f1", "#22c55e", "#f59e0b", "#3b82f6", "#ec4899"];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Ranking de Vendas</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Top revendedores(as) por volume acumulado</p>
        </div>
        <ExportButton loading={downloading === "ranking"} onClick={onDownload} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : ranking.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">Nenhum dado de acerto disponível</p>
        ) : (
          <>
            <div className="mb-6">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={ranking.map(([, v]) => v)} layout="vertical" margin={{ left: 8, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} width={90} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {ranking.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Revendedor(a)</TableHead>
                  <TableHead className="text-right">Acertos</TableHead>
                  <TableHead className="text-right">Total Vendido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranking.map(([, v], i) => (
                  <TableRow key={i}>
                    <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{v.name}</TableCell>
                    <TableCell className="text-right">{v.count}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(v.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
