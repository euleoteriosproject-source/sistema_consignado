"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { settlementsApi } from "@/lib/api/settlements";
import { consignmentsApi } from "@/lib/api/consignments";
import { resellersApi } from "@/lib/api/resellers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, TrendingUp, DollarSign, Wallet, Clock, ExternalLink, Receipt, AlertCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SettlementFormModal } from "@/components/settlements/SettlementFormModal";
import type { PageResponse, Settlement, SettlementsSummary, ConsignmentSummary, Consignment, ResellerSummary } from "@/types";

const paymentLabel: Record<string, string> = {
  cash: "Dinheiro", pix: "PIX", transfer: "Transferência", other: "Outro",
};
const consignmentStatusVariant: Record<string, "default" | "outline" | "destructive" | "secondary"> = {
  open: "default", partially_settled: "outline", overdue: "destructive",
};
const consignmentStatusLabel: Record<string, string> = {
  open: "Aberto", partially_settled: "Parcial", overdue: "Atrasado",
};

function SettlementDetailModal({ settlement, onClose }: { settlement: Settlement; onClose: () => void }) {
  const { data: consignment, isLoading } = useQuery<Consignment>({
    queryKey: ["consignment-detail-for-settlement", settlement.consignmentId],
    queryFn: () => consignmentsApi.get(settlement.consignmentId!),
    enabled: !!settlement.consignmentId,
  });

  const commissionRate = settlement.totalSoldValue > 0
    ? ((settlement.totalCommission / settlement.totalSoldValue) * 100).toFixed(1)
    : "0";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Extrato do acerto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Revendedor(a)</p>
              <p className="font-medium">{settlement.resellerName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Data do acerto</p>
              <p className="font-medium">{formatDate(settlement.settlementDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Gestor(a)</p>
              <p className="font-medium">{settlement.managerName}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Forma de pagamento</p>
              <Badge variant="outline">{paymentLabel[settlement.paymentMethod] ?? settlement.paymentMethod}</Badge>
            </div>
          </div>

          <Separator />

          {/* Items from consignment */}
          {settlement.consignmentId ? (
            <>
              <p className="text-sm font-medium">Peças vendidas</p>
              {isLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : consignment ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd.</TableHead>
                      <TableHead className="text-right">Val. Vendido</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consignment.items.filter((i) => i.quantitySold > 0).map((item) => {
                      const commission = item.soldValue * (item.commissionRate / 100);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm">
                            {item.productCode && <span className="text-xs text-muted-foreground mr-1">[{item.productCode}]</span>}
                            {item.productName}
                          </TableCell>
                          <TableCell className="text-right text-sm">{item.quantitySold}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(item.soldValue)}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(commission)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : null}
              <Separator />
            </>
          ) : (
            <p className="text-xs text-muted-foreground italic">Acerto sem lote vinculado</p>
          )}

          {/* Financial breakdown */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total vendido</span>
              <span className="font-medium">{formatCurrency(settlement.totalSoldValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Comissão paga ({commissionRate}%)</span>
              <span className="text-orange-600">− {formatCurrency(settlement.totalCommission)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>Líquido recebido</span>
              <span className="text-green-600">{formatCurrency(settlement.netToReceive)}</span>
            </div>
          </div>

          {/* Notes */}
          {settlement.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Observações</p>
                <p className="text-sm">{settlement.notes}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function FinanceiroPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);
  const [resellerFilter, setResellerFilter] = useState("all");

  const { data: resellersData } = useQuery<PageResponse<ResellerSummary>>({
    queryKey: ["resellers-for-filter"],
    queryFn: () => resellersApi.list({ size: "200", status: "active" }),
  });
  const resellerOptions = resellersData?.content ?? [];

  const settlementParams: Record<string, string> = { page: String(page), size: "20" };
  if (resellerFilter !== "all") settlementParams.resellerId = resellerFilter;

  const { data: summary } = useQuery<SettlementsSummary>({
    queryKey: ["settlements-summary", resellerFilter],
    queryFn: () => settlementsApi.summary(resellerFilter !== "all" ? { resellerId: resellerFilter } : undefined),
  });

  const { data, isLoading } = useQuery<PageResponse<Settlement>>({
    queryKey: ["settlements", page, resellerFilter],
    queryFn: () => settlementsApi.list(settlementParams),
  });

  const { data: openConsignmentsData, isLoading: loadingOpen } = useQuery<PageResponse<ConsignmentSummary>>({
    queryKey: ["consignments-open-financial"],
    queryFn: () => consignmentsApi.list({ size: "200" }),
    select: (d) => ({
      ...d,
      content: d.content.filter((c) => c.status === "open" || c.status === "partially_settled" || c.status === "overdue"),
    }),
  });

  const openLots = openConsignmentsData?.content ?? [];
  const totalEstimated = openLots.reduce((acc, c) => acc + (c.totalValue ?? 0), 0);
  const totalByReseller = openLots.reduce((acc, c) => {
    if (!acc[c.resellerId]) acc[c.resellerId] = { name: c.resellerName, manager: c.managerName, estimated: 0, lots: 0 };
    acc[c.resellerId].estimated += c.totalValue ?? 0;
    acc[c.resellerId].lots += 1;
    return acc;
  }, {} as Record<string, { name: string; manager: string; estimated: number; lots: number }>);
  const resellerRows = Object.entries(totalByReseller).sort(([, a], [, b]) => b.estimated - a.estimated);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground text-sm">Acertos e valores em circulação</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="sm:w-auto w-full">
          <Plus className="h-4 w-4 mr-2" />
          Novo acerto
        </Button>
      </div>

      {summary && (
        <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-1 flex flex-row items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Vendido</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalSoldValue)}</p>
              <p className="text-xs text-muted-foreground mt-1">{summary.totalSettlements} acertos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 flex flex-row items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Comissões Pagas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalCommission)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 flex flex-row items-center gap-2">
              <Wallet className="h-4 w-4 text-green-600" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Líquido Recebido</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalNetReceived)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 flex flex-row items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <CardTitle className="text-sm font-medium text-muted-foreground">Em Circulação (est.)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalEstimated)}</p>
              <p className="text-xs text-muted-foreground mt-1">{openLots.length} lotes abertos</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200 dark:border-amber-800">
            <CardHeader className="pb-1 flex flex-row items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <CardTitle className="text-sm font-medium text-muted-foreground">A Receber</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(summary.totalPendingReceivable ?? 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">vendas não acertadas</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="settlements">
        <TabsList>
          <TabsTrigger value="settlements">Acertos registrados</TabsTrigger>
          <TabsTrigger value="open">
            Em andamento
            {openLots.length > 0 && (
              <Badge variant="secondary" className="ml-1.5">{openLots.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settlements">
          <Card>
            <div className="p-4 border-b">
              <Select value={resellerFilter} onValueChange={(v) => { setResellerFilter(v); setPage(0); }}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Filtrar por revendedor(a)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos(as) os revendedores(as)</SelectItem>
                  {resellerOptions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Revendedor(a)</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Total Vendido</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                    <TableHead className="text-right">Líquido</TableHead>
                    <TableHead>Pagamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    : data?.content.map((s) => (
                        <TableRow
                          key={s.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedSettlement(s)}
                        >
                          <TableCell className="font-medium">{s.resellerName}</TableCell>
                          <TableCell>{formatDate(s.settlementDate)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(s.totalSoldValue)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(s.totalCommission)}</TableCell>
                          <TableCell className="text-right text-green-600 font-medium">
                            {formatCurrency(s.netToReceive)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{paymentLabel[s.paymentMethod] ?? s.paymentMethod}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  {!isLoading && data?.content.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        Nenhum acerto registrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
              {data && data.totalPages > 1 && (
                <div className="flex justify-between items-center p-4">
                  <span className="text-sm text-muted-foreground">{data.totalElements} acertos</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
                    <span className="text-sm text-muted-foreground flex items-center">{page + 1} / {data.totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= data.totalPages - 1} onClick={() => setPage(page + 1)}>Próxima</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="open" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Por revendedor(a)</CardTitle></CardHeader>
              <CardContent className="p-0">
                {loadingOpen ? (
                  <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                ) : resellerRows.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum lote em andamento</p>
                ) : (
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Revendedor(a)</TableHead>
                        <TableHead className="text-right">Lotes</TableHead>
                        <TableHead className="text-right">Val. Estimado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resellerRows.map(([id, r]) => (
                        <TableRow key={id}>
                          <TableCell>
                            <p className="font-medium">{r.name}</p>
                            <p className="text-xs text-muted-foreground">{r.manager}</p>
                          </TableCell>
                          <TableCell className="text-right">{r.lots}</TableCell>
                          <TableCell className="text-right font-medium text-orange-600">{formatCurrency(r.estimated)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Lotes individuais</CardTitle></CardHeader>
              <CardContent className="p-0">
                {loadingOpen ? (
                  <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                ) : openLots.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum lote em andamento</p>
                ) : (
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Revendedor(a)</TableHead>
                        <TableHead>Retirada</TableHead>
                        <TableHead className="text-right">Val. Estimado</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openLots.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.resellerName}</TableCell>
                          <TableCell>{formatDate(c.deliveredAt)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(c.totalValue ?? 0)}</TableCell>
                          <TableCell>
                            <Badge variant={consignmentStatusVariant[c.status] ?? "secondary"}>
                              {consignmentStatusLabel[c.status] ?? c.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.push(`/consignados/${c.id}`)}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <SettlementFormModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {selectedSettlement && (
        <SettlementDetailModal
          settlement={selectedSettlement}
          onClose={() => setSelectedSettlement(null)}
        />
      )}
    </div>
  );
}
