"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, type AdminTicket } from "@/lib/api/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { LifeBuoy, CheckCircle, Clock, AlertCircle, MessageSquare, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

const priorityConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; border: string }> = {
  low:    { label: "Baixa",  variant: "secondary",   border: "border-l-green-400" },
  medium: { label: "Média",  variant: "outline",     border: "border-l-amber-400" },
  high:   { label: "Alta",   variant: "destructive", border: "border-l-red-500"   },
};

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  open:        { label: "Aberto",       icon: Clock,        color: "text-blue-600"  },
  in_progress: { label: "Em andamento", icon: AlertCircle,  color: "text-amber-600" },
  resolved:    { label: "Resolvido",    icon: CheckCircle,  color: "text-green-600" },
};

function RespondDialog({ ticket, onClose }: { ticket: AdminTicket; onClose: () => void }) {
  const qc = useQueryClient();
  const [response, setResponse] = useState(ticket.adminResponse ?? "");
  const [status, setStatus] = useState(ticket.status);

  const mutation = useMutation({
    mutationFn: () => adminApi.respondToTicket(ticket.id, response, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
      toast.success("Resposta enviada!");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Responder chamado
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{ticket.tenantName} — {formatDate(ticket.createdAt)}</p>
            <p className="font-medium text-sm">{ticket.subject}</p>
            <p className="text-sm text-muted-foreground line-clamp-3">{ticket.description}</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Resposta ao cliente</label>
            <Textarea
              placeholder="Escreva a resposta que o cliente verá no sistema..."
              rows={5}
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              className="resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button
              className="flex-1"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Salvar resposta
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TicketRow({ ticket }: { ticket: AdminTicket }) {
  const [expanded, setExpanded] = useState(false);
  const [respondOpen, setRespondOpen] = useState(false);
  const priority = priorityConfig[ticket.priority] ?? priorityConfig.medium;
  const status   = statusConfig[ticket.status]     ?? statusConfig.open;
  const StatusIcon = status.icon;

  return (
    <>
      <tr
        className={`border-b last:border-0 hover:bg-muted/30 cursor-pointer border-l-4 ${priority.border}`}
        onClick={() => setExpanded(v => !v)}
      >
        <td className="px-4 py-3">
          <p className="text-xs font-medium">{ticket.tenantName}</p>
          <p className="text-xs text-muted-foreground">{formatDate(ticket.createdAt)}</p>
        </td>
        <td className="px-4 py-3">
          <p className="text-sm font-medium">{ticket.subject}</p>
          {ticket.adminResponse && (
            <p className="text-xs text-primary flex items-center gap-1 mt-0.5">
              <MessageSquare className="h-3 w-3" /> Respondido
            </p>
          )}
        </td>
        <td className="px-4 py-3">
          <Badge variant={priority.variant} className="text-xs">{priority.label}</Badge>
        </td>
        <td className="px-4 py-3">
          <span className={`flex items-center gap-1 text-xs font-medium ${status.color}`}>
            <StatusIcon className="h-3.5 w-3.5" />{status.label}
          </span>
        </td>
        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          <Button
            size="sm" variant="outline" className="h-7 text-xs gap-1"
            onClick={() => setRespondOpen(true)}
          >
            <MessageSquare className="h-3 w-3" />
            {ticket.adminResponse ? "Editar resposta" : "Responder"}
          </Button>
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b bg-muted/10">
          <td colSpan={6} className="px-4 py-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Mensagem do cliente</p>
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </div>
            {ticket.adminResponse && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-xs font-medium text-primary uppercase mb-1">Sua resposta</p>
                <p className="text-sm whitespace-pre-wrap">{ticket.adminResponse}</p>
                {ticket.respondedAt && (
                  <p className="text-xs text-muted-foreground mt-1">{formatDate(ticket.respondedAt)}</p>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
      {respondOpen && <RespondDialog ticket={ticket} onClose={() => setRespondOpen(false)} />}
    </>
  );
}

export default function AdminSupportPage() {
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: adminApi.tickets,
    staleTime: 0,
    refetchOnMount: true,
  });

  const open     = tickets?.filter(t => t.status !== "resolved") ?? [];
  const resolved = tickets?.filter(t => t.status === "resolved") ?? [];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <LifeBuoy className="h-5 w-5" />
        <h1 className="text-2xl font-bold">Suporte</h1>
        {open.length > 0 && (
          <Badge variant="destructive">{open.length} aberto{open.length > 1 ? "s" : ""}</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Chamados abertos / em andamento</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : open.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">Nenhum chamado aberto. 🎉</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left px-4 py-3 font-medium">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium">Assunto</th>
                    <th className="text-left px-4 py-3 font-medium">Prioridade</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Ação</th>
                    <th className="w-8" />
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
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Resolvidos ({resolved.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left px-4 py-3 font-medium">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium">Assunto</th>
                    <th className="text-left px-4 py-3 font-medium">Prioridade</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Ação</th>
                    <th className="w-8" />
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
