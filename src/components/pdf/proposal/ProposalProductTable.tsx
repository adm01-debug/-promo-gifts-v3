import React from "react";
import type { ProposalItem } from "../ProposalHtmlTemplate";

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
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      {showHeader && (
        <thead>
          <tr>
            <th style={{ ...thBase, textAlign: "center", width: "50px", borderRadius: "6px 0 0 0" }}>#</th>
            <th style={{ ...thBase, textAlign: "center", width: "80px" }}>Foto</th>
            <th style={{ ...thBase, textAlign: "left" }}>Descrição do Produto</th>
            <th style={{ ...thBase, textAlign: "center", width: "50px" }}>Qtd.</th>
            <th style={{ ...thBase, textAlign: "right", width: "90px" }}>Unitário</th>
            <th style={{ ...thBase, textAlign: "right", width: "95px", borderRadius: "0 6px 0 0" }}>Total</th>
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
            if (p.material) s += ` | ${p.material}`;
            return s;
          }).join(", ");

          return (
            <tr key={idx} style={{
              backgroundColor: isEven ? "#ffffff" : "#f9fafb",
              borderBottom: "1px solid #eef0f2",
            }}>
              {/* Row number */}
              <td style={{ padding: "8px 6px", textAlign: "center", verticalAlign: "middle", fontSize: "12px", fontWeight: 700, color: "#999" }}>
                {String(startIndex + idx + 1).padStart(2, "0")}
              </td>
              {/* Image */}
              <td style={{ padding: "6px", textAlign: "center", verticalAlign: "middle", width: "80px" }}>
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    crossOrigin="anonymous"
                    style={{
                      width: "60px",
                      height: "60px",
                      objectFit: "contain",
                      borderRadius: "6px",
                      border: "1px solid #e8e8e8",
                      backgroundColor: "#fff",
                      padding: "2px",
                    }}
                  />
                ) : (
                  <div style={{
                    width: "60px",
                    height: "60px",
                    backgroundColor: "#f0f0f0",
                    borderRadius: "6px",
                    border: "1px solid #e8e8e8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto",
                  }}>
                    <span style={{ fontSize: "9px", color: "#bbb" }}>—</span>
                  </div>
                )}
              </td>
              {/* Description */}
              <td style={{ padding: "8px 10px", verticalAlign: "top" }}>
                <span style={{ fontWeight: 800, color: "#111", fontSize: "13px", display: "block", marginBottom: "2px", lineHeight: "1.3" }}>
                  {item.name}
                </span>
                {item.sku && (
                  <span style={{
                    background: "#e8f5e9",
                    color: "#2e7d32",
                    fontSize: "9px",
                    padding: "1px 5px",
                    borderRadius: "3px",
                    fontWeight: 700,
                    fontFamily: "'Roboto Mono', monospace",
                  }}>
                    #{item.sku}
                  </span>
                )}
                {item.description && (
                  <span style={{ display: "block", fontSize: "11px", color: "#666", marginTop: "3px", lineHeight: "1.4", maxWidth: "380px" }}>
                    {item.description}
                  </span>
                )}
                {gravacao && (
                  <span style={{ display: "block", fontSize: "10px", color: "#00796b", marginTop: "2px", lineHeight: "1.3", fontWeight: 600 }}>
                    ✦ Gravação: {gravacao}
                  </span>
                )}
                {!gravacao && item.color && (
                  <span style={{ display: "block", fontSize: "10px", color: "#666", marginTop: "2px" }}>
                    Cor: {item.color}
                  </span>
                )}
              </td>
              {/* Qty */}
              <td style={{ padding: "8px 6px", textAlign: "center", verticalAlign: "middle", fontWeight: 800, fontSize: "14px", color: "#222" }}>
                {item.quantity}
              </td>
              {/* Unit price */}
              <td style={{ padding: "8px 6px", textAlign: "right", verticalAlign: "middle" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#333" }}>{fmt(allInUnitPrice)}</span>
                {itemDiscount > 0 && (
                  <span style={{ display: "block", fontSize: "10px", color: "#e53935", marginTop: "2px", fontWeight: 600 }}>
                    -{fmt(itemDiscount)}
                  </span>
                )}
              </td>
              {/* Total */}
              <td style={{ padding: "8px 6px", textAlign: "right", verticalAlign: "middle", fontWeight: 800, fontSize: "14px", color: "#1a1a1a" }}>
                {fmt(total)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
