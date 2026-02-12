/**
 * ProposalDocument — Template React-PDF para Proposta Comercial
 * 
 * Layout premium baseado no mockup v2 com:
 * - Header com branding
 * - Info do cliente e nº do orçamento
 * - Tabela de produtos com personalização detalhada
 * - Seção de totais (subtotal, frete, desconto, líquido)
 * - Condições e observações
 * - Footer com dados do vendedor e QR code
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
  Link,
} from "@react-pdf/renderer";

// ─── Fonts ───────────────────────────────────────────────
Font.register({
  family: "DM Sans",
  fonts: [
    { src: "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAopxhS23kVg.ttf", fontWeight: 300 },
    { src: "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAkJxhS23kVg.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAzpxhS23kVg.ttf", fontWeight: 500 },
    { src: "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAIpthS23kVg.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAG5thS23kVg.ttf", fontWeight: 700 },
  ],
});

// ─── Colors ──────────────────────────────────────────────
const C = {
  primary: "#EA580C",        // Orange 600
  primaryLight: "#FFF7ED",   // Orange 50
  primaryMid: "#FDBA74",     // Orange 300
  dark: "#1C1917",           // Stone 900
  text: "#44403C",           // Stone 700
  muted: "#78716C",          // Stone 500
  light: "#F5F5F4",          // Stone 100
  border: "#E7E5E4",         // Stone 200
  white: "#FFFFFF",
  green: "#16A34A",
  greenLight: "#F0FDF4",
};

// ─── Styles ──────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "DM Sans",
    fontSize: 9,
    color: C.text,
    backgroundColor: C.white,
    paddingTop: 30,
    paddingBottom: 60,
    paddingHorizontal: 35,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  brandBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandIcon: {
    width: 32,
    height: 32,
    backgroundColor: C.primary,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  brandIconText: {
    fontSize: 18,
    color: C.white,
    textAlign: "center",
  },
  brandName: {
    fontSize: 16,
    fontWeight: 700,
    color: C.dark,
    letterSpacing: -0.3,
  },
  brandSub: {
    fontSize: 8,
    color: C.muted,
    marginTop: 1,
  },
  quoteInfo: {
    alignItems: "flex-end",
  },
  quoteNumber: {
    fontSize: 11,
    fontWeight: 700,
    color: C.primary,
  },
  quoteDate: {
    fontSize: 8,
    color: C.muted,
    marginTop: 2,
  },

  // Client bar
  clientBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.primaryLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: C.primaryMid,
  },
  clientLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  clientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  clientAvatarText: {
    fontSize: 14,
    fontWeight: 700,
    color: C.white,
    textAlign: "center",
  },
  clientLabel: {
    fontSize: 7,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  clientName: {
    fontSize: 12,
    fontWeight: 700,
    color: C.dark,
  },
  clientContact: {
    fontSize: 8,
    color: C.muted,
    marginTop: 1,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 6,
  },

  // Table header
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.dark,
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  thText: {
    color: C.white,
    fontSize: 7,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Table row
  tableRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tableRowAlt: {
    backgroundColor: C.light,
  },

  // Column widths
  colProduct: { width: "42%" },
  colQty: { width: "10%", textAlign: "center" },
  colUnit: { width: "15%", textAlign: "right" },
  colDiscount: { width: "13%", textAlign: "center" },
  colTotal: { width: "20%", textAlign: "right" },

  // Product cell
  productName: {
    fontSize: 10,
    fontWeight: 600,
    color: C.dark,
  },
  productSku: {
    fontSize: 7,
    color: C.muted,
    fontWeight: 500,
  },
  productDesc: {
    fontSize: 7.5,
    color: C.muted,
    marginTop: 3,
    lineHeight: 1.4,
  },
  techBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  techText: {
    fontSize: 7,
    color: C.primary,
    fontWeight: 500,
  },
  materialText: {
    fontSize: 7,
    color: C.text,
  },

  cellText: {
    fontSize: 9,
    color: C.dark,
    fontWeight: 500,
  },
  discountText: {
    fontSize: 8,
    color: C.green,
    fontWeight: 500,
  },

  // Totals
  totalsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    gap: 16,
  },
  conditionsBox: {
    flex: 1,
    padding: 12,
    backgroundColor: C.light,
    borderRadius: 8,
  },
  conditionsTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: C.dark,
    marginBottom: 6,
  },
  conditionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 4,
  },
  conditionIcon: {
    fontSize: 8,
    color: C.primary,
  },
  conditionText: {
    fontSize: 8,
    color: C.text,
    lineHeight: 1.4,
    flex: 1,
  },

  totalsBox: {
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
    fontWeight: 500,
  },
  totalDivider: {
    height: 1.5,
    backgroundColor: C.dark,
    marginVertical: 4,
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: C.dark,
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: 700,
    color: C.primary,
  },
  savingsText: {
    fontSize: 7.5,
    color: C.green,
    marginTop: 4,
    textAlign: "right",
  },

  // Notes
  notesBox: {
    marginTop: 14,
    padding: 10,
    backgroundColor: C.primaryLight,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.primaryMid,
  },
  notesTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: C.primary,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 8,
    color: C.text,
    lineHeight: 1.5,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 35,
    right: 35,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
  },
  footerLeft: {
    gap: 2,
  },
  footerText: {
    fontSize: 7,
    color: C.muted,
  },
  footerSeller: {
    fontSize: 8,
    fontWeight: 600,
    color: C.dark,
  },
  footerRight: {
    alignItems: "flex-end",
  },
  footerBrand: {
    fontSize: 8,
    fontWeight: 700,
    color: C.primary,
  },
  footerVersion: {
    fontSize: 6,
    color: C.muted,
    marginTop: 2,
  },

  // Trust badges
  trustRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trustText: {
    fontSize: 7,
    color: C.muted,
    fontWeight: 500,
  },

  // Validity
  validityBox: {
    backgroundColor: C.greenLight,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: "flex-end",
  },
  validityText: {
    fontSize: 7,
    color: C.green,
    fontWeight: 600,
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function itemTotal(item: ProposalItem): number {
  const base = item.quantity * item.unitPrice;
  const discount = (item.discount || 0) * item.quantity;
  return base - discount;
}

// ─── Document ────────────────────────────────────────────
export const ProposalDocument = ({ data }: { data: ProposalDocumentData }) => {
  const clientDisplay = data.client.company || data.client.name;
  const initials = getInitials(clientDisplay);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── HEADER ── */}
        <View style={s.headerRow}>
          <View style={s.brandBlock}>
            <View style={s.brandIcon}>
              <Text style={s.brandIconText}>🎁</Text>
            </View>
            <View>
              <Text style={s.brandName}>Promo Brindes</Text>
              <Text style={s.brandSub}>Brindes Promocionais e Personalizados</Text>
            </View>
          </View>
          <View style={s.quoteInfo}>
            <Text style={s.quoteNumber}>Nº {data.quoteNumber}</Text>
            <Text style={s.quoteDate}>{data.date}</Text>
          </View>
        </View>

        {/* ── CLIENT BAR ── */}
        <View style={s.clientBar}>
          <View style={s.clientLeft}>
            <View style={s.clientAvatar}>
              <Text style={s.clientAvatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={s.clientLabel}>Proposta para</Text>
              <Text style={s.clientName}>{clientDisplay}</Text>
              {data.client.contactName && (
                <Text style={s.clientContact}>Solicitante: {data.client.contactName}</Text>
              )}
              {data.client.email && (
                <Text style={s.clientContact}>{data.client.email}</Text>
              )}
            </View>
          </View>
          {data.validUntil && (
            <View style={s.validityBox}>
              <Text style={s.validityText}>Válido até {data.validUntil}</Text>
            </View>
          )}
        </View>

        {/* ── TABLE HEADER ── */}
        <View style={s.tableHeader}>
          <Text style={[s.thText, s.colProduct]}>Descrição do Produto</Text>
          <Text style={[s.thText, s.colQty]}>Qtd</Text>
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
            {/* Product info */}
            <View style={s.colProduct}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                <Text style={s.productName}>{item.name}</Text>
                {item.sku && <Text style={s.productSku}>#{item.sku}</Text>}
              </View>
              {item.description && (
                <Text style={s.productDesc}>{item.description}</Text>
              )}
              {/* Personalizations */}
              {item.personalizations && item.personalizations.length > 0 && (
                <View style={{ marginTop: 4 }}>
                  {item.personalizations.map((p, pIdx) => (
                    <View key={pIdx} style={s.techBadge}>
                      <Text style={s.techText}>◇ {p.technique_name}</Text>
                      {p.material && (
                        <Text style={s.materialText}>▪ {p.material}</Text>
                      )}
                      {p.colors_count && p.colors_count > 1 && (
                        <Text style={s.materialText}>({p.colors_count} cores)</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
              {/* Fallback: legacy personalization_type */}
              {(!item.personalizations || item.personalizations.length === 0) && item.color && (
                <View style={s.techBadge}>
                  <Text style={s.materialText}>▪ {item.color}</Text>
                </View>
              )}
            </View>

            {/* Qty */}
            <Text style={[s.cellText, s.colQty]}>{item.quantity}</Text>
            
            {/* Unit price */}
            <Text style={[s.cellText, s.colUnit]}>{fmt(item.unitPrice)}</Text>
            
            {/* Discount */}
            <Text style={[item.discount ? s.discountText : s.cellText, s.colDiscount]}>
              {item.discount ? `-${fmt(item.discount)}` : "—"}
            </Text>
            
            {/* Total */}
            <Text style={[s.cellText, s.colTotal]}>{fmt(itemTotal(item))}</Text>
          </View>
        ))}

        {/* ── TOTALS + CONDITIONS ── */}
        <View style={s.totalsSection}>
          {/* Left: conditions */}
          <View style={s.conditionsBox}>
            {data.deliveryTime && (
              <>
                <Text style={s.conditionsTitle}>Previsão de Entrega</Text>
                <Text style={[s.conditionText, { marginBottom: 8 }]}>{data.deliveryTime}</Text>
              </>
            )}
            <Text style={s.conditionsTitle}>Informações Relevantes</Text>
            <View style={s.conditionRow}>
              <Text style={s.conditionIcon}>✅</Text>
              <Text style={s.conditionText}>Valores incluem personalização completa</Text>
            </View>
            {data.paymentTerms && (
              <View style={s.conditionRow}>
                <Text style={s.conditionIcon}>💳</Text>
                <Text style={s.conditionText}>{data.paymentTerms}</Text>
              </View>
            )}
            <View style={s.conditionRow}>
              <Text style={s.conditionIcon}>🔍</Text>
              <Text style={s.conditionText}>Todos os produtos passam por controle de qualidade</Text>
            </View>
          </View>

          {/* Right: totals */}
          <View style={s.totalsBox}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Sub Total</Text>
              <Text style={s.totalValue}>{fmt(data.subtotal)}</Text>
            </View>
            
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Frete</Text>
              <Text style={s.totalValue}>
                {data.shippingCost ? fmt(data.shippingCost) : "✓ Cortesia"}
              </Text>
            </View>

            {data.discount && data.discount > 0 && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Desconto</Text>
                <Text style={[s.totalValue, { color: C.green }]}>- {fmt(data.discount)}</Text>
              </View>
            )}

            <View style={s.totalDivider} />

            <View style={s.totalRow}>
              <Text style={s.grandTotalLabel}>Valor Total</Text>
              <Text style={s.grandTotalValue}>{fmt(data.total)}</Text>
            </View>

            {data.discount && data.discount > 0 && (
              <Text style={s.savingsText}>
                Você economiza {fmt(data.discount)} nesta proposta
              </Text>
            )}
          </View>
        </View>

        {/* ── NOTES ── */}
        {data.notes && (
          <View style={s.notesBox}>
            <Text style={s.notesTitle}>Observações</Text>
            <Text style={s.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* ── TRUST BADGES ── */}
        <View style={s.trustRow}>
          <View style={s.trustBadge}>
            <Text style={s.conditionIcon}>✅</Text>
            <Text style={s.trustText}>+500 empresas atendidas</Text>
          </View>
          <View style={s.trustBadge}>
            <Text style={s.conditionIcon}>⭐</Text>
            <Text style={s.trustText}>Referência em brindes corporativos</Text>
          </View>
          <View style={s.trustBadge}>
            <Text style={s.conditionIcon}>🛡️</Text>
            <Text style={s.trustText}>Garantia de qualidade</Text>
          </View>
        </View>

        {/* ── FOOTER ── */}
        <View style={s.footer} fixed>
          <View style={s.footerLeft}>
            <Text style={s.footerSeller}>{data.seller.name}</Text>
            {data.seller.email && <Text style={s.footerText}>{data.seller.email}</Text>}
            {data.seller.phone && <Text style={s.footerText}>{data.seller.phone}</Text>}
          </View>
          <View style={s.footerRight}>
            <Text style={s.footerBrand}>Promo Brindes</Text>
            <Text style={s.footerVersion}>Proposta gerada automaticamente</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ProposalDocument;
