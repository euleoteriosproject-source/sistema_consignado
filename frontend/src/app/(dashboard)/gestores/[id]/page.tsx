"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api/settings";
import { resellersApi } from "@/lib/api/resellers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ArrowRightLeft, Users, Mail, Loader2, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import type { PageResponse, ResellerSummary } from "@/types";

export default function GestorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [transferOpen, setTransferOpen] = useState(false);
  const [targetManagerId, setTargetManagerId] = useState("");

  const { data: managers } = useQuery({
    queryKey: ["managers"],
    queryFn: settingsApi.managers,
  });

  const manager = managers?.find((m) => m.id === id);
  const otherActiveManagers = managers?.filter((m) => m.id !== id && m.active) ?? [];

  const { data: resellersData, isLoading } = useQuery<PageResponse<ResellerSummary>>({
    queryKey: ["manager-resellers", id],
    queryFn: () => resellersApi.list({ managerId: id, size: "200", status: "active" }),
    enabled: !!id,
  });
  const resellers = resellersData?.content ?? [];

  function toggleAll(checked: boolean) {
    if (checked) setSelected(new Set(resellers.map((r) => r.id)));
    else setSelected(new Set());
  }

  function toggleOne(resellerId: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(resellerId);
    else next.delete(resellerId);
    setSelected(next);
  }

  const transferMutation = useMutation({
    mutationFn: () => resellersApi.bulkTransfer([...selected], targetManagerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["manager-resellers", id] });
      qc.invalidateQueries({ queryKey: ["resellers"] });
      toast.success(`${selected.size} revendedor(a)(s) transferido(a)(s)!`);
      setSelected(new Set());
      setTransferOpen(false);
      setTargetManagerId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!managers) return <div className="p-6"><Skeleton className="h-8 w-64" /></div>;
  if (!manager) return <div className="p-6 text-muted-foreground">Gestor(a) não encontrado(a).</div>;

  const allSelected = resellers.length > 0 && selected.size === resellers.length;
  const someSelected = selected.size > 0 && !allSelected;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{manager.name}</h1>
            {manager.active ? (
              <Badge variant="default">Ativo(a)</Badge>
            ) : manager.invitePending ? (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Mail className="h-2.5 w-2.5" /> Aguardando convite
              </Badge>
            ) : (
              <Badge variant="secondary">Inativo(a)</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{manager.email}</p>
        </div>
      </div>

      {/* Resellers card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Revendedoras ativas</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{resellers.length} revendedor(a)(s) ativo(a)(s)</p>
          </div>
          {selected.size > 0 && (
            <Button size="sm" onClick={() => setTransferOpen(true)}>
              <ArrowRightLeft className="h-4 w-4 mr-1" />
              Transferir {selected.size === resellers.length ? "todas" : `${selected.size}`}
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : resellers.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">
              Nenhuma revendedora ativa vinculada
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                        onCheckedChange={(v) => toggleAll(!!v)}
                      />
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="text-right">Lotes abertos</TableHead>
                    <TableHead className="text-right">Valor em aberto</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resellers.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => toggleOne(r.id, !selected.has(r.id))}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(r.id)}
                          onCheckedChange={(v) => toggleOne(r.id, !!v)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-muted-foreground">{r.phone}</TableCell>
                      <TableCell className="text-right">{r.openConsignments}</TableCell>
                      <TableCell className="text-right">{formatCurrency(r.openValue ?? 0)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); router.push(`/revendedoras/${r.id}`); }}
                        >
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

      {/* Transfer modal */}
      <Dialog open={transferOpen} onOpenChange={(o) => !o && setTransferOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Transferir revendedoras
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground">
              Transferindo <strong>{selected.size}</strong> revendedor(a)(s) de <strong>{manager.name}</strong> para:
            </p>
            <Select value={targetManagerId} onValueChange={setTargetManagerId}>
              <SelectTrigger><SelectValue placeholder="Selecione o(a) gestor(a) destino" /></SelectTrigger>
              <SelectContent>
                {otherActiveManagers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {otherActiveManagers.length === 0 && (
              <p className="text-xs text-destructive">Não há outros(as) gestores(as) ativos(as) disponíveis.</p>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setTransferOpen(false)}>Cancelar</Button>
              <Button
                className="flex-1"
                disabled={!targetManagerId || transferMutation.isPending}
                onClick={() => transferMutation.mutate()}
              >
                {transferMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Transferir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
