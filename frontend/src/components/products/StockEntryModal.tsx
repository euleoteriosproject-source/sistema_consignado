"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, PackagePlus } from "lucide-react";
import { productsApi } from "@/lib/api/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  product: { id: string; name: string; stockTotal: number; stockAvailable: number; salePrice: number };
}

export function StockEntryModal({ open, onClose, product }: Props) {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState("");

  const qty = parseInt(quantity) || 0;

  const mutation = useMutation({
    mutationFn: () => productsApi.addStock(product.id, qty),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      toast.success(`${qty} unidade(s) adicionada(s) ao estoque!`);
      setQuantity("");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setQuantity(""); onClose(); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary" />
            Entrada de estoque
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <p className="font-medium">{product.name}</p>
            <div className="flex justify-between text-muted-foreground">
              <span>Estoque total atual</span>
              <span className="font-medium text-foreground">{product.stockTotal} un.</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Disponível para envio</span>
              <span className="font-medium text-foreground">{product.stockAvailable} un.</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Quantidade comprada *</Label>
            <Input
              type="number"
              min={1}
              placeholder="Ex: 20"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              autoFocus
            />
          </div>

          {qty > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Novo estoque total</span>
                <span className="font-semibold">{product.stockTotal + qty} un.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Novo disponível</span>
                <span className="font-semibold">{product.stockAvailable + qty} un.</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor investido</span>
                <span className="font-semibold text-green-600">{formatCurrency(qty * product.salePrice)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || qty <= 0}
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar entrada
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
