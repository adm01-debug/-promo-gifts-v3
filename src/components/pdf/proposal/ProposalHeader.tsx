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

  // Main header: white logo area left, sharp green diagonal, dark right with title
  const H = 150;
  const W = 794;
  // Diagonal cut: starts at x=320 top, x=370 bottom
  const diagX1 = 320; // top left of green band
  const diagX2 = 348; // top right of green band  
  const diagX3 = 400; // bottom right of green band
  const diagX4 = 372; // bottom left of green band

  return (
    <div style={{ position: "relative", width: `${W}px`, height: `${H}px`, flexShrink: 0 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", top: 0, left: 0 }}>
        {/* White background for logo area */}
        <rect x="0" y="0" width={W} height={H} fill="#ffffff" />

        {/* Dark right section */}
        <polygon
          points={`${diagX2},0 ${W},0 ${W},${H} ${diagX3},${H}`}
          fill="#2d2d2d"
        />

        {/* Green diagonal stripe */}
        <polygon
          points={`${diagX1},0 ${diagX2},0 ${diagX3},${H} ${diagX4},${H}`}
          fill="#00c853"
        />

        {/* Green bottom bar on white area */}
        <rect x="0" y={H - 6} width={diagX4} height="6" fill="#00c853" />
      </svg>

      {/* Logo - left side, large */}
      <div style={{
        position: "absolute",
        zIndex: 10,
        top: "50%",
        left: "36px",
        transform: "translateY(-50%)",
        width: "230px",
      }}>
        <img
          src="/images/promo-brindes-logo.png"
          alt="Promo Brindes"
          style={{ width: "100%", display: "block" }}
          crossOrigin="anonymous"
        />
      </div>

      {/* Title - right side */}
      <div style={{
        position: "absolute",
        zIndex: 10,
        textAlign: "right",
        color: "#ffffff",
        top: "50%",
        right: "36px",
        transform: "translateY(-50%)",
      }}>
        <p style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 900,
          fontSize: "28px",
          textTransform: "uppercase",
          letterSpacing: "3px",
          margin: "0 0 6px 0",
          lineHeight: 1,
        }}>
          Proposta Comercial
        </p>
        <p style={{
          fontSize: "12px",
          opacity: 0.85,
          fontWeight: 400,
          lineHeight: "1.6",
          margin: 0,
          fontVariantNumeric: "tabular-nums",
          fontFamily: "'Montserrat', sans-serif",
        }}>
          Nº {data.quoteNumber} • {data.date}
        </p>
        {data.validUntil && (
          <p style={{
            fontSize: "11px",
            opacity: 0.65,
            fontWeight: 400,
            lineHeight: "1.5",
            marginTop: "2px",
            fontFamily: "'Montserrat', sans-serif",
          }}>
            Válida até {data.validUntil}
          </p>
        )}
      </div>
    </div>
  );
}
