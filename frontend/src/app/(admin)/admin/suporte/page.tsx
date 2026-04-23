"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, type AdminTicket } from "@/lib/api/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LifeBuoy, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

const priorityConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  low:    { label: "Baixa",  variant: "secondary"   },
  medium: { label: "Média",  variant: "outline"     },
  high:   { label: "Alta",   variant: "destructive" },
};

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  open:        { label: "Aberto",       icon: Clock,        color: "text-blue-600"  },
  in_progress: { label: "Em andamento", icon: AlertCircle,  color: "text-amber-600" },
  resolved:    { label: "Resolvido",    icon: CheckCircle,  color: "text-green-600" },
};

function TicketRow({ ticket }: { ticket: AdminTicket }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const priority = priorityConfig[ticket.priority] ?? priorityConfig.medium;
  const status   = statusConfig[ticket.status]     ?? statusConfig.open;
  const StatusIcon = status.icon;

  const update = useMutation({
    mutationFn: (s: string) => adminApi.updateTicketStatus(ticket.id, s),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-tickets"] }); toast.success("Status atualizado."); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <td className="px-4 py-3 font-medium text-xs">{ticket.tenantName}</td>
        <td className="px-4 py-3 text-sm">{ticket.subject}</td>
        <td className="px-4 py-3">
          <Badge variant={priority.variant} className="text-xs">{priority.label}</Badge>
        </td>
        <td className="px-4 py-3">
          <span className={`flex items-center gap-1 text-xs font-medium ${status.color}`}>
            <StatusIcon className="h-3.5 w-3.5" />{status.label}
          </span>
        </td>
        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(ticket.createdAt)}</td>
        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          <Select value={ticket.status} onValueChange={(v) => update.mutate(v)} disabled={update.isPending}>
            <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="in_progress">Em andamento</SelectItem>
              <SelectItem value="resolved">Resolvido</SelectItem>
            </SelectContent>
          </Select>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b bg-muted/20">
          <td colSpan={6} className="px-4 py-3 text-sm text-muted-foreground whitespace-pre-wrap">
            {ticket.description}
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminSupportPage() {
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: adminApi.tickets,
    staleTime: 0,
  });

  const open     = tickets?.filter(t => t.status !== "resolved") ?? [];
  const resolved = tickets?.filter(t => t.status === "resolved") ?? [];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center gap-2">
        <LifeBuoy className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Suporte</h1>
        {open.length > 0 && <Badge variant="destructive">{open.length} abertos</Badge>}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Chamados abertos / em andamento</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : open.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">Nenhum chamado aberto.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium">Assunto</th>
                    <th className="text-left px-4 py-3 font-medium">Prioridade</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Data</th>
                    <th className="text-left px-4 py-3 font-medium">Ação</th>
                  </tr>
                </thead>
                <tbody>{open.map(t => <TicketRow key={t.id} ticket={t} />)}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {resolved.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Resolvidos ({resolved.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left px-4 py-3 font-medium">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium">Assunto</th>
                    <th className="text-left px-4 py-3 font-medium">Prioridade</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Data</th>
                    <th />
                  </tr>
                </thead>
                <tbody>{resolved.map(t => <TicketRow key={t.id} ticket={t} />)}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
