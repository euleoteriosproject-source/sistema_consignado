"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import type { TenantSettings, Manager } from "@/types";

export default function ConfiguracoesPage() {
  const qc = useQueryClient();

  const { data: settings, isLoading: loadingSettings } = useQuery<TenantSettings>({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
  });

  const { data: managers, isLoading: loadingManagers } = useQuery<Manager[]>({
    queryKey: ["managers"],
    queryFn: settingsApi.managers,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      settingsApi.updateManagerStatus(id, active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["managers"] });
      toast.success("Status da gestora atualizado");
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Negócio</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSettings ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-32" />
            </div>
          ) : settings ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium w-40">Nome da empresa</span>
                <span className="text-sm">{settings.name}</span>
              </div>
              <Separator />
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium w-40">Plano</span>
                <Badge>{settings.plan.toUpperCase()}</Badge>
              </div>
              <Separator />
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium w-40">Comissão padrão</span>
                <span className="text-sm">{settings.defaultCommissionRate}%</span>
              </div>
              <Separator />
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium w-40">Dias para retorno</span>
                <span className="text-sm">{settings.defaultReturnDays} dias</span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestoras</CardTitle>
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Nova Gestora
          </Button>
        </CardHeader>
        <CardContent>
          {loadingManagers ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {managers?.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>
                      <Badge variant={m.active ? "success" : "secondary"}>
                        {m.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatus.mutate({ id: m.id, active: !m.active })}
                        disabled={toggleStatus.isPending}
                      >
                        {m.active ? "Desativar" : "Ativar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {managers?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhuma gestora cadastrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
