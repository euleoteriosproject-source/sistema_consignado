"use client";
import { useState } from "react";
import { toast } from "sonner";
import { reportsApi, downloadBlob } from "@/lib/api/reports";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2, Users, ShoppingBag, DollarSign, Trophy } from "lucide-react";

interface ReportItem {
  key: "resellers" | "consignments" | "financial" | "ranking";
  title: string;
  description: string;
  icon: React.ReactNode;
  filename: string;
}

const reports: ReportItem[] = [
  {
    key: "resellers",
    title: "Revendedoras",
    description: "Lista completa de revendedoras com status e dados de contato",
    icon: <Users className="h-6 w-6 text-primary" />,
    filename: "revendedoras.xlsx",
  },
  {
    key: "consignments",
    title: "Consignados",
    description: "Todos os lotes com itens, valores e status de retorno",
    icon: <ShoppingBag className="h-6 w-6 text-primary" />,
    filename: "consignados.xlsx",
  },
  {
    key: "financial",
    title: "Financeiro",
    description: "Histórico de acertos, comissões e valores recebidos",
    icon: <DollarSign className="h-6 w-6 text-primary" />,
    filename: "financeiro.xlsx",
  },
  {
    key: "ranking",
    title: "Ranking de Vendas",
    description: "Ranking de revendedoras por volume de vendas",
    icon: <Trophy className="h-6 w-6 text-primary" />,
    filename: "ranking.xlsx",
  },
];

export default function RelatoriosPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleDownload = async (report: ReportItem) => {
    setLoading(report.key);
    try {
      const blob = await reportsApi[report.key]();
      downloadBlob(blob, report.filename);
      toast.success(`Relatório "${report.title}" baixado com sucesso`);
    } catch {
      toast.error("Erro ao gerar relatório. Tente novamente.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Relatórios</h1>
      <p className="text-muted-foreground">Exporte dados em formato Excel (.xlsx) para análise externa.</p>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <Card key={report.key}>
            <CardHeader className="flex flex-row items-center gap-4 pb-2">
              {report.icon}
              <div>
                <CardTitle className="text-base">{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => handleDownload(report)}
                disabled={loading !== null}
                className="w-full"
              >
                {loading === report.key ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                )}
                Exportar Excel
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
