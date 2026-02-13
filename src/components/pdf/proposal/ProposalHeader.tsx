import React from "react";
import type { ProposalTemplateData } from "../ProposalHtmlTemplate";

interface Props {
  data: ProposalTemplateData;
  isContinuation?: boolean;
}

export function ProposalHeader({ data, isContinuation }: Props) {
  if (isContinuation) {
    return (
      <div style={{ width: "794px", height: "60px", flexShrink: 0, position: "relative" }}>
        <svg width="794" height="60" viewBox="0 0 794 60" style={{ position: "absolute", top: 0, left: 0 }}>
          <rect x="0" y="0" width="794" height="60" fill="#333333" />
          <rect x="0" y="56" width="794" height="4" fill="#00c853" />
        </svg>
        <div style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 36px", height: "60px" }}>
          <img
            src="/images/promo-brindes-logo.png"
            alt="Promo Brindes"
            style={{ height: "32px", display: "block" }}
            crossOrigin="anonymous"
          />
          <div style={{ textAlign: "right", color: "#fff" }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>
              Proposta #{data.quoteNumber}
            </span>
            <span style={{ fontSize: "11px", opacity: 0.7, marginLeft: "16px" }}>
              {data.date}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "794px", height: "145px", flexShrink: 0 }}>
      <svg width="794" height="145" viewBox="0 0 794 145" style={{ position: "absolute", top: 0, left: 0 }}>
        <polygon points="340,0 375,0 410,145 370,145" fill="#00c853" />
        <polygon points="370,0 794,0 794,115 395,115" fill="#333333" />
        <polygon points="395,115 418,115 395,145" fill="#009e41" />
      </svg>
      <div style={{ position: "absolute", zIndex: 10, top: "50%", left: "36px", transform: "translateY(-50%)", width: "190px" }}>
        <img src="/images/promo-brindes-logo.png" alt="Promo Brindes" style={{ width: "100%", display: "block" }} crossOrigin="anonymous" />
      </div>
      <div style={{ position: "absolute", zIndex: 10, textAlign: "right", color: "#fff", top: "20px", right: "36px" }}>
        <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: "26px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 4px 0" }}>
          Proposta
        </p>
        <p style={{ fontSize: "12px", opacity: 0.9, fontWeight: 300, lineHeight: "1.5", margin: 0 }}>
          Nº: #{data.quoteNumber}
        </p>
        <p style={{ fontSize: "12px", opacity: 0.9, fontWeight: 300, lineHeight: "1.5", margin: 0 }}>
          Data: {data.date}
        </p>
        {data.validUntil && (
          <p style={{ fontSize: "11px", opacity: 0.8, fontWeight: 400, lineHeight: "1.5", marginTop: "2px" }}>
            Válida até: {data.validUntil}
          </p>
        )}
      </div>
    </div>
  );
}
