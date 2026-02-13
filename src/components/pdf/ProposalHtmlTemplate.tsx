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

const PRIMARY = "#003d29";
const LIGHT_BG = "#f9f9f9";
const TEXT = "#333333";
const TEXT_LIGHT = "#666666";
const TEXT_MUTED = "#999999";
const BORDER = "#eeeeee";

export const ProposalHtmlTemplate = forwardRef<HTMLDivElement, { data: ProposalTemplateData }>(
  ({ data }, ref) => {
    const company = data.client.company || data.client.name;
    const contact = data.client.contactName || "";

    return (
      <div
        ref={ref}
        style={{
          width: "794px",
          minHeight: "1123px",
          backgroundColor: "#fff",
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          color: TEXT,
          position: "relative",
          boxSizing: "border-box",
          padding: "40px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ═══ HEADER ═══ */}
        <HeaderSection data={data} />

        {/* ═══ CLIENT INFO ═══ */}
        <ClientSection company={company} contact={contact} />

        {/* ═══ PRODUCTS TABLE ═══ */}
        <ProductsTable items={data.items} />

        {/* ═══ TOTALS ═══ */}
        <TotalsSection data={data} />

        {/* ═══ FOOTER ═══ */}
        <FooterSection data={data} />
      </div>
    );
  }
);

ProposalHtmlTemplate.displayName = "ProposalHtmlTemplate";

/* ─── Header ─── */
function HeaderSection({ data }: { data: ProposalTemplateData }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: `3px solid ${PRIMARY}`,
        paddingBottom: "20px",
        marginBottom: "30px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <img
          src="/images/promo-brindes-logo.png"
          alt="Promo Brindes"
          style={{ height: "50px", display: "block" }}
          crossOrigin="anonymous"
        />
        <div
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: PRIMARY,
          }}
        >
          PROMO BRINDES
        </div>
      </div>

      <div style={{ textAlign: "right" }}>
        <div
          style={{
            color: PRIMARY,
            fontSize: "22px",
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          Proposta Comercial
        </div>
        <div style={{ color: TEXT_LIGHT, marginTop: "5px", fontSize: "14px" }}>
          Nº: #{data.quoteNumber}
        </div>
        <div style={{ color: TEXT_LIGHT, marginTop: "3px", fontSize: "14px" }}>
          Data: {data.date}
        </div>
      </div>
    </div>
  );
}

/* ─── Client Section ─── */
function ClientSection({ company, contact }: { company: string; contact: string }) {
  return (
    <div
      style={{
        background: LIGHT_BG,
        padding: "20px",
        borderRadius: "8px",
        marginBottom: "30px",
      }}
    >
      <div
        style={{
          color: PRIMARY,
          fontWeight: 700,
          fontSize: "16px",
          marginBottom: "10px",
        }}
      >
        👤 Cliente
      </div>
      <div style={{ color: TEXT, fontSize: "15px", lineHeight: "1.8" }}>
        <span>
          <strong>Empresa:</strong> {company}
        </span>
        {contact && (
          <span style={{ display: "block" }}>
            <strong>Contato:</strong> {contact}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Products Table ─── */
function ProductsTable({ items }: { items: ProposalItem[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px" }}>
      <thead>
        <tr>
          <th style={{ ...thStyle, width: "40%", textAlign: "left" }}>Produto</th>
          <th style={{ ...thStyle, width: "12%", textAlign: "center" }}>Qtd.</th>
          <th style={{ ...thStyle, width: "16%", textAlign: "right" }}>Preço Unit.</th>
          <th style={{ ...thStyle, width: "16%", textAlign: "right" }}>Adicional</th>
          <th style={{ ...thStyle, width: "16%", textAlign: "right" }}>Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => (
          <ProductRow key={idx} item={item} />
        ))}
      </tbody>
    </table>
  );
}

function ProductRow({ item }: { item: ProposalItem }) {
  const setupCost = item.personalizations?.reduce((sum, p) => sum + (p.setup_cost || 0), 0) || 0;
  const persUnitCost = item.personalizations?.reduce((sum, p) => {
    const pTotal = p.total_cost || 0;
    return sum + (item.quantity > 0 ? pTotal / item.quantity : 0);
  }, 0) || 0;
  const allInUnitPrice = item.unitPrice + persUnitCost;
  const itemDiscount = item.discount || 0;
  const total = item.quantity * allInUnitPrice - itemDiscount * item.quantity;

  // Build gravação description
  const gravacaoLines = item.personalizations?.map((p) => {
    let s = p.technique_name;
    if (p.material) s += ` | Material: ${p.material}`;
    return s;
  }) || [];

  return (
    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
      {/* Produto */}
      <td style={{ ...tdStyle, verticalAlign: "top" }}>
        <div style={{ color: PRIMARY, fontWeight: "bold", fontSize: "16px" }}>
          {item.name}
        </div>
        {item.sku && (
          <div style={{ color: TEXT_MUTED, fontSize: "12px", marginTop: "3px" }}>
            Ticket: #{item.sku}
          </div>
        )}
        <div style={{ color: TEXT_LIGHT, fontSize: "13px", marginTop: "5px", lineHeight: "1.6" }}>
          {item.description && <span>{item.description}<br /></span>}
          {gravacaoLines.length > 0 && (
            <span><strong>Gravação:</strong> {gravacaoLines.join(", ")}</span>
          )}
          {!gravacaoLines.length && item.color && (
            <span><strong>Cor:</strong> {item.color}</span>
          )}
        </div>
      </td>

      {/* Qtd */}
      <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700, fontSize: "15px" }}>
        {item.quantity}
      </td>

      {/* Preço Unit */}
      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, fontSize: "15px" }}>
        {fmt(allInUnitPrice)}
        {itemDiscount > 0 && (
          <div style={{ fontSize: "11px", color: TEXT_MUTED, marginTop: "3px" }}>
            (Desc: {fmt(itemDiscount)})
          </div>
        )}
      </td>

      {/* Adicional (Setup) */}
      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, fontSize: "15px" }}>
        {fmt(setupCost)}
      </td>

      {/* Total */}
      <td style={{ ...tdStyle, textAlign: "right", fontWeight: "bold", fontSize: "16px", color: PRIMARY }}>
        {fmt(total)}
      </td>
    </tr>
  );
}

/* ─── Totals ─── */
function TotalsSection({ data }: { data: ProposalTemplateData }) {
  return (
    <div
      style={{
        background: PRIMARY,
        color: "#fff",
        padding: "20px 30px",
        borderRadius: "8px",
        textAlign: "right",
        marginBottom: "30px",
      }}
    >
      {data.shippingCost != null && data.shippingCost > 0 && (
        <div style={{ opacity: 0.8, fontSize: "14px", marginBottom: "5px" }}>
          Frete: {fmt(data.shippingCost)}
        </div>
      )}
      {data.discount != null && data.discount > 0 && (
        <div style={{ opacity: 0.8, fontSize: "14px", marginBottom: "5px" }}>
          Desconto: - {fmt(data.discount)}
        </div>
      )}
      <div style={{ opacity: 0.8, fontSize: "14px", marginBottom: "5px" }}>
        TOTAL GERAL
      </div>
      <div style={{ fontSize: "28px", fontWeight: 800 }}>
        {fmt(data.total)}
      </div>
    </div>
  );
}

/* ─── Footer ─── */
function FooterSection({ data }: { data: ProposalTemplateData }) {
  return (
    <div style={{ marginTop: "auto", textAlign: "center", color: TEXT_MUTED, fontSize: "13px", lineHeight: "1.8" }}>
      <div>
        {data.validUntil
          ? `Proposta válida até ${data.validUntil}`
          : "Proposta válida por 15 dias"}{" "}
        | Condições sujeitas a alteração
      </div>
      {data.paymentTerms && (
        <div>{data.paymentTerms}</div>
      )}
      {data.deliveryTime && (
        <div>Previsão de Entrega: {data.deliveryTime}</div>
      )}
      <div style={{ marginTop: "10px" }}>
        Vendedor: {data.seller.name}
        {data.seller.phone && ` | ${data.seller.phone}`}
        {data.seller.email && ` | ${data.seller.email}`}
      </div>
      <div style={{ marginTop: "8px", fontSize: "12px" }}>
        © {new Date().getFullYear()} - Promo Brindes
      </div>
    </div>
  );
}

/* ─── Styles ─── */
const thStyle: React.CSSProperties = {
  backgroundColor: PRIMARY,
  color: "#fff",
  padding: "15px 10px",
  fontWeight: 600,
  fontSize: "14px",
};

const tdStyle: React.CSSProperties = {
  padding: "15px 10px",
  fontSize: "15px",
  color: TEXT,
  verticalAlign: "middle",
};
