import React from "react";
import type { ProposalTemplateData } from "../ProposalHtmlTemplate";

interface Props {
  data: ProposalTemplateData;
  isContinuation?: boolean;
  quoteNumber?: string;
}

export function ProposalHeader({ data, isContinuation }: Props) {
  if (isContinuation) {
    return (
      <div style={{ width: "794px", height: "64px", flexShrink: 0, position: "relative" }}>
        <svg width="794" height="64" viewBox="0 0 794 64" style={{ position: "absolute", top: 0, left: 0 }}>
          <rect x="0" y="0" width="794" height="64" fill="#2d2d2d" />
          <rect x="0" y="58" width="794" height="6" fill="#00c853" />
        </svg>
        <div style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 36px", height: "64px" }}>
          <img
            src="/images/promo-brindes-logo.png"
            alt="Promo Brindes"
            style={{ height: "30px", display: "block", filter: "brightness(0) invert(1)" }}
            crossOrigin="anonymous"
          />
          <div style={{ textAlign: "right", color: "#fff", display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.6 }}>
              Continuação
            </span>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>
              Proposta {data.quoteNumber}
            </span>
            <span style={{ fontSize: "11px", opacity: 0.6 }}>
              {data.date}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const H = 160;
  const W = 794;
  const t1 = 318;
  const t2 = 348;
  const b1 = 370;
  const b2 = 402;
  const barH = 8;
  const frameBottom = H - barH;

  return (
    <div style={{ position: "relative", width: `${W}px`, height: `${H}px`, flexShrink: 0 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", top: 0, left: 0 }}>
        <rect x="0" y="0" width={W} height={H} fill="#ffffff" />
        <polygon points={`${t2},0 ${W},0 ${W},${H} ${b2},${H}`} fill="#2d2d2d" />
        <polygon points={`${t1},0 ${t2},0 ${b2},${H} ${b1},${H}`} fill="#00c853" />
        <rect x="0" y={frameBottom} width={t1} height={barH} fill="#00c853" />
      </svg>

      <div style={{
        position: "absolute",
        zIndex: 10,
        top: "10px",
        left: "24px",
        bottom: `${barH + 6}px`,
        width: "270px",
        border: "2px solid #1a1a1a",
        backgroundColor: "#ffffff",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px 14px",
      }}>
        <img src="/images/promo-brindes-logo.png" alt="Promo Brindes" style={{ width: "100%", display: "block" }} crossOrigin="anonymous" />
      </div>

      <div style={{ position: "absolute", zIndex: 10, textAlign: "right", color: "#ffffff", top: "50%", right: "32px", transform: "translateY(-50%)" }}>
        <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: "26px", textTransform: "uppercase", letterSpacing: "2.5px", margin: "0 0 6px 0", lineHeight: 1, whiteSpace: "nowrap" }}>
          Proposta Comercial
        </p>
        <p style={{ fontSize: "12px", opacity: 0.9, fontWeight: 400, lineHeight: "1.7", margin: 0, fontVariantNumeric: "tabular-nums", fontFamily: "'Montserrat', sans-serif" }}>
          Nº {data.quoteNumber} • {data.date}
        </p>
        {data.validUntil && (
          <p style={{ fontSize: "11px", opacity: 0.7, fontWeight: 400, lineHeight: "1.5", marginTop: "2px", fontFamily: "'Montserrat', sans-serif" }}>
            Válida até {data.validUntil}
          </p>
        )}
      </div>
    </div>
  );
}
