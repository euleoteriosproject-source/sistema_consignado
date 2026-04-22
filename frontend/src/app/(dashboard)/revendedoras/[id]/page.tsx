"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { resellersApi } from "@/lib/api/resellers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Pencil, FileText, CheckCircle, AlertCircle, ToggleLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ResellerFormModal } from "@/components/resellers/ResellerFormModal";
import { DocumentUploadModal } from "@/components/resellers/DocumentUploadModal";
import { toast } from "sonner";
import type { Reseller, ResellerCompleteness } from "@/types";

const statusLabel: Record<string, string> = {
  active: "Ativa", inactive: "Inativa", blocked: "Bloqueada",
};
const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default", inactive: "secondary", blocked: "destructive",
};
const consignmentStatus: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: "Aberto", variant: "default" },
  partially_settled: { label: "Parcial", variant: "outline" },
  settled: { label: "Encerrado", variant: "secondary" },
  overdue: { label: "Atrasado", variant: "destructive" },
};

export default function ResellerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);

  const { data: reseller, isLoading } = useQuery<Reseller>({
    queryKey: ["reseller", id],
    queryFn: () => resellersApi.get(id),
  });

  const { data: balance } = useQuery({
    queryKey: ["reseller-balance", id],
    queryFn: () => resellersApi.balance(id),
  });

  const { data: completeness } = useQuery<ResellerCompleteness>({
    queryKey: ["reseller-completeness", id],
    queryFn: () => resellersApi.completeness(id),
    enabled: !!reseller && reseller.status !== "active",
  });

  const activateMutation = useMutation({
    mutationFn: () => resellersApi.updateStatus(id, "active"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reseller", id] });
      queryClient.invalidateQueries({ queryKey: ["resellers"] });
      toast.success("Revendedor(a) ativado(a)!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: consignments } = useQuery({
    queryKey: ["reseller-consignments", id],
    queryFn: () => resellersApi.consignments(id),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  if (!reseller) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{reseller.name}</h1>
            <Badge variant={statusVariant[reseller.status] ?? "secondary"}>
              {statusLabel[reseller.status] ?? reseller.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Gestor(a): {reseller.managerName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setDocsOpen(true)}>
            <FileText className="h-4 w-4 mr-1" /> Documentos
          </Button>
          <Button size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Editar
          </Button>
        </div>
      </div>

      {reseller.status !== "active" && (
        <div className={`rounded-lg border p-4 ${completeness?.complete ? "border-green-200 bg-green-50 dark:bg-green-950/20" : "border-amber-200 bg-amber-50 dark:bg-amber-950/20"}`}>
          <div className="flex items-start gap-3">
            {completeness?.complete ? (
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            )}
            <div className="flex-1">
              {completeness?.complete ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-400">Cadastro completo</p>
                    <p className="text-sm text-green-700 dark:text-green-500">Todos os dados estão preenchidos. Você pode ativar este cadastro.</p>
                  </div>
                  <Button onClick={() => activateMutation.mutate()} disabled={activateMutation.isPending} className="ml-4">
                    <ToggleLeft className="h-4 w-4 mr-1" /> Ativar cadastro
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-400">Cadastro incompleto — não pode ser ativado</p>
                  <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                    Pendências: {completeness?.missing.join(" • ")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {balance && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground font-normal">Lotes Abertos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{balance.openConsignmentsCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground font-normal">Total Enviado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(balance.totalSentValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground font-normal">Total Vendido</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(balance.totalSoldValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground font-normal">Líquido a Receber</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(balance.netToReceive)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {reseller.phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telefone</span>
                <span>{reseller.phone}</span>
              </div>
            )}
            {reseller.phone2 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Telefone 2</span>
                <span>{reseller.phone2}</span>
              </div>
            )}
            {reseller.email && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">E-mail</span>
                  <span>{reseller.email}</span>
                </div>
              </>
            )}
            {reseller.cpf && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CPF</span>
                  <span>{reseller.cpf}</span>
                </div>
              </>
            )}
            {reseller.birthDate && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nascimento</span>
                  <span>{formatDate(reseller.birthDate)}</span>
                </div>
              </>
            )}
            {(reseller.addressStreet || reseller.addressCity) && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Endereço</span>
                  <span className="text-right max-w-[200px]">
                    {[reseller.addressStreet, reseller.addressNumber, reseller.addressCity, reseller.addressState]
                      .filter(Boolean).join(", ")}
                  </span>
                </div>
              </>
            )}
            {(reseller.instagram || reseller.facebook || reseller.tiktok) && (
              <>
                <Separator />
                <div className="space-y-1">
                  <span className="text-muted-foreground">Redes sociais</span>
                  <div className="flex gap-3 flex-wrap mt-1">
                    {reseller.instagram && <Badge variant="outline">@{reseller.instagram.replace("@", "")}</Badge>}
                    {reseller.facebook && <Badge variant="outline">{reseller.facebook}</Badge>}
                    {reseller.tiktok && <Badge variant="outline">@{reseller.tiktok.replace("@", "")}</Badge>}
                  </div>
                </div>
              </>
            )}
            {reseller.notes && (
              <>
                <Separator />
                <div>
                  <span className="text-muted-foreground">Observações</span>
                  <p className="mt-1">{reseller.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Referências</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {reseller.reference1Name ? (
              <div className="space-y-1">
                <p className="font-medium">{reseller.reference1Name}</p>
                {reseller.reference1Phone && <p className="text-muted-foreground">{reseller.reference1Phone}</p>}
              </div>
            ) : (
              <p className="text-muted-foreground">Nenhuma referência cadastrada.</p>
            )}
            {reseller.reference2Name && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="font-medium">{reseller.reference2Name}</p>
                  {reseller.reference2Phone && <p className="text-muted-foreground">{reseller.reference2Phone}</p>}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de lotes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entrega</TableHead>
                <TableHead>Retorno Prev.</TableHead>
                <TableHead className="text-right">Itens</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consignments?.map((c) => {
                const cfg = consignmentStatus[c.status] ?? { label: c.status, variant: "secondary" };
                return (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/consignados/${c.id}`)}
                  >
                    <TableCell>{formatDate(c.deliveredAt)}</TableCell>
                    <TableCell>{c.expectedReturnAt ? formatDate(c.expectedReturnAt) : "—"}</TableCell>
                    <TableCell className="text-right">{c.totalItems}</TableCell>
                    <TableCell className="text-right">{formatCurrency(c.totalValue)}</TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {consignments?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum lote encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ResellerFormModal
        open={editOpen}
        onClose={() => {
          queryClient.invalidateQueries({ queryKey: ["reseller", id] });
          setEditOpen(false);
        }}
        reseller={reseller}
      />
      <DocumentUploadModal
        open={docsOpen}
        onClose={() => setDocsOpen(false)}
        resellerId={reseller.id}
        resellerName={reseller.name}
      />
    </div>
  );
}
