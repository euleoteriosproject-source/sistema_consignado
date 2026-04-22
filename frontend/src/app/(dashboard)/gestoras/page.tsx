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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus, Users, ExternalLink } from "lucide-react";
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
            Nenhum(a) revendedor(a) ativo(a) vinculado(a) a este(a) gestor(a)
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => { onClose(); router.push(`/revendedoras/${r.id}`); }}
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
        <p className="text-xs text-muted-foreground text-right">{resellers.length} revendedor(es) ativo(s)</p>
      </DialogContent>
    </Dialog>
  );
}

export default function GestoresPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null);

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
    onError: () => toast.error("Erro ao atualizar status"),
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
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Desde</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managers?.map((m) => (
                    <TableRow
                      key={m.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedManager(m)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {m.name}
                        </div>
                      </TableCell>
                      <TableCell>{m.email}</TableCell>
                      <TableCell>{m.phone ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={m.active ? "default" : "secondary"}>
                          {m.active ? "Ativo(a)" : "Inativo(a)"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(m.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleManager.mutate({ id: m.id, active: !m.active })}
                          disabled={toggleManager.isPending}
                        >
                          {m.active ? "Desativar" : "Ativar"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {managers?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
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

      <p className="text-xs text-muted-foreground">Clique em um(a) gestor(a) para ver sua equipe de revendedores(as)</p>

      <ManagerFormModal open={modalOpen} onClose={() => setModalOpen(false)} />

      {selectedManager && (
        <TeamDialog
          manager={selectedManager}
          onClose={() => setSelectedManager(null)}
        />
      )}
    </div>
  );
}
