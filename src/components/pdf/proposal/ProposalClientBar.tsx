import React from "react";
import type { ProposalTemplateData } from "../ProposalHtmlTemplate";

export function ProposalClientBar({ data }: { data: ProposalTemplateData }) {
  const company = data.client.company || data.client.name;
  const contact = data.client.contactName || "";

  return (
    <div style={{
      backgroundColor: "#f8f9fa",
      borderLeft: "5px solid #00c853",
      padding: "10px 18px",
      marginTop: "12px",
      marginBottom: "14px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      borderRadius: "0 6px 6px 0",
    }}>
      <div>
        <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "10px", color: "#00c853", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px 0" }}>
          Empresa
        </p>
        <p style={{ fontWeight: 700, fontSize: "15px", color: "#1a1a1a", margin: 0 }}>{company}</p>
        {data.client.email && (
          <p style={{ fontSize: "11px", color: "#666", margin: "3px 0 0 0" }}>✉ {data.client.email}</p>
        )}
        {data.client.phone && (
          <p style={{ fontSize: "11px", color: "#666", margin: "2px 0 0 0" }}>☎ {data.client.phone}</p>
        )}
      </div>
      {contact && (
        <div style={{ textAlign: "right" }}>
          <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "10px", color: "#00c853", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px 0" }}>
            Solicitante
          </p>
          <p style={{ fontWeight: 700, fontSize: "15px", color: "#1a1a1a", margin: 0 }}>{contact}</p>
        </div>
      )}
    </div>
  );
}
