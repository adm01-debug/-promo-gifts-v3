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

export const ProposalHtmlTemplate = forwardRef<HTMLDivElement, { data: ProposalTemplateData }>(
  ({ data }, ref) => {
    const company = data.client.company || data.client.name;
    const contact = data.client.contactName || data.client.name;

    return (
      <div
        ref={ref}
        style={{
          width: "794px", // A4 width at 96dpi
          minHeight: "1123px", // A4 height
          backgroundColor: "#fff",
          fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
          color: "#333",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* ═══ HEADER ═══ */}
        <div
          style={{
            position: "relative",
            height: "100px",
            backgroundColor: "#2D8C47",
            overflow: "hidden",
          }}
        >
          {/* Diagonal black triangle */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 0,
              height: 0,
              borderTop: "100px solid #1A1A1A",
              borderLeft: "160px solid transparent",
            }}
          />
          {/* Logo */}
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "30px",
              backgroundColor: "#fff",
              borderRadius: "6px",
              padding: "6px 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src="/images/promo-brindes-logo.png"
              alt="Promo Brindes"
              style={{ height: "60px", width: "auto" }}
              crossOrigin="anonymous"
            />
          </div>
        </div>

        {/* Gray decorative lines */}
        <div style={{ height: "3px", background: "linear-gradient(to bottom, #aaa, #ddd)" }} />

        {/* ═══ CLIENT + QUOTE NUMBER ═══ */}
        <div style={{ padding: "20px 30px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "13px", color: "#666" }}>Empresa:</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#2D8C47", marginTop: "2px" }}>{company}</div>
            <div style={{ fontSize: "13px", color: "#333", marginTop: "4px" }}>Solicitante: {contact}</div>
            {data.client.email && (
              <div style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>{data.client.email}</div>
            )}
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                backgroundColor: "#1A1A1A",
                color: "#fff",
                borderRadius: "6px",
                padding: "10px 24px",
                fontSize: "20px",
                fontWeight: 700,
              }}
            >
              Nº: #{data.quoteNumber}
            </div>
            <div style={{ fontSize: "13px", color: "#666", marginTop: "6px" }}>
              Data: {data.date}
            </div>
          </div>
        </div>

        {/* ═══ PRODUCTS TABLE ═══ */}
        <div style={{ padding: "10px 30px 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ backgroundColor: "#2D8C47" }}>
                <th style={{ ...thStyle, width: "50px", borderTopLeftRadius: "6px" }}></th>
                <th style={{ ...thStyle, textAlign: "left" }}>Descrição do Produto</th>
                <th style={{ ...thStyle, width: "60px" }}>Quant.</th>
                <th style={{ ...thStyle, width: "80px" }}>Valor Uni.</th>
                <th style={{ ...thStyle, width: "80px" }}>Desconto{"\n"}Unitário</th>
                <th style={{ ...thStyle, width: "90px", borderTopRightRadius: "6px" }}>Valor Total</th>
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

                return (
                  <tr key={idx} style={{ backgroundColor: idx % 2 === 1 ? "#f8f8f8" : "#fff", borderBottom: "1px solid #e0e0e0" }}>
                    {/* Image */}
                    <td style={{ padding: "8px", textAlign: "center", verticalAlign: "top" }}>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px" }}
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div style={{ width: "40px", height: "40px", backgroundColor: "#eee", borderRadius: "4px" }} />
                      )}
                    </td>
                    {/* Description */}
                    <td style={{ padding: "8px", verticalAlign: "top" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <span style={{ fontWeight: 700, fontSize: "13px" }}>{item.name}</span>
                        {item.sku && (
                          <span style={{ color: "#2D8C47", fontWeight: 700, fontSize: "11px", whiteSpace: "nowrap" }}>
                            Ticket: #{item.sku}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <div style={{ fontSize: "10px", color: "#666", marginTop: "2px", lineHeight: "1.4" }}>
                          {item.description}
                        </div>
                      )}
                      {/* Gravação + Material */}
                      <div style={{ marginTop: "4px", fontSize: "10px", color: "#555" }}>
                        {item.personalizations && item.personalizations.length > 0 ? (
                          item.personalizations.map((p, pi) => (
                            <span key={pi}>
                              <strong>Gravação:</strong> {p.technique_name}
                              {p.colors_count && p.colors_count > 1 ? ` (${p.colors_count} cores)` : ""}
                              {(p.material || item.material) && (
                                <>.  <strong>Material:</strong> {p.material || item.material}</>
                              )}
                              {pi < (item.personalizations?.length || 0) - 1 && "  |  "}
                            </span>
                          ))
                        ) : item.color ? (
                          <span><strong>Cor:</strong> {item.color}</span>
                        ) : null}
                      </div>
                    </td>
                    <td style={{ ...tdCenter, fontWeight: 700 }}>{item.quantity}.</td>
                    <td style={{ ...tdRight }}>{fmt(allInUnitPrice)}</td>
                    <td style={{ ...tdCenter }}>{fmt(itemDiscount)}</td>
                    <td style={{ ...tdRight, fontWeight: 700 }}>{fmt(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ═══ BOTTOM SECTION ═══ */}
        <div style={{ padding: "20px 30px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          {/* Left: Delivery + Info */}
          <div style={{ maxWidth: "50%" }}>
            {data.deliveryTime && (
              <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "4px" }}>
                Previsão de Entrega: {data.deliveryTime}
              </div>
            )}
            <div style={{ fontSize: "11px", color: "#999", marginBottom: "14px" }}>
              Orçamento Válido por 15 dias após o envio
            </div>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>
              Informações Relevantes:
            </div>
            <div style={{ fontSize: "11px", lineHeight: "1.8" }}>
              - Todos os valores são para produtos já personalizados.<br />
              - {data.paymentTerms || "Pagamento feito após a entrega (À vista/ Boleto/ Pix)."}
              <br />
              - Todos produtos passam por controle de qualidade.
            </div>
          </div>

          {/* Right: Totals */}
          <div style={{ textAlign: "right", minWidth: "220px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
              <span>Sub Total:</span>
              <span style={{ fontWeight: 700 }}>{fmt(data.subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
              <span>Valor Frete:</span>
              <span style={{ fontWeight: 700 }}>{data.shippingCost ? fmt(data.shippingCost) : "Cotesia"}</span>
            </div>
            {data.discount && data.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                <span>Desconto:</span>
                <span style={{ fontWeight: 700 }}>{fmt(data.discount)}</span>
              </div>
            )}
            {/* Grand total box */}
            <div
              style={{
                border: "3px solid #2D8C47",
                borderRadius: "8px",
                padding: "10px 16px",
                marginTop: "10px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "9px", fontWeight: 700, color: "#2D8C47", letterSpacing: "0.5px" }}>
                VALOR TOTAL DA PROPOSTA:
              </div>
              <div style={{ fontSize: "26px", fontWeight: 700, color: "#2D8C47", marginTop: "2px" }}>
                {fmt(data.total)}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "0 30px 20px",
          }}
        >
          {/* Seller signature (right) */}
          <div style={{ textAlign: "right", marginBottom: "16px" }}>
            <div style={{ fontStyle: "italic", fontSize: "18px", fontWeight: 700 }}>
              {data.seller.name}
            </div>
            <div style={{ borderTop: "1px solid #333", display: "inline-block", paddingTop: "4px", marginTop: "4px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>
                {data.seller.name}
              </div>
              <div style={{ fontSize: "10px", color: "#999" }}>Executivo de Vendas</div>
            </div>
          </div>

          {/* Contact icons row */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px", fontSize: "10px", color: "#555", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#2D8C47" }} />
              <span>{data.seller.phone || "00-00000-0000"}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#2D8C47" }} />
              <span>promobrindes.com</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#2D8C47" }} />
              <span>comercial01@gmail.com</span>
            </div>
          </div>

          {/* CNPJ */}
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#555", lineHeight: "1.6" }}>
            CNPJ: 36.835.552/0001-67<br />
            Razão Social: Brasil Marcas Industria e<br />
            Comercio de Brindes LTDA.
          </div>
        </div>
      </div>
    );
  }
);

ProposalHtmlTemplate.displayName = "ProposalHtmlTemplate";

// Shared styles
const thStyle: React.CSSProperties = {
  color: "#fff",
  fontWeight: 700,
  fontSize: "12px",
  padding: "10px 8px",
  textAlign: "center",
  whiteSpace: "pre-line",
};

const tdCenter: React.CSSProperties = {
  padding: "8px",
  textAlign: "center",
  verticalAlign: "top",
  fontSize: "12px",
};

const tdRight: React.CSSProperties = {
  padding: "8px",
  textAlign: "right",
  verticalAlign: "top",
  fontSize: "12px",
};
