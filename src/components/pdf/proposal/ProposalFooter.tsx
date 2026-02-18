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
        <div style={{ position: "absolute", bottom: "4px", left: "40px", fontSize: "8px", color: "#999", display: "flex", gap: "16px", fontVariantNumeric: "tabular-nums" }}>
          <span>Página {pageNumber} de {totalPages}</span>
          <span>Impresso em: {printDate}</span>
        </div>
      </div>
    </div>
  );
}
