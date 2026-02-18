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
        <table style={{ position: "relative", zIndex: 10, width: "794px", height: "64px", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ padding: "0 36px", verticalAlign: "middle" }}>
                <LogoWithTransparentBg
                  src="/images/promo-brindes-logo-v2.png"
                  alt="Promo Brindes"
                  style={{ height: "30px", display: "block" }}
                />
              </td>
              <td style={{ padding: "0 36px", verticalAlign: "middle", textAlign: "right" }}>
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "rgba(255,255,255,0.6)" }}>
                  Continuacao&nbsp;&nbsp;
                </span>
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "#ffffff" }}>
                  Proposta {data.quoteNumber}&nbsp;&nbsp;
                </span>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>
                  {data.date}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  const H = 128;
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
        left: "50px",
        bottom: `${barH}px`,
        width: "234px",
        paddingTop: "34px",
        paddingLeft: "14px",
        paddingRight: "14px",
        boxSizing: "border-box",
      }}>
        <LogoWithTransparentBg
          src="/images/promo-brindes-logo-v2.png"
          alt="Promo Brindes"
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </div>

      <div style={{ position: "absolute", zIndex: 10, textAlign: "right", top: "0", bottom: "0", right: "32px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end" }}>
        <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: "20px", textTransform: "uppercase", letterSpacing: "3px", margin: "0 0 6px 0", lineHeight: 1, whiteSpace: "nowrap", color: "#ffffff" }}>
          Proposta Comercial
        </p>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.95)", fontWeight: 400, lineHeight: "1.7", margin: 0, fontFamily: "'Montserrat', sans-serif" }}>
          Proposta {data.quoteNumber}
        </p>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)", margin: "0 0 6px 0", fontFamily: "'Montserrat', sans-serif", fontWeight: 400 }}>
          {data.date}
        </p>
        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.70)", margin: 0, fontFamily: "'Montserrat', sans-serif", fontWeight: 400, whiteSpace: "nowrap" }}>
          (11) 4637-5517  |  www.promobrindes.com.br
        </p>
      </div>
    </div>
  );
}
