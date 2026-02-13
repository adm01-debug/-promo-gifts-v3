import React, { forwardRef } from "react";
import type { ProposalTemplateData } from "./ProposalHtmlTemplate";

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const PropostaComercialTailwind = forwardRef<HTMLDivElement, { data: ProposalTemplateData }>(
  ({ data }, ref) => {
    const company = data.client.company || data.client.name;
    const contact = data.client.contactName || "";

    return (
      <div
        ref={ref}
        className="bg-white text-[#333] relative flex flex-col"
        style={{
          width: "794px",
          height: "1123px",
          fontFamily: "'Roboto', 'Segoe UI', Helvetica, Arial, sans-serif",
          boxSizing: "border-box",
        }}
      >

        {/* ═══ HEADER ═══ */}
        <div className="relative" style={{ width: "794px", height: "145px", flexShrink: 0 }}>
          <svg width="794" height="145" viewBox="0 0 794 145" className="absolute top-0 left-0">
            <polygon points="340,0 375,0 410,145 370,145" fill="#00c853" />
            <polygon points="370,0 794,0 794,115 395,115" fill="#333333" />
            <polygon points="395,115 418,115 395,145" fill="#009e41" />
          </svg>

          {/* Logo */}
          <div className="absolute z-10" style={{ top: "50%", left: "36px", transform: "translateY(-50%)", width: "190px" }}>
            <img
              src="/images/promo-brindes-logo.png"
              alt="Promo Brindes"
              className="w-full block"
              crossOrigin="anonymous"
            />
          </div>

          {/* Texto do Header */}
          <div className="absolute z-10 text-right text-white" style={{ top: "20px", right: "36px" }}>
            <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: "26px", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 4px 0" }}>
              Proposta
            </p>
            <p style={{ fontSize: "12px", opacity: 0.9, fontWeight: 300, lineHeight: "1.5" }}>
              Nº: #{data.quoteNumber}
            </p>
            <p style={{ fontSize: "12px", opacity: 0.9, fontWeight: 300, lineHeight: "1.5" }}>
              Data: {data.date}
            </p>
            {data.validUntil && (
              <p style={{ fontSize: "11px", opacity: 0.8, fontWeight: 400, lineHeight: "1.5", marginTop: "2px" }}>
                Válida até: {data.validUntil}
              </p>
            )}
          </div>
        </div>

        {/* ═══ CONTENT ═══ */}
        <div style={{ padding: "0 40px", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Barra do Cliente */}
          <div className="flex justify-between" style={{
            backgroundColor: "#f5f5f5",
            borderLeft: "5px solid #00c853",
            padding: "10px 20px",
            marginTop: "14px",
            marginBottom: "14px",
          }}>
            <div>
              <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "11px", color: "#00c853", textTransform: "uppercase", margin: "0 0 3px 0" }}>
                Empresa
              </p>
              <p style={{ fontWeight: 600, fontSize: "15px", color: "#222", margin: 0 }}>{company}</p>
              {data.client.email && (
                <p style={{ fontSize: "11px", color: "#666", margin: "2px 0 0 0" }}>{data.client.email}</p>
              )}
              {data.client.phone && (
                <p style={{ fontSize: "11px", color: "#666", margin: "1px 0 0 0" }}>{data.client.phone}</p>
              )}
            </div>
            {contact && (
              <div className="text-right">
                <p style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "11px", color: "#00c853", textTransform: "uppercase", margin: "0 0 3px 0" }}>
                  Solicitante
                </p>
                <p style={{ fontWeight: 600, fontSize: "15px", color: "#222", margin: 0 }}>{contact}</p>
              </div>
            )}
          </div>

          {/* Tabela de Produtos */}
          <table className="w-full border-collapse" style={{ marginBottom: "16px" }}>
            <thead>
              <tr>
                <th style={{ ...thBase, textAlign: "center", width: "100px" }}>Foto</th>
                <th style={{ ...thBase, textAlign: "left" }}>Descrição do Produto</th>
                <th style={{ ...thBase, textAlign: "center", width: "50px" }}>Qtd.</th>
                <th style={{ ...thBase, textAlign: "right", width: "95px" }}>Unitário</th>
                <th style={{ ...thBase, textAlign: "right", width: "100px" }}>Total</th>
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
                    <td className="text-center align-middle" style={{ padding: "14px 6px", width: "100px" }}>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          crossOrigin="anonymous"
                          style={{
                            width: "90px",
                            height: "90px",
                            objectFit: "contain",
                            borderRadius: "8px",
                            border: "1px solid #eee",
                            backgroundColor: "#fff",
                            padding: "4px",
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center mx-auto" style={{
                          width: "90px",
                          height: "90px",
                          backgroundColor: "#f5f5f5",
                          borderRadius: "8px",
                          border: "1px solid #eee",
                        }}>
                          <span style={{ fontSize: "9px", color: "#bbb" }}>—</span>
                        </div>
                      )}
                    </td>
                    <td className="align-top" style={{ padding: "14px 10px" }}>
                      <span className="block" style={{ fontWeight: 800, color: "#000", fontSize: "15px", marginBottom: "4px" }}>
                        {item.name}
                      </span>
                      {item.sku && (
                        <span style={{ background: "#f0f0f0", color: "#555", fontSize: "10px", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                          #{item.sku}
                        </span>
                      )}
                      {item.description && (
                        <span className="block" style={{ fontSize: "12px", color: "#555", marginTop: "4px", lineHeight: "1.4", maxWidth: "400px" }}>
                          {item.description}
                        </span>
                      )}
                      {gravacao && (
                        <span className="block" style={{ fontSize: "12px", color: "#555", marginTop: "3px", lineHeight: "1.4" }}>
                          Gravação: {gravacao}
                        </span>
                      )}
                      {!gravacao && item.color && (
                        <span className="block" style={{ fontSize: "12px", color: "#555", marginTop: "3px" }}>
                          Cor: {item.color}
                        </span>
                      )}
                    </td>
                    <td className="text-center align-middle" style={{ padding: "14px 8px", fontWeight: 700, fontSize: "14px" }}>{item.quantity}</td>
                    <td className="text-right align-middle" style={{ padding: "14px 8px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 500 }}>{fmt(allInUnitPrice)}</span>
                      {itemDiscount > 0 && (
                        <span className="block" style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                          (Desc: {fmt(itemDiscount)})
                        </span>
                      )}
                    </td>
                    <td className="text-right align-middle" style={{ padding: "14px 8px", fontWeight: 800, fontSize: "15px", color: "#333" }}>{fmt(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* TOTAIS */}
          <div className="flex justify-end" style={{ marginTop: "4px" }}>
            <div style={{ width: "320px" }}>
              <div className="flex justify-between" style={{ padding: "6px 0", fontSize: "13px", color: "#555", borderBottom: "1px solid #fafafa" }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: 500 }}>{fmt(data.subtotal)}</span>
              </div>
              <div className="flex justify-between" style={{ padding: "6px 0", fontSize: "13px", color: "#555", borderBottom: "1px solid #fafafa" }}>
                <span>Frete:</span>
                <span style={{ fontWeight: 500 }}>{data.shippingCost ? fmt(data.shippingCost) : "Cortesia"}</span>
              </div>
              {data.discount && data.discount > 0 && (
                <div className="flex justify-between" style={{ padding: "6px 0", fontSize: "13px", color: "#555", borderBottom: "1px solid #fafafa" }}>
                  <span>Desconto Global:</span>
                  <span style={{ fontWeight: 500 }}>- {fmt(data.discount)}</span>
                </div>
              )}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#00c853",
                color: "#ffffff",
                padding: "12px 18px",
                marginTop: "10px",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,200,83, 0.25)",
              }}>
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, textTransform: "uppercase", fontSize: "14px", color: "#ffffff" }}>
                  Valor Total:
                </span>
                <strong style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: "22px", color: "#ffffff" }}>
                  {fmt(data.total)}
                </strong>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div style={{ marginTop: "12px", fontSize: "11px", color: "#666", lineHeight: "1.5", borderTop: "1px solid #eee", paddingTop: "10px" }}>
            <div style={{ fontWeight: 700, fontSize: "12px", color: "#333", marginBottom: "6px" }}>
              Informações Relevantes:
            </div>
            <div>- Todos os valores são para produtos já personalizados conforme descrição.</div>
            <div>- {data.paymentTerms || "Pagamento: À vista / Boleto / Pix (após a entrega)."}</div>
            <div>- Todos produtos passam por controle de qualidade.</div>
            {data.deliveryTime && <div>- Previsão de Entrega: {data.deliveryTime}.</div>}
            {data.validUntil && <div>- Validade da Proposta: {data.validUntil}.</div>}
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div className="relative" style={{ width: "794px", height: "160px", flexShrink: 0, marginTop: "auto" }}>
          <svg width="794" height="160" viewBox="0 0 794 160" className="absolute top-0 left-0">
            <polygon points="360,160 382,10 410,10 388,160" fill="#e0e0e0" />
            <polygon points="385,160 407,10 443,10 421,160" fill="#00c853" />
            <polygon points="440,50 794,50 794,115 415,115" fill="#333333" />
            <rect x="470" y="115" width="324" height="45" fill="#00c853" />
            <polygon points="470,115 493,115 470,147" fill="#009e41" />
          </svg>

          <div className="relative z-10 h-full" style={{ padding: "0 40px" }}>
            {/* Contatos */}
            <div className="flex items-center gap-4" style={{ paddingTop: "8px", marginBottom: "10px" }}>
              <ContactDot color="#333333" text={data.seller.phone || "00-00000-0000"} />
              <ContactDot color="#00c853" text="promobrindes.com" />
              <ContactDot color="#00c853" text={data.seller.email || "comercial@promobrindes.com.br"} />
            </div>

            <div style={{ fontSize: "10px", fontWeight: 600, color: "#555", lineHeight: "1.3" }}>
              CNPJ: 36.835.552/0001-67<br />
              Razão Social: Brasil Marcas Industria e Comercio de Brindes LTDA.
            </div>

            <div style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: "14px",
              fontWeight: 700,
              color: "#0085ca",
              fontStyle: "italic",
              marginTop: "6px",
            }}>
              adm01@promobrindes.com.br
            </div>

            {/* Assinatura */}
            <div className="absolute text-center" style={{ top: "8px", right: "44px" }}>
              <div style={{
                fontFamily: "'Sacramento', cursive",
                fontSize: "30px",
                color: "#0085ca",
                marginBottom: "-4px",
                transform: "rotate(-3deg)",
              }}>
                {data.seller.name}
              </div>
              <p style={{ fontWeight: 800, fontSize: "11px", textTransform: "uppercase", marginTop: "4px", color: "#000" }}>
                {data.seller.name}
              </p>
              <div style={{ width: "160px", height: "1px", backgroundColor: "#333", margin: "2px auto" }} />
              <p style={{ fontSize: "10px", color: "#666" }}>Executivo de Vendas</p>
            </div>
          </div>
        </div>

        {/* CSS GLOBAL PARA FONTES */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Roboto:wght@300;400;500;700&family=Sacramento&display=swap');
          @media print {
            body { background: white; }
            button { display: none; }
            @page { margin: 0; size: auto; }
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        `}</style>
      </div>
    );
  }
);

PropostaComercialTailwind.displayName = "PropostaComercialTailwind";

function ContactDot({ color, text }: { color: string; text: string }) {
  return (
    <div className="flex items-center gap-2" style={{ fontSize: "12px", fontWeight: 700, color: "#333" }}>
      <div className="rounded-full flex-shrink-0" style={{ width: "12px", height: "12px", backgroundColor: color }} />
      <span>{text}</span>
    </div>
  );
}

const thBase: React.CSSProperties = {
  backgroundColor: "#00c853",
  color: "#fff",
  padding: "12px 10px",
  fontSize: "12px",
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 700,
  textTransform: "uppercase",
};

export default PropostaComercialTailwind;
