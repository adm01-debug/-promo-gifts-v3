import React from "react";
import type { ProposalTemplateData } from "../ProposalHtmlTemplate";
import { ProposalNotes } from "./ProposalNotes";
import { ProposalSellerSignature } from "./ProposalSellerSignature";

interface Props {
  data: ProposalTemplateData;
  isLastPage?: boolean;
  pageNumber: number;
  totalPages: number;
}

export function ProposalFooter({ data, isLastPage, pageNumber, totalPages }: Props) {
  const printDate = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ width: "794px", flexShrink: 0, marginTop: "auto" }}>
      {/* Seller Signature only on last page */}
      {isLastPage && <ProposalSellerSignature data={data} />}

      {/* Condições Comerciais only on last page */}
      {isLastPage && (
        <div style={{ padding: "0 36px", marginBottom: "6px" }}>
          <ProposalNotes data={data} />
        </div>
      )}

      {/* Page info */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 36px", fontSize: "8px", color: "#999", fontVariantNumeric: "tabular-nums" }}>
        <span>Página {pageNumber} de {totalPages}</span>
        <span>Impresso em: {printDate}</span>
      </div>

      {/* Green bar */}
      <div style={{ width: "794px", height: "40px", backgroundColor: "#00c853" }} />
    </div>
  );
}
