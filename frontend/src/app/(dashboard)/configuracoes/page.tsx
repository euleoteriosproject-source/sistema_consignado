"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { settingsApi } from "@/lib/api/settings";
import { productCategoriesApi } from "@/lib/api/productCategories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Building2, User, Tag, X, Plus, Image, Upload } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import type { TenantSettings, UserProfile } from "@/types";

const profileSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

export default function ConfiguracoesPage() {
  const qc = useQueryClient();

  const { data: settings, isLoading: loadingSettings } = useQuery<TenantSettings>({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
  });

  const { data: profile, isLoading: loadingProfile } = useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: settingsApi.profile,
  });

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: profile ? { name: profile.name, phone: profile.phone ?? "" } : undefined,
  });

  const [newCategory, setNewCategory] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#B8860B");

  useEffect(() => {
    if (settings) {
      setLogoUrl(settings.logoUrl ?? "");
      setPrimaryColor(settings.primaryColor ?? "#B8860B");
    }
  }, [settings]);

  const setBranding = useAuthStore((s) => s.setBranding);

  const updateBranding = useMutation({
    mutationFn: () => settingsApi.update({ logoUrl: logoUrl || null, primaryColor }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      setBranding(logoUrl || null, primaryColor);
      // Aplica a cor imediatamente
      if (primaryColor) {
        const hex = primaryColor;
        const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
        const max = Math.max(r,g,b), min = Math.min(r,g,b);
        let h=0,s=0; const l=(max+min)/2;
        if (max!==min){const d=max-min;s=l>0.5?d/(2-max-min):d/(max+min);switch(max){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;case b:h=((r-g)/d+4)/6;break;}}
        const hsl = `${Math.round(h*360)} ${Math.round(s*100)}% ${Math.round(l*100)}%`;
        document.documentElement.style.setProperty('--primary', hsl);
        document.documentElement.style.setProperty('--ring', hsl);
        document.documentElement.style.setProperty('--sidebar-primary', hsl);
      }
      toast.success("Identidade visual atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const uploadLogo = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData(); fd.append("file", file);
      return settingsApi.uploadLogo(fd);
    },
    onSuccess: (url: string) => {
      setLogoUrl(url);
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Logo enviado!");
    },
    onError: () => toast.error("Erro ao enviar logo"),
  });

  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: ["product-categories"],
    queryFn: productCategoriesApi.list,
  });

  const createCategory = useMutation({
    mutationFn: (name: string) => productCategoriesApi.create(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-categories"] });
      setNewCategory("");
      toast.success("Categoria criada!");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => productCategoriesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Categoria removida.");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateProfile = useMutation({
    mutationFn: (data: ProfileForm) => settingsApi.updateProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Perfil atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar perfil"),
  });

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Negócio
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-3.5 w-3.5" /> Meu Perfil
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5">
            <Tag className="h-3.5 w-3.5" /> Categorias
          </TabsTrigger>
        </TabsList>

        {/* ── Negócio ── */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Dados do negócio</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSettings ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-64" />)}
                </div>
              ) : settings ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground w-40">Nome da empresa</span>
                    <span className="font-medium">{settings.name}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground w-40">Slug</span>
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{settings.slug}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground w-40">Plano</span>
                    <Badge>{settings.plan.toUpperCase()}</Badge>
                  </div>
                  {settings.trialEndsAt && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground w-40">Trial até</span>
                        <span>{new Date(settings.trialEndsAt).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground w-40">Criado em</span>
                    <span>{new Date(settings.createdAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Identidade visual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex gap-3 items-center">
                  {logoUrl && (
                    <img src={logoUrl} alt="Logo" className="h-14 w-14 rounded object-contain border" />
                  )}
                  <div className="flex-1 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Button type="button" variant="outline" size="sm" asChild disabled={uploadLogo.isPending}>
                        <span>
                          {uploadLogo.isPending
                            ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            : <Upload className="h-4 w-4 mr-1" />}
                          Subir imagem
                        </span>
                      </Button>
                      <input
                        type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo.mutate(f); }}
                      />
                    </label>
                    <Input
                      placeholder="ou cole a URL aqui..."
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Cor principal</Label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-10 w-16 rounded border cursor-pointer p-1"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-32 font-mono uppercase"
                    maxLength={7}
                  />
                  <div className="h-8 w-8 rounded-full border" style={{ background: primaryColor }} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => updateBranding.mutate()} disabled={updateBranding.isPending}>
                  {updateBranding.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <Save className="h-4 w-4 mr-2" />
                  Salvar identidade
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Meu Perfil ── */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Meu Perfil</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProfile ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : profile ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 pb-3 border-b">
                    <div>
                      <p className="text-sm text-muted-foreground">E-mail</p>
                      <p className="font-medium">{profile.email}</p>
                    </div>
                    <Badge variant="outline" className="ml-auto">{profile.role === "owner" ? "Proprietário(a)" : "Gestor(a)"}</Badge>
                  </div>
                  <form onSubmit={handleSubmit((d) => updateProfile.mutate(d))} className="space-y-4">
                    <div className="space-y-1">
                      <Label>Nome</Label>
                      <Input {...register("name")} />
                      {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label>Telefone</Label>
                      <Input {...register("phone")} placeholder="(11) 99999-9999" />
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={updateProfile.isPending || !isDirty}>
                        {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                    </div>
                  </form>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
        {/* ── Categorias ── */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Categorias de produtos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Nova categoria..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && newCategory.trim() && createCategory.mutate(newCategory)}
                />
                <Button
                  onClick={() => newCategory.trim() && createCategory.mutate(newCategory)}
                  disabled={createCategory.isPending || !newCategory.trim()}
                >
                  {createCategory.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Plus className="h-4 w-4" />}
                </Button>
              </div>
              {loadingCats ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <div key={c.id} className="flex items-center gap-1 bg-muted px-3 py-1.5 rounded-full text-sm">
                      <span>{c.name}</span>
                      <button
                        onClick={() => deleteCategory.mutate(c.id)}
                        className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
