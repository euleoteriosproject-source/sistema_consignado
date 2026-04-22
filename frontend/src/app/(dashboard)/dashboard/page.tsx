"use client";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/dashboard";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Users, ShoppingBag, DollarSign, AlertTriangle } from "lucide-react";
import type { DashboardSummary, DashboardAlert, DashboardChartData } from "@/types";

export default function DashboardPage() {
  const role = useAuthStore((s) => s.role);
  const isOwner = role === "owner";

  const { data: summary, isLoading: loadingSummary } = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary"],
    queryFn: dashboardApi.summary,
  });

  const { data: alerts } = useQuery<DashboardAlert[]>({
    queryKey: ["dashboard-alerts"],
    queryFn: dashboardApi.alerts,
  });

  const { data: charts } = useQuery<DashboardChartData>({
    queryKey: ["dashboard-charts", "6m"],
    queryFn: () => dashboardApi.charts("6m"),
  });

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {!isOwner && <p className="text-sm text-muted-foreground">Visão dos seus revendedores(as)</p>}
      </div>

      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title={isOwner ? "Revendedores(as) Ativas" : "Revendedores(as)"}
          value={summary?.activeResellers}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          loading={loadingSummary}
        />
        <KpiCard
          title="Lotes em Aberto"
          value={summary?.openConsignments}
          icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
          loading={loadingSummary}
        />
        <KpiCard
          title="Valor em Circulação"
          value={summary ? formatCurrency(summary.totalOpenValue) : undefined}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          loading={loadingSummary}
        />
        <KpiCard
          title="Lotes Atrasados"
          value={summary?.overdueConsignments}
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          loading={loadingSummary}
          valueClass={summary?.overdueConsignments ? "text-destructive" : undefined}
        />
      </div>

      {charts && (
        <Card>
          <CardHeader>
            <CardTitle>Acertos por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220} className="md:!h-[300px]">
              <AreaChart data={charts.monthlySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => formatCurrency(v)} width={80} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Area
                  type="monotone"
                  dataKey="totalValue"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.15)"
                  name="Total"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {alerts && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((alert) => (
              <div key={`${alert.type}-${alert.resellerId}`} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{alert.resellerName}</p>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                </div>
                <Badge variant={alert.type === "overdue" ? "destructive" : "warning"}>
                  {alert.type === "overdue" ? "Atrasado" : "Atenção"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
  loading,
  valueClass,
}: {
  title: string;
  value?: string | number;
  icon: React.ReactNode;
  loading?: boolean;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className={`text-2xl font-bold ${valueClass ?? ""}`}>{value ?? "—"}</div>
        )}
      </CardContent>
    </Card>
  );
}
