import React from "react";
import type { ProposalTemplateData } from "../ProposalHtmlTemplate";
import { LogoWithTransparentBg } from "./LogoWithTransparentBg";

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
          <rect x="0" y="0" width="794" height="64" fill="#000000" />
          <rect x="0" y="58" width="794" height="6" fill="#00c853" />
        </svg>
        <div style={{ position: "relative", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 36px", height: "64px" }}>
          <LogoWithTransparentBg
            src="/images/promo-brindes-logo-v2.png"
            alt="Promo Brindes"
            style={{ height: "30px", display: "block" }}
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
  const barH = 7;
  const darkStart = 380;
  const greenStart = 350;
  const darkEnd = 430;
  const greenEnd = 400;

  return (
    <div style={{ position: "relative", width: `${W}px`, height: `${H}px`, flexShrink: 0 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", top: 0, left: 0 }}>
        <rect x="0" y="0" width={W} height={H} fill="#ffffff" />
        <polygon points={`${darkStart},0 ${W},0 ${W},${H} ${darkEnd},${H}`} fill="#000000" />
        <polygon points={`${greenStart},0 ${darkStart},0 ${darkEnd},${H} ${greenEnd},${H}`} fill="#00c853" />
        <rect x="0" y={H - barH} width={W} height={barH} fill="#00c853" />
      </svg>

      <div style={{
        position: "absolute",
        zIndex: 10,
        top: "0",
        left: "24px",
        bottom: `${barH}px`,
        width: "260px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "10px 14px",
        gap: "6px",
      }}>
        <LogoWithTransparentBg
          src="/images/promo-brindes-logo-v2.png"
          alt="Promo Brindes"
          style={{ width: "100%", height: "auto", display: "block" }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", paddingLeft: "2px" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#444", letterSpacing: "0.3px" }}>
            📞 (11) 4637-5517
          </span>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#00c853", letterSpacing: "0.3px" }}>
            🌐 www.promobrindes.com.br
          </span>
        </div>
      </div>

      <div style={{ position: "absolute", zIndex: 10, textAlign: "right", color: "#ffffff", top: "50%", right: "32px", transform: "translateY(-75%)" }}>
        <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: "22px", textTransform: "uppercase", letterSpacing: "3px", margin: "0 0 8px 0", lineHeight: 1, whiteSpace: "nowrap" }}>
          Proposta Comercial
        </p>
        <p style={{ fontSize: "15px", opacity: 0.95, fontWeight: 400, lineHeight: "1.8", margin: 0, fontVariantNumeric: "tabular-nums", fontFamily: "'Montserrat', sans-serif" }}>
          Proposta {data.quoteNumber}
        </p>
        <p style={{ fontSize: "13px", opacity: 0.65, margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
          {data.date}
        </p>
      </div>
    </div>
  );
}
