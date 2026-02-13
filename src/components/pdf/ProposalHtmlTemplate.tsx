import React, { forwardRef } from "react";

export interface ProposalItemPersonalization {
  technique_name: string;
  material?: string;
  colors_count?: number;
  area_cm2?: number;
  unit_cost?: number;
  setup_cost?: number;
  total_cost?: number;
}

export interface ProposalItem {
  name: string;
  sku?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  color?: string;
  imageUrl?: string;
  material?: string;
  personalizations?: ProposalItemPersonalization[];
}

export interface ProposalTemplateData {
  quoteNumber: string;
  date: string;
  validUntil: string;
  client: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    contactName?: string;
  };
  seller: {
    name: string;
    email?: string;
    phone?: string;
  };
  items: ProposalItem[];
  subtotal: number;
  discount?: number;
  shippingCost?: number;
  total: number;
  notes?: string;
  paymentTerms?: string;
  deliveryTime?: string;
}

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const GREEN = "#00bf63";
const DARK = "#333333";
const DARK_GREEN = "#008f4a";

/**
 * ProposalHtmlTemplate — html2canvas-compatible
 * 
 * Avoids CSS transforms (skewX/rotate) that html2canvas can't render.
 * Uses SVG polygons for diagonal/geometric shapes instead.
 */
export const ProposalHtmlTemplate = forwardRef<HTMLDivElement, { data: ProposalTemplateData }>(
  ({ data }, ref) => {
    const company = data.client.company || data.client.name;
    const contact = data.client.contactName || data.client.name;

    return (
      <div
        ref={ref}
        style={{
          width: "794px",
          minHeight: "1123px",
          backgroundColor: "#fff",
          fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif",
          color: "#333",
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {/* ═══ HEADER — SVG-based geometric shapes ═══ */}
        <div style={{ position: "relative", width: "794px", height: "150px", overflow: "hidden" }}>
          <svg
            width="794"
            height="150"
            viewBox="0 0 794 150"
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            {/* Green bar left bottom */}
            <rect x="0" y="120" width="380" height="5" fill={GREEN} />
            {/* Green diagonal tall block */}
            <polygon points="340,150 370,0 430,0 400,150" fill={GREEN} />
            {/* Dark grey skewed block */}
            <polygon points="390,0 794,0 794,120 360,120" fill={DARK} />
            {/* Green bottom-right strip */}
            <rect x="400" y="120" width="394" height="30" fill={GREEN} />
            {/* Green connector diagonal */}
            <polygon points="370,120 400,120 380,150 350,150" fill={GREEN} />
          </svg>

          {/* Logo on top of SVG */}
          <div
            style={{
              position: "absolute",
              top: "30px",
              left: "40px",
              width: "220px",
              zIndex: 10,
            }}
          >
            <img
              src="/images/promo-brindes-logo.png"
              alt="Promo Brindes"
              style={{ width: "100%", display: "block" }}
              crossOrigin="anonymous"
            />
          </div>

          {/* Quote info on dark block */}
          <div
            style={{
              position: "absolute",
              top: "25px",
              right: "40px",
              textAlign: "right",
              color: "#fff",
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: "22px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
              Orçamento
            </div>
            <div style={{ fontSize: "12px", lineHeight: "1.5" }}>
              Nº: #{data.quoteNumber}<br />
              Data: {data.date}
            </div>
          </div>
        </div>

        {/* ═══ CONTENT ═══ */}
        <div style={{ padding: "20px 50px 0" }}>
          {/* Client Info */}
          <div
            style={{
              backgroundColor: "#f8f8f8",
              borderLeft: `5px solid ${GREEN}`,
              padding: "18px 20px",
              marginBottom: "25px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontSize: "11px", color: GREEN, textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>
                Empresa
              </div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "#000" }}>{company}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: GREEN, textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>
                Solicitante
              </div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "#000" }}>{contact}</div>
            </div>
          </div>

          {/* Products Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "25px" }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "left" }}>Descrição</th>
                <th style={{ ...thStyle, textAlign: "center", width: "55px" }}>Qtd.</th>
                <th style={{ ...thStyle, textAlign: "right", width: "85px" }}>Unitário</th>
                <th style={{ ...thStyle, textAlign: "right", width: "85px" }}>Desconto</th>
                <th style={{ ...thStyle, textAlign: "right", width: "95px" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => {
                const persUnitCost = item.personalizations?.reduce((sum, p) => {
                  const pTotal = p.total_cost || 0;
                  return sum + (item.quantity > 0 ? pTotal / item.quantity : 0);
                }, 0) || 0;
                const allInUnitPrice = item.unitPrice + persUnitCost;
                const itemDiscount = item.discount || 0;
                const total = item.quantity * allInUnitPrice - itemDiscount * item.quantity;

                const gravacao = item.personalizations?.map((p) => {
                  let s = p.technique_name;
                  if (p.colors_count && p.colors_count > 1) s += ` (${p.colors_count} cores)`;
                  return s;
                }).join(", ");

                const mat = item.personalizations?.[0]?.material || item.material;

                return (
                  <tr key={idx} style={{ backgroundColor: idx % 2 === 1 ? "#fafafa" : "#fff" }}>
                    <td style={{ ...tdStyle, borderBottom: "1px solid #eee" }}>
                      <span style={{ fontWeight: 700, color: "#000", fontSize: "13px" }}>
                        {item.name}
                      </span>
                      {item.sku && (
                        <span
                          style={{
                            fontFamily: "monospace",
                            background: "#eee",
                            padding: "1px 5px",
                            borderRadius: "3px",
                            fontSize: "10px",
                            color: "#555",
                            marginLeft: "6px",
                          }}
                        >
                          #{item.sku}
                        </span>
                      )}
                      {item.description && (
                        <span style={{ display: "block", fontSize: "10px", color: "#666", marginTop: "3px", lineHeight: "1.4" }}>
                          {item.description}
                        </span>
                      )}
                      {gravacao && (
                        <span style={{ display: "block", fontSize: "10px", color: "#666", marginTop: "2px" }}>
                          Gravação: {gravacao}{mat ? ` | ${mat}` : ""}
                        </span>
                      )}
                      {!gravacao && item.color && (
                        <span style={{ display: "block", fontSize: "10px", color: "#666", marginTop: "2px" }}>
                          Cor: {item.color}
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center", borderBottom: "1px solid #eee" }}>{item.quantity}</td>
                    <td style={{ ...tdStyle, textAlign: "right", borderBottom: "1px solid #eee" }}>{fmt(allInUnitPrice)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", borderBottom: "1px solid #eee" }}>
                      {itemDiscount > 0 ? fmt(itemDiscount) : fmt(0)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, borderBottom: "1px solid #eee" }}>{fmt(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
            <div style={{ width: "260px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", borderBottom: "1px solid #f0f0f0" }}>
                <span>Subtotal:</span>
                <span>{fmt(data.subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", borderBottom: "1px solid #f0f0f0" }}>
                <span>Frete:</span>
                <span>{data.shippingCost ? fmt(data.shippingCost) : "Cortesia"}</span>
              </div>
              {data.discount && data.discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", borderBottom: "1px solid #f0f0f0" }}>
                  <span>Desconto:</span>
                  <span>- {fmt(data.discount)}</span>
                </div>
              )}
              <div
                style={{
                  backgroundColor: GREEN,
                  color: "#fff",
                  padding: "10px 12px",
                  borderRadius: "4px",
                  marginTop: "10px",
                  fontWeight: 700,
                  fontSize: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>TOTAL:</span>
                <span>{fmt(data.total)}</span>
              </div>
            </div>
          </div>

          {/* Obs */}
          <div style={{ fontSize: "11px", color: "#888", fontStyle: "italic", marginBottom: "30px" }}>
            Obs: {data.paymentTerms || "Pagamento após entrega (Boleto/Pix)."} Validade 15 dias.
            {data.deliveryTime && ` Previsão de Entrega: ${data.deliveryTime}.`}
          </div>
        </div>

        {/* ═══ FOOTER — SVG-based geometric shapes ═══ */}
        <div style={{ position: "absolute", bottom: 0, left: 0, width: "794px", height: "180px" }}>
          {/* Footer content (above shapes) */}
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "50px",
              zIndex: 10,
            }}
          >
            {/* Contact row */}
            <div style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700 }}>
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#3c3c3c" }} />
                <span>{data.seller.phone || "00-00000-0000"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700 }}>
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: GREEN }} />
                <span>promobrindes.com</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700 }}>
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: GREEN }} />
                <span>comercial01@gmail.com</span>
              </div>
            </div>
            {/* CNPJ */}
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#333", lineHeight: "1.5" }}>
              CNPJ: 36.835.552/0001-67<br />
              Razão Social: Brasil Marcas Industria e<br />
              Comercio de Brindes LTDA.
            </div>
          </div>

          {/* Signature (right side) */}
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "50px",
              textAlign: "center",
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: "28px", color: "#0085ca", fontStyle: "italic", marginBottom: "0px" }}>
              {data.seller.name}
            </div>
            <div style={{ width: "160px", height: "2px", backgroundColor: "#000", margin: "4px auto" }} />
            <div style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase", color: "#000" }}>
              {data.seller.name}
            </div>
            <div style={{ fontSize: "10px", color: "#555" }}>Executivo de Vendas</div>
          </div>

          {/* SVG geometric footer shapes */}
          <svg
            width="794"
            height="180"
            viewBox="0 0 794 180"
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            {/* Black line left */}
            <rect x="0" y="140" width="400" height="3" fill="#333" />
            {/* Light grey diagonal */}
            <polygon points="380,180 410,80 440,80 410,180" fill="#f2f2f2" />
            {/* Green diagonal */}
            <polygon points="410,180 440,80 480,80 450,180" fill={GREEN} />
            {/* Dark block */}
            <polygon points="460,100 794,100 794,145 430,145" fill={DARK} />
            {/* Green bottom strip */}
            <rect x="480" y="145" width="314" height="35" fill={GREEN} />
            {/* Fold triangle */}
            <polygon points="480,145 500,145 480,180" fill={DARK_GREEN} />
          </svg>
        </div>
      </div>
    );
  }
);

ProposalHtmlTemplate.displayName = "ProposalHtmlTemplate";

const thStyle: React.CSSProperties = {
  backgroundColor: GREEN,
  color: "#fff",
  padding: "10px 8px",
  fontSize: "11px",
  textTransform: "uppercase",
  fontWeight: 700,
};

const tdStyle: React.CSSProperties = {
  padding: "10px 8px",
  fontSize: "12px",
  verticalAlign: "top",
  color: "#444",
};
