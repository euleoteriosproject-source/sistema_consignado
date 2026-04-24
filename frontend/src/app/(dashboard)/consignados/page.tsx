"use client";
import { useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { consignmentsApi } from "@/lib/api/consignments";
import { settingsApi } from "@/lib/api/settings";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, UserCog, ChevronLeft, Package } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ConsignmentFormModal } from "@/components/consignments/ConsignmentFormModal";
import { ExtratoModal } from "@/components/consignments/ExtratoModal";
import { useAuthStore } from "@/stores/authStore";
import type { PageResponse, ConsignmentSummary } from "@/types";

const statusConfig: Record<string, { label: string; variant: "default" | "outline" | "secondary" | "destructive" }> = {
  open: { label: "Aberto", variant: "default" },
  partially_settled: { label: "Parcial", variant: "outline" },
  settled: { label: "Encerrado", variant: "secondary" },
  overdue: { label: "Atrasado", variant: "destructive" },
};

function ConsignadosPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const role = useAuthStore((s) => s.role);
  const userName = useAuthStore((s) => s.userName);
  const isOwner = role === "owner";

  // Filtro de gestora persiste na URL (?gestora=ID) para o botão Voltar funcionar
  const selectedManagerId = searchParams.get("gestora");

  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [extratoId, setExtratoId] = useState<string | null>(null);
  const [managerTab, setManagerTab] = useState<"reseller" | "manager_stock">("reseller");

  const { data: managers } = useQuery({
    queryKey: ["managers"],
    queryFn: settingsApi.managers,
    enabled: isOwner,
  });

  const params: Record<string, string | undefined> = { page: String(page), size: "20" };
  if (status !== "all") params.status = status;
  if (isOwner && selectedManagerId) {
    params.managerId = selectedManagerId;
    params.consignmentType = "reseller";
  }
  if (isOwner && !selectedManagerId) params.ownOnly = "true";
  if (!isOwner) params.consignmentType = managerTab;

  const { data, isLoading } = useQuery<PageResponse<ConsignmentSummary>>({
    queryKey: ["consignments", params],
    queryFn: () => consignmentsApi.list(params),
  });

  const selectedManager = managers?.find((m) => m.id === selectedManagerId);

  function selectGestora(id: string) {
    setPage(0);
    router.push(`${pathname}?gestora=${id}`);
  }

  function clearGestora() {
    setPage(0);
    router.push(pathname);
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Consignados</h1>
          <p className="text-muted-foreground text-sm">Gerencie os lotes enviados para revendedoras</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="sm:w-auto w-full">
          <Plus className="h-4 w-4 mr-2" />
          Novo lote
        </Button>
      </div>

      {/* Tabs para gestora */}
      {!isOwner && (
        <Tabs value={managerTab} onValueChange={(v) => { setManagerTab(v as "reseller" | "manager_stock"); setPage(0); }}>
          <TabsList>
            <TabsTrigger value="reseller" className="gap-1.5">
              <UserCog className="h-3.5 w-3.5" /> Minhas revendedoras
            </TabsTrigger>
            <TabsTrigger value="manager_stock" className="gap-1.5">
              <Package className="h-3.5 w-3.5" /> Lotes recebidos do dono
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Gestoras cards (owner only, no filter active) */}
      {isOwner && !selectedManagerId && managers && managers.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {managers.filter(m => m.active).map((m) => (
            <button
              key={m.id}
              onClick={() => selectGestora(m.id)}
              className="text-left border rounded-lg p-4 hover:bg-muted/50 transition-colors flex items-center gap-3"
            >
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <UserCog className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{m.name}</p>
                <p className="text-xs text-muted-foreground">Ver lotes desta gestora</p>
              </div>
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-3 flex-wrap">
          {selectedManagerId && (
            <Button variant="ghost" size="sm" onClick={clearGestora}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {selectedManager?.name ?? "Gestora"}
            </Button>
          )}
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="partially_settled">Parcialmente acertado</SelectItem>
              <SelectItem value="overdue">Atrasado</SelectItem>
              <SelectItem value="settled">Encerrado</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Revendedora</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Retorno Prev.</TableHead>
                <TableHead className="text-right">Itens totais</TableHead>
                <TableHead className="text-right">Itens restantes</TableHead>
                <TableHead className="text-right">Val. Estimado</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : data?.content.map((c) => {
                    const cfg = statusConfig[c.status] ?? { label: c.status, variant: "secondary" };
                    return (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/consignados/${c.id}`)}
                      >
                        <TableCell className="font-medium">{c.resellerName}</TableCell>
                        <TableCell>
                          {c.consignmentType === "manager_stock"
                            ? (isOwner ? (userName ?? "Dono") : "Dono")
                            : c.managerName}
                        </TableCell>
                        <TableCell>{formatDate(c.deliveredAt)}</TableCell>
                        <TableCell>{c.expectedReturnAt ? formatDate(c.expectedReturnAt) : "—"}</TableCell>
                        <TableCell className="text-right">{c.totalItems}</TableCell>
                        <TableCell className="text-right font-medium">
                          {c.totalItems - c.totalSold - c.totalReturned - c.totalLost}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(c.totalValue ?? 0)}</TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant}>{cfg.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              {!isLoading && data?.content.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    Nenhum lote encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
          {data && data.totalPages > 1 && (
            <div className="flex justify-between items-center p-4">
              <span className="text-sm text-muted-foreground">{data.totalElements} lotes</span>
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

      <ConsignmentFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(id) => setExtratoId(id)}
      />
      {extratoId && (
        <ExtratoModal
          consignmentId={extratoId}
          onClose={() => setExtratoId(null)}
        />
      )}
    </div>
  );
}

export default function ConsignadosPage() {
  return (
    <Suspense>
      <ConsignadosPageInner />
    </Suspense>
  );
}
