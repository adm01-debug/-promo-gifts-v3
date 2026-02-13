import React from "react";
import type { ProposalTemplateData } from "../ProposalHtmlTemplate";

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ProposalTotals({ data }: { data: ProposalTemplateData }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
      <div style={{ width: "320px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: "12px", color: "#555", borderBottom: "1px solid #f0f0f0" }}>
          <span>Subtotal:</span>
          <span style={{ fontWeight: 600 }}>{fmt(data.subtotal)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: "12px", color: "#555", borderBottom: "1px solid #f0f0f0" }}>
          <span>Frete:</span>
          <span style={{ fontWeight: 600 }}>{data.shippingCost ? fmt(data.shippingCost) : "Cortesia"}</span>
        </div>
        {data.discount && data.discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: "12px", color: "#e53935", borderBottom: "1px solid #f0f0f0" }}>
            <span>Desconto Global:</span>
            <span style={{ fontWeight: 600 }}>- {fmt(data.discount)}</span>
          </div>
        )}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(135deg, #00c853 0%, #00a844 100%)",
          color: "#ffffff",
          padding: "14px 18px",
          marginTop: "10px",
          borderRadius: "8px",
          boxShadow: "0 4px 16px rgba(0,200,83, 0.3)",
        }}>
          <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, textTransform: "uppercase", fontSize: "13px", color: "#ffffff", letterSpacing: "0.5px" }}>
            Valor Total:
          </span>
          <strong style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: "22px", color: "#ffffff" }}>
            {fmt(data.total)}
          </strong>
        </div>
      </div>
    </div>
  );
}
