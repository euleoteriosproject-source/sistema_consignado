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
  const [netValue, setNetValue] = useState(data.netValue.toFixed(2));
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [notes, setNotes] = useState("");

  const grossValue = data.grossValue;
  const parsedNet = parseFloat(netValue) || 0;
  const impliedCommission = Math.max(0, grossValue - parsedNet);

  const mutation = useMutation({
    mutationFn: () =>
      settlementsApi.create({
        resellerId: data.resellerId,
        consignmentId: data.consignmentId,
        totalSoldValue: grossValue,
        totalCommission: impliedCommission,
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
          {/* Sold items summary */}
          <div className="space-y-1.5">
            {data.soldLines.map((line, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {line.productName} × {line.qty}
                </span>
                <span>{formatCurrency(line.qty * line.unitPrice)}</span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total vendido</span>
              <span className="font-medium">{formatCurrency(grossValue)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Comissão (calculada)</span>
              <span>− {formatCurrency(impliedCommission)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-medium">Líquido a receber (editável)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input
                className="pl-8 text-lg font-bold text-green-600"
                value={netValue}
                onChange={(e) => setNetValue(e.target.value)}
                type="number"
                min={0}
                step={0.01}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-sm">Forma de pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-sm">Observações (opcional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: referente às vendas desta semana"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Não agora
            </Button>
            <Button
              className="flex-1"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || parsedNet <= 0}
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
