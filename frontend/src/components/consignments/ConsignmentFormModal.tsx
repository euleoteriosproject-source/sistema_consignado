"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Package, Users } from "lucide-react";
import { consignmentsApi } from "@/lib/api/consignments";
import { resellersApi } from "@/lib/api/resellers";
import { productsApi } from "@/lib/api/products";
import { settingsApi } from "@/lib/api/settings";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ItemRow { productId: string; quantitySent: number }

interface Props { open: boolean; onClose: () => void }

export function ConsignmentFormModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.role);
  const isOwner = role === "owner";
  const [mode, setMode] = useState<"reseller" | "manager_stock">("reseller");
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [resellerId, setResellerId] = useState("");
  const [deliveredAt, setDeliveredAt] = useState(new Date().toISOString().split("T")[0]);
  const [expectedReturnAt, setExpectedReturnAt] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ productId: "", quantitySent: 1 }]);

  const { data: managers } = useQuery({
    queryKey: ["managers"],
    queryFn: settingsApi.managers,
    enabled: open && isOwner,
  });

  const { data: resPage } = useQuery({
    queryKey: ["resellers-active", selectedManagerId],
    queryFn: () => resellersApi.list({
      size: "200", status: "active",
      ...(isOwner && selectedManagerId ? { managerId: selectedManagerId } : {}),
    }),
    enabled: open,
  });
  const { data: prodPage } = useQuery({
    queryKey: ["products-all"],
    queryFn: () => productsApi.list({ size: "200", active: "true" }),
    enabled: open,
  });

  const resellers = resPage?.content ?? [];
  const products = prodPage?.content ?? [];

  function handleResellerChange(id: string) {
    setResellerId(id);
    if (isOwner && !selectedManagerId) {
      const r = resellers.find((r) => r.id === id);
      if (r?.managerId) setSelectedManagerId(r.managerId);
    }
  }

  // Determina o managerId efetivo: se owner, usa a gestora da revendedora (ou a selecionada)
  const effectiveManagerId = isOwner
    ? (selectedManagerId || resellers.find((r) => r.id === resellerId)?.managerId || "")
    : "";

  const mutation = useMutation({
    mutationFn: () =>
      consignmentsApi.create({
        ...(mode === "reseller" ? { resellerId } : {}),
        ...(isOwner && effectiveManagerId ? { managerId: effectiveManagerId } : {}),
        consignmentType: mode,
        deliveredAt,
        expectedReturnAt: expectedReturnAt || undefined,
        notes: notes || undefined,
        items: items.filter((i) => i.productId && i.quantitySent > 0),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consignments"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Lote criado com sucesso!");
      handleClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleClose = () => {
    setMode("reseller"); setSelectedManagerId(""); setResellerId("");
    setDeliveredAt(new Date().toISOString().split("T")[0]);
    setExpectedReturnAt(""); setNotes(""); setItems([{ productId: "", quantitySent: 1 }]);
    onClose();
  };

  const addItem = () => setItems((p) => [...p, { productId: "", quantitySent: 1 }]);
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  const setItem = (i: number, key: keyof ItemRow, val: string | number) =>
    setItems((p) => p.map((row, idx) => idx === i ? { ...row, [key]: val } : row));

  const canSubmit = (mode === "manager_stock" ? effectiveManagerId : resellerId)
    && items.some((i) => i.productId && i.quantitySent > 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo lote de consignado</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {isOwner && (
            <div className="flex gap-2">
              <Button
                type="button" size="sm"
                variant={mode === "reseller" ? "default" : "outline"}
                className="flex-1"
                onClick={() => { setMode("reseller"); setResellerId(""); }}
              >
                <Users className="h-4 w-4 mr-1" /> Para revendedora
              </Button>
              <Button
                type="button" size="sm"
                variant={mode === "manager_stock" ? "default" : "outline"}
                className="flex-1"
                onClick={() => { setMode("manager_stock"); setResellerId(""); }}
              >
                <Package className="h-4 w-4 mr-1" /> Estoque da gestora
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {isOwner && (
              <div className="col-span-2 space-y-1">
                <Label>Gestora responsável</Label>
                <Select value={effectiveManagerId} onValueChange={(v) => { setSelectedManagerId(v); setResellerId(""); }}>
                  <SelectTrigger><SelectValue placeholder="Todas as gestoras" /></SelectTrigger>
                  <SelectContent>
                    {managers?.filter(m => m.active).map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {mode === "reseller" && (
              <div className="col-span-2 space-y-1">
                <Label>Revendedor(a) *</Label>
                <Select value={resellerId} onValueChange={handleResellerChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {resellers.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Data de entrega</Label>
              <DatePicker value={deliveredAt} onChange={setDeliveredAt} />
            </div>
            <div className="space-y-1">
              <Label>Previsão de retorno</Label>
              <DatePicker value={expectedReturnAt} onChange={setExpectedReturnAt} placeholder="Sem previsão" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens do lote *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar item
              </Button>
            </div>
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">Produto</Label>
                  <Select value={item.productId} onValueChange={(v) => setItem(i, "productId", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.code ? `[${p.code}] ` : ""}{p.name} — {p.stockAvailable} disponível
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-1">
                  <Label className="text-xs text-muted-foreground">Qtd</Label>
                  <Input
                    type="number" min={1}
                    value={item.quantitySent}
                    onChange={(e) => setItem(i, "quantitySent", parseInt(e.target.value) || 1)}
                  />
                </div>
                <Button
                  type="button" variant="ghost" size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeItem(i)} disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label>Observações</Label>
            <Input placeholder="Opcional" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !canSubmit}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar lote
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
