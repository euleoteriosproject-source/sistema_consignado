"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { RoleGuard } from "@/components/shared/RoleGuard";
import { createBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Building2, LifeBuoy, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/admin",         label: "Visão Geral",  icon: LayoutDashboard, exact: true },
  { href: "/admin/tenants", label: "Clientes",     icon: Building2 },
  { href: "/admin/suporte", label: "Suporte",      icon: LifeBuoy },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const clearSession = useAuthStore((s) => s.clearSession);

  async function logout() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    clearSession();
    router.replace("/login");
  }

  return (
    <RoleGuard allowed={["superadmin"]} redirect="/dashboard">
      <div className="flex min-h-screen bg-background">
        <aside className="hidden md:flex flex-col w-56 bg-zinc-950 text-zinc-100 border-r border-zinc-800">
          <div className="flex items-center gap-2 px-5 py-5 border-b border-zinc-800">
            <Shield className="h-5 w-5 text-amber-400 shrink-0" />
            <span className="font-bold text-sm">Admin Panel</span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-amber-500/20 text-amber-300"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                  )}>
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="px-3 py-4 border-t border-zinc-800">
            <Button variant="ghost" size="sm" className="w-full justify-start text-zinc-400 hover:text-zinc-100" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>
        </aside>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 border-b border-border flex items-center px-6 gap-3">
            <Shield className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-muted-foreground">Sistema Consignado — Admin</span>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}
