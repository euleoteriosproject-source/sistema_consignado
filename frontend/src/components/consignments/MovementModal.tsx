"use client";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShoppingCart, RotateCcw, AlertTriangle, Info } from "lucide-react";
import { consignmentsApi } from "@/lib/api/consignments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import type { ConsignmentItem } from "@/types";

export interface SettlementOfferData {
  consignmentId: string;
  resellerId: string;
  soldLines: { productName: string; qty: number; unitPrice: number; commissionRate: number }[];
  grossValue: number;
  commissionValue: number;
  netValue: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  consignmentId: string;
  resellerId: string;
  items: ConsignmentItem[];
  onSettlementOffer?: (data: SettlementOfferData) => void;
}

interface Movement {
  itemId: string;
  quantitySold: number;
  quantityReturned: number;
  quantityLost: number;
}

export function MovementModal({ open, onClose, consignmentId, resellerId, items, onSettlementOffer }: Props) {
  const queryClient = useQueryClient();
  const openItems = items.filter((i) => i.status !== "settled");

  const [movementDate, setMovementDate] = useState(new Date().toISOString().split("T")[0]);
  const [movements, setMovements] = useState<Movement[]>(() =>
    openItems.map((i) => ({ itemId: i.id, quantitySold: 0, quantityReturned: 0, quantityLost: 0 }))
  );

  useEffect(() => {
    if (open) {
      setMovementDate(new Date().toISOString().split("T")[0]);
      setMovements(openItems.map((i) => ({ itemId: i.id, quantitySold: 0, quantityReturned: 0, quantityLost: 0 })));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (idx: number, key: keyof Movement, val: number) =>
    setMovements((p) => p.map((m, i) => {
      if (i !== idx) return m;
      const item = openItems[idx];
      const pending = item.quantitySent - item.quantitySold - item.quantityReturned - item.quantityLost;
      const otherKeys = (["quantitySold", "quantityReturned", "quantityLost"] as const).filter((k) => k !== key);
      const otherSum = otherKeys.reduce((sum, k) => sum + m[k], 0);
      const maxAllowed = Math.max(0, pending - otherSum);
      return { ...m, [key]: Math.min(Math.max(0, val), maxAllowed) };
    }));

  const mutation = useMutation({
    mutationFn: () =>
      consignmentsApi.move(consignmentId, {
        movements: movements.filter((m) => m.quantitySold > 0 || m.quantityReturned > 0 || m.quantityLost > 0),
        movementDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consignments"] });
      queryClient.invalidateQueries({ queryKey: ["consignment", consignmentId] });
      toast.success("Movimentação registrada!");
      const soldMovements = movements.filter((m) => m.quantitySold > 0);
      if (onSettlementOffer && soldMovements.length > 0) {
        const soldLines = soldMovements.map((m) => {
          const item = openItems.find((i) => i.id === m.itemId)!;
          return {
            productName: item.productName,
            qty: m.quantitySold,
            unitPrice: item.salePrice,
            commissionRate: item.commissionRate,
          };
        });
        const grossValue = soldLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
        const commissionValue = soldLines.reduce(
          (s, l) => s + l.qty * l.unitPrice * (l.commissionRate / 100), 0
        );
        onSettlementOffer({ consignmentId, resellerId, soldLines, grossValue, commissionValue, netValue: grossValue - commissionValue });
        onClose();
      } else {
        onClose();
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const hasAnyMovement = movements.some(
    (m) => m.quantitySold > 0 || m.quantityReturned > 0 || m.quantityLost > 0
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar movimentação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-4">
            <div className="space-y-1 flex-1">
              <Label>Data da movimentação</Label>
              <Input
                type="date"
                value={movementDate}
                onChange={(e) => setMovementDate(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded p-2 mt-4">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Preencha apenas os campos com movimentação. Pode ser parcial.</span>
            </div>
          </div>

          <div className="space-y-3">
            {openItems.map((item, idx) => {
              const pending = item.quantitySent - item.quantitySold - item.quantityReturned - item.quantityLost;
              const mv = movements[idx];
              const used = (mv?.quantitySold ?? 0) + (mv?.quantityReturned ?? 0) + (mv?.quantityLost ?? 0);
              const remaining = pending - used;
              const isOver = remaining < 0;

              return (
                <div key={item.id} className={`border rounded-lg p-4 space-y-3 ${isOver ? "border-destructive" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{item.productName}</p>
                      {item.productCode && (
                        <p className="text-xs text-muted-foreground font-mono">{item.productCode}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Valor unitário</p>
                      <p className="text-sm font-medium">{formatCurrency(item.salePrice)}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 text-xs flex-wrap">
                    <span className="bg-muted px-2 py-0.5 rounded">Enviado: {item.quantitySent}</span>
                    <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
                      Vendido: {item.quantitySold}
                    </span>
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">
                      Devolvido: {item.quantityReturned}
                    </span>
                    {item.quantityLost > 0 && (
                      <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded">
                        Perdido: {item.quantityLost}
                      </span>
                    )}
                    <span className={`font-medium px-2 py-0.5 rounded ${isOver ? "bg-destructive/10 text-destructive" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"}`}>
                      Pendente agora: {Math.max(0, remaining)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1 text-green-600">
                        <ShoppingCart className="h-3 w-3" /> Vendidas
                      </Label>
                      <Input
                        type="number" min={0} max={pending}
                        value={mv?.quantitySold || ""}
                        placeholder="0"
                        onChange={(e) => set(idx, "quantitySold", parseInt(e.target.value) || 0)}
                        className="border-green-200 focus:border-green-500 text-center"
                      />
                      {(mv?.quantitySold ?? 0) > 0 && (
                        <p className="text-xs text-green-600">
                          = {formatCurrency(item.salePrice * (mv?.quantitySold ?? 0))}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1 text-blue-600">
                        <RotateCcw className="h-3 w-3" /> Devolvidas
                      </Label>
                      <Input
                        type="number" min={0} max={pending}
                        value={mv?.quantityReturned || ""}
                        placeholder="0"
                        onChange={(e) => set(idx, "quantityReturned", parseInt(e.target.value) || 0)}
                        className="border-blue-200 focus:border-blue-500 text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1 text-red-500">
                        <AlertTriangle className="h-3 w-3" /> Perdidas
                      </Label>
                      <Input
                        type="number" min={0} max={pending}
                        value={mv?.quantityLost || ""}
                        placeholder="0"
                        onChange={(e) => set(idx, "quantityLost", parseInt(e.target.value) || 0)}
                        className="border-red-200 focus:border-red-500 text-center"
                      />
                    </div>
                  </div>

                  {isOver && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Total de movimentações excede as peças pendentes ({pending}).
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !hasAnyMovement || movements.some((m, i) => {
                const pending = openItems[i] ? openItems[i].quantitySent - openItems[i].quantitySold - openItems[i].quantityReturned - openItems[i].quantityLost : 0;
                return (m.quantitySold + m.quantityReturned + m.quantityLost) > pending;
              })}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar movimentação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
