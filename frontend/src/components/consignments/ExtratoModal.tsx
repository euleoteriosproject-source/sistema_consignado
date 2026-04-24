"use client";
import { useQuery } from "@tanstack/react-query";
import { consignmentsApi } from "@/lib/api/consignments";
import { settingsApi } from "@/lib/api/settings";
import { settlementsApi } from "@/lib/api/settlements";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Printer, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Consignment, TenantSettings, Settlement } from "@/types";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

const statusMap: Record<string, string> = {
  open: "Em aberto",
  partially_settled: "Parcialmente acertado",
  settled: "Encerrado",
  overdue: "Em atraso",
};

const paymentLabel: Record<string, string> = {
  pix: "PIX", cash: "Dinheiro", transfer: "Transferência", other: "Outro",
};

interface Props { consignmentId: string; onClose: () => void }

export function ExtratoModal({ consignmentId, onClose }: Props) {
  const { data: c, isLoading: loadingC } = useQuery<Consignment>({
    queryKey: ["consignment", consignmentId],
    queryFn: () => consignmentsApi.get(consignmentId),
  });
  const { data: s } = useQuery<TenantSettings>({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
  });
  const { data: settlementsPage } = useQuery({
    queryKey: ["settlements-for-extrato", consignmentId, c?.resellerId],
    queryFn: () => settlementsApi.list({ resellerId: c!.resellerId, size: "50" }),
    enabled: !!c?.resellerId,
  });
  const settlements: Settlement[] = (settlementsPage?.content ?? []).filter(
    (st: Settlement) => st.consignmentId === consignmentId
  );

  const totalPecas = c?.items.reduce((a, i) => a + i.quantitySent, 0) ?? 0;
  const totalValor = c?.items.reduce((a, i) => a + i.quantitySent * i.salePrice, 0) ?? 0;
  const totalAcertos = settlements.reduce((a, st) => a + st.netToReceive, 0);
  const isStock = c?.consignmentType === "manager_stock";
  const sigLeft  = isStock
    ? { name: s?.name ?? "Proprietário(a)", role: "Proprietário(a) — consignou" }
    : { name: c?.managerName ?? "", role: "Responsável pelo lote" };
  const sigRight = isStock
    ? { name: c?.managerName ?? "", role: "Gestora — recebido" }
    : { name: c?.resellerName ?? "", role: "Revendedora — recebido" };

  function handlePrint() {
    if (!c || !s) return;
    const color = s.primaryColor ?? "#B8860B";

    const settlementsHtml = settlements.length > 0 ? `
<h3 style="font-size:11px;font-weight:bold;color:${color};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;margin-top:18px;border-top:1px solid #eee;padding-top:14px">Acertos Registrados</h3>
<table>
  <thead><tr>
    <th>Data</th><th>Forma Pgto.</th><th class="r">Total Vendido</th><th class="r">Comissão</th><th class="r">Líquido Recebido</th>
  </tr></thead>
  <tbody>${settlements.map(st => `
    <tr>
      <td>${fmt(st.settlementDate)}</td>
      <td>${paymentLabel[st.paymentMethod] ?? st.paymentMethod}</td>
      <td class="r">${formatCurrency(st.totalSoldValue)}</td>
      <td class="r" style="color:#d97706">−${formatCurrency(st.totalCommission)}</td>
      <td class="r" style="font-weight:bold;color:#16a34a">${formatCurrency(st.netToReceive)}</td>
    </tr>
    ${st.notes ? `<tr><td colspan="5" style="font-size:10px;color:#888;padding-top:2px">Obs: ${st.notes}</td></tr>` : ""}
  `).join("")}
  </tbody>
</table>
<div style="display:flex;justify-content:flex-end;gap:28px;padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;margin-bottom:18px">
  <div style="text-align:center"><div style="font-size:9px;color:#888;text-transform:uppercase">Total acertado</div><div style="font-size:15px;font-weight:bold;color:#16a34a">${formatCurrency(totalAcertos)}</div></div>
  <div style="text-align:center"><div style="font-size:9px;color:#888;text-transform:uppercase">Pendente</div><div style="font-size:15px;font-weight:bold;color:#d97706">${formatCurrency(Math.max(0, totalValor - settlements.reduce((a, st) => a + st.totalSoldValue, 0)))}</div></div>
</div>` : "";

    const html = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"/><title>Extrato</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;padding:24px}
@page{size:A4;margin:1.5cm}
.header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid ${color};padding-bottom:14px;margin-bottom:18px}
.company{display:flex;align-items:center;gap:12px}
.logo{height:56px;width:56px;object-fit:contain}
.co-name{font-size:18px;font-weight:bold;color:${color}}
.co-sub{font-size:10px;color:#666;margin-top:2px}
.doc-title h1{font-size:15px;font-weight:bold;color:${color};text-transform:uppercase;letter-spacing:1px;text-align:right}
.doc-title p{font-size:10px;color:#666;text-align:right;margin-top:2px}
.info{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;background:#f9f9f9;border:1px solid #e5e5e5;border-radius:6px;padding:12px}
.info label{font-size:9px;text-transform:uppercase;color:#888;display:block;margin-bottom:2px}
.info span{font-size:12px;font-weight:600}
table{width:100%;border-collapse:collapse;margin-bottom:14px}
thead tr{background:${color};color:#fff}
th{padding:7px 9px;text-align:left;font-size:10px;text-transform:uppercase}
th.r{text-align:right}
tr:nth-child(even){background:#f5f5f5}
td{padding:6px 9px;font-size:11px;border-bottom:1px solid #eee}
td.r{text-align:right}
td.code{font-family:monospace;color:#555;font-size:10px}
.totals{display:flex;justify-content:flex-end;gap:28px;padding:10px 14px;background:#f9f9f9;border:1px solid #e5e5e5;border-radius:6px;margin-bottom:16px}
.total-item{text-align:center}
.total-item label{font-size:9px;text-transform:uppercase;color:#888;display:block;margin-bottom:3px}
.total-item span{font-size:15px;font-weight:bold;color:${color}}
.sigs{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:44px}
.sig{border-top:1px solid #999;padding-top:6px;text-align:center;font-size:10px;color:#555}
.sig strong{display:block;margin-bottom:2px;font-size:11px;color:#333}
.footer{text-align:center;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:10px;margin-top:10px}
</style></head><body>
<div class="header">
  <div class="company">
    ${s.logoUrl ? `<img src="${s.logoUrl}" class="logo" alt="logo"/>` : `<div style="width:48px;height:48px;border-radius:8px;background:${color};display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:18px">${s.name.charAt(0)}</div>`}
    <div><div class="co-name">${s.name}</div><div class="co-sub">Semijoias Folheadas</div></div>
  </div>
  <div class="doc-title"><h1>Extrato de Consignação</h1><p>Emitido em ${fmt(new Date().toISOString())}</p></div>
</div>
<div class="info">
  <div><label>Revendedora</label><span>${c.resellerName}</span></div>
  <div><label>Responsável pelo lote</label><span>${c.managerName}</span></div>
  <div><label>Data de entrega</label><span>${fmt(c.deliveredAt)}</span></div>
  <div><label>Retorno previsto</label><span>${c.expectedReturnAt ? fmt(c.expectedReturnAt) : "—"}</span></div>
  <div><label>Status</label><span>${statusMap[c.status] ?? c.status}</span></div>
  ${c.notes ? `<div style="grid-column:1/-1"><label>Obs.</label><span>${c.notes}</span></div>` : ""}
</div>
<table>
  <thead><tr><th>#</th><th>Código</th><th>Produto</th><th class="r">Env.</th><th class="r">Vend.</th><th class="r">Dev.</th><th class="r">Vlr. Unit.</th><th class="r">Total Env.</th></tr></thead>
  <tbody>${c.items.map((it, idx) => `
    <tr><td>${idx + 1}</td><td class="code">${it.productCode ?? "—"}</td><td>${it.productName}</td>
    <td class="r">${it.quantitySent}</td><td class="r">${it.quantitySold}</td><td class="r">${it.quantityReturned}</td>
    <td class="r">${formatCurrency(it.salePrice)}</td>
    <td class="r">${formatCurrency(it.quantitySent * it.salePrice)}</td></tr>`).join("")}
  </tbody>
</table>
<div class="totals">
  <div class="total-item"><label>Total de peças</label><span>${totalPecas}</span></div>
  <div class="total-item"><label>Valor total em consignação</label><span>${formatCurrency(totalValor)}</span></div>
</div>
${settlementsHtml}
<div class="sigs">
  <div class="sig"><strong>${sigLeft.name}</strong>${sigLeft.role}</div>
  <div class="sig"><strong>${sigRight.name}</strong>${sigRight.role}</div>
</div>
<div class="footer">Este documento comprova a entrega e acerto das peças em consignação.</div>
</body></html>`;

    const win = window.open("", "_blank", "width=960,height=720");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle>Extrato de Consignação</DialogTitle>
            <Button size="sm" onClick={handlePrint} disabled={!c || !s}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir extrato
            </Button>
          </div>
        </DialogHeader>

        {loadingC ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : c ? (
          <div className="space-y-4 text-sm">
            {/* Info */}
            <div className="grid grid-cols-2 gap-3 bg-muted/30 rounded-lg p-4">
              <div><p className="text-xs text-muted-foreground">Revendedora</p><p className="font-semibold">{c.resellerName}</p></div>
              <div><p className="text-xs text-muted-foreground">Responsável pelo lote</p><p className="font-semibold">{c.managerName}</p></div>
              <div><p className="text-xs text-muted-foreground">Data de entrega</p><p className="font-semibold">{fmt(c.deliveredAt)}</p></div>
              <div><p className="text-xs text-muted-foreground">Retorno previsto</p><p className="font-semibold">{c.expectedReturnAt ? fmt(c.expectedReturnAt) : "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Status</p><p className="font-semibold">{statusMap[c.status] ?? c.status}</p></div>
            </div>

            {/* Items */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-2">#</th>
                    <th className="text-left py-2 pr-2">Código</th>
                    <th className="text-left py-2 pr-2">Produto</th>
                    <th className="text-right py-2 pr-2">Env.</th>
                    <th className="text-right py-2 pr-2">Vend.</th>
                    <th className="text-right py-2 pr-2">Dev.</th>
                    <th className="text-right py-2 pr-2">Vlr. Unit.</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {c.items.map((item, idx) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-1.5 pr-2 text-muted-foreground">{idx + 1}</td>
                      <td className="py-1.5 pr-2 font-mono text-muted-foreground">{item.productCode ?? "—"}</td>
                      <td className="py-1.5 pr-2 font-medium">{item.productName}</td>
                      <td className="py-1.5 pr-2 text-right">{item.quantitySent}</td>
                      <td className="py-1.5 pr-2 text-right text-green-600">{item.quantitySold}</td>
                      <td className="py-1.5 pr-2 text-right text-blue-600">{item.quantityReturned}</td>
                      <td className="py-1.5 pr-2 text-right">{formatCurrency(item.salePrice)}</td>
                      <td className="py-1.5 text-right font-semibold">{formatCurrency(item.quantitySent * item.salePrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end gap-8 bg-muted/30 rounded-lg p-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Total de peças</p>
                <p className="text-xl font-bold text-primary">{totalPecas}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Valor total</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(totalValor)}</p>
              </div>
            </div>

            {/* Settlements */}
            {settlements.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="font-semibold text-sm mb-3 flex items-center gap-2">
                    Acertos registrados
                    <Badge variant="secondary">{settlements.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {settlements.map((st) => (
                      <div key={st.id} className="border rounded-lg p-3 bg-muted/20">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">{fmt(st.settlementDate)}</span>
                          <Badge variant="outline" className="text-xs">{paymentLabel[st.paymentMethod] ?? st.paymentMethod}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Vendido: </span><span className="font-medium">{formatCurrency(st.totalSoldValue)}</span></div>
                          <div><span className="text-muted-foreground">Comissão: </span><span className="text-amber-600">−{formatCurrency(st.totalCommission)}</span></div>
                          <div><span className="text-muted-foreground">Líquido: </span><span className="font-bold text-green-600">{formatCurrency(st.netToReceive)}</span></div>
                        </div>
                        {st.notes && <p className="text-xs text-muted-foreground mt-1 italic">{st.notes}</p>}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-6 mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Total acertado</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(totalAcertos)}</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Signatures */}
            <Separator />
            <div className="grid grid-cols-2 gap-8 pt-2">
              <div className="border-t pt-2 text-center">
                <p className="font-semibold text-sm">{sigLeft.name}</p>
                <p className="text-xs text-muted-foreground">{sigLeft.role}</p>
              </div>
              <div className="border-t pt-2 text-center">
                <p className="font-semibold text-sm">{sigRight.name}</p>
                <p className="text-xs text-muted-foreground">{sigRight.role}</p>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
