"use client";
import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShoppingCart, Info } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { settlementsApi } from "@/lib/api/settlements";
import { resellersApi } from "@/lib/api/resellers";
import { consignmentsApi } from "@/lib/api/consignments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import type { PageResponse, ResellerSummary, Consignment, Settlement } from "@/types";

const paymentMethods = [
  { value: "pix", label: "PIX" },
  { value: "cash", label: "Dinheiro" },
  { value: "transfer", label: "Transferência" },
  { value: "other", label: "Outro" },
];

const consignmentStatusLabel: Record<string, string> = {
  open: "Aberto", partially_settled: "Parcial", overdue: "Atrasado", settled: "Encerrado",
};

interface Props { open: boolean; onClose: () => void }

export function SettlementFormModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [resellerId, setResellerId] = useState("");
  const [consignmentId, setConsignmentId] = useState("none");
  const [totalInput, setTotalInput] = useState("");
  const [commissionPct, setCommissionPct] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Resellers for dropdown
  const { data: resPage } = useQuery<PageResponse<ResellerSummary>>({
    queryKey: ["resellers-all"],
    queryFn: () => resellersApi.list({ size: "200" }),
    enabled: open,
  });

  // All consignments for selected reseller (including settled — pode ter acerto financeiro pendente)
  const { data: consPage } = useQuery({
    queryKey: ["reseller-consignments-for-settlement", resellerId],
    queryFn: () => consignmentsApi.list({ resellerId, size: "50" }),
    enabled: open && !!resellerId,
  });

  // Full details of the selected consignment
  const { data: consignment, isLoading: loadingCons } = useQuery<Consignment>({
    queryKey: ["consignment-settlement-form-detail", consignmentId],
    queryFn: () => consignmentsApi.get(consignmentId),
    enabled: consignmentId !== "none",
  });

  // Existing settlements linked to this consignment
  const { data: existingSettlements = [] } = useQuery<Settlement[]>({
    queryKey: ["consignment-existing-settlements-form", consignmentId, resellerId],
    queryFn: async () => {
      const page = await settlementsApi.list({ resellerId, size: "100" });
      return page.content.filter((s) => s.consignmentId === consignmentId);
    },
    enabled: consignmentId !== "none" && !!resellerId,
  });

  // Sold items from the selected consignment
  const soldItems = useMemo(
    () => (consignment ? consignment.items.filter((i) => i.quantitySold > 0) : []),
    [consignment]
  );

  const itemsGrossTotal = soldItems.reduce((sum, i) => sum + i.soldValue, 0);
  const alreadySettledTotal = existingSettlements.reduce((sum, s) => sum + s.totalSoldValue, 0);
  const remainingTotal = Math.max(0, itemsGrossTotal - alreadySettledTotal);

  // Auto-fill total when consignment loads (commission fica em branco — usuário informa)
  useEffect(() => {
    if (!consignment) return;
    const items = consignment.items.filter((i) => i.quantitySold > 0);
    const gross = items.reduce((sum, i) => sum + i.soldValue, 0);
    if (gross > 0) {
      const alreadySettled = existingSettlements.reduce((sum, s) => sum + s.totalSoldValue, 0);
      setTotalInput(Math.max(0, gross - alreadySettled).toFixed(2));
    } else {
      setTotalInput("");
    }
    setCommissionPct("");
  }, [consignment?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset consignment when reseller changes
  useEffect(() => {
    setConsignmentId("none");
    setTotalInput("");
  }, [resellerId]);

  const totalSoldValue = parseFloat(totalInput) || 0;
  const pct = parseFloat(commissionPct) || 0;
  const commissionValue = totalSoldValue * (pct / 100);
  const netValue = totalSoldValue - commissionValue;

  const mutation = useMutation({
    mutationFn: () =>
      settlementsApi.create({
        resellerId,
        consignmentId: consignmentId !== "none" ? consignmentId : undefined,
        settlementDate,
        totalSoldValue,
        totalCommission: commissionValue,
        paymentMethod,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      queryClient.invalidateQueries({ queryKey: ["consignment-settlements"] });
      queryClient.invalidateQueries({ queryKey: ["consignments"] });
      queryClient.invalidateQueries({ queryKey: ["resellers"] });
      toast.success("Acerto registrado!");
      handleClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleClose = () => {
    setResellerId(""); setConsignmentId("none"); setTotalInput("");
    setCommissionPct(""); setPaymentMethod("pix");
    setSettlementDate(new Date().toISOString().split("T")[0]); setNotes("");
    onClose();
  };

  const resellers = resPage?.content ?? [];
  const consignments = consPage?.content ?? [];
  const canSubmit = resellerId && totalSoldValue > 0 && paymentMethod;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo acerto financeiro</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Reseller */}
          <div className="space-y-1">
            <Label>Revendedor(a) *</Label>
            <Select value={resellerId} onValueChange={setResellerId}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {resellers.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Consignment */}
          {resellerId && (
            <div className="space-y-1">
              <Label>Lote vinculado</Label>
              <Select value={consignmentId} onValueChange={setConsignmentId}>
                <SelectTrigger><SelectValue placeholder="Selecione um lote..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem lote vinculado</SelectItem>
                  {consignments.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {new Date(c.deliveredAt).toLocaleDateString("pt-BR")} —{" "}
                      {consignmentStatusLabel[c.status] ?? c.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Items from selected consignment */}
          {consignmentId !== "none" && (
            <>
              {loadingCons ? (
                <div className="space-y-1.5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : soldItems.length > 0 ? (
                <div className="border rounded-lg overflow-hidden text-sm">
                  <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <ShoppingCart className="h-3 w-3" /> Itens vendidos neste lote
                    </span>
                    {alreadySettledTotal > 0 && (
                      <span className="text-xs text-orange-600 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Já acertado: {formatCurrency(alreadySettledTotal)}
                      </span>
                    )}
                  </div>
                  <div className="divide-y">
                    {soldItems.map((item) => (
                      <div key={item.id} className="px-3 py-2 flex items-center justify-between">
                        <div>
                          {item.productCode && (
                            <span className="text-xs text-muted-foreground mr-1">[{item.productCode}]</span>
                          )}
                          <span>{item.productName}</span>
                          <span className="text-muted-foreground text-xs ml-2">× {item.quantitySold}</span>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="font-medium">{formatCurrency(item.soldValue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-muted/50 px-3 py-2 flex justify-between font-medium text-sm">
                    <span>Total vendido</span>
                    <span>{formatCurrency(itemsGrossTotal)}</span>
                  </div>
                  {alreadySettledTotal > 0 && (
                    <div className="px-3 py-2 flex justify-between text-sm text-orange-600 border-t">
                      <span>Já acertado</span>
                      <span>− {formatCurrency(alreadySettledTotal)}</span>
                    </div>
                  )}
                  {remainingTotal > 0 && (
                    <div className="px-3 py-2 flex justify-between text-sm font-semibold text-green-700 dark:text-green-400 border-t bg-green-50 dark:bg-green-900/20">
                      <span>Restante a acertar</span>
                      <span>{formatCurrency(remainingTotal)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <Info className="h-4 w-4 shrink-0" />
                  Nenhum item vendido registrado neste lote.
                </div>
              )}
              <Separator />
            </>
          )}

          {/* Total sold value — editable */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">
              Total vendido (R$) *
            </Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={totalInput}
              onChange={(e) => setTotalInput(e.target.value)}
              placeholder="0,00"
            />
          </div>

          {/* Commission: % input + calculated R$ */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Comissão</Label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 w-28">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={commissionPct}
                  onChange={(e) => setCommissionPct(e.target.value)}
                  className="text-center"
                />
                <span className="text-sm text-muted-foreground shrink-0">%</span>
              </div>
              <span className="text-muted-foreground text-sm">=</span>
              <span className="font-semibold text-orange-600">{formatCurrency(commissionValue)}</span>
            </div>
          </div>

          {/* Net value */}
          {totalSoldValue > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm font-medium">Líquido a receber</span>
              <span className="text-xl font-bold text-green-600">{formatCurrency(netValue)}</span>
            </div>
          )}

          {/* Date & payment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Data do acerto</Label>
              <DatePicker value={settlementDate} onChange={setSettlementDate} />
            </div>
            <div className="space-y-1">
              <Label>Forma de pagamento *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label>Observações</Label>
            <Input
              placeholder="Opcional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !canSubmit}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar acerto
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
