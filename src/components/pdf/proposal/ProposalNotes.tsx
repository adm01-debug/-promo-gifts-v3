import React from "react";
import type { ProposalTemplateData } from "../ProposalHtmlTemplate";

export function ProposalNotes({ data }: { data: ProposalTemplateData }) {
  return (
    <div style={{
      marginTop: "10px",
      fontSize: "10px",
      color: "#666",
      lineHeight: "1.5",
      borderTop: "2px solid #e8f5e9",
      paddingTop: "8px",
    }}>
      <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "10px", color: "#00c853", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
        Informações Relevantes
      </div>
      <div>• Todos os valores são para produtos já personalizados conforme descrição.</div>
      <div>• {data.paymentTerms || "Pagamento: À vista / Boleto / Pix (após a entrega)."}</div>
      <div>• Todos produtos passam por controle de qualidade.</div>
      {data.deliveryTime && <div>• Previsão de Entrega: {data.deliveryTime}.</div>}
      {data.validUntil && <div>• Validade da Proposta: {data.validUntil}.</div>}
    </div>
  );
}
