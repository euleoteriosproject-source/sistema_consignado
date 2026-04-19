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

  const handleSignOut = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b bg-background">
      <MobileNav />
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
        <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sair">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
