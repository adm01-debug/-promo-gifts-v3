/**
 * MockupApprovalTemplate — HTML template for the approval document.
 * Follows the visual identity of the commercial proposal (ProposalHtmlTemplate).
 * One product per page. Rendered as a web page, exportable to PDF.
 */

import React, { forwardRef } from "react";
import type { MockupApprovalData } from "@/types/mockup-approval";

const GREEN = "#00c853";
const DARK = "#2d2d2d";

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

          {/* Two-column: Mockup + Product/Tech info */}
          <div style={{ display: "flex", gap: "24px", marginTop: "20px" }}>
            {/* Left: Mockup image */}
            <div style={{ flex: "0 0 340px" }}>
              <div style={{
                width: "340px",
                height: "340px",
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
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
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

            {/* Right: Product + Technique details */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Product card */}
              <ProductSection product={data.product} />

              {/* Technique card */}
              <TechniqueSection personalization={data.personalization} />
            </div>
          </div>

          {/* Pantone table */}
          {data.pantoneColors.length > 0 && (
            <PantoneSection colors={data.pantoneColors} />
          )}

          {/* Notes */}
          {data.notes && (
            <div style={{ marginTop: "20px", fontSize: "12px", color: "#666", lineHeight: "1.6", borderTop: "1px solid #eee", paddingTop: "12px" }}>
              <div style={{ fontWeight: 700, fontSize: "11px", color: "#333", marginBottom: "4px", textTransform: "uppercase" }}>
                Observações
              </div>
              <div>{data.notes}</div>
            </div>
          )}

          {/* Seller signature */}
          <SellerSignature seller={data.seller} printDate={printDate} />
        </div>

        {/* ═══ FOOTER ═══ */}
        <ApprovalFooter printDate={printDate} />
      </div>
    );
  }
);

MockupApprovalTemplate.displayName = "MockupApprovalTemplate";

/* ─── Header ─── */
function ApprovalHeader({ documentNumber, date }: { documentNumber: string; date: string }) {
  const H = 130;
  const W = 794;
  const barH = 7;
  const darkStart = 340;
  const greenStart = 310;
  const darkEnd = 390;
  const greenEnd = 360;

  return (
    <div style={{ position: "relative", width: `${W}px`, height: `${H}px`, flexShrink: 0, marginBottom: "16px" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", top: 0, left: 0 }}>
        <rect x="0" y="0" width={W} height={H} fill="#ffffff" />
        <polygon points={`${darkStart},0 ${W},0 ${W},${H} ${darkEnd},${H}`} fill={DARK} />
        <polygon points={`${greenStart},0 ${darkStart},0 ${darkEnd},${H} ${greenEnd},${H}`} fill={GREEN} />
        <rect x="0" y={H - barH} width={W} height={barH} fill={GREEN} />
      </svg>

      {/* Logo */}
      <div style={{
        position: "absolute", zIndex: 10, top: 0, left: "24px",
        bottom: `${barH}px`, width: "280px",
        display: "flex", alignItems: "center", justifyContent: "flex-start",
        padding: "10px 14px",
      }}>
        <img
          src="/images/promo-brindes-logo.png"
          alt="Promo Brindes"
          crossOrigin="anonymous"
          style={{ width: "100%", height: "auto", display: "block", mixBlendMode: "multiply" as any }}
        />
      </div>

      {/* Title */}
      <div style={{
        position: "absolute", zIndex: 10, textAlign: "right", color: "#ffffff",
        top: "50%", right: "32px", transform: "translateY(-55%)",
      }}>
        <p style={{
          fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: "22px",
          textTransform: "uppercase", letterSpacing: "3px", margin: "0 0 6px 0", lineHeight: 1, whiteSpace: "nowrap",
        }}>
          Aprovação de Mockup
        </p>
        <p style={{
          fontSize: "12px", opacity: 0.95, fontWeight: 400, lineHeight: "1.8", margin: 0,
          fontVariantNumeric: "tabular-nums", fontFamily: "'Montserrat', sans-serif",
        }}>
          Ref.&nbsp;{documentNumber} • {date}
        </p>
      </div>
    </div>
  );
}

/* ─── Client Section ─── */
function ClientSection({ client }: { client: MockupApprovalData["client"] }) {
  return (
    <div style={{
      backgroundColor: "#f5f5f5", borderLeft: `6px solid ${GREEN}`,
      padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    }}>
      <div>
        <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "11px", color: GREEN, textTransform: "uppercase", margin: "0 0 4px 0" }}>
          Empresa
        </div>
        <div style={{ fontWeight: 600, fontSize: "15px", color: "#222" }}>{client.name}</div>
        {client.cnpj && <div style={{ fontSize: "11px", color: "#666", marginTop: "2px", fontWeight: 700 }}>CNPJ: {client.cnpj}</div>}
        {client.phone && <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>☎ {client.phone}</div>}
      </div>
      {client.contactName && (
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "11px", color: GREEN, textTransform: "uppercase", margin: "0 0 4px 0" }}>
            Solicitante
          </div>
          <div style={{ fontWeight: 600, fontSize: "15px", color: "#222" }}>{client.contactName}</div>
        </div>
      )}
    </div>
  );
}

/* ─── Product Section ─── */
function ProductSection({ product }: { product: MockupApprovalData["product"] }) {
  return (
    <div style={{ border: "1px solid #e8e8e8", borderRadius: "6px", padding: "14px", backgroundColor: "#fafafa" }}>
      <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "11px", color: GREEN, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
        Produto
      </div>
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            crossOrigin="anonymous"
            style={{ width: "60px", height: "60px", objectFit: "contain", borderRadius: "4px", border: "1px solid #eee", backgroundColor: "#fff", padding: "2px" }}
          />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "14px", color: "#111", marginBottom: "4px" }}>{product.name}</div>
          {product.sku && (
            <span style={{
              display: "inline-block",
              background: product.colorHex || "#2e7d32",
              color: getContrastColor(product.colorHex || "#2e7d32"),
              fontSize: "10px", padding: "1px 5px", borderRadius: "3px",
              fontWeight: 700, fontFamily: "'Roboto Mono', monospace",
            }}>
              {product.sku}
            </span>
          )}
          <div style={{ display: "flex", gap: "16px", marginTop: "6px", fontSize: "11px", color: "#666" }}>
            {product.color && <span>Cor: <strong style={{ color: "#333" }}>{product.color}</strong></span>}
            {product.material && <span>Material: <strong style={{ color: "#333" }}>{product.material}</strong></span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Technique Section ─── */
function TechniqueSection({ personalization }: { personalization: MockupApprovalData["personalization"] }) {
  return (
    <div style={{ border: "1px solid #e8e8e8", borderRadius: "6px", padding: "14px", backgroundColor: "#fafafa" }}>
      <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "11px", color: GREEN, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
        Personalização
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <InfoCell label="Técnica" value={personalization.techniqueName} />
        <InfoCell label="Local" value={personalization.locationName} />
        <InfoCell label="Dimensões" value={`${personalization.widthCm} × ${personalization.heightCm} cm`} />
        <InfoCell label="Área" value={personalization.areaCm2 ? `${personalization.areaCm2.toFixed(1)} cm²` : `${(personalization.widthCm * personalization.heightCm).toFixed(1)} cm²`} />
        {personalization.colorsCount !== undefined && (
          <InfoCell label="Cores" value={`${personalization.colorsCount} cor${personalization.colorsCount > 1 ? "es" : ""}`} />
        )}
      </div>
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

/* ─── Pantone Section ─── */
function PantoneSection({ colors }: { colors: MockupApprovalData["pantoneColors"] }) {
  return (
    <div style={{ marginTop: "20px" }}>
      <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "11px", color: GREEN, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
        Cores Pantone
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "6px 10px", backgroundColor: DARK, color: "#fff", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Swatch</th>
            <th style={{ textAlign: "left", padding: "6px 10px", backgroundColor: DARK, color: "#fff", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Código Pantone</th>
            <th style={{ textAlign: "left", padding: "6px 10px", backgroundColor: DARK, color: "#fff", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Hex</th>
          </tr>
        </thead>
        <tbody>
          {colors.map((color, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: "6px 10px" }}>
                <div style={{
                  width: "24px", height: "24px", borderRadius: "4px",
                  backgroundColor: color.hex, border: "1px solid #ddd",
                }} />
              </td>
              <td style={{ padding: "6px 10px", fontWeight: 600 }}>{color.name}</td>
              <td style={{ padding: "6px 10px", fontFamily: "'Roboto Mono', monospace", fontSize: "11px", color: "#666" }}>{color.hex.toUpperCase()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Seller Signature ─── */
function SellerSignature({ seller, printDate }: { seller: MockupApprovalData["seller"]; printDate: string }) {
  if (!seller.name) return null;

  return (
    <div style={{ marginTop: "40px", display: "flex", justifyContent: "flex-start" }}>
      <div style={{ textAlign: "center", minWidth: "220px", maxWidth: "280px" }}>
        <div style={{ minHeight: "36px", display: "flex", alignItems: "flex-end", justifyContent: "center", marginBottom: "2px" }}>
          <div style={{ fontFamily: "'Sacramento', cursive", fontSize: "32px", color: "#1a1a1a", lineHeight: 1, whiteSpace: "nowrap" }}>
            {seller.name}
          </div>
        </div>
        <div style={{ width: "100%", height: "1px", backgroundColor: "#999", margin: "0 auto 6px auto" }} />
        <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "11px", color: "#333", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {seller.name}
        </div>
        {seller.email && (
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "11px", color: "#777", marginTop: "2px" }}>
            {seller.email}
          </div>
        )}
        <div style={{ fontSize: "8px", color: "#333", marginTop: "6px", lineHeight: "1.3", fontWeight: 600 }}>
          Documento gerado eletronicamente por {seller.name} em {printDate}
        </div>
      </div>
    </div>
  );
}

/* ─── Footer ─── */
function ApprovalFooter({ printDate }: { printDate: string }) {
  return (
    <div style={{ width: "794px", flexShrink: 0, marginTop: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 36px", fontSize: "8px", color: "#999" }}>
        <span>Aprovação de Mockup — Promo Brindes</span>
        <span>Gerado em: {printDate}</span>
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
