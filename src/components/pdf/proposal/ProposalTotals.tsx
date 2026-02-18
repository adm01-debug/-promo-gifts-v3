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
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "9px 16px",
            margin: "6px 0",
            backgroundColor: "#fff5f5",
            border: "1px solid #ffcdd2",
            borderLeft: "4px solid #e53935",
            borderRadius: "0 6px 6px 0",
            fontVariantNumeric: "tabular-nums",
          }}>
            <span style={{ fontWeight: 700, fontSize: "13px", color: "#c62828" }}>Desconto Global:</span>
            <span style={{ fontWeight: 800, fontSize: "15px", color: "#c62828" }}>- {fmt(data.discount)}</span>
          </div>
        )}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(135deg, #00c853 0%, #00a844 100%)",
          color: "#ffffff",
          padding: "8px 18px",
          marginTop: "10px",
          borderRadius: "8px",
          boxShadow: "0 4px 16px rgba(0,200,83, 0.3)",
        }}>
          <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, textTransform: "uppercase", fontSize: "13px", color: "#ffffff", letterSpacing: "0.5px" }}>
            Valor Total:
          </span>
          <strong style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: "22px", color: "#ffffff", fontVariantNumeric: "tabular-nums" }}>
            {fmt(data.total)}
          </strong>
        </div>
      </div>
    </div>
  );
}
