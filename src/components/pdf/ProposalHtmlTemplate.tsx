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

const GREEN = "#00bd56";
const DARK = "#363636";
const DARK_GREEN = "#008f40";
const SIG_BLUE = "#0077b6";

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
          fontFamily: "'Roboto', 'Segoe UI', Helvetica, Arial, sans-serif",
          color: "#333",
          position: "relative",
          boxSizing: "border-box",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ═══ HEADER (SVG geometric shapes) ═══ */}
        <div style={{ position: "relative", width: "794px", height: "160px", marginBottom: "30px" }}>
          <svg width="794" height="160" viewBox="0 0 794 160" style={{ position: "absolute", top: 0, left: 0 }}>
            {/* Green line bottom-left */}
            <rect x="0" y="122" width="370" height="3" fill={GREEN} />
            {/* Green diagonal tall block */}
            <polygon points="350,0 385,0 425,160 390,160" fill={GREEN} />
            {/* Dark grey skewed block */}
            <polygon points="380,0 794,0 794,125 410,125" fill={DARK} />
            {/* Green bottom-right strip */}
            <rect x="410" y="125" width="384" height="35" fill={GREEN} />
            {/* Fold/shadow triangle */}
            <polygon points="410,125 435,125 410,160" fill={DARK_GREEN} />
          </svg>

          {/* Logo */}
          <div style={{ position: "absolute", top: "50%", left: "40px", transform: "translateY(-50%)", width: "200px", zIndex: 10 }}>
            <img
              src="/images/promo-brindes-logo.png"
              alt="Promo Brindes"
              style={{ width: "100%", display: "block" }}
              crossOrigin="anonymous"
            />
          </div>

          {/* Quote text on dark block */}
          <div style={{ position: "absolute", top: "30px", right: "40px", textAlign: "right", color: "#fff", zIndex: 10 }}>
            <div style={{ fontSize: "22px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 5px 0" }}>
              Orçamento
            </div>
            <div style={{ fontSize: "12px", opacity: 0.9, fontWeight: 300, lineHeight: "1.5" }}>
              Nº: #{data.quoteNumber}<br />
              Data: {data.date}
            </div>
          </div>
        </div>

        {/* ═══ CONTENT ═══ */}
        <div style={{ padding: "0 40px", flex: 1 }}>
          {/* Client Box */}
          <div
            style={{
              backgroundColor: "#f9f9f9",
              borderLeft: `5px solid ${GREEN}`,
              padding: "20px",
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "30px",
              borderRadius: "0 4px 4px 0",
            }}
          >
            <div>
              <div style={{ color: GREEN, fontSize: "11px", textTransform: "uppercase", fontWeight: 700, margin: "0 0 5px 0" }}>
                Empresa
              </div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "#333" }}>{company}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: GREEN, fontSize: "11px", textTransform: "uppercase", fontWeight: 700, margin: "0 0 5px 0" }}>
                Solicitante
              </div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "#333" }}>{contact}</div>
            </div>
          </div>

          {/* Products Table */}
          <div style={{ marginBottom: "30px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: "center", width: "70px" }}>Foto</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>Descrição</th>
                  <th style={{ ...thStyle, textAlign: "center", width: "50px" }}>Qtd.</th>
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
                      <td style={{ ...tdStyle, textAlign: "center", padding: "6px", width: "70px" }}>
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            crossOrigin="anonymous"
                            style={{
                              width: "60px",
                              height: "60px",
                              objectFit: "contain",
                              borderRadius: "4px",
                              border: "1px solid #eee",
                              backgroundColor: "#fff",
                            }}
                          />
                        ) : (
                          <div style={{
                            width: "60px",
                            height: "60px",
                            backgroundColor: "#f5f5f5",
                            borderRadius: "4px",
                            border: "1px solid #eee",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto",
                          }}>
                            <span style={{ fontSize: "9px", color: "#bbb" }}>Sem foto</span>
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <strong style={{ display: "inline", fontSize: "13px", color: "#222" }}>{item.name}</strong>
                        {item.sku && (
                          <span style={{
                            fontFamily: "'Courier New', monospace",
                            background: "#eee",
                            padding: "2px 5px",
                            borderRadius: "3px",
                            fontSize: "10px",
                            color: "#555",
                            marginLeft: "8px",
                          }}>
                            #{item.sku}
                          </span>
                        )}
                        {item.description && (
                          <span style={{ display: "block", fontSize: "11px", color: "#666", marginTop: "3px", lineHeight: "1.4" }}>
                            {item.description}
                          </span>
                        )}
                        {gravacao && (
                          <span style={{ display: "block", fontSize: "11px", color: "#777", marginTop: "2px" }}>
                            Gravação: {gravacao}{mat ? ` | Material: ${mat}` : ""}
                          </span>
                        )}
                        {!gravacao && item.color && (
                          <span style={{ display: "block", fontSize: "11px", color: "#777", marginTop: "2px" }}>
                            Cor: {item.color}
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center", fontWeight: 500 }}>{item.quantity}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(allInUnitPrice)}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{itemDiscount > 0 ? fmt(itemDiscount) : fmt(0)}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{fmt(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "25px" }}>
            <div style={{ width: "280px" }}>
              <div style={totalsRowStyle}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: 500 }}>{fmt(data.subtotal)}</span>
              </div>
              <div style={totalsRowStyle}>
                <span>Frete:</span>
                <span style={{ fontWeight: 500 }}>{data.shippingCost ? fmt(data.shippingCost) : "Cortesia"}</span>
              </div>
              {data.discount && data.discount > 0 && (
                <div style={totalsRowStyle}>
                  <span>Desconto:</span>
                  <span style={{ fontWeight: 500 }}>- {fmt(data.discount)}</span>
                </div>
              )}
              <div
                style={{
                  backgroundColor: GREEN,
                  color: "#fff",
                  padding: "12px 14px",
                  borderRadius: "4px",
                  marginTop: "12px",
                  fontWeight: 700,
                  fontSize: "17px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>TOTAL:</span>
                <span>{fmt(data.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes / Terms */}
          <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: "15px", marginBottom: "20px" }}>
            <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px", color: "#333" }}>
              Informações Relevantes:
            </div>
            <ul style={{ paddingLeft: "18px", margin: 0, fontSize: "11px", color: "#555", lineHeight: "1.9" }}>
              <li>Todos os valores são para produtos já personalizados.</li>
              <li>{data.paymentTerms || "Pagamento feito após a entrega (À vista / Boleto / Pix)."}</li>
              <li>Todos produtos passam por controle de qualidade.</li>
              {data.deliveryTime && <li>Previsão de Entrega: {data.deliveryTime}.</li>}
            </ul>
          </div>
        </div>

        {/* ═══ FOOTER (SVG geometric shapes) ═══ */}
        <div style={{ position: "relative", width: "794px", height: "180px", marginTop: "auto" }}>
          {/* Footer content */}
          <div style={{ position: "relative", zIndex: 10, padding: "0 40px", height: "100%" }}>
            {/* Contact row */}
            <div style={{ display: "flex", alignItems: "center", gap: "18px", marginBottom: "12px", paddingTop: "8px" }}>
              <ContactDot color="#3c3c3c" text={data.seller.phone || "00-00000-0000"} />
              <ContactDot color={GREEN} text="promobrindes.com" />
              <ContactDot color={GREEN} text="comercial01@gmail.com" />
            </div>
            {/* CNPJ */}
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#333", lineHeight: "1.5" }}>
              CNPJ: 36.835.552/0001-67<br />
              Razão Social: Brasil Marcas Industria e<br />
              Comercio de Brindes LTDA.
            </div>

            {/* Signature (right) */}
            <div style={{ position: "absolute", top: "8px", right: "40px", textAlign: "center" }}>
              <div style={{ fontSize: "30px", color: SIG_BLUE, fontStyle: "italic", fontFamily: "'Sacramento', cursive", marginBottom: "0px" }}>
                {data.seller.name}
              </div>
              <div style={{ width: "180px", height: "2px", backgroundColor: "#000", margin: "2px auto" }} />
              <div style={{ fontSize: "13px", fontWeight: 900, textTransform: "uppercase", color: "#000", letterSpacing: "0.5px" }}>
                {data.seller.name}
              </div>
              <div style={{ fontSize: "10px", color: "#555" }}>Executivo de Vendas</div>
            </div>
          </div>

          {/* SVG shapes */}
          <svg width="794" height="180" viewBox="0 0 794 180" style={{ position: "absolute", top: 0, left: 0 }}>
            {/* Black line left */}
            <rect x="0" y="140" width="390" height="3" fill="#333" />
            {/* Light grey diagonal */}
            <polygon points="370,180 395,80 425,80 400,180" fill="#f0f0f0" />
            {/* Green diagonal */}
            <polygon points="400,180 425,80 465,80 440,180" fill={GREEN} />
            {/* Dark block */}
            <polygon points="450,100 794,100 794,145 420,145" fill={DARK} />
            {/* Green bottom strip */}
            <rect x="470" y="145" width="324" height="35" fill={GREEN} />
            {/* Fold triangle */}
            <polygon points="470,145 490,145 470,180" fill={DARK_GREEN} />
          </svg>
        </div>
      </div>
    );
  }
);

ProposalHtmlTemplate.displayName = "ProposalHtmlTemplate";

/* Small helper component for contact dots */
function ContactDot({ color, text }: { color: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 700, color: "#333" }}>
      <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
      <span>{text}</span>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  backgroundColor: GREEN,
  color: "#fff",
  padding: "12px 10px",
  fontSize: "12px",
  textTransform: "uppercase",
  fontWeight: 700,
};

const tdStyle: React.CSSProperties = {
  padding: "12px 10px",
  borderBottom: "1px solid #eee",
  fontSize: "13px",
  color: "#444",
  verticalAlign: "top",
};

const totalsRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "7px 0",
  fontSize: "13px",
  borderBottom: "1px solid #f0f0f0",
  color: "#444",
};
