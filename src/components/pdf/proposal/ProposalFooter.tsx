import React from "react";
import type { ProposalTemplateData } from "../ProposalHtmlTemplate";

function ContactDot({ color, text }: { color: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: 700, color: "#333" }}>
      <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
      <span>{text}</span>
    </div>
  );
}

interface Props {
  data: ProposalTemplateData;
  isLastPage?: boolean;
  pageNumber: number;
  totalPages: number;
}

export function ProposalFooter({ data, isLastPage, pageNumber, totalPages }: Props) {
  const printDate = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  if (!isLastPage) {
    return (
      <div style={{ width: "794px", height: "40px", flexShrink: 0, marginTop: "auto", position: "relative" }}>
        <svg width="794" height="40" viewBox="0 0 794 40" style={{ position: "absolute", top: 0, left: 0 }}>
          <rect x="0" y="0" width="794" height="4" fill="#00c853" />
          <rect x="0" y="4" width="794" height="36" fill="#333333" />
        </svg>
        <div style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 36px", height: "40px" }}>
          <span style={{ fontSize: "10px", color: "#aaa" }}>promobrindes.com</span>
          <span style={{ fontSize: "10px", color: "#aaa", fontVariantNumeric: "tabular-nums" }}>
            Página {pageNumber} de {totalPages}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "794px", height: "140px", flexShrink: 0, marginTop: "auto" }}>
      <svg width="794" height="140" viewBox="0 0 794 140" style={{ position: "absolute", top: 0, left: 0 }}>
        <polygon points="360,140 380,10 408,10 388,140" fill="#e0e0e0" />
        <polygon points="385,140 405,10 441,10 421,140" fill="#00c853" />
        <polygon points="438,45 794,45 794,100 413,100" fill="#333333" />
        <rect x="468" y="100" width="326" height="40" fill="#00c853" />
        <polygon points="468,100 489,100 468,130" fill="#009e41" />
      </svg>

      <div style={{ position: "relative", zIndex: 10, height: "100%", padding: "0 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", paddingTop: "8px", marginBottom: "8px" }}>
          <ContactDot color="#333333" text={data.seller.phone || "00-00000-0000"} />
          <ContactDot color="#00c853" text="promobrindes.com" />
        </div>

        <div style={{ fontSize: "9px", fontWeight: 600, color: "#555", lineHeight: "1.3" }}>
          CNPJ: 36.835.552/0001-67 | Razão Social: Brasil Marcas Industria e Comercio de Brindes LTDA.
        </div>

        <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "13px", fontWeight: 700, color: "#0085ca", fontStyle: "italic", marginTop: "4px" }}>
          adm01@promobrindes.com.br
        </div>

        {/* Assinatura do vendedor */}
        <div style={{ position: "absolute", top: "8px", right: "44px", textAlign: "center" }}>
          <div style={{ fontFamily: "'Sacramento', cursive", fontSize: "28px", color: "#0085ca", marginBottom: "-4px", transform: "rotate(-3deg)" }}>
            {data.seller.name}
          </div>
          <p style={{ fontWeight: 800, fontSize: "10px", textTransform: "uppercase", marginTop: "4px", color: "#000", margin: "4px 0 0 0" }}>
            {data.seller.name}
          </p>
          <div style={{ width: "150px", height: "1px", backgroundColor: "#333", margin: "2px auto" }} />
          <p style={{ fontSize: "9px", color: "#666", margin: "2px 0 0 0" }}>Executivo de Vendas</p>
        </div>

        {/* Page number + print date */}
        <div style={{ position: "absolute", bottom: "4px", left: "40px", fontSize: "8px", color: "#999", display: "flex", gap: "16px", fontVariantNumeric: "tabular-nums" }}>
          <span>Página {pageNumber} de {totalPages}</span>
          <span>Impresso em: {printDate}</span>
        </div>
      </div>
    </div>
  );
}
