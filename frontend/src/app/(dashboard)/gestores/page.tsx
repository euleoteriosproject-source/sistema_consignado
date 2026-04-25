"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { settingsApi } from "@/lib/api/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Users, Trash2, Mail } from "lucide-react";
import { toast } from "sonner";
import { ManagerFormModal } from "@/components/settings/ManagerFormModal";
import type { Manager } from "@/types";

export default function GestoresPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

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
          <h1 className="text-2xl font-bold">Gestores</h1>
          <p className="text-muted-foreground text-sm">Usuários com acesso para gerenciar revendedores</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="sm:w-auto w-full">
          <UserPlus className="h-4 w-4 mr-2" />
          Novo(a) gestor(a)
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Gestores cadastrados
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
                      onClick={() => router.push(`/gestores/${m.id}`)}>
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

      <p className="text-xs text-muted-foreground">Clique em um(a) gestor(a) para ver o perfil e transferir revendedores</p>

      <ManagerFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
