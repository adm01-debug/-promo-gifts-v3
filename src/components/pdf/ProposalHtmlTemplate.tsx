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

const GREEN = "#00c853";
const GREEN_DARK = "#009e41";
const DARK = "#333333";
const BLUE = "#0085ca";

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
          color: "#444",
          position: "relative",
          boxSizing: "border-box",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ═══ HEADER ═══ */}
        <div style={{ position: "relative", width: "794px", height: "160px", marginBottom: "30px" }}>
          <svg width="794" height="160" viewBox="0 0 794 160" style={{ position: "absolute", top: 0, left: 0 }}>
            {/* Green bottom line left */}
            <rect x="0" y="130" width="360" height="4" fill={GREEN} />
            {/* Green diagonal tall block */}
            <polygon points="340,0 380,0 420,160 380,160" fill={GREEN} />
            {/* Dark grey skewed block (right side) */}
            <polygon points="375,0 794,0 794,125 405,125" fill={DARK} />
            {/* Green bottom-right strip */}
            <rect x="405" y="125" width="389" height="35" fill={GREEN} />
            {/* Shadow/fold triangle */}
            <polygon points="405,125 430,125 405,160" fill={GREEN_DARK} />
          </svg>

          {/* Logo */}
          <div style={{ position: "absolute", top: "50%", left: "50px", transform: "translateY(-50%)", width: "220px", zIndex: 10 }}>
            <img
              src="/images/promo-brindes-logo.png"
              alt="Promo Brindes"
              style={{ width: "100%", display: "block" }}
              crossOrigin="anonymous"
            />
          </div>

          {/* Quote info on dark block */}
          <div style={{ position: "absolute", top: "25px", right: "40px", textAlign: "right", color: "#fff", zIndex: 10 }}>
            <div style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 800,
              fontSize: "28px",
              textTransform: "uppercase",
              letterSpacing: "1px",
              margin: "0 0 5px 0",
            }}>
              Orçamento
            </div>
            <div style={{ fontSize: "13px", opacity: 0.9, fontWeight: 300, lineHeight: "1.6" }}>
              Nº: #{data.quoteNumber}
            </div>
            <div style={{ fontSize: "13px", opacity: 0.9, fontWeight: 300, lineHeight: "1.6" }}>
              Data: {data.date}
            </div>
          </div>
        </div>

        {/* ═══ CONTENT ═══ */}
        <div style={{ padding: "0 50px", flex: 1 }}>
          {/* Client Bar */}
          <div
            style={{
              backgroundColor: "#f5f5f5",
              borderLeft: `6px solid ${GREEN}`,
              padding: "15px 20px",
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "30px",
            }}
          >
            <div>
              <div style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 700,
                fontSize: "11px",
                color: GREEN,
                textTransform: "uppercase",
                margin: "0 0 5px 0",
              }}>
                Empresa
              </div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: "#222" }}>{company}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 700,
                fontSize: "11px",
                color: GREEN,
                textTransform: "uppercase",
                margin: "0 0 5px 0",
              }}>
                Solicitante
              </div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: "#222" }}>{contact}</div>
            </div>
          </div>

          {/* Products Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px" }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "center", width: "60px" }}>Foto</th>
                <th style={{ ...thStyle, textAlign: "left" }}>Descrição</th>
                <th style={{ ...thStyle, textAlign: "center", width: "50px" }}>Qtd.</th>
                <th style={{ ...thStyle, textAlign: "right", width: "85px" }}>Unitário</th>
                <th style={{ ...thStyle, textAlign: "center", width: "70px" }}>Desc.</th>
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
                  if (p.material) s += ` | ${p.material}`;
                  return s;
                }).join(", ");

                return (
                  <tr key={idx} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ ...tdStyle, textAlign: "center", padding: "10px 6px", width: "60px" }}>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          crossOrigin="anonymous"
                          style={{
                            width: "45px",
                            height: "45px",
                            objectFit: "contain",
                            borderRadius: "4px",
                            border: "1px solid #eee",
                            backgroundColor: "#fff",
                            padding: "2px",
                          }}
                        />
                      ) : (
                        <div style={{
                          width: "45px",
                          height: "45px",
                          backgroundColor: "#f5f5f5",
                          borderRadius: "4px",
                          border: "1px solid #eee",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "0 auto",
                        }}>
                          <span style={{ fontSize: "9px", color: "#bbb" }}>—</span>
                        </div>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 700, color: "#222", fontSize: "14px" }}>
                        {item.name}
                      </span>
                      {item.sku && (
                        <span style={{
                          background: "#eee",
                          color: "#777",
                          fontSize: "10px",
                          padding: "2px 5px",
                          borderRadius: "3px",
                          marginLeft: "5px",
                          fontWeight: 400,
                        }}>
                          #{item.sku}
                        </span>
                      )}
                      {item.description && (
                        <span style={{ display: "block", fontSize: "11px", color: "#777", marginTop: "4px" }}>
                          {item.description}
                        </span>
                      )}
                      {gravacao && (
                        <span style={{ display: "block", fontSize: "11px", color: "#777", marginTop: "4px" }}>
                          Gravação: {gravacao}
                        </span>
                      )}
                      {!gravacao && item.color && (
                        <span style={{ display: "block", fontSize: "11px", color: "#777", marginTop: "4px" }}>
                          Cor: {item.color}
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700 }}>{item.quantity}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(allInUnitPrice)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(itemDiscount)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{fmt(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
            <div style={{ width: "320px" }}>
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
              {/* Grand total green bar */}
              <div
                style={{
                  backgroundColor: GREEN,
                  color: "#fff",
                  padding: "12px 15px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "15px",
                  borderRadius: "4px",
                }}
              >
                <span style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  fontSize: "14px",
                }}>
                  Total:
                </span>
                <strong style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 800,
                  fontSize: "20px",
                }}>
                  {fmt(data.total)}
                </strong>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginTop: "40px", fontSize: "11px", color: "#888", lineHeight: "1.6", borderTop: "1px solid #eee", paddingTop: "20px" }}>
            <div style={{ fontWeight: 700, fontSize: "12px", color: "#333", marginBottom: "6px" }}>
              Informações Relevantes:
            </div>
            <div>Todos os valores são para produtos já personalizados.</div>
            <div>{data.paymentTerms || "Pagamento feito após a entrega (À vista / Boleto / Pix)."}</div>
            <div>Todos produtos passam por controle de qualidade.</div>
            {data.deliveryTime && <div>Previsão de Entrega: {data.deliveryTime}.</div>}
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div style={{ position: "relative", width: "794px", height: "180px", marginTop: "auto" }}>
          {/* SVG shapes */}
          <svg width="794" height="180" viewBox="0 0 794 180" style={{ position: "absolute", top: 0, left: 0 }}>
            {/* Grey diagonal */}
            <polygon points="370,180 395,20 425,20 400,180" fill="#e0e0e0" />
            {/* Green diagonal */}
            <polygon points="395,180 420,20 460,20 435,180" fill={GREEN} />
            {/* Dark block */}
            <polygon points="455,60 794,60 794,130 425,130" fill={DARK} />
            {/* Green bottom strip */}
            <rect x="480" y="130" width="314" height="50" fill={GREEN} />
            {/* Fold triangle */}
            <polygon points="480,130 505,130 480,165" fill={GREEN_DARK} />
          </svg>

          {/* Footer content */}
          <div style={{ position: "relative", zIndex: 10, padding: "0 50px", height: "100%" }}>
            {/* Contact row */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "15px", paddingTop: "10px" }}>
              <ContactDot color={DARK} text={data.seller.phone || "00-00000-0000"} />
              <ContactDot color={GREEN} text="promobrindes.com" />
              <ContactDot color={GREEN} text="comercial01@gmail.com" />
            </div>

            {/* CNPJ */}
            <div style={{ fontSize: "10px", fontWeight: 600, color: "#555", lineHeight: "1.4" }}>
              CNPJ: 36.835.552/0001-67<br />
              Razão Social: Brasil Marcas Industria e Comercio de Brindes LTDA.
            </div>

            {/* Blue email */}
            <div style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: "16px",
              fontWeight: 700,
              color: BLUE,
              fontStyle: "italic",
              marginTop: "5px",
            }}>
              adm01@promobrindes.com.br
            </div>

            {/* Signature (right) */}
            <div style={{ position: "absolute", top: "10px", right: "50px", textAlign: "center" }}>
              <div style={{
                fontFamily: "'Sacramento', cursive",
                fontSize: "32px",
                color: BLUE,
                marginBottom: "-5px",
                transform: "rotate(-3deg)",
              }}>
                {data.seller.name}
              </div>
              <div style={{
                fontWeight: 800,
                fontSize: "12px",
                textTransform: "uppercase",
                marginTop: "5px",
                color: "#000",
              }}>
                {data.seller.name}
              </div>
              <div style={{ width: "180px", height: "1px", backgroundColor: "#333", margin: "2px auto" }} />
              <div style={{ fontSize: "10px", color: "#666" }}>Executivo de Vendas</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ProposalHtmlTemplate.displayName = "ProposalHtmlTemplate";

function ContactDot({ color, text }: { color: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 700, color: "#333" }}>
      <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
      <span>{text}</span>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  backgroundColor: GREEN,
  color: "#fff",
  padding: "12px 10px",
  fontSize: "12px",
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 700,
  textTransform: "uppercase",
};

const tdStyle: React.CSSProperties = {
  padding: "15px 10px",
  fontSize: "13px",
  color: "#444",
  verticalAlign: "middle",
};

const totalsRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "6px 0",
  fontSize: "13px",
  color: "#555",
  borderBottom: "1px solid #fafafa",
};
