"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createBrowserClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { MobileNav } from "./MobileNav";

export function Header() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const userName = useAuthStore((s) => s.userName);

  const handleSignOut = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Prioridade: nome do backend → user_metadata do Supabase → email
  const displayName =
    userName ??
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    "";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || displayName.slice(0, 2).toUpperCase();

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b bg-background">
      <MobileNav />
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs bg-primary text-primary-foreground font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="hidden sm:flex flex-col leading-tight">
          <span className="text-sm font-medium">{displayName}</span>
          {displayName !== user?.email && (
            <span className="text-xs text-muted-foreground">{user?.email}</span>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sair">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
