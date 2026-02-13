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
          width: "794px",
          minHeight: "1123px",
          backgroundColor: "#fff",
          fontFamily: "'Roboto', 'Segoe UI', Helvetica, Arial, sans-serif",
          color: "#333",
          position: "relative",
          padding: "40px",
          boxSizing: "border-box",
        }}
      >
        {/* ═══ HEADER ═══ */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "40px",
            borderBottom: "2px solid #000",
            paddingBottom: "20px",
          }}
        >
          {/* Logo */}
          <div style={{ width: "250px" }}>
            <img
              src="/images/promo-brindes-logo.png"
              alt="Promo Brindes"
              style={{ maxWidth: "100%", height: "auto" }}
              crossOrigin="anonymous"
            />
          </div>
          {/* Title + Meta */}
          <div style={{ textAlign: "right" }}>
            <h1
              style={{
                margin: "0 0 10px 0",
                fontSize: "24px",
                textTransform: "uppercase",
                color: "#000",
                fontWeight: 700,
              }}
            >
              Orçamento
            </h1>
            <div style={{ fontSize: "14px", lineHeight: "1.5" }}>
              <div>N°: #{data.quoteNumber}</div>
              <div>Data: {data.date}</div>
              <div>Validade: 15 dias</div>
            </div>
          </div>
        </div>

        {/* ═══ CLIENT INFO ═══ */}
        <div
          style={{
            backgroundColor: "#f4f4f4",
            padding: "20px",
            borderRadius: "4px",
            marginBottom: "30px",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#666", textTransform: "uppercase" }}>
              Empresa
            </div>
            <div style={{ margin: 0, fontWeight: 700, fontSize: "16px" }}>{company}</div>
          </div>
          <div>
            <div style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#666", textTransform: "uppercase" }}>
              Solicitante
            </div>
            <div style={{ margin: 0, fontWeight: 700, fontSize: "16px" }}>{contact}</div>
          </div>
        </div>

        {/* ═══ PRODUCTS TABLE ═══ */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px", fontSize: "13px" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left" }}>Descrição do Produto</th>
              <th style={{ ...thStyle, ...colCenter, width: "60px" }}>Quant.</th>
              <th style={{ ...thStyle, ...colMoney, width: "90px" }}>Valor Uni.</th>
              <th style={{ ...thStyle, ...colMoney, width: "90px" }}>Desconto Uni.</th>
              <th style={{ ...thStyle, ...colMoney, width: "100px" }}>Valor Total</th>
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

              // Build gravação string
              const gravacao = item.personalizations?.map((p) => {
                let s = p.technique_name;
                if (p.colors_count && p.colors_count > 1) s += ` (${p.colors_count} cores)`;
                const mat = p.material || item.material;
                if (mat) s += ` | Material: ${mat}`;
                return s;
              }).join(", ");

              return (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 1 ? "#fafafa" : "#fff" }}>
                  {/* Description */}
                  <td style={{ borderBottom: "1px solid #ddd", padding: "12px 8px", verticalAlign: "top" }}>
                    <strong style={{ display: "block", fontSize: "14px", marginBottom: "4px" }}>
                      {item.name}
                    </strong>
                    {item.sku && (
                      <span
                        style={{
                          fontFamily: "monospace",
                          background: "#eee",
                          padding: "2px 4px",
                          borderRadius: "3px",
                          fontSize: "10px",
                          color: "#555",
                          display: "inline-block",
                          marginBottom: "4px",
                        }}
                      >
                        Ticket: #{item.sku}
                      </span>
                    )}
                    {item.description && (
                      <span style={{ display: "block", color: "#666", fontSize: "11px", marginBottom: "2px", lineHeight: "1.4" }}>
                        {item.description}
                      </span>
                    )}
                    {gravacao && (
                      <span style={{ display: "block", color: "#666", fontSize: "11px", lineHeight: "1.4" }}>
                        Gravação: {gravacao}
                      </span>
                    )}
                    {!gravacao && item.color && (
                      <span style={{ display: "block", color: "#666", fontSize: "11px", lineHeight: "1.4" }}>
                        Cor: {item.color}
                      </span>
                    )}
                  </td>
                  <td style={{ ...tdBase, ...colCenter, fontWeight: 700 }}>{item.quantity}</td>
                  <td style={{ ...tdBase, ...colMoney }}>{fmt(allInUnitPrice)}</td>
                  <td style={{ ...tdBase, ...colMoney }}>
                    {itemDiscount > 0 ? `- ${fmt(itemDiscount)}` : fmt(0)}
                  </td>
                  <td style={{ ...tdBase, ...colMoney, fontWeight: 700 }}>{fmt(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ═══ TOTALS ═══ */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "40px" }}>
          <div style={{ width: "300px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}>
              <span>Sub Total:</span>
              <span>{fmt(data.subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}>
              <span>Valor Frete:</span>
              <span>{data.shippingCost ? fmt(data.shippingCost) : "Cortesia"}</span>
            </div>
            {data.discount && data.discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}>
                <span>Desconto Geral:</span>
                <span>- {fmt(data.discount)}</span>
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "2px solid #000",
                marginTop: "10px",
                paddingTop: "15px",
                fontSize: "18px",
                fontWeight: 700,
              }}
            >
              <span>TOTAL:</span>
              <span>{fmt(data.total)}</span>
            </div>
          </div>
        </div>

        {/* ═══ FOOTER INFO ═══ */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "#555",
            borderTop: "1px solid #ddd",
            paddingTop: "20px",
          }}
        >
          {/* Terms */}
          <div style={{ maxWidth: "55%" }}>
            <strong>Informações Relevantes:</strong>
            <ul style={{ paddingLeft: "20px", margin: "5px 0", lineHeight: "1.8" }}>
              <li>Todos os valores são para produtos já personalizados.</li>
              <li>{data.paymentTerms || "Pagamento feito após a entrega (À vista / Boleto / Pix)."}</li>
              <li>Todos produtos passam por controle de qualidade.</li>
              {data.deliveryTime && <li>Previsão de Entrega: {data.deliveryTime}.</li>}
            </ul>
          </div>
          {/* Company info */}
          <div style={{ textAlign: "right", lineHeight: "1.8" }}>
            <strong>Brasil Marcas Industria e Comercio de Brindes LTDA.</strong>
            <br />
            CNPJ: 36.835.552/0001-67
            <br />
            <br />
            promobrindes.com
            <br />
            comercial01@gmail.com
            <br />
            {data.seller.phone || "00-00000-0000"}
          </div>
        </div>

        {/* ═══ SIGNATURE ═══ */}
        <div
          style={{
            marginTop: "50px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ width: "200px", borderTop: "1px solid #333", marginBottom: "10px" }} />
          <div style={{ fontWeight: 700 }}>{data.seller.name}</div>
          <div style={{ fontSize: "12px", color: "#666" }}>Executivo de Vendas</div>
        </div>
      </div>
    );
  }
);

ProposalHtmlTemplate.displayName = "ProposalHtmlTemplate";

// Shared styles
const thStyle: React.CSSProperties = {
  backgroundColor: "#000",
  color: "#fff",
  textAlign: "left",
  padding: "12px 8px",
  textTransform: "uppercase",
  fontSize: "11px",
  fontWeight: 700,
};

const tdBase: React.CSSProperties = {
  borderBottom: "1px solid #ddd",
  padding: "12px 8px",
  verticalAlign: "top",
};

const colCenter: React.CSSProperties = {
  textAlign: "center",
};

const colMoney: React.CSSProperties = {
  textAlign: "right",
  whiteSpace: "nowrap",
};
