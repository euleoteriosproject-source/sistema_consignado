"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { productsApi } from "@/lib/api/products";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, PackagePlus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { PageResponse, ProductSummary } from "@/types";

const categories = [
  { value: "", label: "Todas" },
  { value: "anel", label: "Anel" },
  { value: "colar", label: "Colar" },
  { value: "brinco", label: "Brinco" },
  { value: "pulseira", label: "Pulseira" },
  { value: "tornozeleira", label: "Tornozeleira" },
  { value: "conjunto", label: "Conjunto" },
  { value: "outro", label: "Outro" },
];

export default function ProdutosPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(0);

  const params: Record<string, string> = { page: String(page), size: "20" };
  if (search) params.search = search;
  if (category) params.category = category;

  const { data, isLoading } = useQuery<PageResponse<ProductSummary>>({
    queryKey: ["products", params],
    queryFn: () => productsApi.list(params),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <Button>
          <PackagePlus className="h-4 w-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-48">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="Buscar produto..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="max-w-sm"
              />
            </div>
            <Select value={category} onValueChange={(v) => { setCategory(v); setPage(0); }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Preço Venda</TableHead>
                  <TableHead>Estoque Total</TableHead>
                  <TableHead>Disponível</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.content.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground">{p.code ?? "—"}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="capitalize">{p.category}</TableCell>
                    <TableCell>{formatCurrency(p.salePrice)}</TableCell>
                    <TableCell>{p.stockTotal}</TableCell>
                    <TableCell>{p.stockAvailable}</TableCell>
                    <TableCell>
                      <Badge variant={p.active ? "success" : "secondary"}>
                        {p.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.content.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhum produto encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">{data.totalElements} produtos</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={page >= data.totalPages - 1} onClick={() => setPage(page + 1)}>Próxima</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
