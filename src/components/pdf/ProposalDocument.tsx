/**
 * ProposalDocument — Template React-PDF para Proposta Comercial
 * 
 * Layout baseado na proposta real da Promo Brindes com:
 * - Header com banner laranja e branding
 * - Dados da empresa + solicitante + nº orçamento
 * - Tabela de produtos com foto, descrição, técnica e material
 * - Totais (subtotal, frete, desconto, valor total)
 * - Condições e informações relevantes
 * - Footer com dados de contato e assinatura do vendedor
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

// ─── Colors (brand orange) ──────────────────────────────
const C = {
  primary: "#EA580C",
  primaryDark: "#C2410C",
  primaryLight: "#FFF7ED",
  primaryMid: "#FDBA74",
  dark: "#1C1917",
  text: "#44403C",
  muted: "#78716C",
  light: "#F5F5F4",
  border: "#D6D3D1",
  white: "#FFFFFF",
  green: "#16A34A",
  greenBg: "#DCFCE7",
  headerBg: "#292524",
};

// ─── Styles ──────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.text,
    backgroundColor: C.white,
    paddingBottom: 80,
  },

  // ── Top banner ──
  banner: {
    backgroundColor: C.primary,
    height: 70,
    paddingHorizontal: 35,
    paddingTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bannerTitle: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    letterSpacing: 1,
  },
  bannerSub: {
    fontSize: 9,
    color: C.white,
    opacity: 0.85,
    marginTop: 2,
  },
  bannerRight: {
    alignItems: "flex-end",
  },
  bannerLabel: {
    fontSize: 7,
    color: C.white,
    opacity: 0.7,
    textTransform: "uppercase",
  },

  // ── Client section ──
  clientSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 35,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  clientBlock: {},
  clientLabel: {
    fontSize: 8,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  clientCompany: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: C.primary,
    marginBottom: 2,
  },
  clientContact: {
    fontSize: 9,
    color: C.dark,
  },
  clientDetail: {
    fontSize: 8,
    color: C.muted,
    marginTop: 1,
  },
  quoteInfoBox: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  quoteNumber: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
  },
  quoteDate: {
    fontSize: 9,
    color: C.muted,
    marginTop: 3,
  },

  // ── Table ──
  tableContainer: {
    paddingHorizontal: 35,
    marginTop: 14,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.headerBg,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  thText: {
    color: C.white,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },

  tableRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableRowAlt: {
    backgroundColor: "#FAFAF9",
  },

  // Column widths
  colImage: { width: 45 },
  colDesc: { width: "40%", paddingLeft: 6 },
  colQty: { width: "10%", textAlign: "center" },
  colUnit: { width: "15%", textAlign: "right" },
  colDiscount: { width: "12%", textAlign: "center" },
  colTotal: { width: "15%", textAlign: "right" },

  productImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
    objectFit: "contain",
    backgroundColor: C.light,
  },
  productName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
  },
  productSku: {
    fontSize: 7,
    color: C.primary,
    fontFamily: "Helvetica-Bold",
    marginTop: 1,
  },
  productDesc: {
    fontSize: 7.5,
    color: C.muted,
    marginTop: 2,
    lineHeight: 1.4,
  },
  techLine: {
    fontSize: 7.5,
    color: C.text,
    marginTop: 3,
  },
  techLabel: {
    fontFamily: "Helvetica-Bold",
    color: C.dark,
  },
  materialLabel: {
    fontFamily: "Helvetica-Bold",
    color: C.dark,
  },
  cellText: {
    fontSize: 9,
    color: C.dark,
  },
  cellTextBold: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
  },

  // ── Bottom section ──
  bottomSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 35,
    marginTop: 18,
    gap: 20,
  },
  infoColumn: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    marginBottom: 6,
  },
  infoSubtitle: {
    fontSize: 9,
    color: C.muted,
    marginBottom: 10,
  },
  infoSectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    marginTop: 8,
    marginBottom: 4,
  },
  infoBullet: {
    fontSize: 8,
    color: C.text,
    marginBottom: 3,
    lineHeight: 1.4,
  },

  // ── Totals ──
  totalsColumn: {
    width: 200,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 9,
    color: C.muted,
  },
  totalValue: {
    fontSize: 9,
    color: C.dark,
  },
  totalDivider: {
    height: 2,
    backgroundColor: C.primary,
    marginVertical: 6,
    borderRadius: 1,
  },
  grandTotalBox: {
    backgroundColor: C.primaryLight,
    borderWidth: 2,
    borderColor: C.primary,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  grandTotalValue: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: C.primary,
    marginTop: 2,
  },

  // ── Notes ──
  notesBox: {
    marginHorizontal: 35,
    marginTop: 12,
    padding: 10,
    backgroundColor: C.primaryLight,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.primaryMid,
  },
  notesTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.primary,
    marginBottom: 3,
  },
  notesText: {
    fontSize: 8,
    color: C.text,
    lineHeight: 1.5,
  },

  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 35,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerLeft: {
    gap: 2,
  },
  footerContact: {
    fontSize: 7.5,
    color: C.muted,
  },
  footerLegal: {
    fontSize: 7,
    color: C.muted,
    marginTop: 4,
  },
  footerRight: {
    alignItems: "flex-end",
  },
  footerSellerName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    textTransform: "uppercase",
  },
  footerSellerRole: {
    fontSize: 8,
    color: C.muted,
    marginTop: 1,
  },
});

// ─── Types ───────────────────────────────────────────────
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

export interface ProposalDocumentData {
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
  shippingLabel?: string;
  total: number;
  notes?: string;
  internalNotes?: string;
  paymentTerms?: string;
  deliveryTime?: string;
}

// ─── Helpers ─────────────────────────────────────────────
function fmt(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function itemTotal(item: ProposalItem): number {
  const base = item.quantity * item.unitPrice;
  const discountTotal = (item.discount || 0) * item.quantity;
  return base - discountTotal;
}

// ─── Document ────────────────────────────────────────────
export const ProposalDocument = ({ data }: { data: ProposalDocumentData }) => {
  const companyName = data.client.company || data.client.name;
  const contactName = data.client.contactName || data.client.name;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── BANNER HEADER ── */}
        <View style={s.banner}>
          <View>
            <Text style={s.bannerTitle}>Promo Brindes</Text>
            <Text style={s.bannerSub}>Brindes Promocionais e Personalizados</Text>
          </View>
          <View style={s.bannerRight}>
            <Text style={s.bannerLabel}>Proposta Comercial</Text>
          </View>
        </View>

        {/* ── CLIENT + QUOTE INFO ── */}
        <View style={s.clientSection}>
          <View style={s.clientBlock}>
            <Text style={s.clientLabel}>Empresa</Text>
            <Text style={s.clientCompany}>{companyName}</Text>
            {contactName !== companyName && (
              <Text style={s.clientContact}>Solicitante: {contactName}</Text>
            )}
            {data.client.email && (
              <Text style={s.clientDetail}>{data.client.email}</Text>
            )}
            {data.client.phone && (
              <Text style={s.clientDetail}>{data.client.phone}</Text>
            )}
          </View>
          <View style={s.quoteInfoBox}>
            <Text style={s.quoteNumber}>N. {data.quoteNumber}</Text>
            <Text style={s.quoteDate}>Data: {data.date}</Text>
            {data.validUntil && (
              <Text style={s.quoteDate}>Valido ate: {data.validUntil}</Text>
            )}
          </View>
        </View>

        {/* ── TABLE HEADER ── */}
        <View style={s.tableContainer}>
          <View style={s.tableHeader}>
            <View style={s.colImage} />
            <Text style={[s.thText, s.colDesc]}>Descricao do Produto</Text>
            <Text style={[s.thText, s.colQty]}>Quant.</Text>
            <Text style={[s.thText, s.colUnit]}>Valor Uni.</Text>
            <Text style={[s.thText, s.colDiscount]}>Desconto</Text>
            <Text style={[s.thText, s.colTotal]}>Valor Total</Text>
          </View>

          {/* ── TABLE BODY ── */}
          {data.items.map((item, idx) => (
            <View
              key={idx}
              style={[s.tableRow, idx % 2 === 1 ? s.tableRowAlt : {}]}
              wrap={false}
            >
              {/* Product image */}
              <View style={s.colImage}>
                {item.imageUrl ? (
                  <Image style={s.productImage} src={item.imageUrl} />
                ) : (
                  <View style={[s.productImage, { alignItems: "center", justifyContent: "center" }]}>
                    <Text style={{ fontSize: 16, color: C.muted }}>-</Text>
                  </View>
                )}
              </View>

              {/* Description */}
              <View style={s.colDesc}>
                <Text style={s.productName}>{item.name}</Text>
                {item.sku && (
                  <Text style={s.productSku}>Ticket: #{item.sku}</Text>
                )}
                {item.description && (
                  <Text style={s.productDesc}>{item.description}</Text>
                )}
                {/* Technique + Material line */}
                {item.personalizations && item.personalizations.length > 0 ? (
                  item.personalizations.map((p, pIdx) => (
                    <Text key={pIdx} style={s.techLine}>
                      <Text style={s.techLabel}>Gravacao: </Text>
                      <Text>{p.technique_name}</Text>
                      {p.colors_count && p.colors_count > 1 ? (
                        <Text> ({p.colors_count} cores)</Text>
                      ) : null}
                      {(p.material || item.material) ? (
                        <Text>
                          {"  "}
                          <Text style={s.materialLabel}>Material: </Text>
                          {p.material || item.material}
                        </Text>
                      ) : null}
                    </Text>
                  ))
                ) : item.color ? (
                  <Text style={s.techLine}>
                    <Text style={s.techLabel}>Cor: </Text>
                    <Text>{item.color}</Text>
                    {item.material ? (
                      <Text>
                        {"  "}
                        <Text style={s.materialLabel}>Material: </Text>
                        {item.material}
                      </Text>
                    ) : null}
                  </Text>
                ) : null}
              </View>

              {/* Qty */}
              <Text style={[s.cellTextBold, s.colQty]}>{item.quantity}</Text>

              {/* Unit price */}
              <Text style={[s.cellText, s.colUnit]}>{fmt(item.unitPrice)}</Text>

              {/* Discount */}
              <Text style={[s.cellText, s.colDiscount]}>
                {item.discount ? fmt(item.discount) : fmt(0)}
              </Text>

              {/* Total */}
              <Text style={[s.cellTextBold, s.colTotal]}>{fmt(itemTotal(item))}</Text>
            </View>
          ))}
        </View>

        {/* ── BOTTOM: INFO + TOTALS ── */}
        <View style={s.bottomSection}>
          {/* Left: delivery + conditions */}
          <View style={s.infoColumn}>
            {data.deliveryTime && (
              <>
                <Text style={s.infoTitle}>Previsao de Entrega:</Text>
                <Text style={s.infoSubtitle}>{data.deliveryTime}</Text>
              </>
            )}
            {data.validUntil && (
              <Text style={s.infoBullet}>Orcamento valido ate {data.validUntil}</Text>
            )}
            <Text style={s.infoSectionTitle}>Informacoes Relevantes:</Text>
            <Text style={s.infoBullet}>- Todos os valores sao para produtos ja personalizados.</Text>
            {data.paymentTerms ? (
              <Text style={s.infoBullet}>- {data.paymentTerms}</Text>
            ) : (
              <Text style={s.infoBullet}>- Pagamento feito apos a entrega (A vista / Boleto / Pix).</Text>
            )}
            <Text style={s.infoBullet}>- Todos produtos passam por controle de qualidade.</Text>
          </View>

          {/* Right: totals */}
          <View style={s.totalsColumn}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Sub Total:</Text>
              <Text style={s.totalValue}>{fmt(data.subtotal)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Valor Frete:</Text>
              <Text style={s.totalValue}>
                {data.shippingCost ? fmt(data.shippingCost) : "Cortesia"}
              </Text>
            </View>
            {data.discount && data.discount > 0 && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Desconto:</Text>
                <Text style={[s.totalValue, { color: C.green }]}>{fmt(data.discount)}</Text>
              </View>
            )}
            <View style={s.totalDivider} />
            <View style={s.grandTotalBox}>
              <Text style={s.grandTotalLabel}>Valor Total da Proposta:</Text>
              <Text style={s.grandTotalValue}>{fmt(data.total)}</Text>
            </View>
          </View>
        </View>

        {/* ── NOTES ── */}
        {data.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesTitle}>Observacoes</Text>
            <Text style={s.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* ── FOOTER ── */}
        <View style={s.footer} fixed>
          <View style={s.footerLeft}>
            <Text style={s.footerContact}>promobrindes.com</Text>
            <Text style={s.footerContact}>comercial01@gmail.com</Text>
            {data.seller.phone && (
              <Text style={s.footerContact}>{data.seller.phone}</Text>
            )}
            <Text style={s.footerLegal}>
              CNPJ: 36.835.552/0001-67
            </Text>
            <Text style={s.footerLegal}>
              Razao Social: Brasil Marcas Industria e Comercio de Brindes LTDA.
            </Text>
          </View>
          <View style={s.footerRight}>
            <Text style={s.footerSellerName}>{data.seller.name}</Text>
            <Text style={s.footerSellerRole}>Executivo de Vendas</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ProposalDocument;
