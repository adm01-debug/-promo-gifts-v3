import React, { useEffect, useState } from "react";
import type { ProposalItem } from "../ProposalHtmlTemplate";
import { processLogoTransparent } from "./LogoWithTransparentBg";

function ProductImageTransparent({ src, alt }: { src: string; alt: string }) {
  const [dataUrl, setDataUrl] = useState<string>("");
  useEffect(() => {
    processLogoTransparent(src).then(setDataUrl);
  }, [src]);
  return (
    <div style={{
      width: "92px",
      height: "92px",
      border: "0.5px solid #d0d0d0",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto",
      padding: "0px",
      boxSizing: "border-box",
    }}>
      <img
        src={dataUrl || src}
        alt={alt}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
    </div>
  );
}

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const thBase: React.CSSProperties = {
  backgroundColor: "#00c853",
  color: "#fff",
  padding: "10px 10px",
  fontSize: "11px",
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.3px",
};

interface Props {
  items: ProposalItem[];
  showHeader?: boolean;
  startIndex?: number;
}

export function ProposalProductTable({ items, showHeader = true, startIndex = 0 }: Props) {
  const hasAnyImage = items.some((item) => !!item.imageUrl);

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
      {showHeader && (
        <thead>
          <tr>
            {hasAnyImage && (
              <th style={{ ...thBase, textAlign: "center", width: "110px", borderRadius: "6px 0 0 0" }}>Foto</th>
            )}
            <th style={{ ...thBase, textAlign: "left", borderRadius: hasAnyImage ? "0" : "6px 0 0 0" }}>Descrição do Produto</th>
            <th style={{ ...thBase, textAlign: "center", width: "52px" }}>Qtd.</th>
            <th style={{ ...thBase, textAlign: "right", width: "90px", borderRadius: "0 6px 0 0" }}>Unitário</th>
          </tr>
        </thead>
      )}
      <tbody>
        {items.map((item, idx) => {
          const persUnitCost = item.personalizations?.reduce((sum, p) => {
            const pTotal = p.total_cost || 0;
            return sum + (item.quantity > 0 ? pTotal / item.quantity : 0);
          }, 0) || 0;
          const allInUnitPrice = item.unitPrice + persUnitCost;
          const itemDiscount = item.discount || 0;
          const total = item.quantity * allInUnitPrice - itemDiscount * item.quantity;
          const isEven = (startIndex + idx) % 2 === 0;

          const gravacao = item.personalizations?.map((p) => {
            let s = p.technique_name;
            // Try direct fields first, then parse from notes ("Local — Code | WxHcm")
            let widthCm = p.width_cm;
            let heightCm = p.height_cm;
            if ((!widthCm || !heightCm) && p.notes) {
              const dimMatch = p.notes.match(/\|\s*([\d.]+)×([\d.]+)cm/);
              if (dimMatch) {
                widthCm = parseFloat(dimMatch[1]);
                heightCm = parseFloat(dimMatch[2]);
              }
            }
            if (widthCm && heightCm) s += ` ${widthCm}×${heightCm}cm`;
            if (p.colors_count) s += ` | ${p.colors_count} cor${p.colors_count > 1 ? "es" : ""}`;
            if (p.material) s += ` | ${p.material}`;
            return s;
          }).join(" · ");

          return (
            <tr key={idx} style={{
              backgroundColor: isEven ? "#ffffff" : "#f9fafb",
              borderBottom: "1px solid #eef0f2",
            }}>
              {/* Image — conditional column */}
              {hasAnyImage && (
                <td style={{ padding: "1px", textAlign: "center", verticalAlign: "middle" }}>
                  {item.imageUrl ? (
                    <ProductImageTransparent src={item.imageUrl} alt={item.name} />
                  ) : (
                    <div style={{
                      width: "92px",
                      height: "92px",
                      backgroundColor: "#f5f5f5",
                      borderRadius: "4px",
                      border: "1.5px solid #d0d0d0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto",
                      boxSizing: "border-box",
                    }}>
                      <span style={{ fontSize: "9px", color: "#ccc" }}>—</span>
                    </div>
                  )}
                </td>
              )}
              {/* Description */}
              <td style={{ padding: "8px 10px", verticalAlign: "middle" }}>
                {(item.composedCode || item.sku) && (() => {
                  const bgColor = item.colorHex || "#2e7d32";
                  // Determine text color based on luminance
                  const hex = bgColor.replace("#", "");
                  const r = parseInt(hex.substring(0, 2), 16);
                  const g = parseInt(hex.substring(2, 4), 16);
                  const b = parseInt(hex.substring(4, 6), 16);
                  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                  const textColor = luminance > 0.5 ? "#1a1a1a" : "#ffffff";
                  return (
                    <span style={{
                      display: "inline-block",
                      background: bgColor,
                      color: textColor,
                      fontSize: "9px",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      fontWeight: 700,
                      fontFamily: "'Roboto Mono', monospace",
                      whiteSpace: "nowrap",
                      marginBottom: "4px",
                    }}>
                      {item.composedCode || item.sku}
                    </span>
                  );
                })()}
                <div style={{ fontWeight: 800, color: "#111", fontSize: "13px", lineHeight: "1.3", marginBottom: "2px" }}>
                  {item.name}
                </div>
                {item.description && (
                  <span style={{ display: "block", fontSize: "11px", color: "#666", marginBottom: "4px", lineHeight: "1.4", maxWidth: "380px" }}>
                    {item.description}
                  </span>
                )}
                {gravacao && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "3px 7px",
                    backgroundColor: "#e0f2f1",
                    borderRadius: "4px",
                    borderLeft: "3px solid #00796b",
                    maxWidth: "fit-content",
                    marginTop: "2px",
                  }}>
                    <span style={{ fontSize: "10px", color: "#00796b", fontWeight: 700 }}>
                      ✦ Gravação:
                    </span>
                    <span style={{ fontSize: "10px", color: "#00796b", fontWeight: 500 }}>
                      {gravacao}
                    </span>
                  </div>
                )}
                {!gravacao && item.color && (
                  <span style={{ display: "block", fontSize: "10px", color: "#666", marginTop: "2px" }}>
                    Cor: {item.color}
                  </span>
                )}
              </td>
              {/* Qty */}
              <td style={{ padding: "8px 6px", textAlign: "center", verticalAlign: "middle", fontWeight: 800, fontSize: "14px", color: "#222", fontVariantNumeric: "tabular-nums" }}>
                {item.quantity}
              </td>
              {/* Unit price */}
              <td style={{ padding: "8px 8px", textAlign: "right", verticalAlign: "middle", fontVariantNumeric: "tabular-nums" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#333" }}>{fmt(allInUnitPrice)}</span>
                {itemDiscount > 0 && (
                  <span style={{ display: "block", fontSize: "10px", color: "#e53935", marginTop: "2px", fontWeight: 600 }}>
                    -{fmt(itemDiscount)}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
