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
      <div ref={ref} className="font-sans bg-white text-[#333] print:m-0 print:w-full print:shadow-none"
        style={{ width: "794px", minHeight: "1123px", fontFamily: "'Roboto', sans-serif" }}>

        {/* --- HEADER --- */}
        <div className="relative" style={{ width: "794px", height: "160px", marginBottom: "30px" }}>
          {/* Linha Inferior */}
          <div className="absolute bottom-0 left-0 w-full h-[3px]" style={{ backgroundColor: "#00c853" }} />

          {/* Formas Geométricas */}
          <svg width="794" height="160" viewBox="0 0 794 160" className="absolute top-0 left-0">
            <polygon points="340,0 380,0 420,160 380,160" fill="#00c853" />
            <polygon points="375,0 794,0 794,125 405,125" fill="#333333" />
            <polygon points="405,125 430,125 405,160" fill="#009e41" />
          </svg>

          {/* Logo */}
          <div className="absolute z-10" style={{ top: "50%", left: "40px", transform: "translateY(-50%)", width: "200px" }}>
            <img
              src="/images/promo-brindes-logo.png"
              alt="Promo Brindes"
              className="w-full block"
              crossOrigin="anonymous"
            />
          </div>

          {/* Texto do Header */}
          <div className="absolute z-10 text-right text-white" style={{ top: "25px", right: "40px" }}>
            <p className="uppercase tracking-wide" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: "28px", margin: "0 0 5px 0" }}>
              PROPOSTA
            </p>
            <p style={{ fontSize: "13px", opacity: 0.9, fontWeight: 300, lineHeight: "1.6" }}>
              Nº: #{data.quoteNumber}
            </p>
            <p style={{ fontSize: "13px", opacity: 0.9, fontWeight: 300, lineHeight: "1.6" }}>
              Data: {data.date}
            </p>
          </div>
        </div>

        {/* --- CONTEÚDO PRINCIPAL --- */}
        <div style={{ padding: "0 50px", flex: 1 }}>

          {/* Barra do Cliente */}
          <div className="flex justify-between" style={{ backgroundColor: "#f5f5f5", borderLeft: "6px solid #00c853", padding: "20px 25px", marginBottom: "30px" }}>
            <div>
              <p className="uppercase" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "12px", color: "#00c853", margin: "0 0 5px 0" }}>
                Empresa
              </p>
              <p style={{ fontWeight: 600, fontSize: "16px", color: "#222" }}>{company}</p>
            </div>
            {contact && (
              <div className="text-right">
                <p className="uppercase" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "12px", color: "#00c853", margin: "0 0 5px 0" }}>
                  Solicitante
                </p>
                <p style={{ fontWeight: 600, fontSize: "16px", color: "#222" }}>{contact}</p>
              </div>
            )}
          </div>

          {/* Tabela de Produtos */}
          <table className="w-full border-collapse" style={{ marginBottom: "30px" }}>
            <thead>
              <tr>
                <th className="text-center uppercase" style={{ ...thBase, width: "90px" }}>Foto</th>
                <th className="text-left uppercase" style={thBase}>Descrição do Produto</th>
                <th className="text-center uppercase" style={{ ...thBase, width: "55px" }}>Qtd.</th>
                <th className="text-right uppercase" style={{ ...thBase, width: "100px" }}>Unitário</th>
                <th className="text-right uppercase" style={{ ...thBase, width: "110px" }}>Total</th>
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
                    <td className="text-center align-middle" style={{ padding: "20px 8px", width: "90px" }}>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          crossOrigin="anonymous"
                          className="rounded-md"
                          style={{ width: "80px", height: "80px", objectFit: "contain", border: "1px solid #eee", backgroundColor: "#fff", padding: "4px" }}
                        />
                      ) : (
                        <div className="flex items-center justify-center mx-auto rounded-md" style={{ width: "80px", height: "80px", backgroundColor: "#f5f5f5", border: "1px solid #eee" }}>
                          <span style={{ fontSize: "9px", color: "#bbb" }}>—</span>
                        </div>
                      )}
                    </td>
                    <td className="align-top" style={{ padding: "20px 12px" }}>
                      <span className="block" style={{ fontWeight: 800, color: "#000", fontSize: "16px", marginBottom: "6px" }}>
                        {item.name}
                      </span>
                      {item.sku && (
                        <span className="rounded" style={{ background: "#f0f0f0", color: "#555", fontSize: "11px", padding: "2px 6px", fontWeight: 600 }}>
                          #{item.sku}
                        </span>
                      )}
                      {item.description && (
                        <span className="block" style={{ fontSize: "13px", color: "#555", marginTop: "6px", lineHeight: "1.5", maxWidth: "450px" }}>
                          {item.description}
                        </span>
                      )}
                      {gravacao && (
                        <span className="block" style={{ fontSize: "13px", color: "#555", marginTop: "4px", lineHeight: "1.5" }}>
                          Gravação: {gravacao}
                        </span>
                      )}
                      {!gravacao && item.color && (
                        <span className="block" style={{ fontSize: "13px", color: "#555", marginTop: "4px" }}>
                          Cor: {item.color}
                        </span>
                      )}
                    </td>
                    <td className="text-center align-middle" style={{ padding: "20px 12px", fontWeight: 700, fontSize: "15px" }}>{item.quantity}</td>
                    <td className="text-right align-middle" style={{ padding: "20px 12px" }}>
                      <span style={{ fontSize: "15px", fontWeight: 500 }}>{fmt(allInUnitPrice)}</span>
                      {itemDiscount > 0 && (
                        <span className="block" style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>
                          (Desc: {fmt(itemDiscount)})
                        </span>
                      )}
                    </td>
                    <td className="text-right align-middle" style={{ padding: "20px 12px", fontWeight: 800, fontSize: "16px", color: "#333" }}>{fmt(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* TOTAIS */}
          <div className="flex justify-end" style={{ marginTop: "20px" }}>
            <div style={{ width: "350px" }}>
              <div className="flex justify-between" style={{ padding: "8px 0", fontSize: "14px", color: "#555", borderBottom: "1px solid #fafafa" }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: 500 }}>{fmt(data.subtotal)}</span>
              </div>
              <div className="flex justify-between" style={{ padding: "8px 0", fontSize: "14px", color: "#555", borderBottom: "1px solid #fafafa" }}>
                <span>Frete:</span>
                <span style={{ fontWeight: 500 }}>{data.shippingCost ? fmt(data.shippingCost) : "Cortesia"}</span>
              </div>
              {data.discount && data.discount > 0 && (
                <div className="flex justify-between" style={{ padding: "8px 0", fontSize: "14px", color: "#555", borderBottom: "1px solid #fafafa" }}>
                  <span>Desconto Global:</span>
                  <span style={{ fontWeight: 500 }}>- {fmt(data.discount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-white rounded-md" style={{
                backgroundColor: "#00c853",
                padding: "15px 20px",
                marginTop: "15px",
                boxShadow: "0 4px 10px rgba(0,200,83, 0.2)",
              }}>
                <span className="uppercase" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: "15px" }}>
                  Valor Total:
                </span>
                <strong style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: "24px" }}>
                  {fmt(data.total)}
                </strong>
              </div>
            </div>
          </div>

          {/* Notas */}
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
        </div>

        {/* --- FOOTER --- */}
        <div className="relative" style={{ width: "794px", height: "180px", marginTop: "auto" }}>
          <svg width="794" height="180" viewBox="0 0 794 180" className="absolute top-0 left-0">
            <polygon points="370,180 395,20 425,20 400,180" fill="#e0e0e0" />
            <polygon points="395,180 420,20 460,20 435,180" fill="#00c853" />
            <polygon points="455,60 794,60 794,130 425,130" fill="#333333" />
            <rect x="480" y="130" width="314" height="50" fill="#00c853" />
            <polygon points="480,130 505,130 480,165" fill="#009e41" />
          </svg>

          <div className="relative z-10 h-full" style={{ padding: "0 50px" }}>
            <div className="flex items-center gap-5" style={{ marginBottom: "15px", paddingTop: "10px" }}>
              <ContactDot color="#333333" text={data.seller.phone || "00-00000-0000"} />
              <ContactDot color="#00c853" text="promobrindes.com" />
              <ContactDot color="#00c853" text="comercial01@gmail.com" />
            </div>

            <div style={{ fontSize: "11px", fontWeight: 600, color: "#555", lineHeight: "1.4" }}>
              CNPJ: 36.835.552/0001-67<br />
              Razão Social: Brasil Marcas Industria e Comercio de Brindes LTDA.
            </div>

            <div style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: "16px",
              fontWeight: 700,
              color: "#0085ca",
              fontStyle: "italic",
              marginTop: "8px",
            }}>
              adm01@promobrindes.com.br
            </div>

            {/* Assinatura */}
            <div className="absolute text-center" style={{ top: "10px", right: "50px" }}>
              <div style={{
                fontFamily: "'Sacramento', cursive",
                fontSize: "34px",
                color: "#0085ca",
                marginBottom: "-5px",
                transform: "rotate(-3deg)",
              }}>
                {data.seller.name}
              </div>
              <p className="uppercase" style={{ fontWeight: 800, fontSize: "12px", marginTop: "5px", color: "#000" }}>
                {data.seller.name}
              </p>
              <div className="mx-auto" style={{ width: "180px", height: "1px", backgroundColor: "#333", margin: "2px auto" }} />
              <p style={{ fontSize: "11px", color: "#666" }}>Executivo de Vendas</p>
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
    <div className="flex items-center gap-2" style={{ fontSize: "13px", fontWeight: 700, color: "#333" }}>
      <div className="rounded-full flex-shrink-0" style={{ width: "14px", height: "14px", backgroundColor: color }} />
      <span>{text}</span>
    </div>
  );
}

const thBase: React.CSSProperties = {
  backgroundColor: "#00c853",
  color: "#fff",
  padding: "15px 12px",
  fontSize: "13px",
  fontFamily: "'Montserrat', sans-serif",
  fontWeight: 700,
};

export default PropostaComercialTailwind;
