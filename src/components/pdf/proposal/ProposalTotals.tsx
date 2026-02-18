import React from "react";
import type { ProposalTemplateData } from "../ProposalHtmlTemplate";
import { formatShipping } from "../ProposalHtmlTemplate";

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "7px 16px",
  fontSize: "12px",
  color: "#555",
  fontVariantNumeric: "tabular-nums",
};

export function ProposalTotals({ data }: { data: ProposalTemplateData }) {
  const shippingLabel = data.shippingType
    ? formatShipping(data.shippingType, data.shippingCost)
    : (data.shippingCost ? fmt(data.shippingCost) : "Cortesia");

  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
      <div style={{ width: "360px" }}>
        {/* Escada visual progressiva */}
        <div style={{ ...rowStyle, borderBottom: "1px solid #f0f0f0" }}>
          <span>Subtotal:</span>
          <span style={{ fontWeight: 600 }}>{fmt(data.subtotal)}</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: "1px solid #f0f0f0", paddingLeft: "24px" }}>
          <span>Frete:</span>
          <span style={{ fontWeight: 600 }}>{shippingLabel}</span>
        </div>
        {data.discount && data.discount > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", margin: "6px 0", backgroundColor: "#fff5f5", border: "1px solid #ffcdd2", borderRadius: "0 6px 6px 0", fontVariantNumeric: "tabular-nums" }}>
            <tbody>
              <tr>
                <td style={{ width: "6px", backgroundColor: "#e53935", padding: 0 }} />
                <td style={{ padding: "7.5px 16px" }}>
                  <span style={{ fontWeight: 700, fontSize: "13px", color: "#c62828" }}>Desconto Global:</span>
                </td>
                <td style={{ padding: "7.5px 16px", textAlign: "right" }}>
                  <span style={{ fontWeight: 800, fontSize: "15px", color: "#c62828" }}>- {fmt(data.discount)}</span>
                </td>
              </tr>
            </tbody>
          </table>
        )}
        <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#00c853", borderRadius: "8px", marginTop: "10px" }}>
          <tbody>
            <tr>
              <td style={{ padding: "10px 18px" }}>
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, textTransform: "uppercase", fontSize: "13px", color: "#ffffff", letterSpacing: "0.5px" }}>
                  Valor Total:
                </span>
              </td>
              <td style={{ padding: "10px 18px", textAlign: "right" }}>
                <strong style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: "19px", color: "#ffffff", fontVariantNumeric: "tabular-nums" }}>
                  {fmt(data.total)}
                </strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
