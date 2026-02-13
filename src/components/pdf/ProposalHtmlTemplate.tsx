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

const BRAND_GREEN = "#00bf63";
const BRAND_DARK = "#333333";
const SIG_BLUE = "#0085ca";

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
          display: "flex",
          flexDirection: "column",
          paddingBottom: 0,
        }}
      >
        {/* ═══ HEADER ═══ */}
        <div
          style={{
            position: "relative",
            height: "160px",
            width: "100%",
            marginBottom: "20px",
            overflow: "hidden",
          }}
        >
          {/* Logo */}
          <div style={{ position: "absolute", top: "40px", left: "50px", width: "220px", zIndex: 10 }}>
            <img
              src="/images/promo-brindes-logo.png"
              alt="Promo Brindes"
              style={{ width: "100%", display: "block" }}
              crossOrigin="anonymous"
            />
          </div>

          {/* Green bottom line (left) */}
          <div
            style={{
              position: "absolute",
              bottom: "30px",
              left: 0,
              width: "45%",
              height: "4px",
              backgroundColor: BRAND_GREEN,
              zIndex: 2,
            }}
          />

          {/* Green diagonal shape */}
          <div
            style={{
              position: "absolute",
              bottom: "30px",
              left: "42%",
              width: "100px",
              height: "130px",
              backgroundColor: BRAND_GREEN,
              transform: "skewX(-40deg)",
              zIndex: 2,
            }}
          />

          {/* Dark grey block with content */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: "-50px",
              width: "55%",
              height: "130px",
              backgroundColor: BRAND_DARK,
              transform: "skewX(-40deg)",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                transform: "skewX(40deg)",
                color: "white",
                textAlign: "right",
                marginRight: "60px",
                marginTop: "20px",
              }}
            >
              <div style={{ fontSize: "20px", margin: "0 0 5px 0", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
                Orçamento
              </div>
              <div style={{ fontSize: "12px", margin: 0, lineHeight: "1.4" }}>
                Nº: #{data.quoteNumber}
              </div>
              <div style={{ fontSize: "12px", margin: 0, lineHeight: "1.4" }}>
                Data: {data.date}
              </div>
            </div>
          </div>

          {/* Green bottom-right strip */}
          <div
            style={{
              position: "absolute",
              bottom: "30px",
              right: 0,
              width: "45%",
              height: "35px",
              backgroundColor: BRAND_GREEN,
              zIndex: 0,
            }}
          />
          {/* Green connector */}
          <div
            style={{
              position: "absolute",
              bottom: "30px",
              right: "40%",
              width: "50px",
              height: "35px",
              backgroundColor: BRAND_GREEN,
              transform: "skewX(-40deg)",
              zIndex: 0,
            }}
          />
        </div>

        {/* ═══ CONTENT ═══ */}
        <div style={{ padding: "0 50px", flex: 1 }}>
          {/* Client Info */}
          <div
            style={{
              backgroundColor: "#f8f8f8",
              borderLeft: `5px solid ${BRAND_GREEN}`,
              padding: "20px",
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ margin: "0 0 5px 0", color: BRAND_GREEN, fontSize: "11px", textTransform: "uppercase", fontWeight: 700 }}>
                Empresa
              </div>
              <div style={{ margin: 0, fontWeight: 700, fontSize: "14px" }}>{company}</div>
            </div>
            <div>
              <div style={{ margin: "0 0 5px 0", color: BRAND_GREEN, fontSize: "11px", textTransform: "uppercase", fontWeight: 700 }}>
                Solicitante
              </div>
              <div style={{ margin: 0, fontWeight: 700, fontSize: "14px" }}>{contact}</div>
            </div>
          </div>

          {/* Products Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
            <thead>
              <tr style={{ backgroundColor: BRAND_GREEN, color: "#fff" }}>
                <th style={thStyle}>Descrição</th>
                <th style={{ ...thStyle, textAlign: "center", width: "50px" }}>Qtd.</th>
                <th style={{ ...thStyle, textAlign: "right", width: "80px" }}>Unitário</th>
                <th style={{ ...thStyle, textAlign: "right", width: "80px" }}>Desconto</th>
                <th style={{ ...thStyle, textAlign: "right", width: "90px" }}>Total</th>
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
                  <tr key={idx} style={{ borderBottom: "1px solid #eee", backgroundColor: idx % 2 === 1 ? "#fafafa" : "#fff" }}>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 700, color: "#000", display: "block" }}>
                        {item.name}{" "}
                        {item.sku && (
                          <span style={{ fontSize: "9px", color: "#777", background: "#eee", padding: "1px 4px", borderRadius: "3px" }}>
                            #{item.sku}
                          </span>
                        )}
                      </span>
                      {item.description && (
                        <span style={{ display: "block", fontSize: "10px", color: "#666", marginTop: "3px" }}>
                          {item.description}
                        </span>
                      )}
                      {gravacao && (
                        <span style={{ display: "block", fontSize: "10px", color: "#666", marginTop: "2px" }}>
                          Gravação: {gravacao}{mat ? `. Material: ${mat}` : ""}
                        </span>
                      )}
                      {!gravacao && item.color && (
                        <span style={{ display: "block", fontSize: "10px", color: "#666", marginTop: "2px" }}>
                          Cor: {item.color}
                        </span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>{item.quantity}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmt(allInUnitPrice)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{itemDiscount > 0 ? fmt(itemDiscount) : fmt(0)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{fmt(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ width: "250px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "12px", borderBottom: "1px solid #f0f0f0" }}>
                <span>Subtotal:</span>
                <span>{fmt(data.subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "12px", borderBottom: "1px solid #f0f0f0" }}>
                <span>Frete:</span>
                <span>{data.shippingCost ? fmt(data.shippingCost) : "Cortesia"}</span>
              </div>
              {data.discount && data.discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "12px", borderBottom: "1px solid #f0f0f0" }}>
                  <span>Desconto:</span>
                  <span>- {fmt(data.discount)}</span>
                </div>
              )}
              <div
                style={{
                  backgroundColor: BRAND_GREEN,
                  color: "#fff",
                  padding: "10px",
                  borderRadius: "4px",
                  marginTop: "10px",
                  fontWeight: 700,
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
          <div style={{ marginTop: "15px", fontSize: "10px", color: "#666", fontStyle: "italic" }}>
            Obs: {data.paymentTerms || "Pagamento após entrega (Boleto/Pix)."} Validade 15 dias.
            {data.deliveryTime && ` Previsão de Entrega: ${data.deliveryTime}.`}
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div
          style={{
            position: "relative",
            height: "200px",
            width: "100%",
            marginTop: "30px",
            overflow: "hidden",
          }}
        >
          {/* Footer line (left black) */}
          <div style={{ position: "absolute", bottom: "20px", left: 0, width: "55%", height: "3px", backgroundColor: "#333", zIndex: 5 }} />

          {/* Geometric shapes */}
          <div style={{ position: "absolute", bottom: "20px", right: 0, width: "100%", height: "100px", pointerEvents: "none" }}>
            {/* Light grey diagonal */}
            <div style={{ position: "absolute", bottom: 0, right: "42%", width: "60px", height: "100%", backgroundColor: "#f2f2f2", transform: "skewX(-40deg)", zIndex: 1 }} />
            {/* Green diagonal */}
            <div style={{ position: "absolute", bottom: 0, right: "37%", width: "70px", height: "100%", backgroundColor: BRAND_GREEN, transform: "skewX(-40deg)", zIndex: 2, borderLeft: "3px solid white" }} />
            {/* Dark block */}
            <div style={{ position: "absolute", bottom: "20px", right: "-50px", width: "45%", height: "80px", backgroundColor: BRAND_DARK, transform: "skewX(-40deg)", zIndex: 3, borderLeft: "3px solid white" }} />
            {/* Green bottom strip */}
            <div style={{ position: "absolute", bottom: 0, right: 0, width: "32%", height: "35px", backgroundColor: BRAND_GREEN, zIndex: 4 }} />
            {/* Fold triangle */}
            <div
              style={{
                position: "absolute",
                bottom: "35px",
                right: "32%",
                width: 0,
                height: 0,
                borderStyle: "solid",
                borderWidth: "0 0 35px 20px",
                borderColor: "transparent transparent #008f4a transparent",
                zIndex: 5,
              }}
            />
          </div>

          {/* Footer content */}
          <div
            style={{
              position: "relative",
              padding: "0 50px",
              height: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            {/* Left: contacts + CNPJ */}
            <div style={{ marginBottom: "20px", zIndex: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "15px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 700, color: "#333" }}>
                  <div style={{ width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#3c3c3c", display: "inline-block" }} />
                  <span>{data.seller.phone || "00-00000-0000"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 700, color: "#333" }}>
                  <div style={{ width: "18px", height: "18px", borderRadius: "50%", backgroundColor: BRAND_GREEN, display: "inline-block" }} />
                  <span>promobrindes.com</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 700, color: "#333" }}>
                  <div style={{ width: "18px", height: "18px", borderRadius: "50%", backgroundColor: BRAND_GREEN, display: "inline-block" }} />
                  <span>comercial01@gmail.com</span>
                </div>
              </div>
              <div style={{ fontSize: "11px", color: "#333", fontWeight: 700, lineHeight: "1.4" }}>
                CNPJ: 36.835.552/0001-67<br />
                Razão Social: Brasil Marcas Industria e<br />
                Comercio de Brindes LTDA.
              </div>
            </div>

            {/* Right: Signature */}
            <div style={{ position: "absolute", right: "50px", top: "20px", textAlign: "center", zIndex: 10 }}>
              <div
                style={{
                  fontFamily: "'Sacramento', 'Brush Script MT', cursive",
                  fontSize: "32px",
                  color: SIG_BLUE,
                  marginBottom: "-5px",
                  transform: "rotate(-5deg)",
                }}
              >
                {data.seller.name}
              </div>
              <div style={{ fontSize: "14px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.5px", color: "#000" }}>
                {data.seller.name.toUpperCase()}
              </div>
              <div style={{ width: "100%", height: "2px", backgroundColor: "#000", margin: "2px 0" }} />
              <div style={{ fontSize: "11px", color: "#333" }}>Executivo de Vendas</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ProposalHtmlTemplate.displayName = "ProposalHtmlTemplate";

// Shared styles
const thStyle: React.CSSProperties = {
  padding: "10px",
  textAlign: "left",
  fontSize: "12px",
  textTransform: "uppercase",
  fontWeight: 700,
};

const tdStyle: React.CSSProperties = {
  padding: "10px",
  fontSize: "12px",
  verticalAlign: "top",
  color: "#444",
};
