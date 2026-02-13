/**
 * Proposal PDF Generator — jsPDF implementation
 * 
 * Layout fiel ao PDF de referência da Promo Brindes:
 * - Header verde/preto
 * - Empresa + Solicitante + Nº + Data
 * - Tabela com descrição, técnica, material
 * - Totais com caixa verde "Valor Total da Proposta"
 * - Footer com CNPJ e vendedor
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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

function fmt(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Colors matching reference PDF
const GREEN = [45, 140, 71] as const;    // #2D8C47
const GREEN_DARK = [30, 107, 53] as const;
const BLACK = [26, 26, 26] as const;
const TEXT = [51, 51, 51] as const;
const MUTED = [119, 119, 119] as const;
const WHITE = [255, 255, 255] as const;

// Helper to load image as base64 for jsPDF
async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateProposalPDFv2(data: ProposalDocumentData): Promise<Blob> {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = 0;

  // Pre-load product images
  const imageMap = new Map<number, string>();
  await Promise.all(
    data.items.map(async (item, idx) => {
      if (item.imageUrl) {
        const b64 = await loadImageAsBase64(item.imageUrl);
        if (b64) imageMap.set(idx, b64);
      }
    })
  );

  // ═══ HEADER: Green banner ═══
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pw, 28, "F");
  // Black accent on right
  doc.setFillColor(...BLACK);
  doc.rect(pw - 50, 0, 50, 28, "F");
  // Dark green bottom line
  doc.setFillColor(...GREEN_DARK);
  doc.rect(0, 28, pw, 2, "F");

  // Title
  doc.setFontSize(20);
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bolditalic");
  doc.text("Promo Brindes", margin, 16);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Brindes Promocionais e Personalizados", margin, 23);

  y = 40;

  // ═══ CLIENT + QUOTE INFO ═══
  const company = data.client.company || data.client.name;
  const contact = data.client.contactName || data.client.name;

  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "normal");
  doc.text("Empresa:", margin, y);

  y += 6;
  doc.setFontSize(14);
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.text(company, margin, y);

  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "normal");
  doc.text(`Solicitante: ${contact}`, margin, y);

  if (data.client.email) {
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(data.client.email, margin, y);
  }

  // Quote number (right)
  doc.setFontSize(14);
  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "bold");
  doc.text(`N.: #${data.quoteNumber}`, pw - margin, 40, { align: "right" });

  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.text(`Data: ${data.date}`, pw - margin, 48, { align: "right" });
  if (data.validUntil) {
    doc.text(`Valido ate: ${data.validUntil}`, pw - margin, 54, { align: "right" });
  }

  y += 10;

  // ═══ PRODUCTS TABLE ═══
  // Calculate unit price including personalization
  const tableBody = data.items.map((item, idx) => {
    // Personalization cost per unit
    const persUnitCost = item.personalizations?.reduce((sum, p) => {
      const pTotal = p.total_cost || 0;
      return sum + (item.quantity > 0 ? pTotal / item.quantity : 0);
    }, 0) || 0;

    const allInUnitPrice = item.unitPrice + persUnitCost;
    const total = item.quantity * allInUnitPrice - (item.discount || 0) * item.quantity;

    // Build description lines
    let desc = item.name;
    if (item.sku) desc += `\nTicket: #${item.sku}`;

    // Technique + Material
    if (item.personalizations && item.personalizations.length > 0) {
      item.personalizations.forEach(p => {
        let line = `Gravacao: ${p.technique_name}`;
        if (p.colors_count && p.colors_count > 1) line += ` (${p.colors_count} cores)`;
        if (p.material || item.material) line += `  Material: ${p.material || item.material}`;
        desc += `\n${line}`;
      });
    } else if (item.color) {
      desc += `\nCor: ${item.color}`;
    }

    return {
      desc,
      qty: `${item.quantity}.`,
      unit: fmt(allInUnitPrice),
      discount: fmt(item.discount || 0),
      total: fmt(total),
      imgIdx: idx,
    };
  });

  autoTable(doc, {
    startY: y,
    head: [["", "Descricao do Produto", "Quant.", "Valor Uni.", "Desconto\nUnitario", "Valor Total"]],
    body: tableBody.map(r => ["", r.desc, r.qty, r.unit, r.discount, r.total]),
    theme: "plain",
    headStyles: {
      fillColor: [...BLACK] as [number, number, number],
      textColor: [...WHITE] as [number, number, number],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 5,
      lineColor: [221, 221, 221],
      lineWidth: 0.3,
      minCellHeight: 20,
    },
    columnStyles: {
      0: { cellWidth: 18, halign: "center" },
      1: { cellWidth: 62, halign: "left", fontStyle: "normal" },
      2: { cellWidth: 18, halign: "center", fontStyle: "bold" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 22, halign: "center" },
      5: { cellWidth: 28, halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
    didDrawCell: (hookData) => {
      // Draw product image in first column
      if (hookData.section === "body" && hookData.column.index === 0) {
        const rowIdx = hookData.row.index;
        const imgData = imageMap.get(tableBody[rowIdx]?.imgIdx);
        if (imgData) {
          const cellX = hookData.cell.x + 1;
          const cellY = hookData.cell.y + 1;
          const imgSize = Math.min(hookData.cell.height - 2, 16);
          try {
            doc.addImage(imgData, "JPEG", cellX, cellY, imgSize, imgSize);
          } catch {
            // skip if image fails
          }
        }
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // ═══ BOTTOM LEFT: Delivery + Conditions ═══
  const leftX = margin;
  let leftY = y;

  if (data.deliveryTime) {
    doc.setFontSize(11);
    doc.setTextColor(...BLACK);
    doc.setFont("helvetica", "bold");
    doc.text(`Previsao de Entrega: ${data.deliveryTime}`, leftX, leftY);
    leftY += 6;
  }

  if (data.validUntil) {
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text(`Orcamento Valido por 15 dias apos o envio`, leftX, leftY);
    leftY += 10;
  }

  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "bold");
  doc.text("Informacoes Relevantes:", leftX, leftY);
  leftY += 6;

  doc.setFontSize(8);
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "normal");
  doc.text("- Todos os valores sao para produtos ja personalizados.", leftX, leftY);
  leftY += 5;

  if (data.paymentTerms) {
    doc.text(`- ${data.paymentTerms}`, leftX, leftY);
  } else {
    doc.text("- Pagamento feito apos a entrega (A vista / Boleto / Pix).", leftX, leftY);
  }
  leftY += 5;
  doc.text("- Todos produtos passam por controle de qualidade.", leftX, leftY);

  // ═══ BOTTOM RIGHT: Totals ═══
  const rightX = pw - margin - 65;
  let rightY = y;

  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "normal");
  doc.text("Sub Total:", rightX, rightY);
  doc.setFont("helvetica", "bold");
  doc.text(fmt(data.subtotal), pw - margin, rightY, { align: "right" });
  rightY += 7;

  doc.setFont("helvetica", "normal");
  doc.text("Valor Frete:", rightX, rightY);
  doc.setFont("helvetica", "bold");
  doc.text(data.shippingCost ? fmt(data.shippingCost) : "Cortesia", pw - margin, rightY, { align: "right" });
  rightY += 7;

  if (data.discount && data.discount > 0) {
    doc.setFont("helvetica", "normal");
    doc.text("Desconto:", rightX, rightY);
    doc.setFont("helvetica", "bold");
    doc.text(fmt(data.discount), pw - margin, rightY, { align: "right" });
    rightY += 7;
  }

  // Grand total box
  rightY += 4;
  const boxW = 70;
  const boxH = 22;
  const boxX = pw - margin - boxW;

  doc.setDrawColor(...GREEN);
  doc.setLineWidth(1.5);
  doc.roundedRect(boxX, rightY, boxW, boxH, 3, 3, "S");

  doc.setFontSize(7);
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.text("VALOR TOTAL DA PROPOSTA:", boxX + boxW / 2, rightY + 8, { align: "center" });

  doc.setFontSize(16);
  doc.text(fmt(data.total), boxX + boxW / 2, rightY + 18, { align: "center" });

  // ═══ NOTES ═══
  if (data.notes) {
    const notesY = Math.max(leftY, rightY + boxH) + 10;
    doc.setFillColor(232, 245, 233);
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, notesY, pw - 2 * margin, 20, 2, 2, "FD");

    doc.setFontSize(8);
    doc.setTextColor(...GREEN_DARK);
    doc.setFont("helvetica", "bold");
    doc.text("Observacoes", margin + 5, notesY + 6);

    doc.setFontSize(8);
    doc.setTextColor(...TEXT);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(data.notes, pw - 2 * margin - 10);
    doc.text(lines, margin + 5, notesY + 12);
  }

  // ═══ FOOTER ═══
  const footerY = ph - 25;
  doc.setDrawColor(221, 221, 221);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pw - margin, footerY);

  // Left: contacts
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.text("promobrindes.com", margin, footerY + 6);
  doc.text("comercial01@gmail.com", margin + 35, footerY + 6);
  if (data.seller.phone) {
    doc.text(data.seller.phone, margin + 80, footerY + 6);
  }

  doc.setFontSize(7);
  doc.text("CNPJ: 36.835.552/0001-67", margin, footerY + 12);
  doc.text("Razao Social: Brasil Marcas Industria e Comercio de Brindes LTDA.", margin, footerY + 17);

  // Right: seller
  doc.setFontSize(10);
  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "bold");
  doc.text(data.seller.name.toUpperCase(), pw - margin, footerY + 8, { align: "right" });
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.text("Executivo de Vendas", pw - margin, footerY + 14, { align: "right" });

  return doc.output("blob");
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
