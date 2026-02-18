import React from "react";
import type { ProposalTemplateData } from "../ProposalHtmlTemplate";

export function ProposalClientBar({ data }: { data: ProposalTemplateData }) {
  const company = data.client.company || data.client.name;
  const contact = data.client.contactName || "";

  return (
    <table style={{
      width: "100%",
      borderCollapse: "collapse",
      backgroundColor: "#f8f9fa",
      marginTop: "12px",
      marginBottom: "14px",
      borderRadius: "6px",
    }}>
      <tbody>
        <tr>
          <td style={{ padding: "10px 18px", verticalAlign: "top" }}>
            <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "13px", color: "#00c853", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
              Empresa
            </div>
            <div style={{ fontWeight: 700, fontSize: "15px", color: "#1a1a1a" }}>{company}</div>
            {data.client.cnpj && (
              <div style={{ fontSize: "11px", color: "#666", marginTop: "3px", fontWeight: 700 }}>CNPJ: {data.client.cnpj}</div>
            )}
            {data.client.phone && (
              <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>Tel: {data.client.phone}</div>
            )}
          </td>
          {contact && (
            <td style={{ padding: "10px 18px", verticalAlign: "top", textAlign: "right" }}>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "13px", color: "#00c853", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                Solicitante
              </div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "#1a1a1a" }}>{contact}</div>
            </td>
          )}
        </tr>
      </tbody>
    </table>
  );
}
