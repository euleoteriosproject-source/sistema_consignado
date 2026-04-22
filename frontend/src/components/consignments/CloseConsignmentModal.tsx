"use client";
import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShoppingCart, RotateCcw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { consignmentsApi } from "@/lib/api/consignments";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import type { ConsignmentItem } from "@/types";
import type { SettlementOfferData } from "./MovementModal";

interface Props {
  open: boolean;
  onClose: () => void;
  consignmentId: string;
  resellerId: string;
  items: ConsignmentItem[];
  onSettled: () => void;
  onSettlementOffer: (data: SettlementOfferData) => void;
}

interface ItemReconciliation {
  itemId: string;
  sold: number;
  returned: number;
  lost: number;
}

export function CloseConsignmentModal({
  open, onClose, consignmentId, resellerId, items, onSettled, onSettlementOffer,
}: Props) {
  const queryClient = useQueryClient();

  const pendingItems = items.filter((i) => {
    const rem = i.quantitySent - i.quantitySold - i.quantityReturned - i.quantityLost;
    return rem > 0;
  });

  const [reconciliations, setReconciliations] = useState<ItemReconciliation[]>(() =>
    pendingItems.map((i) => ({ itemId: i.id, sold: 0, returned: 0, lost: 0 }))
  );

  const set = (idx: number, key: keyof Omit<ItemReconciliation, "itemId">, val: number) =>
    setReconciliations((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const item = pendingItems[idx];
        const pending = item.quantitySent - item.quantitySold - item.quantityReturned - item.quantityLost;
        const otherKeys = (["sold", "returned", "lost"] as const).filter((k) => k !== key);
        const otherSum = otherKeys.reduce((s, k) => s + r[k], 0);
        const maxAllowed = Math.max(0, pending - otherSum);
        return { ...r, [key]: Math.min(Math.max(0, val), maxAllowed) };
      })
    );

  const itemErrors = useMemo(
    () =>
      reconciliations.map((r, idx) => {
        const item = pendingItems[idx];
        const pending = item.quantitySent - item.quantitySold - item.quantityReturned - item.quantityLost;
        const total = r.sold + r.returned + r.lost;
        return total !== pending ? `Deve somar ${pending} (atual: ${total})` : null;
      }),
    [reconciliations, pendingItems]
  );

  const allValid = itemErrors.every((e) => e === null);

  const moveMutation = useMutation({
    mutationFn: () => {
      const moves = reconciliations
        .filter((r) => r.sold > 0 || r.returned > 0 || r.lost > 0)
        .map((r) => ({ itemId: r.itemId, quantitySold: r.sold, quantityReturned: r.returned, quantityLost: r.lost }));
      if (moves.length === 0) return Promise.resolve(null);
      return consignmentsApi.move(consignmentId, { movements: moves, movementDate: new Date().toISOString().split("T")[0] });
    },
    onSuccess: () => settleMutation.mutate(),
    onError: (e) => toast.error(e.message),
  });

  const settleMutation = useMutation({
    mutationFn: () => consignmentsApi.settle(consignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consignment", consignmentId] });
      queryClient.invalidateQueries({ queryKey: ["consignments"] });
      toast.success("Lote encerrado!");

      const soldRecs = reconciliations.filter((r) => r.sold > 0);
      if (soldRecs.length > 0) {
        const soldLines = soldRecs.map((r) => {
          const item = pendingItems.find((i) => i.id === r.itemId)!;
          return { productName: item.productName, qty: r.sold, unitPrice: item.salePrice, commissionRate: item.commissionRate };
        });
        const grossValue = soldLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
        const commissionValue = soldLines.reduce((s, l) => s + l.qty * l.unitPrice * (l.commissionRate / 100), 0);
        onClose();
        onSettlementOffer({ consignmentId, resellerId, soldLines, grossValue, commissionValue, netValue: grossValue - commissionValue });
      } else {
        onClose();
        onSettled();
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const isLoading = moveMutation.isPending || settleMutation.isPending;

  if (pendingItems.length === 0) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Encerrar lote
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Todos os itens já foram acertados. Deseja encerrar o lote?</p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" onClick={() => settleMutation.mutate()} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Encerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Encerrar lote — acertar itens pendentes
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-1">
          Para encerrar, todos os itens pendentes devem ser contabilizados: vendido, devolvido ou perdido.
        </p>

        <div className="space-y-3 mt-2">
          {pendingItems.map((item, idx) => {
            const pending = item.quantitySent - item.quantitySold - item.quantityReturned - item.quantityLost;
            const r = reconciliations[idx];
            const err = itemErrors[idx];
            const total = r.sold + r.returned + r.lost;

            return (
              <div key={item.id} className={`border rounded-lg p-4 space-y-3 ${err ? "border-destructive" : total === pending ? "border-green-400" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{item.productName}</p>
                    {item.productCode && <p className="text-xs text-muted-foreground font-mono">{item.productCode}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Valor unitário</p>
                    <p className="text-sm font-medium">{formatCurrency(item.salePrice)}</p>
                  </div>
                </div>

                <div className="flex gap-2 text-xs flex-wrap">
                  <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded font-medium">
                    Pendentes: {pending}
                  </span>
                  <span className={`px-2 py-0.5 rounded font-medium ${total === pending ? "bg-green-100 dark:bg-green-900/30 text-green-700" : "bg-muted text-muted-foreground"}`}>
                    Acertado: {total} / {pending}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1 text-green-600">
                      <ShoppingCart className="h-3 w-3" /> Vendidas
                    </Label>
                    <Input
                      type="number" min={0}
                      value={r.sold || ""}
                      placeholder="0"
                      onChange={(e) => set(idx, "sold", parseInt(e.target.value) || 0)}
                      className="border-green-200 focus:border-green-500 text-center"
                    />
                    {r.sold > 0 && (
                      <p className="text-xs text-green-600">= {formatCurrency(item.salePrice * r.sold)}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1 text-blue-600">
                      <RotateCcw className="h-3 w-3" /> Devolvidas
                    </Label>
                    <Input
                      type="number" min={0}
                      value={r.returned || ""}
                      placeholder="0"
                      onChange={(e) => set(idx, "returned", parseInt(e.target.value) || 0)}
                      className="border-blue-200 focus:border-blue-500 text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs flex items-center gap-1 text-red-500">
                      <AlertTriangle className="h-3 w-3" /> Perdidas
                    </Label>
                    <Input
                      type="number" min={0}
                      value={r.lost || ""}
                      placeholder="0"
                      onChange={(e) => set(idx, "lost", parseInt(e.target.value) || 0)}
                      className="border-red-200 focus:border-red-500 text-center"
                    />
                  </div>
                </div>

                {err && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> {err}
                  </p>
                )}
                {!err && total === pending && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Item acertado
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2 border-t mt-2">
          {!allValid && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 flex-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              Acerte todos os itens para encerrar
            </p>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => moveMutation.mutate()} disabled={!allValid || isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar e encerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
