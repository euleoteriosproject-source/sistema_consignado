"use client";
import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { consignmentsApi } from "@/lib/api/consignments";
import { settlementsApi } from "@/lib/api/settlements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, TrendingUp, CheckCircle, Receipt, History, TrendingDown, RotateCcw, AlertTriangle, Clock, CircleDollarSign, AlertCircle, Package, Printer } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { MovementModal } from "@/components/consignments/MovementModal";
import { PostMovementSettlementDialog } from "@/components/consignments/PostMovementSettlementDialog";
import { CloseConsignmentModal } from "@/components/consignments/CloseConsignmentModal";
import { ExtratoModal } from "@/components/consignments/ExtratoModal";
import type { SettlementOfferData } from "@/components/consignments/MovementModal";
import type { Consignment, ConsignmentItem, PageResponse, Settlement } from "@/types";

const statusConfig: Record<string, { label: string; variant: "default" | "outline" | "secondary" | "destructive" }> = {
  open: { label: "Aberto", variant: "default" },
  partially_settled: { label: "Parcialmente Acertado", variant: "outline" },
  settled: { label: "Encerrado", variant: "secondary" },
  overdue: { label: "Atrasado", variant: "destructive" },
};

const itemStatus: Record<string, { label: string; variant: "default" | "outline" | "secondary" }> = {
  pending: { label: "Pendente", variant: "outline" },
  partially_settled: { label: "Parcial", variant: "default" },
  settled: { label: "Acertado", variant: "secondary" },
};

const paymentLabel: Record<string, string> = {
  cash: "Dinheiro", pix: "PIX", transfer: "Transferência", other: "Outro",
};

const movementConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  sold:     { label: "Vendida",   icon: <TrendingDown className="h-3.5 w-3.5" />, color: "text-green-600" },
  returned: { label: "Devolvida", icon: <RotateCcw className="h-3.5 w-3.5" />,   color: "text-blue-600" },
  lost:     { label: "Perdida",   icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-red-600" },
  settle:   { label: "Acerto",    icon: <Receipt className="h-3.5 w-3.5" />,       color: "text-orange-600" },
};

const moveOrder = ["sold", "returned", "lost", "settle"] as const;

function ItemHistoryDialog({
  item,
  open,
  onClose,
  deliveredAt,
}: {
  item: ConsignmentItem;
  open: boolean;
  onClose: () => void;
  deliveredAt: string;
}) {
  const { batches, unaccounted } = useMemo(() => {
    const sorted = [...item.movements].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const result: { timestamp: Date; totals: Record<string, number> }[] = [];
    for (const m of sorted) {
      const ts = new Date(m.createdAt);
      const minute = Math.floor(ts.getTime() / 60000);
      const last = result[result.length - 1];
      if (!last || Math.floor(last.timestamp.getTime() / 60000) !== minute) {
        result.push({ timestamp: ts, totals: { [m.movementType]: m.quantity } });
      } else {
        last.totals[m.movementType] = (last.totals[m.movementType] ?? 0) + m.quantity;
      }
    }
    const sums = item.movements.reduce((acc, m) => {
      acc[m.movementType] = (acc[m.movementType] ?? 0) + m.quantity;
      return acc;
    }, {} as Record<string, number>);
    const ua = {
      sold: Math.max(0, item.quantitySold - (sums.sold ?? 0)),
      returned: Math.max(0, item.quantityReturned - (sums.returned ?? 0)),
      lost: Math.max(0, item.quantityLost - (sums.lost ?? 0)),
    };
    return { batches: result, unaccounted: ua };
  }, [item.movements, item.quantitySold, item.quantityReturned, item.quantityLost]);

  const hasUnaccounted = unaccounted.sold > 0 || unaccounted.returned > 0 || unaccounted.lost > 0;
  const showSnapshotFallback = item.movements.length === 0 && (item.quantitySold > 0 || item.quantityReturned > 0 || item.quantityLost > 0);
  const showEmpty = item.movements.length === 0 && !showSnapshotFallback;
  const hasMore = batches.length > 0 || showSnapshotFallback || hasUnaccounted;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Extrato — {item.productName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-0 max-h-80 overflow-y-auto pr-1">
          {/* Delivery node */}
          <TimelineNode
            icon={<Package className="h-3.5 w-3.5 text-primary" />}
            iconBg="bg-primary/10"
            showLine={hasMore}
          >
            <p className="text-xs text-muted-foreground">{formatDate(deliveredAt)}</p>
            <p className="text-sm font-medium">
              Enviado: <span className="font-bold">{item.quantitySent}</span>{" "}
              {item.quantitySent === 1 ? "peça" : "peças"}
            </p>
          </TimelineNode>

          {/* Unaccounted movements (pre-migration history) */}
          {hasUnaccounted && (
            <TimelineNode
              icon={<Clock className="h-3.5 w-3.5 text-muted-foreground" />}
              iconBg="bg-muted"
              showLine={batches.length > 0}
            >
              <p className="text-xs text-muted-foreground mb-1">Movimentações anteriores (sem data registrada)</p>
              <div className="space-y-0.5">
                {unaccounted.sold > 0 && (
                  <div className={`flex items-center gap-1.5 text-sm ${movementConfig.sold.color}`}>
                    {movementConfig.sold.icon}
                    <span>Vendida: <span className="font-medium">{unaccounted.sold} {unaccounted.sold === 1 ? "peça" : "peças"}</span></span>
                  </div>
                )}
                {unaccounted.returned > 0 && (
                  <div className={`flex items-center gap-1.5 text-sm ${movementConfig.returned.color}`}>
                    {movementConfig.returned.icon}
                    <span>Devolvida: <span className="font-medium">{unaccounted.returned} {unaccounted.returned === 1 ? "peça" : "peças"}</span></span>
                  </div>
                )}
                {unaccounted.lost > 0 && (
                  <div className={`flex items-center gap-1.5 text-sm ${movementConfig.lost.color}`}>
                    {movementConfig.lost.icon}
                    <span>Perdida: <span className="font-medium">{unaccounted.lost} {unaccounted.lost === 1 ? "peça" : "peças"}</span></span>
                  </div>
                )}
              </div>
            </TimelineNode>
          )}

          {/* Movement batches */}
          {batches.map((batch, i) => (
            <TimelineNode
              key={i}
              icon={<Clock className="h-3.5 w-3.5 text-muted-foreground" />}
              iconBg="bg-muted"
              showLine={i < batches.length - 1}
            >
              <p className="text-xs text-muted-foreground mb-1">
                {batch.timestamp.toLocaleString("pt-BR", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
              <div className="space-y-0.5">
                {moveOrder.filter((t) => batch.totals[t]).map((type) => {
                  const cfg = movementConfig[type];
                  const qty = batch.totals[type];
                  return (
                    <div key={type} className={`flex items-center gap-1.5 text-sm ${cfg.color}`}>
                      {cfg.icon}
                      <span>
                        {cfg.label}:{" "}
                        <span className="font-medium">{qty} {qty === 1 ? "peça" : "peças"}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </TimelineNode>
          ))}

          {/* Snapshot fallback for pre-migration data */}
          {showSnapshotFallback && (
            <TimelineNode
              icon={<Clock className="h-3.5 w-3.5 text-muted-foreground" />}
              iconBg="bg-muted"
              showLine={false}
            >
              <p className="text-xs text-muted-foreground mb-1">Movimentações (sem registro de data)</p>
              <div className="space-y-0.5">
                {item.quantitySold > 0 && (
                  <div className={`flex items-center gap-1.5 text-sm ${movementConfig.sold.color}`}>
                    {movementConfig.sold.icon}
                    <span>Vendida: <span className="font-medium">{item.quantitySold} {item.quantitySold === 1 ? "peça" : "peças"}</span></span>
                  </div>
                )}
                {item.quantityReturned > 0 && (
                  <div className={`flex items-center gap-1.5 text-sm ${movementConfig.returned.color}`}>
                    {movementConfig.returned.icon}
                    <span>Devolvida: <span className="font-medium">{item.quantityReturned} {item.quantityReturned === 1 ? "peça" : "peças"}</span></span>
                  </div>
                )}
                {item.quantityLost > 0 && (
                  <div className={`flex items-center gap-1.5 text-sm ${movementConfig.lost.color}`}>
                    {movementConfig.lost.icon}
                    <span>Perdida: <span className="font-medium">{item.quantityLost} {item.quantityLost === 1 ? "peça" : "peças"}</span></span>
                  </div>
                )}
              </div>
            </TimelineNode>
          )}

          {showEmpty && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma movimentação registrada</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TimelineNode({
  icon,
  iconBg,
  showLine,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  showLine: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-7 h-7 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        {showLine && <div className="w-px flex-1 bg-border mt-1 min-h-3" />}
      </div>
      <div className="pb-4 flex-1">{children}</div>
    </div>
  );
}

export default function ConsignmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [movementOpen, setMovementOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [extratoOpen, setExtratoOpen] = useState(false);
  const [settlementOffer, setSettlementOffer] = useState<SettlementOfferData | null>(null);
  const [historyItemId, setHistoryItemId] = useState<string | null>(null);

  const { data: consignment, isLoading } = useQuery<Consignment>({
    queryKey: ["consignment", id],
    queryFn: () => consignmentsApi.get(id),
  });

  const historyItem = historyItemId
    ? (consignment?.items.find((i) => i.id === historyItemId) ?? null)
    : null;

  const { data: settlementsPage } = useQuery<PageResponse<Settlement>>({
    queryKey: ["consignment-settlements", id, consignment?.resellerId],
    queryFn: () => settlementsApi.list({ resellerId: consignment!.resellerId, size: "50" }),
    enabled: !!consignment?.resellerId,
    select: (data) => ({
      ...data,
      content: data.content.filter((s) => s.consignmentId === id),
    }),
  });

  const relatedSettlements = settlementsPage?.content ?? [];


  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  if (!consignment) return null;

  const cfg = statusConfig[consignment.status] ?? { label: consignment.status, variant: "secondary" };
  const isOpen = consignment.status === "open" || consignment.status === "partially_settled" || consignment.status === "overdue";

  const totalPending = consignment.items.reduce((acc, item) => {
    return acc + item.quantitySent - item.quantitySold - item.quantityReturned - item.quantityLost;
  }, 0);

  const totalItemsSent = consignment.items.reduce((acc, item) => acc + item.quantitySent, 0);

  const totalSettledAmount = relatedSettlements.reduce((acc, s) => acc + s.netToReceive, 0);
  const totalCommissionPaid = relatedSettlements.reduce((acc, s) => acc + s.totalCommission, 0);
  const totalSettledGross = relatedSettlements.reduce((acc, s) => acc + s.totalSoldValue, 0);
  const pendingGross = Math.max(0, consignment.totalSoldValue - totalSettledGross);
  const avgCommissionPct = consignment.totalSoldValue > 0
    ? (consignment.items.reduce((s, i) => s + i.soldValue * (i.commissionRate / 100), 0) / consignment.totalSoldValue) * 100
    : 30;
  const pendingNet = pendingGross * (1 - avgCommissionPct / 100);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-start gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{consignment.resellerName}</h1>
            <Badge variant={cfg.variant}>{cfg.label}</Badge>
            {relatedSettlements.length > 0 && (
              <Badge variant="outline" className="text-green-600 border-green-300">
                <Receipt className="h-3 w-3 mr-1" />
                {relatedSettlements.length} acerto{relatedSettlements.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Gestor(a): {consignment.managerName} · Retirada: {formatDate(consignment.deliveredAt)}
            {consignment.expectedReturnAt && ` · Retorno: ${formatDate(consignment.expectedReturnAt)}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setExtratoOpen(true)}>
            <Printer className="h-4 w-4 mr-1" /> Extrato
          </Button>
          {isOpen && (
            <>
              <Button variant="outline" size="sm" onClick={() => setMovementOpen(true)}>
                <TrendingUp className="h-4 w-4 mr-1" /> Movimentar
              </Button>
              <Button size="sm" onClick={() => setCloseOpen(true)}>
                <CheckCircle className="h-4 w-4 mr-1" /> Encerrar lote
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground font-normal">Val. Estimado (total)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(consignment.totalSentValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground font-normal">Total Vendido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(consignment.totalSoldValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground font-normal">Peças Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalPending}</p>
            <p className="text-xs text-muted-foreground">{totalItemsSent} enviadas no total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground font-normal">Acertado / Comissão</CardTitle>
          </CardHeader>
          <CardContent>
            {relatedSettlements.length > 0 ? (
              <>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSettledAmount)}</p>
                <p className="text-xs text-muted-foreground">Comissão paga: {formatCurrency(totalCommissionPaid)}</p>
              </>
            ) : (
              <p className="text-2xl font-bold text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Banner financeiro */}
      {consignment.totalSoldValue > 0 && (
        <div className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${
          pendingGross > 0.01
            ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
            : "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
        }`}>
          <div className="flex items-center gap-3 flex-1">
            {pendingGross > 0.01
              ? <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              : <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />}
            <div className="space-y-1 text-sm">
              <p className={`font-semibold ${pendingGross > 0.01 ? "text-amber-800 dark:text-amber-400" : "text-green-800 dark:text-green-400"}`}>
                {pendingGross > 0.01 ? "Acerto financeiro pendente" : "Tudo acertado!"}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Total vendido: <strong>{formatCurrency(consignment.totalSoldValue)}</strong></span>
                {totalSettledGross > 0 && <span>Já acertado: <strong>{formatCurrency(totalSettledGross)}</strong></span>}
                {pendingGross > 0.01 && (
                  <span className="text-amber-700 dark:text-amber-400 font-medium">
                    Falta acertar: <strong>{formatCurrency(pendingGross)}</strong>
                    {" "}(líq. est. {formatCurrency(pendingNet)})
                  </span>
                )}
              </div>
            </div>
          </div>
          {pendingGross > 0.01 && (
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
              onClick={() => {
                const soldLines = consignment.items
                  .filter((i) => i.soldValue > 0)
                  .map((i) => ({ productName: i.productName, qty: i.quantitySold, unitPrice: i.salePrice, commissionRate: i.commissionRate }));
                setSettlementOffer({
                  consignmentId: id,
                  resellerId: consignment.resellerId,
                  soldLines,
                  grossValue: pendingGross,
                  commissionValue: pendingGross * (avgCommissionPct / 100),
                  netValue: pendingNet,
                });
              }}
            >
              <CircleDollarSign className="h-4 w-4 mr-1" /> Fazer acerto
            </Button>
          )}
        </div>
      )}

      {consignment.notes && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Observações: {consignment.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Itens do lote
            <span className="text-xs font-normal text-muted-foreground">· clique no produto para ver o extrato</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Enviado</TableHead>
                <TableHead className="text-right">Vendido</TableHead>
                <TableHead className="text-right">Devolvido</TableHead>
                <TableHead className="text-right">Perdido</TableHead>
                <TableHead className="text-right">Pendente</TableHead>
                <TableHead className="text-right">Valor Vendido</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consignment.items.map((item) => {
                const pending = item.quantitySent - item.quantitySold - item.quantityReturned - item.quantityLost;
                const ist = itemStatus[item.status] ?? { label: item.status, variant: "outline" };
                const hasHistory = item.movements.length > 0;
                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setHistoryItemId(item.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        {item.productCode && <span className="text-xs text-muted-foreground">[{item.productCode}]</span>}
                        <span>{item.productName}</span>
                        {hasHistory && <History className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantitySent}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">{item.quantitySold}</TableCell>
                    <TableCell className="text-right text-blue-600">{item.quantityReturned}</TableCell>
                    <TableCell className="text-right text-red-600">{item.quantityLost}</TableCell>
                    <TableCell className="text-right font-medium">{pending}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.soldValue)}</TableCell>
                    <TableCell>
                      <Badge variant={ist.variant}>{ist.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {relatedSettlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Acertos deste lote
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Total Vendido</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="text-right">Líquido</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Obs.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatedSettlements.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{formatDate(s.settlementDate)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(s.totalSoldValue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(s.totalCommission)}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">{formatCurrency(s.netToReceive)}</TableCell>
                    <TableCell><Badge variant="outline">{paymentLabel[s.paymentMethod] ?? s.paymentMethod}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{s.notes ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <MovementModal
        open={movementOpen}
        onClose={() => setMovementOpen(false)}
        consignmentId={id}
        resellerId={consignment.resellerId}
        items={consignment.items}
        onSettlementOffer={(data) => setSettlementOffer(data)}
      />

      {closeOpen && (
        <CloseConsignmentModal
          open={closeOpen}
          onClose={() => setCloseOpen(false)}
          consignmentId={id}
          resellerId={consignment.resellerId}
          items={consignment.items}
          alreadySettledGross={totalSettledGross}
          onSettled={() => setCloseOpen(false)}
          onSettlementOffer={(data) => setSettlementOffer(data)}
        />
      )}

      {settlementOffer && (
        <PostMovementSettlementDialog
          open={!!settlementOffer}
          data={settlementOffer}
          onClose={() => setSettlementOffer(null)}
        />
      )}

      {historyItem && (
        <ItemHistoryDialog
          item={historyItem}
          open={!!historyItem}
          onClose={() => setHistoryItemId(null)}
          deliveredAt={consignment.deliveredAt}
        />
      )}

      {extratoOpen && (
        <ExtratoModal consignmentId={id} onClose={() => setExtratoOpen(false)} />
      )}
    </div>
  );
}
