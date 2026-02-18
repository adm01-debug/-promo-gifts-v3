import React from "react";
import type { ProposalTemplateData } from "../ProposalHtmlTemplate";

interface Props {
  data: ProposalTemplateData;
  isLastPage?: boolean;
  pageNumber: number;
  totalPages: number;
}

export function ProposalFooter({ isLastPage, pageNumber, totalPages }: Props) {
  const printDate = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ width: "794px", flexShrink: 0, marginTop: "auto" }}>
      {!isLastPage && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 36px", fontSize: "8px", color: "#999", fontVariantNumeric: "tabular-nums" }}>
          <span>Página {pageNumber} de {totalPages}</span>
          <span>Impresso em: {printDate}</span>
        </div>
      )}
      {isLastPage && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 36px", fontSize: "8px", color: "#999", fontVariantNumeric: "tabular-nums" }}>
          <span>Página {pageNumber} de {totalPages}</span>
          <span>Impresso em: {printDate}</span>
        </div>
      )}
      <div style={{ width: "794px", height: "40px", backgroundColor: "#00c853" }} />
    </div>
  );
}
