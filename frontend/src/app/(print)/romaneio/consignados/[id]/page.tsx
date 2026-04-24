"use client";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { consignmentsApi } from "@/lib/api/consignments";
import { settingsApi } from "@/lib/api/settings";
import { formatCurrency } from "@/lib/utils";
import type { Consignment, TenantSettings } from "@/types";

function formatDateBR(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

const statusMap: Record<string, string> = {
  open: "Em aberto",
  partially_settled: "Parcialmente acertado",
  settled: "Encerrado",
  overdue: "Em atraso",
};

export default function RomaneioPrintPage() {
  const { id } = useParams<{ id: string }>();

  const { data: consignment } = useQuery<Consignment>({
    queryKey: ["consignment", id],
    queryFn: () => consignmentsApi.get(id),
  });

  const { data: settings } = useQuery<TenantSettings>({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
  });

  useEffect(() => {
    if (consignment && settings) {
      document.title = `Romaneio — ${consignment.resellerName} — ${formatDateBR(consignment.deliveredAt)}`;
    }
  }, [consignment, settings]);

  if (!consignment || !settings) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif" }}>
        Carregando...
      </div>
    );
  }

  const totalPecas = consignment.items.reduce((s, i) => s + i.quantitySent, 0);
  const totalValor = consignment.items.reduce((s, i) => s + i.quantitySent * i.salePrice, 0);
  const color = settings.primaryColor ?? "#B8860B";

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Arial', sans-serif; font-size: 12px; color: #1a1a1a; background: white; }
        @page { size: A4; margin: 1.5cm; }
        @media print {
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
        .page { max-width: 800px; margin: 0 auto; padding: 24px; }
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid ${color}; padding-bottom: 16px; margin-bottom: 20px; }
        .company { display: flex; align-items: center; gap: 12px; }
        .company-logo { height: 60px; width: 60px; object-fit: contain; }
        .company-name { font-size: 20px; font-weight: bold; color: ${color}; }
        .company-sub { font-size: 10px; color: #666; margin-top: 2px; }
        .doc-title { text-align: right; }
        .doc-title h1 { font-size: 16px; font-weight: bold; color: ${color}; text-transform: uppercase; letter-spacing: 1px; }
        .doc-title p { font-size: 10px; color: #666; margin-top: 2px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 6px; padding: 14px; }
        .info-block label { font-size: 9px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; display: block; margin-bottom: 3px; }
        .info-block span { font-size: 12px; font-weight: 600; color: #1a1a1a; }
        .info-block.full { grid-column: 1 / -1; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        thead tr { background-color: ${color}; color: white; }
        thead th { padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        thead th.right { text-align: right; }
        tbody tr:nth-child(even) { background: #f5f5f5; }
        tbody tr { border-bottom: 1px solid #eee; }
        tbody td { padding: 7px 10px; font-size: 11px; vertical-align: middle; }
        tbody td.right { text-align: right; }
        tbody td.code { font-family: monospace; color: #555; font-size: 10px; }
        .totals { display: flex; justify-content: flex-end; gap: 32px; margin-bottom: 24px; padding: 12px 16px; background: #f9f9f9; border: 1px solid #e5e5e5; border-radius: 6px; }
        .total-item { text-align: center; }
        .total-item label { font-size: 9px; text-transform: uppercase; color: #888; display: block; margin-bottom: 4px; }
        .total-item span { font-size: 16px; font-weight: bold; color: ${color}; }
        .notes { margin-bottom: 24px; padding: 10px 14px; background: #fffbeb; border-left: 3px solid ${color}; font-size: 11px; }
        .notes label { font-size: 9px; text-transform: uppercase; color: #888; display: block; margin-bottom: 4px; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
        .sig-line { border-top: 1px solid #999; padding-top: 6px; text-align: center; font-size: 10px; color: #555; }
        .print-btn { position: fixed; bottom: 24px; right: 24px; background: ${color}; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.2); }
        .print-btn:hover { opacity: 0.9; }
        .footer { text-align: center; font-size: 9px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; margin-top: 8px; }
      `}</style>

      <div className="page">
        {/* Header */}
        <div className="header">
          <div className="company">
            {settings.logoUrl
              ? <img src={settings.logoUrl} alt={settings.name} className="company-logo" />
              : <div style={{ width: 50, height: 50, borderRadius: 8, background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: 20 }}>
                  {settings.name.charAt(0)}
                </div>
            }
            <div>
              <div className="company-name">{settings.name}</div>
              <div className="company-sub">Semijoias Folheadas</div>
            </div>
          </div>
          <div className="doc-title">
            <h1>Romaneio de Consignação</h1>
            <p>Emitido em {formatDateBR(new Date().toISOString())}</p>
          </div>
        </div>

        {/* Info */}
        <div className="info-grid">
          <div className="info-block">
            <label>Revendedora</label>
            <span>{consignment.resellerName}</span>
          </div>
          <div className="info-block">
            <label>Gestora</label>
            <span>{consignment.managerName}</span>
          </div>
          <div className="info-block">
            <label>Data de entrega</label>
            <span>{formatDateBR(consignment.deliveredAt)}</span>
          </div>
          <div className="info-block">
            <label>Retorno previsto</label>
            <span>{consignment.expectedReturnAt ? formatDateBR(consignment.expectedReturnAt) : "—"}</span>
          </div>
          <div className="info-block">
            <label>Status</label>
            <span>{statusMap[consignment.status] ?? consignment.status}</span>
          </div>
          {consignment.notes && (
            <div className="info-block full">
              <label>Observações</label>
              <span>{consignment.notes}</span>
            </div>
          )}
        </div>

        {/* Items table */}
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Código</th>
              <th>Produto</th>
              <th className="right">Qtd. Enviada</th>
              <th className="right">Vlr. Unitário</th>
              <th className="right">Total</th>
            </tr>
          </thead>
          <tbody>
            {consignment.items.map((item, idx) => (
              <tr key={item.id}>
                <td>{idx + 1}</td>
                <td className="code">{item.productCode ?? "—"}</td>
                <td>{item.productName}</td>
                <td className="right">{item.quantitySent}</td>
                <td className="right">{formatCurrency(item.salePrice)}</td>
                <td className="right">{formatCurrency(item.quantitySent * item.salePrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="totals">
          <div className="total-item">
            <label>Total de peças</label>
            <span>{totalPecas}</span>
          </div>
          <div className="total-item">
            <label>Valor total em consignação</label>
            <span>{formatCurrency(totalValor)}</span>
          </div>
        </div>

        {/* Signatures */}
        <div className="signatures">
          <div className="sig-line">
            Assinatura da Revendedora<br />
            {consignment.resellerName}
          </div>
          <div className="sig-line">
            Assinatura Responsável<br />
            {consignment.managerName}
          </div>
        </div>

        <div className="footer" style={{ marginTop: 24 }}>
          Este documento comprova a entrega das peças acima relacionadas para consignação.
          A revendedora se compromete a devolver ou acertar os valores no prazo acordado.
        </div>
      </div>

      <button className="print-btn no-print" onClick={() => window.print()}>
        Imprimir / Salvar PDF
      </button>
    </>
  );
}
