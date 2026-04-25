"use client";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api/settings";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Printer } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Settlement, Consignment } from "@/types";

const paymentLabel: Record<string, string> = {
  pix: "PIX", cash: "Dinheiro", transfer: "Transferência", other: "Outro",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

interface Props {
  settlement: Settlement;
  consignment: Consignment;
  onClose: () => void;
}

export function SettlementReceiptModal({ settlement, consignment, onClose }: Props) {
  const { data: branding } = useQuery({
    queryKey: ["settings-branding"],
    queryFn: settingsApi.branding,
  });

  const commissionRate = settlement.totalSoldValue > 0
    ? ((settlement.totalCommission / settlement.totalSoldValue) * 100).toFixed(1)
    : "0";

  function handlePrint() {
    const color = branding?.primaryColor ?? "#B8860B";
    const logoHtml = branding?.logoUrl
      ? `<img src="${branding.logoUrl}" style="height:56px;width:56px;object-fit:contain" alt="logo"/>`
      : `<div style="width:48px;height:48px;border-radius:8px;background:${color};display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:18px">${(branding?.name ?? "?").charAt(0)}</div>`;

    const soldItems = consignment.items.filter(i => i.quantitySold > 0);

    const html = `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"/><title>Comprovante de Acerto</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;padding:24px;max-width:600px;margin:0 auto}
@page{size:A5;margin:1.2cm}
.header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid ${color};padding-bottom:12px;margin-bottom:16px}
.company{display:flex;align-items:center;gap:10px}
.co-name{font-size:15px;font-weight:bold;color:${color}}
.title{text-align:right}
.title h1{font-size:13px;font-weight:bold;color:${color};text-transform:uppercase;letter-spacing:0.5px}
.title p{font-size:9px;color:#666;margin-top:2px}
.info{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f9f9f9;border:1px solid #e5e5e5;border-radius:5px;padding:10px;margin-bottom:14px}
.info label{font-size:8px;text-transform:uppercase;color:#888;display:block;margin-bottom:1px}
.info span{font-size:11px;font-weight:600}
table{width:100%;border-collapse:collapse;margin-bottom:12px}
thead tr{background:${color};color:#fff}
th{padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase}
th.r{text-align:right}
tr:nth-child(even){background:#f5f5f5}
td{padding:5px 8px;font-size:11px;border-bottom:1px solid #eee}
td.r{text-align:right}
.breakdown{background:#f9f9f9;border:1px solid #e5e5e5;border-radius:5px;padding:10px;margin-bottom:14px}
.breakdown-row{display:flex;justify-content:space-between;padding:3px 0;font-size:11px}
.breakdown-row.total{font-weight:bold;font-size:13px;border-top:1px solid #ddd;margin-top:4px;padding-top:6px}
.green{color:#16a34a}
.amber{color:#d97706}
.sig{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:32px}
.sig-line{border-top:1px solid #999;padding-top:6px;text-align:center;font-size:10px;color:#555}
.sig-line strong{display:block;font-size:11px;color:#333;margin-bottom:2px}
.footer{text-align:center;font-size:9px;color:#aaa;border-top:1px solid #eee;padding-top:8px;margin-top:10px}
</style></head><body>
<div class="header">
  <div class="company">${logoHtml}<div><div class="co-name">${branding?.name ?? "Empresa"}</div></div></div>
  <div class="title"><h1>Comprovante de Acerto</h1><p>Emitido em ${fmt(new Date().toISOString())}</p></div>
</div>
<div class="info">
  <div><label>Revendedor(a)</label><span>${settlement.resellerName}</span></div>
  <div><label>Gestor(a)</label><span>${settlement.managerName}</span></div>
  <div><label>Data do acerto</label><span>${fmt(settlement.settlementDate)}</span></div>
  <div><label>Forma de pagamento</label><span>${paymentLabel[settlement.paymentMethod] ?? settlement.paymentMethod}</span></div>
  ${settlement.notes ? `<div style="grid-column:1/-1"><label>Observações</label><span>${settlement.notes}</span></div>` : ""}
</div>
${soldItems.length > 0 ? `
<table>
  <thead><tr><th>Produto</th><th class="r">Qtd</th><th class="r">Vlr. Unit.</th><th class="r">Total</th></tr></thead>
  <tbody>${soldItems.map(i => `<tr>
    <td>${i.productCode ? `<span style="font-family:monospace;color:#666;font-size:10px">[${i.productCode}]</span> ` : ""}${i.productName}</td>
    <td class="r">${i.quantitySold}</td>
    <td class="r">${formatCurrency(i.salePrice)}</td>
    <td class="r">${formatCurrency(i.quantitySold * i.salePrice)}</td>
  </tr>`).join("")}</tbody>
</table>` : ""}
<div class="breakdown">
  <div class="breakdown-row"><span>Total vendido</span><span>${formatCurrency(settlement.totalSoldValue)}</span></div>
  <div class="breakdown-row"><span>Comissão (${commissionRate}%)</span><span class="amber">−${formatCurrency(settlement.totalCommission)}</span></div>
  <div class="breakdown-row total"><span>Líquido recebido</span><span class="green">${formatCurrency(settlement.netToReceive)}</span></div>
</div>
<div class="sig">
  <div class="sig-line"><strong>${settlement.resellerName}</strong>Revendedor(a)</div>
  <div class="sig-line"><strong>${settlement.managerName}</strong>Gestor(a) responsável</div>
</div>
<div class="footer">Este documento comprova o acerto financeiro referente ao consignado.</div>
</body></html>`;

    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-4 w-4" /> Comprovante de Acerto
            </DialogTitle>
            <Button size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3 bg-muted/30 rounded-lg p-3">
            <div>
              <p className="text-xs text-muted-foreground">Revendedor(a)</p>
              <p className="font-semibold">{settlement.resellerName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data</p>
              <p className="font-semibold">{fmt(settlement.settlementDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pagamento</p>
              <Badge variant="outline">{paymentLabel[settlement.paymentMethod] ?? settlement.paymentMethod}</Badge>
            </div>
            {settlement.notes && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Observações</p>
                <p className="italic">{settlement.notes}</p>
              </div>
            )}
          </div>

          {consignment.items.filter(i => i.quantitySold > 0).length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">Itens vendidos</p>
              {consignment.items.filter(i => i.quantitySold > 0).map(i => (
                <div key={i.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                  <span className="truncate">{i.productName} <span className="text-muted-foreground">×{i.quantitySold}</span></span>
                  <span className="font-medium shrink-0 ml-2">{formatCurrency(i.quantitySold * i.salePrice)}</span>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total vendido</span>
              <span className="font-medium">{formatCurrency(settlement.totalSoldValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Comissão ({commissionRate}%)</span>
              <span className="text-amber-600">−{formatCurrency(settlement.totalCommission)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-1 border-t">
              <span>Líquido recebido</span>
              <span className="text-green-600">{formatCurrency(settlement.netToReceive)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
