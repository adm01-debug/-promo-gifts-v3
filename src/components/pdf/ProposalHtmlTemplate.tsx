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
    const contact = data.client.contactName || "";

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
        <HeaderSection data={data} />

        {/* ═══ CONTENT ═══ */}
        <div style={{ padding: "0 50px", flex: 1 }}>
          <ClientBar company={company} contact={contact} />
          <ProductsTable items={data.items} />
          <TotalsSection data={data} />
          <NotesSection data={data} />
        </div>

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
    <div style={{ position: "relative", width: "794px", height: "160px", marginBottom: "30px" }}>
      <svg width="794" height="160" viewBox="0 0 794 160" style={{ position: "absolute", top: 0, left: 0 }}>
        <polygon points="340,0 380,0 420,160 380,160" fill={GREEN} />
        <polygon points="375,0 794,0 794,125 405,125" fill={DARK} />
        <polygon points="405,125 430,125 405,160" fill={GREEN_DARK} />
      </svg>

      <div style={{ position: "absolute", top: "50%", left: "40px", transform: "translateY(-50%)", width: "280px", zIndex: 10 }}>
        <img
          src="/images/promo-brindes-logo.png"
          alt="Promo Brindes"
          style={{ width: "100%", display: "block" }}
          crossOrigin="anonymous"
        />
      </div>

      <div style={{ position: "absolute", top: "25px", right: "40px", textAlign: "right", color: "#fff", zIndex: 10 }}>
        <div style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 800,
          fontSize: "28px",
          textTransform: "uppercase",
          letterSpacing: "1px",
          margin: "0 0 5px 0",
        }}>
          Proposta
        </div>
        <div style={{ fontSize: "13px", opacity: 0.9, fontWeight: 300, lineHeight: "1.6" }}>
          Nº: #{data.quoteNumber}
        </div>
        <div style={{ fontSize: "13px", opacity: 0.9, fontWeight: 300, lineHeight: "1.6" }}>
          Data: {data.date}
        </div>
      </div>
    </div>
  );
}

/* ─── Client Bar ─── */
function ClientBar({ company, contact }: { company: string; contact: string }) {
  return (
    <div
      style={{
        backgroundColor: "#f5f5f5",
        borderLeft: `6px solid ${GREEN}`,
        padding: "20px 25px",
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "30px",
      }}
    >
      <div>
        <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "12px", color: GREEN, textTransform: "uppercase", margin: "0 0 5px 0" }}>
          Empresa
        </div>
        <div style={{ fontWeight: 600, fontSize: "16px", color: "#222" }}>{company}</div>
      </div>
      {contact && (
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "12px", color: GREEN, textTransform: "uppercase", margin: "0 0 5px 0" }}>
            Solicitante
          </div>
          <div style={{ fontWeight: 600, fontSize: "16px", color: "#222" }}>{contact}</div>
        </div>
      )}
    </div>
  );
}

/* ─── Products Table ─── */
function ProductsTable({ items }: { items: ProposalItem[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px" }}>
      <thead>
        <tr>
          <th style={{ ...thStyle, textAlign: "center", width: "80px" }}>Foto</th>
          <th style={{ ...thStyle, textAlign: "left" }}>Descrição do Produto</th>
          <th style={{ ...thStyle, textAlign: "center", width: "50px" }}>Qtd.</th>
          <th style={{ ...thStyle, textAlign: "right", width: "90px" }}>Unitário</th>
          <th style={{ ...thStyle, textAlign: "right", width: "80px" }}>Setup</th>
          <th style={{ ...thStyle, textAlign: "right", width: "100px" }}>Total</th>
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
  const persUnitCost = item.personalizations?.reduce((sum, p) => {
    const pTotal = p.total_cost || 0;
    return sum + (item.quantity > 0 ? pTotal / item.quantity : 0);
  }, 0) || 0;
  const setupCost = item.personalizations?.reduce((sum, p) => sum + (p.setup_cost || 0), 0) || 0;
  const allInUnitPrice = item.unitPrice + persUnitCost;
  const itemDiscount = item.discount || 0;
  const total = item.quantity * allInUnitPrice - itemDiscount * item.quantity;

  const gravacao = item.personalizations?.map((p) => {
    let s = p.technique_name;
    if (p.material) s += ` | ${p.material}`;
    return s;
  }).join(", ");

  return (
    <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
      <td style={{ ...tdStyle, textAlign: "center", padding: "20px 8px", width: "80px" }}>
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            crossOrigin="anonymous"
            style={{
              width: "70px",
              height: "70px",
              objectFit: "contain",
              borderRadius: "6px",
              border: "1px solid #eee",
              backgroundColor: "#fff",
              padding: "4px",
            }}
          />
        ) : (
          <div style={{
            width: "70px",
            height: "70px",
            backgroundColor: "#f5f5f5",
            borderRadius: "6px",
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
      <td style={{ ...tdStyle, verticalAlign: "top" }}>
        <span style={{ fontWeight: 800, color: "#000", fontSize: "15px", display: "block", marginBottom: "6px" }}>
          {item.name}
        </span>
        {item.sku && (
          <span style={{
            background: "#f0f0f0",
            color: "#555",
            fontSize: "11px",
            padding: "2px 6px",
            borderRadius: "4px",
            marginLeft: "0",
            fontWeight: 600,
          }}>
            #{item.sku}
          </span>
        )}
        {item.description && (
          <span style={{ display: "block", fontSize: "12px", color: "#555", marginTop: "6px", lineHeight: "1.5", maxWidth: "350px" }}>
            {item.description}
          </span>
        )}
        {gravacao && (
          <span style={{ display: "block", fontSize: "12px", color: "#555", marginTop: "4px", lineHeight: "1.5" }}>
            Gravação: {gravacao}
          </span>
        )}
        {!gravacao && item.color && (
          <span style={{ display: "block", fontSize: "12px", color: "#555", marginTop: "4px" }}>
            Cor: {item.color}
          </span>
        )}
      </td>
      <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700, fontSize: "14px" }}>{item.quantity}</td>
      <td style={{ ...tdStyle, textAlign: "right" }}>
        <span style={{ fontSize: "14px", fontWeight: 500 }}>{fmt(allInUnitPrice)}</span>
        {itemDiscount > 0 && (
          <span style={{ display: "block", fontSize: "11px", color: "#888", marginTop: "4px" }}>
            (Desc: {fmt(itemDiscount)})
          </span>
        )}
      </td>
      <td style={{ ...tdStyle, textAlign: "right" }}>
        <span style={{ fontSize: "14px", fontWeight: 500 }}>{fmt(setupCost)}</span>
      </td>
      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, fontSize: "15px", color: DARK }}>{fmt(total)}</td>
    </tr>
  );
}

/* ─── Totals ─── */
function TotalsSection({ data }: { data: ProposalTemplateData }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
      <div style={{ width: "350px" }}>
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
            <span>Desconto Global:</span>
            <span style={{ fontWeight: 500 }}>- {fmt(data.discount)}</span>
          </div>
        )}
        <div
          style={{
            backgroundColor: GREEN,
            color: "#fff",
            padding: "15px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "15px",
            borderRadius: "6px",
            boxShadow: "0 4px 10px rgba(0,200,83, 0.2)",
          }}
        >
          <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, textTransform: "uppercase", fontSize: "15px" }}>
            Valor Total:
          </span>
          <strong style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: "24px" }}>
            {fmt(data.total)}
          </strong>
        </div>
      </div>
    </div>
  );
}

/* ─── Notes ─── */
function NotesSection({ data }: { data: ProposalTemplateData }) {
  return (
    <div style={{ marginTop: "50px", fontSize: "12px", color: "#666", lineHeight: "1.6", borderTop: "1px solid #eee", paddingTop: "20px" }}>
      <div style={{ fontWeight: 700, fontSize: "13px", color: "#333", marginBottom: "8px" }}>
        Informações Relevantes:
      </div>
      <div>- Todos os valores são para produtos já personalizados conforme descrição.</div>
      <div>- {data.paymentTerms || "Pagamento: À vista / Boleto / Pix (após a entrega)."}</div>
      <div>- Todos produtos passam por controle de qualidade.</div>
      {data.deliveryTime && <div>- Previsão de Entrega: {data.deliveryTime}.</div>}
      {data.validUntil && <div>- Validade da Proposta: {data.validUntil}.</div>}
    </div>
  );
}

/* ─── Footer ─── */
function FooterSection({ data }: { data: ProposalTemplateData }) {
  return (
    <div style={{ position: "relative", width: "794px", height: "220px", marginTop: "auto" }}>
      {/* Left side: contact info */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "380px", zIndex: 10, padding: "15px 0 0 50px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "12px", flexWrap: "wrap" }}>
          <ContactDot color={DARK} text={data.seller.phone || "00-00000-0000"} />
          <ContactDot color={GREEN} text="promobrindes.com" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "12px" }}>
          <ContactDot color={GREEN} text="comercial01@gmail.com" />
        </div>

        <div style={{ fontSize: "11px", fontWeight: 600, color: "#555", lineHeight: "1.5", marginBottom: "6px" }}>
          CNPJ: 36.835.552/0001-67<br />
          Razão Social: Brasil Marcas Industria e Comercio de Brindes LTDA.
        </div>

        <div style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: "14px",
          fontWeight: 700,
          color: BLUE,
          fontStyle: "italic",
        }}>
          adm01@promobrindes.com.br
        </div>
      </div>

      {/* Right side: SVG background + seller signature */}
      <svg width="794" height="220" viewBox="0 0 794 220" style={{ position: "absolute", top: 0, left: 0 }}>
        <polygon points="400,220 425,30 455,30 430,220" fill="#e0e0e0" />
        <polygon points="430,220 455,30 495,30 470,220" fill={GREEN} />
        <polygon points="490,80 794,80 794,160 460,160" fill={DARK} />
        <rect x="510" y="160" width="284" height="60" fill={GREEN} />
        <polygon points="510,160 535,160 510,195" fill={GREEN_DARK} />
      </svg>

      {/* Seller signature - positioned over the dark bar */}
      <div style={{ position: "absolute", top: "70px", right: "50px", textAlign: "center", zIndex: 10 }}>
        <div style={{
          fontFamily: "'Sacramento', cursive",
          fontSize: "34px",
          color: "#fff",
          marginBottom: "-5px",
          transform: "rotate(-3deg)",
        }}>
          {data.seller.name}
        </div>
        <div style={{ fontWeight: 800, fontSize: "12px", textTransform: "uppercase", marginTop: "5px", color: "#fff" }}>
          {data.seller.name}
        </div>
        <div style={{ width: "180px", height: "1px", backgroundColor: "#fff", margin: "2px auto" }} />
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)" }}>Executivo de Vendas</div>
      </div>
    </div>
  );
}

function ContactDot({ color, text }: { color: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 700, color: "#333" }}>
      <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
      <span>{text}</span>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  backgroundColor: GREEN,
  color: "#fff",
  padding: "15px 12px",
  fontSize: "13px",
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 700,
  textTransform: "uppercase",
};

const tdStyle: React.CSSProperties = {
  padding: "20px 12px",
  fontSize: "15px",
  color: "#333",
  verticalAlign: "middle",
};

const totalsRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 0",
  fontSize: "14px",
  color: "#555",
  borderBottom: "1px solid #fafafa",
};
