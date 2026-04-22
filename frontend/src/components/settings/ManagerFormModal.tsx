"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Mail, KeyRound } from "lucide-react";
import { settingsApi } from "@/lib/api/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const inviteSchema = z.object({
  name: z.string().min(2, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional(),
});

const passwordSchema = inviteSchema.extend({
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

type InviteForm = z.infer<typeof inviteSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

interface Props { open: boolean; onClose: () => void }

export function ManagerFormModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"invite" | "password">("invite");

  const inviteForm = useForm<InviteForm>({ resolver: zodResolver(inviteSchema) });
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const mutation = useMutation({
    mutationFn: (data: InviteForm | PasswordForm) => settingsApi.createManager(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
      toast.success(
        mode === "invite"
          ? "Convite enviado! O(a) gestor(a) receberá um e-mail para criar a senha."
          : "Gestor(a) cadastrado(a)!"
      );
      inviteForm.reset();
      passwordForm.reset();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleClose = () => {
    inviteForm.reset();
    passwordForm.reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar gestor(a)</DialogTitle>
        </DialogHeader>

        {/* Toggle de modo */}
        <div className="flex rounded-lg border p-1 gap-1 mt-2">
          <button
            type="button"
            onClick={() => setMode("invite")}
            className={`flex-1 flex items-center justify-center gap-2 text-sm py-2 px-3 rounded-md transition-colors ${
              mode === "invite"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail className="h-4 w-4" />
            Enviar convite
          </button>
          <button
            type="button"
            onClick={() => setMode("password")}
            className={`flex-1 flex items-center justify-center gap-2 text-sm py-2 px-3 rounded-md transition-colors ${
              mode === "password"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <KeyRound className="h-4 w-4" />
            Definir senha
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          {mode === "invite"
            ? "O(a) gestor(a) receberá um e-mail com link para criar a própria senha."
            : "Você define a senha inicial. Informe ao(à) gestor(a) para trocar depois."}
        </p>

        {mode === "invite" ? (
          <form
            onSubmit={inviteForm.handleSubmit((d) => mutation.mutate(d))}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label>Nome completo *</Label>
              <Input placeholder="Maria Silva" {...inviteForm.register("name")} />
              {inviteForm.formState.errors.name && (
                <p className="text-xs text-destructive">{inviteForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>E-mail *</Label>
              <Input type="email" placeholder="gestor@email.com" {...inviteForm.register("email")} />
              {inviteForm.formState.errors.email && (
                <p className="text-xs text-destructive">{inviteForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input placeholder="(11) 99999-9999" {...inviteForm.register("phone")} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Mail className="h-4 w-4 mr-1" />
                Enviar convite
              </Button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={passwordForm.handleSubmit((d) => mutation.mutate(d))}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label>Nome completo *</Label>
              <Input placeholder="Maria Silva" {...passwordForm.register("name")} />
              {passwordForm.formState.errors.name && (
                <p className="text-xs text-destructive">{passwordForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>E-mail *</Label>
              <Input type="email" placeholder="gestor@email.com" {...passwordForm.register("email")} />
              {passwordForm.formState.errors.email && (
                <p className="text-xs text-destructive">{passwordForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Senha inicial *</Label>
              <Input type="password" placeholder="Mínimo 6 caracteres" {...passwordForm.register("password")} />
              {passwordForm.formState.errors.password && (
                <p className="text-xs text-destructive">{passwordForm.formState.errors.password.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Telefone</Label>
              <Input placeholder="(11) 99999-9999" {...passwordForm.register("phone")} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar gestor(a)
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
