"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Package, ShoppingBag,
  DollarSign, FileText, Settings, Gem, UserCog, LifeBuoy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";

const ownerNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/gestores", label: "Gestores", icon: UserCog },
  { href: "/revendedoras", label: "Revendedoras", icon: Users },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/consignados", label: "Consignados", icon: ShoppingBag },
  { href: "/financeiro", label: "Financeiro", icon: DollarSign },
  { href: "/relatorios", label: "Relatórios", icon: FileText },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
  { href: "/suporte",       label: "Suporte",        icon: LifeBuoy },
];

const managerNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/revendedoras", label: "Revendedores(as)", icon: Users },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/consignados", label: "Consignados", icon: ShoppingBag },
  { href: "/financeiro", label: "Financeiro", icon: DollarSign },
];

export function Sidebar() {
  const pathname = usePathname();
  const tenantName = useAuthStore((s) => s.tenantName);
  const logoUrl = useAuthStore((s) => s.logoUrl);
  const role = useAuthStore((s) => s.role);
  const navItems = role === "manager" ? managerNav : ownerNav;

  return (
    <aside className="hidden md:flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border min-h-screen">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
        {logoUrl ? (
          <img src={logoUrl} alt={tenantName ?? "Logo"} className="h-8 w-8 rounded object-contain shrink-0" />
        ) : (
          <Gem className="h-6 w-6 text-primary shrink-0" />
        )}
        <span className="text-base font-bold text-sidebar-foreground truncate leading-tight">
          {tenantName ?? "Consignado"}
        </span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
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
      <div className="px-4 py-4 border-t border-sidebar-border flex items-center">
        {role && (
          <span className={cn(
            "text-xs px-2 py-1 rounded-full font-medium",
            role === "owner" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"
          )}>
            {role === "owner" ? "Proprietário(a)" : "Gestor(a)"}
          </span>
        )}
      </div>
    </aside>
  );
}
