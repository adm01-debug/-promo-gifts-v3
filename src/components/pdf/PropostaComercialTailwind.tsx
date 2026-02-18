import React, { forwardRef } from "react";
import type { ProposalTemplateData, ProposalItem } from "./ProposalHtmlTemplate";
import { ProposalHeader } from "./proposal/ProposalHeader";
import { ProposalClientBar } from "./proposal/ProposalClientBar";
import { ProposalProductTable } from "./proposal/ProposalProductTable";
import { ProposalTotals } from "./proposal/ProposalTotals";
import { ProposalNotes } from "./proposal/ProposalNotes";
import { ProposalFooter } from "./proposal/ProposalFooter";

const PAGE_W = 794;
const PAGE_H = 1123;
const FIRST_HEADER_H = 155;
const CONT_HEADER_H = 60;
const FULL_FOOTER_H = 140;
const SIMPLE_FOOTER_H = 40;
const CONTENT_PAD = 36;
const CLIENT_BAR_H = 90;
const TOTALS_H = 160;
const NOTES_H = 160; // condições comerciais + aceite do cliente
const TABLE_HEADER_H = 38;
const ROW_H = 76; // estimated row height

function paginateItems(items: ProposalItem[]) {
  // First page: header(145) + clientbar(90) + tableheader(38) + footer(40/140) + totals/notes
  // Available for rows on first page
  const firstPageAvailable = PAGE_H - FIRST_HEADER_H - CLIENT_BAR_H - TABLE_HEADER_H - SIMPLE_FOOTER_H - 30; // 30 padding
  const firstPageRows = Math.floor(firstPageAvailable / ROW_H);

  if (items.length <= firstPageRows) {
    // Everything fits on one page
    return [items];
  }

  // Multi-page
  const pages: ProposalItem[][] = [];
  let remaining = [...items];

  // First page
  const fpRows = Math.min(firstPageRows, remaining.length);
  pages.push(remaining.slice(0, fpRows));
  remaining = remaining.slice(fpRows);

  // Middle/last pages
  while (remaining.length > 0) {
    const contPageAvailable = PAGE_H - CONT_HEADER_H - TABLE_HEADER_H - SIMPLE_FOOTER_H - 30;
    const contPageRows = Math.floor(contPageAvailable / ROW_H);

    // If this is the last chunk, account for totals+notes+full footer
    if (remaining.length <= contPageRows) {
      // Check if totals+notes+full footer fit
      const spaceNeeded = remaining.length * ROW_H + TABLE_HEADER_H + TOTALS_H + NOTES_H + FULL_FOOTER_H + CONT_HEADER_H + 40;
      if (spaceNeeded <= PAGE_H) {
        pages.push(remaining);
        remaining = [];
      } else {
        // Split: put some on this page, rest on next with totals
        const fitRows = Math.floor((PAGE_H - CONT_HEADER_H - TABLE_HEADER_H - SIMPLE_FOOTER_H - 30) / ROW_H);
        pages.push(remaining.slice(0, fitRows));
        remaining = remaining.slice(fitRows);
      }
    } else {
      pages.push(remaining.slice(0, contPageRows));
      remaining = remaining.slice(contPageRows);
    }
  }

  return pages;
}

export const PropostaComercialTailwind = forwardRef<HTMLDivElement, { data: ProposalTemplateData; isDraft?: boolean }>(
  ({ data, isDraft = false }, ref) => {
    const pages = paginateItems(data.items);
    const totalPages = pages.length;
    let itemIndex = 0;

    return (
      <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
        {pages.map((pageItems, pageIdx) => {
          const isFirst = pageIdx === 0;
          const isLast = pageIdx === totalPages - 1;
          const startIdx = itemIndex;
          itemIndex += pageItems.length;

          return (
            <div
              key={pageIdx}
              className="proposal-page"
              style={{
                width: `${PAGE_W}px`,
                height: `${PAGE_H}px`,
                backgroundColor: "#fff",
                fontFamily: "'Roboto', 'Segoe UI', Helvetica, Arial, sans-serif",
                color: "#333",
                position: "relative",
                boxSizing: "border-box",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                pageBreakAfter: isLast ? "auto" : "always",
              }}
            >
              {/* Watermark for drafts */}
              {isDraft && (
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%) rotate(-35deg)",
                  fontSize: "80px",
                  fontWeight: 900,
                  color: "rgba(200, 0, 0, 0.07)",
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  pointerEvents: "none",
                  zIndex: 5,
                  userSelect: "none",
                }}>
                  RASCUNHO
                </div>
              )}
              <ProposalHeader data={data} isContinuation={!isFirst} />

              <div style={{ padding: `0 ${CONTENT_PAD}px`, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {isFirst && <ProposalClientBar data={data} />}

                <ProposalProductTable
                  items={pageItems}
                  showHeader={true}
                  startIndex={startIdx}
                />

                {isLast && (
                  <>
                    <ProposalTotals data={data} />
                    <ProposalNotes data={data} />
                  </>
                )}
              </div>

              <ProposalFooter
                data={data}
                isLastPage={isLast}
                pageNumber={pageIdx + 1}
                totalPages={totalPages}
              />
            </div>
          );
        })}

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Roboto:wght@300;400;500;700&family=Sacramento&display=swap');
          @media print {
            body { background: white; }
            button { display: none; }
            @page { margin: 0; size: auto; }
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        `}</style>
      </div>
    );
  }
);

PropostaComercialTailwind.displayName = "PropostaComercialTailwind";

export default PropostaComercialTailwind;
