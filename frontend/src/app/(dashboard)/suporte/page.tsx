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
import { LifeBuoy, Plus, Loader2, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, MessageSquare, Paperclip, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import type { SupportTicket } from "@/types";

const WHATSAPP_NUMBER = "5551982895068";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Preciso de suporte com o sistema de consignado.")}`;

const priorityConfig = {
  low:    { label: "Baixa",  variant: "secondary"   as const, border: "border-l-green-400"  },
  medium: { label: "Média",  variant: "outline"     as const, border: "border-l-amber-400"  },
  high:   { label: "Alta",   variant: "destructive" as const, border: "border-l-red-500"    },
};

const statusConfig = {
  open:        { label: "Aberto",       icon: Clock,        color: "text-blue-600"  },
  in_progress: { label: "Em andamento", icon: AlertCircle,  color: "text-amber-600" },
  resolved:    { label: "Resolvido",    icon: CheckCircle,  color: "text-green-600" },
};

function NewTicketDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      let attachmentUrl: string | undefined;
      let attachmentName: string | undefined;
      if (file) {
        setUploading(true);
        try {
          const res = await supportApi.uploadAttachment(file);
          attachmentUrl = res.data.url;
          attachmentName = res.data.name;
        } finally {
          setUploading(false);
        }
      }
      return supportApi.create({ subject, description, priority, attachmentUrl, attachmentName });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
      toast.success("Chamado aberto! Entraremos em contato em breve.");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LifeBuoy className="h-4 w-4" /> Abrir chamado de suporte
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label>Assunto *</Label>
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
            <Label>Descrição *</Label>
            <Textarea
              placeholder="Descreva o problema com o máximo de detalhes. Inclua o que estava fazendo quando ocorreu."
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
            />
          </div>
          <div className="space-y-1">
            <Label>Anexo <span className="text-muted-foreground text-xs">(opcional — imagem ou PDF)</span></Label>
            {file ? (
              <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-muted/30">
                <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate flex-1">{file.name}</span>
                <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-destructive">
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors">
                <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">Clique para selecionar arquivo</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
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
              {(mutation.isPending || uploading) && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {uploading ? "Enviando arquivo..." : "Enviar chamado"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const [expanded, setExpanded] = useState(false);
  const priority   = priorityConfig[ticket.priority] ?? priorityConfig.medium;
  const status     = statusConfig[ticket.status]     ?? statusConfig.open;
  const StatusIcon = status.icon;
  const hasResponse = !!ticket.adminResponse;

  return (
    <div className={`border-l-4 ${priority.border} border border-l-[4px] rounded-lg overflow-hidden`}>
      <div
        className="flex items-start justify-between gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <StatusIcon className={`h-4 w-4 shrink-0 mt-0.5 ${status.color}`} />
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{ticket.subject}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-muted-foreground">{formatDate(ticket.createdAt)}</span>
              {hasResponse && (
                <span className="flex items-center gap-1 text-xs text-primary font-medium">
                  <MessageSquare className="h-3 w-3" /> Resposta disponível
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={priority.variant} className="text-xs">{priority.label}</Badge>
          <span className={`text-xs font-medium hidden sm:inline ${status.color}`}>{status.label}</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t space-y-3">
          <div className="pt-3">
            <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Sua mensagem</p>
            <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
          </div>
          {ticket.attachmentUrl && (
            <div>
              <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Anexo</p>
              <a
                href={ticket.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Paperclip className="h-3.5 w-3.5" />
                {ticket.attachmentName ?? "Ver anexo"}
              </a>
            </div>
          )}
          {hasResponse && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium text-primary uppercase">Resposta do suporte</p>
              <p className="text-sm whitespace-pre-wrap">{ticket.adminResponse}</p>
              {ticket.respondedAt && (
                <p className="text-xs text-muted-foreground">{formatDate(ticket.respondedAt)}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SupportPage() {
  const [newOpen, setNewOpen] = useState(false);

  const { data: tickets, isLoading } = useQuery<SupportTicket[]>({
    queryKey: ["support-tickets"],
    queryFn: supportApi.list,
    staleTime: 0,
    refetchOnMount: true,
  });

  const open     = tickets?.filter((t) => t.status !== "resolved") ?? [];
  const resolved = tickets?.filter((t) => t.status === "resolved") ?? [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LifeBuoy className="h-6 w-6" /> Suporte
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Abra um chamado ou fale diretamente pelo WhatsApp
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo chamado
        </Button>
      </div>

      {/* Contato rápido */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-sm">Precisa de ajuda urgente?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Fale diretamente pelo WhatsApp para suporte imediato</p>
          </div>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="border-green-400 text-green-700 hover:bg-green-100 shrink-0 gap-2">
              <svg className="h-4 w-4 fill-green-600" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </Button>
          </a>
        </CardContent>
      </Card>

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
                {open.length > 0 && <Badge variant="secondary">{open.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {open.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nenhum chamado em aberto. Tudo certo! 🎉
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
