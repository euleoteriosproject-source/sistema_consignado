"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Receipt, Loader2 } from "lucide-react";
import { settlementsApi } from "@/lib/api/settlements";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import type { SettlementOfferData } from "./MovementModal";

interface Props {
  open: boolean;
  data: SettlementOfferData;
  onClose: () => void;
}

const paymentMethods = [
  { value: "pix", label: "PIX" },
  { value: "cash", label: "Dinheiro" },
  { value: "transfer", label: "Transferência" },
  { value: "other", label: "Outro" },
];

export function PostMovementSettlementDialog({ open, data, onClose }: Props) {
  const queryClient = useQueryClient();
  const grossValue = data.grossValue;

  const [commissionPct, setCommissionPct] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [notes, setNotes] = useState("");

  const pct = parseFloat(commissionPct) || 0;
  const commissionValue = grossValue * (pct / 100);
  const netValue = grossValue - commissionValue;

  const mutation = useMutation({
    mutationFn: () =>
      settlementsApi.create({
        resellerId: data.resellerId,
        consignmentId: data.consignmentId,
        totalSoldValue: grossValue,
        totalCommission: commissionValue,
        paymentMethod,
        notes: notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      queryClient.invalidateQueries({ queryKey: ["consignment-settlements"] });
      queryClient.invalidateQueries({ queryKey: ["consignment", data.consignmentId] });
      queryClient.invalidateQueries({ queryKey: ["resellers"] });
      toast.success("Acerto financeiro registrado!");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-green-600" />
            Registrar acerto financeiro?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Itens vendidos */}
          <div className="space-y-1.5">
            {data.soldLines.map((line, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{line.productName} × {line.qty}</span>
                <span>{formatCurrency(line.qty * line.unitPrice)}</span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Total vendido */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total vendido</span>
            <span className="font-medium">{formatCurrency(grossValue)}</span>
          </div>

          {/* Comissão com % editável */}
          <div className="space-y-1">
            <Label className="text-sm">Comissão (%)</Label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 w-28">
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
              <span className="text-orange-600 font-semibold">{formatCurrency(commissionValue)}</span>
            </div>
          </div>

          {/* Líquido */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex justify-between items-center">
            <span className="text-sm font-medium">Líquido a receber</span>
            <span className="text-xl font-bold text-green-600">{formatCurrency(netValue)}</span>
          </div>

          {/* Forma de pagamento */}
          <div className="space-y-1">
            <Label className="text-sm">Forma de pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {paymentMethods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <Label className="text-sm">Observações (opcional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: referente às vendas desta semana"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Não agora</Button>
            <Button
              className="flex-1"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || netValue <= 0}
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
