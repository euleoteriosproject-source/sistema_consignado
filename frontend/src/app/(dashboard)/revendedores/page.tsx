"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { resellersApi } from "@/lib/api/resellers";
import { settingsApi } from "@/lib/api/settings";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, UserPlus, MoreHorizontal, Pencil, FileText, ToggleLeft, Eye, PackageOpen, ExternalLink, ArrowLeftRight, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ResellerFormModal } from "@/components/resellers/ResellerFormModal";
import { DocumentUploadModal } from "@/components/resellers/DocumentUploadModal";
import { toast } from "sonner";
import type { PageResponse, Reseller, ResellerSummary, ConsignmentSummary } from "@/types";

const statusLabel: Record<string, string> = {
  active: "Ativo", inactive: "Inativo", blocked: "Bloqueado",
};
const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default", inactive: "secondary", blocked: "destructive",
};
const consignmentStatusLabel: Record<string, string> = {
  open: "Aberto", partially_settled: "Parcial", settled: "Encerrado", overdue: "Atrasado",
};
const consignmentStatusVariant: Record<string, "default" | "outline" | "secondary" | "destructive"> = {
  open: "default", partially_settled: "outline", settled: "secondary", overdue: "destructive",
};
const statuses = [
  { value: "all", label: "Todos os status" },
  { value: "active", label: "Ativo" },
  { value: "inactive", label: "Inativo" },
  { value: "blocked", label: "Bloqueado" },
];

function ResellerLotsDialog({ reseller, onClose }: { reseller: ResellerSummary; onClose: () => void }) {
  const router = useRouter();
  const { data, isLoading } = useQuery<ConsignmentSummary[]>({
    queryKey: ["reseller-lots-dialog", reseller.id],
    queryFn: () => resellersApi.consignments(reseller.id),
    select: (lots) => lots.filter((l) => l.status !== "settled"),
  });
  const lots = data ?? [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageOpen className="h-5 w-5" />
            Lotes de {reseller.name}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : lots.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhum lote em andamento</p>
        ) : (
          <div className="space-y-3">
            {lots.map((lot) => (
              <div key={lot.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={consignmentStatusVariant[lot.status] ?? "secondary"}>
                      {consignmentStatusLabel[lot.status] ?? lot.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Retirada: {formatDate(lot.deliveredAt)}
                      {lot.expectedReturnAt && ` · Retorno: ${formatDate(lot.expectedReturnAt)}`}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1"
                    onClick={() => { onClose(); router.push(`/consignados/${lot.id}`); }}>
                    <ExternalLink className="h-3.5 w-3.5" /> Ver lote
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-xs text-muted-foreground">Itens enviados</p>
                    <p className="text-lg font-bold">{lot.totalItems ?? "—"}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-xs text-muted-foreground">Valor em Aberto</p>
                    <p className="text-lg font-bold">{formatCurrency(lot.totalValue ?? 0)}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-xs text-muted-foreground">Gestor(a)</p>
                    <p className="text-sm font-medium truncate">{lot.managerName}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({
  ids,
  onClose,
  onDone,
}: {
  ids: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [targetManagerId, setTargetManagerId] = useState("");

  const { data: managers } = useQuery({
    queryKey: ["managers"],
    queryFn: settingsApi.managers,
  });
  const activeManagers = managers?.filter((m) => m.active) ?? [];

  const transferMutation = useMutation({
    mutationFn: () => resellersApi.bulkTransfer(ids, targetManagerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resellers"] });
      toast.success(`${ids.length} revendedor(es) transferido(s)!`);
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Transferir {ids.length} revendedor{ids.length > 1 ? "es" : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">
            Selecione o(a) gestor(a) que ficará responsável pelos revendedores selecionados.
          </p>
          <Select value={targetManagerId} onValueChange={setTargetManagerId}>
            <SelectTrigger><SelectValue placeholder="Selecione um(a) gestor(a)" /></SelectTrigger>
            <SelectContent>
              {activeManagers.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeManagers.length === 0 && (
            <p className="text-xs text-destructive">Não há gestores(as) ativos(as).</p>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button
              className="flex-1"
              disabled={!targetManagerId || transferMutation.isPending}
              onClick={() => transferMutation.mutate()}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RevendedoresPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(0);
  const [autoFallback, setAutoFallback] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [docsModal, setDocsModal] = useState<{ id: string; name: string } | null>(null);
  const [editReseller, setEditReseller] = useState<Reseller | null>(null);
  const [lotsReseller, setLotsReseller] = useState<ResellerSummary | null>(null);
  const [transferMode, setTransferMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [transferOpen, setTransferOpen] = useState(false);

  const effectiveStatus = autoFallback ? "all" : status;
  const params: Record<string, string> = { page: String(page), size: "20" };
  if (search) params.search = search;
  if (effectiveStatus !== "all") params.status = effectiveStatus;

  const { data, isLoading } = useQuery<PageResponse<ResellerSummary>>({
    queryKey: ["resellers", params],
    queryFn: async () => {
      const result = await resellersApi.list(params);
      if (result.content.length === 0 && status === "active" && !autoFallback && !search) {
        setAutoFallback(true);
      }
      return result;
    },
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: string }) =>
      resellersApi.updateStatus(id, newStatus),
    onSuccess: () => {
      setAutoFallback(false);
      queryClient.invalidateQueries({ queryKey: ["resellers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-alerts"] });
      toast.success("Status atualizado!");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleEdit = async (id: string) => {
    try {
      const r = await resellersApi.get(id);
      setEditReseller(r);
      setModalOpen(true);
    } catch { toast.error("Erro ao carregar revendedor."); }
  };

  const rows = data?.content ?? [];
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someSelected = rows.some((r) => selected.has(r.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
  }

  function exitTransferMode() {
    setTransferMode(false);
    setSelected(new Set());
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Revendedores</h1>
          <p className="text-muted-foreground text-sm">Gerencie sua equipe de revendedores</p>
        </div>
        <div className="flex gap-2 sm:w-auto w-full">
          {transferMode ? (
            <>
              {selected.size > 0 && (
                <Button onClick={() => setTransferOpen(true)} className="flex-1 sm:flex-none gap-2">
                  <ArrowLeftRight className="h-4 w-4" />
                  Transferir ({selected.size})
                </Button>
              )}
              <Button variant="outline" onClick={exitTransferMode} className="flex-1 sm:flex-none gap-2">
                <X className="h-4 w-4" /> Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setTransferMode(true)} className="flex-1 sm:flex-none gap-2">
                <ArrowLeftRight className="h-4 w-4" /> Transferir
              </Button>
              <Button onClick={() => { setEditReseller(null); setModalOpen(true); }} className="flex-1 sm:flex-none gap-2">
                <UserPlus className="h-4 w-4" /> Novo revendedor
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-48">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="Buscar por nome, telefone..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="max-w-sm"
              />
            </div>
            <Select value={effectiveStatus} onValueChange={(v) => { setStatus(v); setAutoFallback(false); setPage(0); }}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {transferMode && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Gestor(a)</TableHead>
                  <TableHead className="text-right">Lotes Abertos</TableHead>
                  <TableHead className="text-right">Valor em Aberto</TableHead>
                  <TableHead className="text-right">A Receber</TableHead>
                  <TableHead>Status</TableHead>
                  {!transferMode && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: transferMode ? 8 : 8 }).map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : rows.map((r) => (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          if (transferMode) toggleOne(r.id);
                          else router.push(`/revendedores/${r.id}`);
                        }}
                      >
                        {transferMode && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selected.has(r.id)}
                              onCheckedChange={() => toggleOne(r.id)}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.phone}</TableCell>
                        <TableCell>{r.managerName}</TableCell>
                        <TableCell className="text-right" onClick={(e) => !transferMode && e.stopPropagation()}>
                          {r.openConsignments > 0 ? (
                            <button
                              onClick={(e) => { if (!transferMode) { e.stopPropagation(); setLotsReseller(r); } }}
                              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                            >
                              <PackageOpen className="h-3.5 w-3.5" />
                              {r.openConsignments}
                            </button>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(r.openValue ?? 0)}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {(r.pendingReceivable ?? 0) > 0 ? formatCurrency(r.pendingReceivable) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[r.status] ?? "secondary"}>
                            {statusLabel[r.status] ?? r.status}
                          </Badge>
                        </TableCell>
                        {!transferMode && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/revendedores/${r.id}`)}>
                                  <Eye className="h-3.5 w-3.5 mr-2" /> Ver perfil
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(r.id)}>
                                  <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDocsModal({ id: r.id, name: r.name })}>
                                  <FileText className="h-3.5 w-3.5 mr-2" /> Documentos
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => toggleStatus.mutate({
                                    id: r.id,
                                    newStatus: r.status === "active" ? "inactive" : "active",
                                  })}
                                >
                                  <ToggleLeft className="h-3.5 w-3.5 mr-2" />
                                  {r.status === "active" ? "Desativar" : "Ativar"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                {!isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={transferMode ? 8 : 9} className="text-center text-muted-foreground py-10">
                      Nenhum revendedor encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {data && data.totalPages > 1 && (
            <div className="flex justify-between items-center p-4">
              <span className="text-sm text-muted-foreground">{data.totalElements} revendedores</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground flex items-center">{page + 1} / {data.totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages - 1} onClick={() => setPage(page + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ResellerFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditReseller(null); }} reseller={editReseller} />
      {docsModal && (
        <DocumentUploadModal
          open={!!docsModal}
          onClose={() => setDocsModal(null)}
          resellerId={docsModal.id}
          resellerName={docsModal.name}
        />
      )}
      {lotsReseller && <ResellerLotsDialog reseller={lotsReseller} onClose={() => setLotsReseller(null)} />}
      {transferOpen && (
        <TransferDialog
          ids={[...selected]}
          onClose={() => setTransferOpen(false)}
          onDone={() => { setTransferOpen(false); exitTransferMode(); }}
        />
      )}
    </div>
  );
}
