"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Gem, LayoutDashboard, Users, Package, ShoppingBag, DollarSign, FileText, Settings, UserCog, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

const ownerNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/gestores", label: "Gestores", icon: UserCog },
  { href: "/revendedores", label: "Revendedores", icon: Users },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/consignados", label: "Consignados", icon: ShoppingBag },
  { href: "/financeiro", label: "Financeiro", icon: DollarSign },
  { href: "/relatorios", label: "Relatórios", icon: FileText },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
  { href: "/suporte",       label: "Suporte",        icon: LifeBuoy },
];

const managerNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/revendedores", label: "Revendedores", icon: Users },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/consignados", label: "Consignados", icon: ShoppingBag },
  { href: "/financeiro", label: "Financeiro", icon: DollarSign },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const tenantName = useAuthStore((s) => s.tenantName);
  const logoUrl = useAuthStore((s) => s.logoUrl);
  const role = useAuthStore((s) => s.role);
  const navItems = role === "manager" ? managerNav : ownerNav;

  return (
    <div className="md:hidden">
      <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)}>
          <aside
            className="absolute left-0 top-0 h-full w-64 bg-sidebar text-sidebar-foreground flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
              {logoUrl ? (
                <img src={logoUrl} alt={tenantName ?? "Logo"} className="h-8 w-8 rounded object-contain shrink-0" />
              ) : (
                <Gem className="h-6 w-6 text-primary" />
              )}
              <span className="text-lg font-bold">{tenantName ?? "Consignado"}</span>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}
