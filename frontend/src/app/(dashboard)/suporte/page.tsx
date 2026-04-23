"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supportApi } from "@/lib/api/support";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LifeBuoy, Plus, Loader2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import type { SupportTicket } from "@/types";

const priorityConfig = {
  low:    { label: "Baixa",  variant: "secondary"    as const, color: "text-green-600" },
  medium: { label: "Média",  variant: "outline"      as const, color: "text-amber-600" },
  high:   { label: "Alta",   variant: "destructive"  as const, color: "text-red-600"   },
};

const statusConfig = {
  open:        { label: "Aberto",      icon: Clock,        color: "text-blue-600"  },
  in_progress: { label: "Em andamento",icon: AlertCircle,  color: "text-amber-600" },
  resolved:    { label: "Resolvido",   icon: CheckCircle,  color: "text-green-600" },
};

function NewTicketDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");

  const mutation = useMutation({
    mutationFn: () => supportApi.create({ subject, description, priority }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
      toast.success("Chamado aberto! Em breve entraremos em contato.");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LifeBuoy className="h-4 w-4" />
            Abrir chamado de suporte
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label>Assunto</Label>
            <Input
              placeholder="Ex: Erro ao registrar movimentação"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Prioridade</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">🟢 Baixa — dúvida ou sugestão</SelectItem>
                <SelectItem value="medium">🟡 Média — funcionalidade com problema</SelectItem>
                <SelectItem value="high">🔴 Alta — sistema fora do ar ou erro crítico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea
              placeholder="Descreva o problema ou dúvida com o máximo de detalhes possível..."
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button
              className="flex-1"
              disabled={!subject.trim() || !description.trim() || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Enviar chamado
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const [expanded, setExpanded] = useState(false);
  const priority = priorityConfig[ticket.priority] ?? priorityConfig.medium;
  const status   = statusConfig[ticket.status]     ?? statusConfig.open;
  const StatusIcon = status.icon;

  return (
    <div
      className="border rounded-lg p-4 space-y-2 cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon className={`h-4 w-4 shrink-0 ${status.color}`} />
          <p className="font-medium text-sm truncate">{ticket.subject}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={priority.variant} className="text-xs">{priority.label}</Badge>
          <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{formatDate(ticket.createdAt)}</p>
      {expanded && (
        <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap border-t pt-2">
          {ticket.description}
        </p>
      )}
    </div>
  );
}

export default function SupportPage() {
  const [newOpen, setNewOpen] = useState(false);

  const { data: tickets, isLoading } = useQuery<SupportTicket[]>({
    queryKey: ["support-tickets"],
    queryFn: supportApi.list,
  });

  const open     = tickets?.filter((t) => t.status !== "resolved") ?? [];
  const resolved = tickets?.filter((t) => t.status === "resolved") ?? [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LifeBuoy className="h-6 w-6" />
            Suporte
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Abra um chamado e entraremos em contato o quanto antes
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Novo chamado
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                Chamados abertos
                {open.length > 0 && (
                  <Badge variant="secondary">{open.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {open.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum chamado aberto. Tudo certo por aqui!
                </p>
              ) : (
                open.map((t) => <TicketCard key={t.id} ticket={t} />)
              )}
            </CardContent>
          </Card>

          {resolved.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-muted-foreground">
                  Resolvidos ({resolved.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {resolved.map((t) => <TicketCard key={t.id} ticket={t} />)}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {newOpen && <NewTicketDialog onClose={() => setNewOpen(false)} />}
    </div>
  );
}
