"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { resellersApi } from "@/lib/api/resellers";
import { settingsApi } from "@/lib/api/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Reseller } from "@/types";

const maskCpf = (v: string) =>
  v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
};

const maskCep = (v: string) =>
  v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d{1,3})/, "$1-$2");

const schema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  managerId: z.string().min(1, "Gestor(a) é obrigatório"),
  cpf: z.string().min(1, "CPF é obrigatório"),
  birthDate: z.string().optional(),
  phone2: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  addressStreet: z.string().min(1, "Rua é obrigatória"),
  addressNumber: z.string().min(1, "Número é obrigatório"),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().min(1, "Bairro é obrigatório"),
  addressCity: z.string().min(1, "Cidade é obrigatória"),
  addressState: z.string().min(2, "Estado é obrigatório").max(2),
  addressZip: z.string().min(1, "CEP é obrigatório"),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  tiktok: z.string().optional(),
  reference1Name: z.string().min(1, "Nome da referência 1 é obrigatório"),
  reference1Phone: z.string().min(1, "Telefone da referência 1 é obrigatório"),
  reference2Name: z.string().optional(),
  reference2Phone: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const TABS = ["basic", "address", "social", "refs"] as const;
type Tab = typeof TABS[number];

const TAB_FIELDS: Record<Tab, (keyof FormData)[]> = {
  basic: ["name", "phone", "managerId", "cpf"],
  address: ["addressStreet", "addressNumber", "addressNeighborhood", "addressCity", "addressState", "addressZip"],
  social: [],
  refs: ["reference1Name", "reference1Phone"],
};

interface Props {
  open: boolean;
  onClose: () => void;
  reseller?: Reseller | null;
}

export function ResellerFormModal({ open, onClose, reseller }: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!reseller;
  const [tab, setTab] = useState<Tab>("basic");

  const { data: managers } = useQuery({
    queryKey: ["managers"],
    queryFn: settingsApi.managers,
    enabled: open,
  });

  const { register, handleSubmit, setValue, watch, reset, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) setTab("basic");
    if (reseller) {
      reset({
        name: reseller.name,
        phone: reseller.phone,
        managerId: reseller.managerId,
        cpf: reseller.cpf ?? "",
        birthDate: reseller.birthDate ?? "",
        phone2: reseller.phone2 ?? "",
        email: reseller.email ?? "",
        addressStreet: reseller.addressStreet ?? "",
        addressNumber: reseller.addressNumber ?? "",
        addressComplement: reseller.addressComplement ?? "",
        addressNeighborhood: reseller.addressNeighborhood ?? "",
        addressCity: reseller.addressCity ?? "",
        addressState: reseller.addressState ?? "",
        addressZip: reseller.addressZip ?? "",
        instagram: reseller.instagram ?? "",
        facebook: reseller.facebook ?? "",
        tiktok: reseller.tiktok ?? "",
        reference1Name: reseller.reference1Name ?? "",
        reference1Phone: reseller.reference1Phone ?? "",
        reference2Name: reseller.reference2Name ?? "",
        reference2Phone: reseller.reference2Phone ?? "",
        notes: reseller.notes ?? "",
      });
    } else {
      reset({});
    }
  }, [reseller, open, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const body = { ...data, birthDate: data.birthDate || undefined, email: data.email || undefined };
      return isEdit ? resellersApi.update(reseller!.id, body) : resellersApi.create(body);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["resellers"] });
      queryClient.invalidateQueries({ queryKey: ["reseller", saved.id] });
      queryClient.invalidateQueries({ queryKey: ["reseller-completeness", saved.id] });
      toast.success(isEdit ? "Revendedor(a) atualizado(a)!" : "Revendedor(a) cadastrado(a)!");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const managerValue = watch("managerId");
  const [instagram, facebook, tiktok] = [watch("instagram"), watch("facebook"), watch("tiktok")];

  const tabIndex = TABS.indexOf(tab);
  const isLastTab = tabIndex === TABS.length - 1;

  const handleAdvance = async () => {
    const fields = TAB_FIELDS[tab];
    if (fields.length > 0) {
      const ok = await trigger(fields);
      if (!ok) return;
    }
    if (tab === "social") {
      if (!instagram?.trim() && !facebook?.trim() && !tiktok?.trim()) {
        toast.error("Preencha pelo menos uma rede social.");
        return;
      }
    }
    setTab(TABS[tabIndex + 1]);
  };

  const handleBack = () => setTab(TABS[tabIndex - 1]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar revendedor(a)" : "Cadastrar revendedor(a)"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="mt-2">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList className="grid grid-cols-4 w-full mb-4">
              <TabsTrigger value="basic">1. Principal</TabsTrigger>
              <TabsTrigger value="address">2. Endereço</TabsTrigger>
              <TabsTrigger value="social">3. Redes</TabsTrigger>
              <TabsTrigger value="refs">4. Referências</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <Label>Nome completo *</Label>
                  <Input placeholder="Ana Paula Silva" {...register("name")} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Telefone principal *</Label>
                  <Input placeholder="(11) 99999-9999" {...register("phone")} onChange={(e) => { e.target.value = maskPhone(e.target.value); register("phone").onChange(e); }} />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Telefone 2</Label>
                  <Input placeholder="(11) 99999-9999" {...register("phone2")} onChange={(e) => { e.target.value = maskPhone(e.target.value); register("phone2").onChange(e); }} />
                </div>
                <div className="space-y-1">
                  <Label>Gestor(a) responsável *</Label>
                  <Select value={managerValue} onValueChange={(v) => setValue("managerId", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um(a) gestor(a)" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.managerId && <p className="text-xs text-destructive">{errors.managerId.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>E-mail</Label>
                  <Input type="email" placeholder="Opcional" {...register("email")} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>CPF *</Label>
                  <Input placeholder="000.000.000-00" {...register("cpf")} onChange={(e) => { e.target.value = maskCpf(e.target.value); register("cpf").onChange(e); }} />
                  {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Data de nascimento</Label>
                  <Input type="date" {...register("birthDate")} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Observações</Label>
                  <Input placeholder="Informações extras..." {...register("notes")} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="address" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <Label>Rua *</Label>
                  <Input placeholder="Rua das Flores" {...register("addressStreet")} />
                  {errors.addressStreet && <p className="text-xs text-destructive">{errors.addressStreet.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Número *</Label>
                  <Input placeholder="123" {...register("addressNumber")} />
                  {errors.addressNumber && <p className="text-xs text-destructive">{errors.addressNumber.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Complemento</Label>
                  <Input placeholder="Apto 2B" {...register("addressComplement")} />
                </div>
                <div className="space-y-1">
                  <Label>Bairro *</Label>
                  <Input {...register("addressNeighborhood")} />
                  {errors.addressNeighborhood && <p className="text-xs text-destructive">{errors.addressNeighborhood.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Cidade *</Label>
                  <Input {...register("addressCity")} />
                  {errors.addressCity && <p className="text-xs text-destructive">{errors.addressCity.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Estado (UF) *</Label>
                  <Input maxLength={2} placeholder="SP" {...register("addressState")} />
                  {errors.addressState && <p className="text-xs text-destructive">{errors.addressState.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>CEP *</Label>
                  <Input placeholder="00000-000" {...register("addressZip")} onChange={(e) => { e.target.value = maskCep(e.target.value); register("addressZip").onChange(e); }} />
                  {errors.addressZip && <p className="text-xs text-destructive">{errors.addressZip.message}</p>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="social" className="space-y-4">
              <p className="text-sm text-muted-foreground">Preencha pelo menos uma rede social. *</p>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Instagram</Label>
                  <Input placeholder="@usuario" {...register("instagram")} />
                </div>
                <div className="space-y-1">
                  <Label>Facebook</Label>
                  <Input placeholder="Nome ou link" {...register("facebook")} />
                </div>
                <div className="space-y-1">
                  <Label>TikTok</Label>
                  <Input placeholder="@usuario" {...register("tiktok")} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="refs" className="space-y-4">
              <p className="text-sm text-muted-foreground">Referência 1 é obrigatória.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Referência 1 — Nome *</Label>
                  <Input {...register("reference1Name")} />
                  {errors.reference1Name && <p className="text-xs text-destructive">{errors.reference1Name.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Referência 1 — Telefone *</Label>
                  <Input placeholder="(11) 99999-9999" {...register("reference1Phone")} onChange={(e) => { e.target.value = maskPhone(e.target.value); register("reference1Phone").onChange(e); }} />
                  {errors.reference1Phone && <p className="text-xs text-destructive">{errors.reference1Phone.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Referência 2 — Nome</Label>
                  <Input {...register("reference2Name")} />
                </div>
                <div className="space-y-1">
                  <Label>Referência 2 — Telefone</Label>
                  <Input placeholder="(11) 99999-9999" {...register("reference2Phone")} onChange={(e) => { e.target.value = maskPhone(e.target.value); register("reference2Phone").onChange(e); }} />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between gap-2 pt-4 border-t mt-4">
            <div>
              {tabIndex > 0 && (
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              {isLastTab ? (
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEdit ? "Salvar alterações" : "Cadastrar revendedor(a)"}
                </Button>
              ) : (
                <Button type="button" onClick={handleAdvance}>
                  Avançar <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
