"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, type AdminTenant } from "@/lib/api/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

const planBadge: Record<string, "default" | "secondary" | "outline"> = {
  basic: "secondary", pro: "outline", premium: "default",
};

function EditTenantDialog({ tenant, onClose }: { tenant: AdminTenant; onClose: () => void }) {
  const qc = useQueryClient();
  const [plan, setPlan] = useState(tenant.plan);
  const [active, setActive] = useState(String(tenant.active));

  const mutation = useMutation({
    mutationFn: () => adminApi.updateTenant(tenant.id, {
      plan,
      active: active === "true",
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tenants"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Cliente atualizado.");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar — {tenant.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Plano</label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Status</label>
            <Select value={active} onValueChange={setActive}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Ativo</SelectItem>
                <SelectItem value="false">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminTenantsPage() {
  const [editing, setEditing] = useState<AdminTenant | null>(null);

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: adminApi.tenants,
    staleTime: 0,
  });

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Clientes</h1>
        {tenants && <Badge variant="secondary">{tenants.length}</Badge>}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Todos os tenants</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">Nome</th>
                    <th className="text-left px-4 py-3 font-medium">Slug</th>
                    <th className="text-left px-4 py-3 font-medium">Plano</th>
                    <th className="text-left px-4 py-3 font-medium">Gestores</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Criado em</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {tenants?.map((t) => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{t.name}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{t.slug}</td>
                      <td className="px-4 py-3">
                        <Badge variant={planBadge[t.plan] ?? "secondary"} className="capitalize">{t.plan}</Badge>
                      </td>
                      <td className="px-4 py-3">{t.managerCount}</td>
                      <td className="px-4 py-3">
                        {t.active
                          ? <Badge variant="default">Ativo</Badge>
                          : <Badge variant="secondary">Inativo</Badge>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(t.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(t)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {editing && <EditTenantDialog tenant={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
