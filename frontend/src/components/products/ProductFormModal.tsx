"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { productsApi } from "@/lib/api/products";
import { productCategoriesApi } from "@/lib/api/productCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  code: z.string().min(1, "Código é obrigatório"),
  stockTotal: z.coerce.number().min(0, "Quantidade inválida"),
  category: z.string().min(1, "Categoria é obrigatória"),
  salePrice: z.coerce.number().min(0, "Preço inválido"),
  costPrice: z.coerce.number().min(0).optional().or(z.literal("")),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
}

export function ProductFormModal({ open, onClose, product }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!product;

  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: ["product-categories"],
    queryFn: productCategoriesApi.list,
    enabled: open,
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { salePrice: 0, stockTotal: 0 },
  });

  useEffect(() => {
    if (!open) return;
    if (product) {
      reset({
        name: product.name,
        code: product.code ?? "",
        stockTotal: product.stockTotal,
        category: product.category,
        salePrice: product.salePrice,
        costPrice: product.costPrice ?? "",
        description: product.description ?? "",
      });
    } else {
      reset({ salePrice: 0, stockTotal: 0 });
    }
  }, [product, open, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const body = {
        name: data.name,
        category: data.category,
        salePrice: data.salePrice,
        code: data.code || undefined,
        description: data.description || undefined,
        costPrice: data.costPrice !== "" ? data.costPrice : undefined,
        stockTotal: data.stockTotal,
      };
      return isEdit ? productsApi.update(product!.id, body) : productsApi.create(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(isEdit ? "Produto atualizado!" : "Produto criado!");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const categoryValue = watch("category");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Nome *</Label>
              <Input placeholder="Ex: Anel Solitário Ouro" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Código *</Label>
              <Input placeholder="Ex: ANL-001" {...register("code")} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Quantidade *</Label>
              <Input type="number" min={0} {...register("stockTotal")} />
              {errors.stockTotal && <p className="text-xs text-destructive">{errors.stockTotal.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Categoria *</Label>
              {loadingCats ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={categoryValue} onValueChange={(v) => setValue("category", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Preço de venda (R$)</Label>
              <Input type="number" step="0.01" min={0} {...register("salePrice")} />
              {errors.salePrice && <p className="text-xs text-destructive">{errors.salePrice.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Preço de custo (R$)</Label>
              <Input type="number" step="0.01" min={0} placeholder="Opcional" {...register("costPrice")} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Descrição</Label>
              <Input placeholder="Opcional" {...register("description")} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Salvar" : "Criar produto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
