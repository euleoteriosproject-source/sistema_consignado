"use client";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, LifeBuoy } from "lucide-react";

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: adminApi.stats,
    staleTime: 0,
  });

  const cards = [
    { title: "Clientes",         value: stats?.totalTenants, icon: Building2, color: "text-blue-600"  },
    { title: "Usuários",         value: stats?.totalUsers,   icon: Users,     color: "text-green-600" },
    { title: "Chamados abertos", value: stats?.openTickets,  icon: LifeBuoy,  color: "text-amber-600" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Visão Geral</h1>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
                <Icon className={`h-4 w-4 ${c.color}`} />
              </CardHeader>
              <CardContent>
                {isLoading
                  ? <Skeleton className="h-8 w-16" />
                  : <p className={`text-3xl font-bold ${c.color}`}>{c.value ?? 0}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
