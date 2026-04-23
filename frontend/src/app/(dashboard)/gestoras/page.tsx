"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { settingsApi } from "@/lib/api/settings";
import { resellersApi } from "@/lib/api/resellers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, Users, ExternalLink, ArrowRightLeft, Trash2, Mail } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { ManagerFormModal } from "@/components/settings/ManagerFormModal";
import type { Manager, PageResponse, ResellerSummary } from "@/types";

function TeamDialog({ manager, onClose }: { manager: Manager; onClose: () => void }) {
  const router = useRouter();
  const { data, isLoading } = useQuery<PageResponse<ResellerSummary>>({
    queryKey: ["manager-team", manager.id],
    queryFn: () => resellersApi.list({ managerId: manager.id, size: "100", status: "active" }),
  });
  const resellers = data?.content ?? [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Equipe de {manager.name}
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : resellers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum(a) revendedor(a) ativo(a) vinculado(a)
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Lotes Abertos</TableHead>
                  <TableHead className="text-right">Valor em Aberto</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {resellers.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.phone}</TableCell>
                    <TableCell className="text-right">{r.openConsignments}</TableCell>
                    <TableCell className="text-right">{formatCurrency(r.openValue ?? 0)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => { onClose(); router.push(`/revendedoras/${r.id}`); }}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="text-xs text-muted-foreground text-right">{resellers.length} revendedor(es) ativo(s)</p>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({
  manager,
  managers,
  onClose,
}: {
  manager: Manager;
  managers: Manager[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [targetId, setTargetId] = useState("");
  const others = managers.filter((m) => m.id !== manager.id && m.active);

  const transfer = useMutation({
    mutationFn: () => settingsApi.transferResellers(manager.id, targetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["managers"] });
      qc.invalidateQueries({ queryKey: ["resellers"] });
      toast.success("Revendedores transferidos!");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Transferir revendedores(as)
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">
            Todos os revendedores(as) de <strong>{manager.name}</strong> serão transferidos para:
          </p>
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger><SelectValue placeholder="Selecione o(a) gestor(a) destino" /></SelectTrigger>
            <SelectContent>
              {others.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {others.length === 0 && (
            <p className="text-xs text-destructive">Não há outros(as) gestores(as) ativos(as) disponíveis.</p>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" disabled={!targetId || transfer.isPending} onClick={() => transfer.mutate()}>
              Transferir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function GestoresPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);
  const [transferManager, setTransferManager] = useState<Manager | null>(null);

  const { data: managers, isLoading } = useQuery<Manager[]>({
    queryKey: ["managers"],
    queryFn: settingsApi.managers,
  });

  const toggleManager = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      settingsApi.updateManagerStatus(id, active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["managers"] });
      toast.success("Status atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteManager = useMutation({
    mutationFn: (id: string) => settingsApi.deleteManager(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["managers"] });
      toast.success("Gestor(a) excluído(a).");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestores(as)</h1>
          <p className="text-muted-foreground text-sm">Usuários(as) com acesso para gerenciar revendedores(as)</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="sm:w-auto w-full">
          <UserPlus className="h-4 w-4 mr-2" />
          Novo(a) gestor(a)
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Gestores(as) cadastrados(as)
            {managers && managers.length > 0 && (
              <Badge variant="secondary" className="ml-2">{managers.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Desde</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managers?.map((m) => (
                    <TableRow key={m.id} className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedManager(m)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {m.name}
                        </div>
                      </TableCell>
                      <TableCell>{m.email}</TableCell>
                      <TableCell>
                        {m.active ? (
                          <Badge variant="default">Ativo(a)</Badge>
                        ) : m.invitePending ? (
                          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                            <Mail className="h-2.5 w-2.5" />
                            Aguardando convite
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Inativo(a)</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(m.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm"
                            onClick={() => setTransferManager(m)}
                            title="Transferir revendedores">
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm"
                            onClick={() => toggleManager.mutate({ id: m.id, active: !m.active })}
                            disabled={toggleManager.isPending}>
                            {m.active ? "Desativar" : "Ativar"}
                          </Button>
                          <Button variant="ghost" size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Excluir ${m.name}? Esta ação não pode ser desfeita.`)) {
                                deleteManager.mutate(m.id);
                              }
                            }}
                            disabled={deleteManager.isPending}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {managers?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                        Nenhum(a) gestor(a) cadastrado(a)
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Clique em um(a) gestor(a) para ver sua equipe</p>

      <ManagerFormModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {selectedManager && (
        <TeamDialog manager={selectedManager} onClose={() => setSelectedManager(null)} />
      )}

      {transferManager && managers && (
        <TransferDialog
          manager={transferManager}
          managers={managers}
          onClose={() => setTransferManager(null)}
        />
      )}
    </div>
  );
}
