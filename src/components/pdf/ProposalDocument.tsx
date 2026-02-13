/**
 * ProposalDocument — Template React-PDF para Proposta Comercial
 * 
 * Layout fiel ao PDF de referência da Promo Brindes:
 * - Header verde/preto com "Promo Brindes"
 * - Empresa + Solicitante + Nº + Data
 * - Tabela com foto, descrição, técnica, material
 * - Totais: Sub Total, Frete, Desconto, Valor Total em caixa verde
 * - Informações relevantes
 * - Footer com contatos + CNPJ + assinatura vendedor
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

// ─── Colors (green + black, matching reference PDF) ─────
const C = {
  green: "#2D8C47",
  greenDark: "#1E6B35",
  greenLight: "#E8F5E9",
  black: "#1A1A1A",
  dark: "#222222",
  text: "#333333",
  muted: "#777777",
  light: "#F7F7F7",
  border: "#DDDDDD",
  white: "#FFFFFF",
  orange: "#E67E22",
};

// ─── Styles ──────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.text,
    backgroundColor: C.white,
    paddingBottom: 90,
  },

  // ── Header banner (green bg with black accent) ──
  headerContainer: {
    position: "relative",
    height: 80,
    backgroundColor: C.green,
    marginBottom: 0,
  },
  headerAccent: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 120,
    height: 80,
    backgroundColor: C.black,
  },
  headerContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 35,
    paddingTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Helvetica-BoldOblique",
    color: C.white,
  },
  headerSub: {
    fontSize: 9,
    color: C.white,
    opacity: 0.9,
    marginTop: 2,
  },
  // Green bottom line under header
  headerLine: {
    height: 4,
    backgroundColor: C.greenDark,
  },

  // ── Client + Quote info section ──
  infoSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 35,
    paddingTop: 20,
    paddingBottom: 16,
  },
  clientBlock: {},
  label: {
    fontSize: 9,
    color: C.text,
  },
  companyName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: C.green,
    marginTop: 2,
  },
  contactName: {
    fontSize: 10,
    color: C.dark,
    marginTop: 2,
  },
  quoteBlock: {
    alignItems: "flex-end",
  },
  quoteNumber: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: C.black,
  },
  quoteDate: {
    fontSize: 9,
    color: C.muted,
    marginTop: 3,
  },

  // ── Table ──
  tableWrap: {
    paddingHorizontal: 35,
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.black,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  th: {
    color: C.white,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },

  tableRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },

  // Columns
  colImg: { width: 48 },
  colDesc: { flex: 1, paddingLeft: 8, paddingRight: 4 },
  colQty: { width: 50, textAlign: "center" },
  colUnit: { width: 65, textAlign: "right" },
  colDisc: { width: 60, textAlign: "center" },
  colTotal: { width: 75, textAlign: "right" },

  productImg: {
    width: 42,
    height: 42,
    objectFit: "contain",
    borderRadius: 3,
  },
  productImgPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 3,
    backgroundColor: C.light,
    alignItems: "center",
    justifyContent: "center",
  },
  productName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
  },
  productDesc: {
    fontSize: 7.5,
    color: C.muted,
    marginTop: 2,
    lineHeight: 1.3,
  },
  ticketText: {
    fontSize: 7.5,
    color: C.green,
    fontFamily: "Helvetica-Bold",
    marginTop: 1,
  },
  techLine: {
    fontSize: 7.5,
    color: C.text,
    marginTop: 3,
  },
  techBold: {
    fontFamily: "Helvetica-Bold",
  },
  cellText: {
    fontSize: 9,
    color: C.dark,
  },
  cellBold: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
  },

  // ── Bottom: Info + Totals ──
  bottomWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 35,
    marginTop: 20,
    gap: 30,
  },
  leftCol: {
    flex: 1,
  },
  deliveryTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    marginBottom: 3,
  },
  deliveryText: {
    fontSize: 9,
    color: C.muted,
    marginBottom: 10,
  },
  infoTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    marginBottom: 4,
  },
  infoBullet: {
    fontSize: 8.5,
    color: C.text,
    marginBottom: 3,
    lineHeight: 1.4,
  },

  rightCol: {
    width: 200,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalLabel: {
    fontSize: 9,
    color: C.text,
  },
  totalValue: {
    fontSize: 9,
    color: C.dark,
    fontFamily: "Helvetica-Bold",
  },

  // Grand total box (green border, matching reference)
  grandBox: {
    borderWidth: 2,
    borderColor: C.green,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    marginTop: 8,
  },
  grandLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.green,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  grandValue: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: C.green,
    marginTop: 2,
  },

  // ── Notes ──
  notesBox: {
    marginHorizontal: 35,
    marginTop: 14,
    padding: 10,
    backgroundColor: C.greenLight,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: C.green,
  },
  notesTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: C.greenDark,
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
    paddingHorizontal: 35,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerLeft: { gap: 2 },
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
  sellerName: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.dark,
    textTransform: "uppercase",
  },
  sellerRole: {
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
function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function itemTotal(item: ProposalItem): number {
  return item.quantity * item.unitPrice - (item.discount || 0) * item.quantity;
}

// ─── Document Component ─────────────────────────────────
export const ProposalDocument = ({ data }: { data: ProposalDocumentData }) => {
  const company = data.client.company || data.client.name;
  const contact = data.client.contactName || data.client.name;

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ═══ HEADER: Green banner with black accent ═══ */}
        <View style={s.headerContainer}>
          <View style={s.headerAccent} />
          <View style={s.headerContent}>
            <View>
              <Text style={s.headerTitle}>Promo Brindes</Text>
              <Text style={s.headerSub}>Brindes Promocionais e Personalizados</Text>
            </View>
          </View>
        </View>
        <View style={s.headerLine} />

        {/* ═══ COMPANY + QUOTE NUMBER ═══ */}
        <View style={s.infoSection}>
          <View style={s.clientBlock}>
            <Text style={s.label}>Empresa:</Text>
            <Text style={s.companyName}>{company}</Text>
            <Text style={s.contactName}>Solicitante: {contact}</Text>
            {data.client.email && (
              <Text style={{ fontSize: 8, color: C.muted, marginTop: 2 }}>{data.client.email}</Text>
            )}
          </View>
          <View style={s.quoteBlock}>
            <Text style={s.quoteNumber}>N.: #{data.quoteNumber}</Text>
            <Text style={s.quoteDate}>Data: {data.date}</Text>
            {data.validUntil && (
              <Text style={s.quoteDate}>Valido ate: {data.validUntil}</Text>
            )}
          </View>
        </View>

        {/* ═══ PRODUCTS TABLE ═══ */}
        <View style={s.tableWrap}>
          <View style={s.tableHeader}>
            <View style={s.colImg} />
            <Text style={[s.th, s.colDesc]}>Descricao do Produto</Text>
            <Text style={[s.th, s.colQty]}>Quant.</Text>
            <Text style={[s.th, s.colUnit]}>Valor Uni.</Text>
            <Text style={[s.th, s.colDisc]}>Desconto{"\n"}Unitario</Text>
            <Text style={[s.th, s.colTotal]}>Valor Total</Text>
          </View>

          {data.items.map((item, idx) => (
            <View key={idx} style={s.tableRow} wrap={false}>
              {/* Image */}
              <View style={s.colImg}>
                {item.imageUrl ? (
                  <Image style={s.productImg} src={item.imageUrl} />
                ) : (
                  <View style={s.productImgPlaceholder}>
                    <Text style={{ fontSize: 14, color: C.muted }}>-</Text>
                  </View>
                )}
              </View>

              {/* Description */}
              <View style={s.colDesc}>
                <Text style={s.productName}>{item.name}</Text>
                {item.description && (
                  <Text style={s.productDesc}>{item.description}</Text>
                )}
                {item.sku && (
                  <Text style={s.ticketText}>Ticket: #{item.sku}</Text>
                )}
                {/* Technique + Material */}
                {item.personalizations && item.personalizations.length > 0 ? (
                  item.personalizations.map((p, pIdx) => (
                    <Text key={pIdx} style={s.techLine}>
                      <Text style={s.techBold}>Gravacao: </Text>
                      <Text>{p.technique_name}</Text>
                      {p.colors_count && p.colors_count > 1 && (
                        <Text> ({p.colors_count} cores)</Text>
                      )}
                      {(p.material || item.material) && (
                        <Text>
                          {"  "}
                          <Text style={s.techBold}>Material: </Text>
                          <Text>{p.material || item.material}</Text>
                        </Text>
                      )}
                    </Text>
                  ))
                ) : item.color ? (
                  <Text style={s.techLine}>
                    <Text style={s.techBold}>Cor: </Text>
                    <Text>{item.color}</Text>
                  </Text>
                ) : null}
              </View>

              {/* Qty */}
              <Text style={[s.cellBold, s.colQty]}>{item.quantity}.</Text>

              {/* Unit */}
              <Text style={[s.cellText, s.colUnit]}>{fmt(item.unitPrice)}</Text>

              {/* Discount */}
              <Text style={[s.cellText, s.colDisc]}>{fmt(item.discount || 0)}</Text>

              {/* Total */}
              <Text style={[s.cellBold, s.colTotal]}>{fmt(itemTotal(item))}</Text>
            </View>
          ))}
        </View>

        {/* ═══ BOTTOM: INFO + TOTALS ═══ */}
        <View style={s.bottomWrap}>
          {/* Left: Delivery + Conditions */}
          <View style={s.leftCol}>
            {data.deliveryTime && (
              <>
                <Text style={s.deliveryTitle}>Previsao de Entrega: {data.deliveryTime}</Text>
              </>
            )}
            {data.validUntil && (
              <Text style={s.deliveryText}>Orcamento Valido por 15 dias apos o envio</Text>
            )}
            <Text style={s.infoTitle}>Informacoes Relevantes:</Text>
            <Text style={s.infoBullet}>- Todos os valores sao para produtos ja personalizados.</Text>
            {data.paymentTerms ? (
              <Text style={s.infoBullet}>- {data.paymentTerms}</Text>
            ) : (
              <Text style={s.infoBullet}>- Pagamento feito apos a entrega (A vista / Boleto / Pix).</Text>
            )}
            <Text style={s.infoBullet}>- Todos produtos passam por controle de qualidade.</Text>
          </View>

          {/* Right: Totals */}
          <View style={s.rightCol}>
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
                <Text style={s.totalValue}>{fmt(data.discount)}</Text>
              </View>
            )}

            {/* Grand Total Box */}
            <View style={s.grandBox}>
              <Text style={s.grandLabel}>Valor Total da Proposta:</Text>
              <Text style={s.grandValue}>{fmt(data.total)}</Text>
            </View>
          </View>
        </View>

        {/* ═══ NOTES ═══ */}
        {data.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesTitle}>Observacoes</Text>
            <Text style={s.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* ═══ FOOTER ═══ */}
        <View style={s.footer} fixed>
          <View style={s.footerLeft}>
            <Text style={s.footerContact}>promobrindes.com</Text>
            <Text style={s.footerContact}>comercial01@gmail.com</Text>
            {data.seller.phone && (
              <Text style={s.footerContact}>{data.seller.phone}</Text>
            )}
            <Text style={s.footerLegal}>CNPJ: 36.835.552/0001-67</Text>
            <Text style={s.footerLegal}>Razao Social: Brasil Marcas Industria e Comercio de Brindes LTDA.</Text>
          </View>
          <View style={s.footerRight}>
            <Text style={s.sellerName}>{data.seller.name}</Text>
            <Text style={s.sellerRole}>Executivo de Vendas</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
};

export default ProposalDocument;
