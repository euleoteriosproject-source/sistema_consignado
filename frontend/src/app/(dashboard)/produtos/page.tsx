"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsApi } from "@/lib/api/products";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, PackagePlus, MoreHorizontal, Pencil, ToggleLeft, TrendingUp } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ProductFormModal } from "@/components/products/ProductFormModal";
import { StockEntryModal } from "@/components/products/StockEntryModal";
import { toast } from "sonner";
import type { PageResponse, ProductSummary, Product, ProductTracking } from "@/types";

const categories = [
  { value: "all", label: "Todas" },
  { value: "anel", label: "Anel" },
  { value: "colar", label: "Colar" },
  { value: "brinco", label: "Brinco" },
  { value: "pulseira", label: "Pulseira" },
  { value: "tornozeleira", label: "Tornozeleira" },
  { value: "conjunto", label: "Conjunto" },
  { value: "outro", label: "Outro" },
];

const catLabel: Record<string, string> = {
  anel: "Anel", colar: "Colar", brinco: "Brinco", pulseira: "Pulseira",
  tornozeleira: "Tornozeleira", conjunto: "Conjunto", outro: "Outro",
};

function TrackingDialog({ productId, productName, onClose }: { productId: string; productName: string; onClose: () => void }) {
  const { data, isLoading } = useQuery<ProductTracking>({
    queryKey: ["product-tracking", productId],
    queryFn: () => productsApi.tracking(productId),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Rastreamento — {productName}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="bg-muted/50 rounded-lg p-2.5">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold">{data?.stockTotal ?? 0}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2.5">
                <p className="text-xs text-muted-foreground">Disponível</p>
                <p className="text-xl font-bold text-green-600">{data?.stockAvailable ?? 0}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-2.5">
                <p className="text-xs text-muted-foreground">Consignado</p>
                <p className="text-xl font-bold text-orange-600">{data?.stockOnConsignment ?? 0}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-2.5">
                <p className="text-xs text-muted-foreground">Vendido</p>
                <p className="text-xl font-bold text-green-700">{data?.totalSold ?? 0}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-2.5">
                <p className="text-xs text-muted-foreground">Perdido</p>
                <p className="text-xl font-bold text-red-600">{data?.totalLost ?? 0}</p>
              </div>
            </div>

            {data && data.locations.length > 0 ? (
              <div>
                <p className="text-sm font-medium mb-2">Com quem está:</p>
                <div className="space-y-2">
                  {data.locations.map((loc) => (
                    <div key={loc.consignmentId} className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <p className="text-sm font-medium">{loc.resellerName}</p>
                        <p className="text-xs text-muted-foreground">Gestor(a): {loc.managerName} · Retirada em: {formatDate(loc.deliveredAt)}</p>
                      </div>
                      <Badge variant="outline" className="text-orange-600 border-orange-300">{loc.quantityOnConsignment} pç</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma peça em consignação no momento</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ProdutosPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [trackingProduct, setTrackingProduct] = useState<{ id: string; name: string } | null>(null);
  const [stockEntryProduct, setStockEntryProduct] = useState<ProductSummary | null>(null);

  const params: Record<string, string> = { page: String(page), size: "20" };
  if (search) params.search = search;
  if (category !== "all") params.category = category;

  const { data, isLoading } = useQuery<PageResponse<ProductSummary>>({
    queryKey: ["products", params],
    queryFn: () => productsApi.list(params),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      productsApi.updateStatus(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Status atualizado!");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleEdit = async (id: string) => {
    try {
      const p = await productsApi.get(id);
      setEditProduct(p);
      setModalOpen(true);
    } catch { toast.error("Erro ao carregar produto."); }
  };

  const handleCloseModal = () => { setModalOpen(false); setEditProduct(null); };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-muted-foreground text-sm">Gerencie seu catálogo de semijoias</p>
        </div>
        <Button onClick={() => { setEditProduct(null); setModalOpen(true); }} className="sm:w-auto w-full">
          <PackagePlus className="h-4 w-4 mr-2" />
          Novo produto
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
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Disponível</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
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
                : data?.content.map((p) => (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setTrackingProduct({ id: p.id, name: p.name })}
                    >
                      <TableCell className="font-mono text-xs">{p.code ?? "—"}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{catLabel[p.category] ?? p.category}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.salePrice)}</TableCell>
                      <TableCell className="text-right">{p.stockTotal}</TableCell>
                      <TableCell className="text-right">{p.stockAvailable}</TableCell>
                      <TableCell>
                        <Badge variant={p.active ? "default" : "secondary"}>
                          {p.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setStockEntryProduct(p)}>
                              <TrendingUp className="h-3.5 w-3.5 mr-2" /> Entrada de estoque
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(p.id)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleStatus.mutate({ id: p.id, active: !p.active })}>
                              <ToggleLeft className="h-3.5 w-3.5 mr-2" />
                              {p.active ? "Desativar" : "Ativar"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
          </div>
          {data && data.totalPages > 1 && (
            <div className="flex justify-center gap-2 p-4">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground flex items-center">
                {page + 1} / {data.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= data.totalPages - 1} onClick={() => setPage(page + 1)}>
                Próxima
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ProductFormModal open={modalOpen} onClose={handleCloseModal} product={editProduct} />

      {stockEntryProduct && (
        <StockEntryModal
          open
          product={stockEntryProduct}
          onClose={() => setStockEntryProduct(null)}
        />
      )}

      {trackingProduct && (
        <TrackingDialog
          productId={trackingProduct.id}
          productName={trackingProduct.name}
          onClose={() => setTrackingProduct(null)}
        />
      )}
    </div>
  );
}
