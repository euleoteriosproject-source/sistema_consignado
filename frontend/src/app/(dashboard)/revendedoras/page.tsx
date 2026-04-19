"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { resellersApi } from "@/lib/api/resellers";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, UserPlus } from "lucide-react";
import type { PageResponse, ResellerSummary } from "@/types";

const statusLabel: Record<string, string> = {
  active: "Ativa",
  inactive: "Inativa",
  blocked: "Bloqueada",
};
const statusVariant: Record<string, "success" | "secondary" | "destructive"> = {
  active: "success",
  inactive: "secondary",
  blocked: "destructive",
};

export default function RevendedorasPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const params: Record<string, string> = { page: String(page), size: "20" };
  if (search) params.search = search;

  const { data, isLoading } = useQuery<PageResponse<ResellerSummary>>({
    queryKey: ["resellers", params],
    queryFn: () => resellersApi.list(params),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Revendedoras</h1>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Nova Revendedora
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Gestora</TableHead>
                  <TableHead>Lotes Abertos</TableHead>
                  <TableHead>Valor em Aberto</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.content.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.phone}</TableCell>
                    <TableCell>{r.managerName}</TableCell>
                    <TableCell>{r.openConsignments}</TableCell>
                    <TableCell>
                      {r.openValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[r.status] ?? "secondary"}>
                        {statusLabel[r.status] ?? r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.content.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma revendedora encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {data.totalElements} revendedoras
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages - 1} onClick={() => setPage(page + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
