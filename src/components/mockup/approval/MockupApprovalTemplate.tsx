/**
 * MockupApprovalTemplate — HTML template for the approval document.
 * One product per page. Rendered as a web page, exportable to PDF.
 */

import React, { forwardRef } from "react";
import type { MockupApprovalData } from "@/types/mockup-approval";
import { LogoWithTransparentBg } from "@/components/pdf/proposal/LogoWithTransparentBg";

const GREEN = "#00c853";
const DARK = "#000000";

export const MockupApprovalTemplate = forwardRef<HTMLDivElement, { data: MockupApprovalData }>(
  ({ data }, ref) => {
    const printDate = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    return (
      <div
        ref={ref}
        style={{
          width: "794px",
          minHeight: "1123px",
          backgroundColor: "#fff",
          fontFamily: "'Roboto', 'Segoe UI', Helvetica, Arial, sans-serif",
          color: "#333",
          position: "relative",
          boxSizing: "border-box",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ═══ HEADER ═══ */}
        <ApprovalHeader documentNumber={data.documentNumber} date={data.date} />

        {/* ═══ CONTENT ═══ */}
        <div style={{ padding: "0 50px", flex: 1 }}>
          {/* Client bar */}
          <ClientSection client={data.client} />

          {/* Main layout: Big mockup LEFT + All info RIGHT */}
          <div style={{ display: "flex", gap: "20px", marginTop: "16px" }}>
            {/* Left: Large mockup image */}
            <div style={{ flex: "0 0 483px" }}>
              <div style={{
                width: "483px",
                height: "630px",
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                overflow: "hidden",
                backgroundColor: "#fafafa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <img
                  src={data.mockupImageUrl}
                  alt="Mockup"
                  crossOrigin="anonymous"
                  style={{ maxWidth: "160%", maxHeight: "160%", objectFit: "contain" }}
                />
              </div>
              <div style={{
                marginTop: "6px",
                textAlign: "center",
                fontSize: "9px",
                color: "#999",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}>
                {data.layoutMode === "ai" ? "Gerado com IA" : "Composição Estática"}
              </div>
            </div>

            {/* Right: Product info + Personalization stacked */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Product info (no image) */}
              <div style={{ border: "1px solid #e8e8e8", borderRadius: "6px", padding: "14px", backgroundColor: "#fafafa" }}>
                <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "11px", color: GREEN, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                  Produto
                </div>
                <div style={{ fontWeight: 700, fontSize: "14px", color: "#111", marginBottom: "6px" }}>{data.product.name}</div>
                {data.product.sku && (
                  <span style={{
                    display: "inline-block",
                    background: data.product.colorHex || "#2e7d32",
                    color: getContrastColor(data.product.colorHex || "#2e7d32"),
                    fontSize: "10px", padding: "1px 5px", borderRadius: "3px",
                    fontWeight: 700, fontFamily: "'Roboto Mono', monospace",
                  }}>
                    {data.product.sku}
                  </span>
                )}
                <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "11px", color: "#666" }}>
                  {data.product.color && <span>Cor: <strong style={{ color: "#333" }}>{data.product.color}</strong></span>}
                  {data.product.material && <span>Material: <strong style={{ color: "#333" }}>{data.product.material}</strong></span>}
                </div>
              </div>

              {/* Personalization */}
              <div style={{ border: "1px solid #e8e8e8", borderRadius: "6px", padding: "14px", backgroundColor: "#fafafa" }}>
                <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "11px", color: GREEN, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                  Personalização
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <InfoCell label="Técnica" value={data.personalization.techniqueName} />
                  <InfoCell label="Local" value={data.personalization.locationName} />
                  <InfoCell label="Dimensões" value={`${data.personalization.widthCm} × ${data.personalization.heightCm} cm`} />
                  <InfoCell label="Área" value={data.personalization.areaCm2 ? `${data.personalization.areaCm2.toFixed(1)} cm²` : `${(data.personalization.widthCm * data.personalization.heightCm).toFixed(1)} cm²`} />
                  {data.personalization.colorsCount !== undefined && (
                    <InfoCell label="Cores" value={`${data.personalization.colorsCount} cor${data.personalization.colorsCount > 1 ? "es" : ""}`} />
                  )}
                </div>
              </div>
              {/* Pantone colors — compact, inside right column */}
              {data.pantoneColors.length > 0 && (
                <PantoneSection colors={data.pantoneColors} />
              )}
            </div>
          </div>

          {/* Notes */}
          {data.notes && (
            <div style={{ marginTop: "14px", fontSize: "11px", color: "#666", lineHeight: "1.5", borderTop: "1px solid #eee", paddingTop: "8px" }}>
              <div style={{ fontWeight: 700, fontSize: "10px", color: "#333", marginBottom: "3px", textTransform: "uppercase" }}>
                Observações
              </div>
              <div>{data.notes}</div>
            </div>
          )}
        </div>

        {/* ═══ FOOTER with seller signature ═══ */}
        <ApprovalFooter printDate={printDate} seller={data.seller} />
      </div>
    );
  }
);

MockupApprovalTemplate.displayName = "MockupApprovalTemplate";

/* ─── Header ─── */
function ApprovalHeader({ documentNumber, date }: { documentNumber: string; date: string }) {
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
        <polygon points={`${greenStart},0 ${darkStart},0 ${darkEnd},${H} ${greenEnd},${H}`} fill={GREEN} />
        <rect x="0" y={H - barH} width={W} height={barH} fill={GREEN} />
      </svg>
      <div style={{ position: "absolute", zIndex: 10, top: "0", left: "50px", bottom: `${barH}px`, width: "234px", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", padding: "10px 14px" }}>
        <LogoWithTransparentBg src="/images/promo-brindes-logo-v2.png" alt="Promo Brindes" style={{ width: "100%", height: "auto", display: "block" }} />
      </div>
      <div style={{ position: "absolute", zIndex: 10, textAlign: "right", color: "#ffffff", top: "0", bottom: "0", right: "32px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end" }}>
        <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: "20px", textTransform: "uppercase", letterSpacing: "3px", margin: "0 0 6px 0", lineHeight: 1, whiteSpace: "nowrap" }}>
          Aprovação de Layout
        </p>
        <p style={{ fontSize: "13px", opacity: 0.95, fontWeight: 400, lineHeight: "1.7", margin: 0, fontVariantNumeric: "tabular-nums", fontFamily: "'Montserrat', sans-serif", whiteSpace: "nowrap", letterSpacing: "0px" }}>
          Ref.&nbsp;{documentNumber}
        </p>
        <p style={{ fontSize: "13px", opacity: 0.85, margin: "0 0 6px 0", fontFamily: "'Montserrat', sans-serif", fontWeight: 400 }}>
          {date}
        </p>
        <p style={{ fontSize: "12px", opacity: 0.7, margin: 0, fontFamily: "'Montserrat', sans-serif", fontWeight: 400, whiteSpace: "nowrap" }}>
          (11) 4637-5517 &nbsp;|&nbsp; www.promobrindes.com.br
        </p>
      </div>
    </div>
  );
}

/* ─── Client Section ─── */
function ClientSection({ client }: { client: MockupApprovalData["client"] }) {
  return (
    <div style={{
      backgroundColor: "#f8f9fa",
      padding: "10px 18px",
      marginTop: "12px",
      marginBottom: "14px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      borderRadius: "6px",
    }}>
      <div>
        <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "13px", color: "#00c853", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px 0" }}>
          Empresa
        </p>
        <p style={{ fontWeight: 700, fontSize: "15px", color: "#1a1a1a", margin: 0 }}>{client.name}</p>
        {client.cnpj && (
          <p style={{ fontSize: "11px", color: "#666", margin: "3px 0 0 0", fontWeight: 700 }}>CNPJ: {client.cnpj}</p>
        )}
        {client.phone && (
          <p style={{ fontSize: "11px", color: "#666", margin: "2px 0 0 0" }}>☎ {client.phone}</p>
        )}
      </div>
      {client.contactName && (
        <div style={{ textAlign: "right" }}>
          <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "13px", color: "#00c853", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 4px 0" }}>
            Solicitante
          </p>
          <p style={{ fontWeight: 700, fontSize: "15px", color: "#1a1a1a", margin: 0 }}>{client.contactName}</p>
        </div>
      )}
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "6px 8px", backgroundColor: "#fff", borderRadius: "4px", border: "1px solid #f0f0f0" }}>
      <div style={{ fontSize: "9px", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "#222", marginTop: "2px" }}>{value}</div>
    </div>
  );
}

/* ─── Pantone Section — compact single-row style ─── */
function PantoneSection({ colors }: { colors: MockupApprovalData["pantoneColors"] }) {
  return (
    <div style={{ marginTop: "16px" }}>
      <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "10px", color: GREEN, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
        Cores Pantone
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "4px 8px", backgroundColor: DARK, color: "#fff", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Swatch</th>
            <th style={{ textAlign: "left", padding: "4px 8px", backgroundColor: DARK, color: "#fff", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Código Pantone</th>
            <th style={{ textAlign: "left", padding: "4px 8px", backgroundColor: DARK, color: "#fff", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Hex</th>
          </tr>
        </thead>
        <tbody>
          {colors.map((color, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: "3px 8px" }}>
                <div style={{ width: "18px", height: "18px", borderRadius: "3px", backgroundColor: color.hex, border: "1px solid #ddd" }} />
              </td>
              <td style={{ padding: "3px 8px", fontWeight: 600, fontSize: "11px" }}>{color.name}</td>
              <td style={{ padding: "3px 8px", fontFamily: "'Roboto Mono', monospace", fontSize: "10px", color: "#666" }}>{color.hex.toUpperCase()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Footer with compact seller signature ─── */
function ApprovalFooter({ printDate, seller }: { printDate: string; seller: MockupApprovalData["seller"] }) {
  return (
    <div style={{ width: "794px", flexShrink: 0, marginTop: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 36px", fontSize: "8px", color: "#000000", fontFamily: "'Montserrat', sans-serif" }}>
        <span>Aprovação de Layout — Promo Brindes</span>
        {seller.email && (
          <span>{seller.email}</span>
        )}
        {seller.name && (
          <span>Documento gerado eletronicamente por {seller.name} em {printDate}</span>
        )}
      </div>
      <div style={{ width: "794px", height: "40px", backgroundColor: GREEN }} />
    </div>
  );
}

/* ─── Util ─── */
function getContrastColor(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
}
