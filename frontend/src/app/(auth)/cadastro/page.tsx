"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Gem, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const schema = z.object({
  storeName: z.string().min(2, "Nome da loja deve ter pelo menos 2 caracteres"),
  ownerName: z.string().min(2, "Seu nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

export default function CadastroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const supabase = createBrowserClient();

      // 1. Cria o usuário no Supabase Auth (salva nome no user_metadata para fallback)
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { data: { full_name: data.ownerName } },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          toast.error("Este e-mail já está cadastrado. Faça login.");
        } else {
          toast.error(signUpError.message);
        }
        return;
      }

      const token = authData.session?.access_token;
      if (!token) {
        toast.error("Confirme seu e-mail e faça login para concluir o cadastro.");
        router.push("/login");
        return;
      }

      // 2. Cria o tenant + owner no backend
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          storeName: data.storeName,
          ownerName: data.ownerName,
          email: data.email,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.message ?? "Erro ao criar conta. Tente novamente.");
        return;
      }

      toast.success(`Bem-vinda, ${data.ownerName}! Sua loja "${data.storeName}" foi criada.`);
      router.push("/dashboard");
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar ao site
          </Button>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          <Gem className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">Consignado</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Criar sua conta</CardTitle>
            <CardDescription>14 dias grátis · sem cartão de crédito</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storeName">Nome da sua loja</Label>
                <Input
                  id="storeName"
                  placeholder="Ex: Bijuterias da Ana"
                  {...register("storeName")}
                />
                {errors.storeName && (
                  <p className="text-sm text-destructive">{errors.storeName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ownerName">Seu nome</Label>
                <Input
                  id="ownerName"
                  placeholder="Ex: Ana Paula"
                  {...register("ownerName")}
                />
                {errors.ownerName && (
                  <p className="text-sm text-destructive">{errors.ownerName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar conta grátis
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Já tem uma conta?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Entrar
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
