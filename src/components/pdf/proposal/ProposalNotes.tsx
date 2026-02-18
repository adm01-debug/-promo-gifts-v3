import React from "react";
import type { ProposalTemplateData } from "../ProposalHtmlTemplate";
import { formatPaymentTerms, formatDeliveryTime, formatShipping } from "../ProposalHtmlTemplate";

export function ProposalNotes({ data }: { data: ProposalTemplateData }) {
  const paymentLabel = formatPaymentTerms(data.paymentTerms);
  const deliveryLabel = formatDeliveryTime(data.deliveryTime);
  const shippingLabel = formatShipping(data.shippingType, data.shippingCost);

  return (
    <div style={{ marginTop: "14px" }}>
      {/* Bloco de Condições Comerciais */}
      <div style={{
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        padding: "12px 16px",
        backgroundColor: "#fafafa",
      }}>
        <div style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 700,
          fontSize: "10px",
          color: "#00c853",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: "8px",
          borderBottom: "2px solid #e8f5e9",
          paddingBottom: "4px",
        }}>
          Condições Comerciais
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
          {/* Pagamento */}
          <div>
            <div style={{ fontSize: "9px", fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: "2px" }}>
              💳 Pagamento
            </div>
            <div style={{ fontSize: "10px", color: "#333", fontWeight: 600, lineHeight: "1.4" }}>
              {paymentLabel || "À vista / Boleto / Pix"}
            </div>
          </div>

          {/* Entrega */}
          <div>
            <div style={{ fontSize: "9px", fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: "2px" }}>
              📦 Prazo de Entrega
            </div>
            <div style={{ fontSize: "10px", color: "#333", fontWeight: 600, lineHeight: "1.4" }}>
              {deliveryLabel || "A combinar"}
            </div>
          </div>

          {/* Frete */}
          <div>
            <div style={{ fontSize: "9px", fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: "2px" }}>
              🚚 Frete
            </div>
            <div style={{ fontSize: "10px", color: "#333", fontWeight: 600, lineHeight: "1.4" }}>
              {shippingLabel}
            </div>
          </div>

          {/* Validade */}
          <div>
            <div style={{ fontSize: "9px", fontWeight: 700, color: "#888", textTransform: "uppercase", marginBottom: "2px" }}>
              📅 Validade da Proposta
            </div>
            <div style={{ fontSize: "10px", color: "#333", fontWeight: 600, lineHeight: "1.4" }}>
              {data.validUntil || "15 dias"}
            </div>
          </div>
        </div>

        <div style={{ fontSize: "9px", color: "#777", lineHeight: "1.5", borderTop: "1px solid #eee", paddingTop: "6px" }}>
          <div>• Todos os valores incluem personalização conforme descrição.</div>
          <div>• Todos os produtos passam por controle de qualidade.</div>
          {data.notes && <div>• {data.notes}</div>}
        </div>
      </div>

      {/* Aceite do cliente */}
      <div style={{ marginTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "40px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ borderBottom: "1px dashed #aaa", height: "30px" }} />
          <div style={{ fontSize: "9px", color: "#888", textAlign: "center", marginTop: "4px", fontWeight: 600 }}>
            De acordo — Assinatura do Cliente
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ borderBottom: "1px dashed #aaa", height: "30px" }} />
          <div style={{ fontSize: "9px", color: "#888", textAlign: "center", marginTop: "4px", fontWeight: 600 }}>
            Data
          </div>
        </div>
      </div>
    </div>
  );
}
