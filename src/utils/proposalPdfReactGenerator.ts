/**
 * Proposal PDF Generator — Pixel-perfect replica of Promo Brindes reference
 * 
 * Layout:
 * - Green header banner with logo + diagonal black accent
 * - Gray decorative lines below header
 * - Empresa/Solicitante left, Nº/Data right in black box
 * - GREEN header table with product images inside description
 * - Ticket in green, Gravação/Material bold labels
 * - Totals right, green bordered "VALOR TOTAL DA PROPOSTA" box
 * - Footer with green circle icons, CNPJ, seller signature
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

// Colors from reference PDF
const GREEN: [number, number, number] = [45, 140, 71];
const GREEN_DARK: [number, number, number] = [30, 107, 53];
const BLACK: [number, number, number] = [26, 26, 26];
const TEXT: [number, number, number] = [51, 51, 51];
const MUTED: [number, number, number] = [119, 119, 119];
const WHITE: [number, number, number] = [255, 255, 255];
const LIGHT_GRAY: [number, number, number] = [230, 230, 230];
const TABLE_BORDER: [number, number, number] = [200, 200, 200];

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (blob.type.includes("text/html")) return null;
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

async function getImageDimensions(b64: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.width, h: img.height });
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = b64;
  });
}

export async function generateProposalPDFv2(data: ProposalDocumentData): Promise<Blob> {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 18;
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

  // ═══════════════════════════════════════════════
  // HEADER: Green banner + diagonal black accent
  // ═══════════════════════════════════════════════
  const headerH = 55;
  
  // Green background
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pw, headerH, "F");
  
  // Diagonal black accent (top-right triangle)
  doc.setFillColor(...BLACK);
  // Triangle: top-right corner
  const triW = 80;
  doc.triangle(pw - triW, 0, pw, 0, pw, headerH, "F");

  // Gray decorative lines below header
  doc.setFillColor(180, 180, 180);
  doc.rect(0, headerH, pw, 1.5, "F");
  doc.setFillColor(220, 220, 220);
  doc.rect(0, headerH + 1.5, pw, 1, "F");

  // Logo
  try {
    const logoB64 = await loadImageAsBase64("/images/promo-brindes-logo.png");
    if (logoB64) {
      const dims = await getImageDimensions(logoB64);
      const ratio = dims.w / dims.h;
      const logoH = 32;
      const logoW = logoH * ratio;
      const logoY = (headerH - logoH) / 2;
      
      // White background behind logo
      doc.setFillColor(...WHITE);
      doc.roundedRect(margin - 2, logoY - 2, logoW + 6, logoH + 4, 2, 2, "F");
      doc.addImage(logoB64, "PNG", margin + 1, logoY, logoW, logoH);
    }
  } catch {
    doc.setFontSize(28);
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bolditalic");
    doc.text("Promo Brindes", margin, 35);
  }

  y = headerH + 8;

  // ═══════════════════════════════════════════════
  // CLIENT INFO (left) + QUOTE NUMBER (right)
  // ═══════════════════════════════════════════════
  const company = data.client.company || data.client.name;
  const contact = data.client.contactName || data.client.name;

  // Left side: Empresa
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "normal");
  doc.text("Empresa:", margin, y);

  y += 7;
  doc.setFontSize(16);
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.text(company, margin, y);

  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "normal");
  doc.text(`Solicitante: ${contact}`, margin, y);

  // Right side: Nº in black box
  const boxW = 70;
  const boxH = 22;
  const boxX = pw - margin - boxW;
  const boxY = headerH + 6;
  
  doc.setFillColor(...BLACK);
  doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, "F");
  
  doc.setFontSize(16);
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.text(`N\u00BA: #${data.quoteNumber}`, boxX + boxW / 2, boxY + 14, { align: "center" });

  // Date below box
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "normal");
  doc.text(`Data: ${data.date}`, boxX + boxW / 2, boxY + boxH + 8, { align: "center" });

  y += 14;

  // ═══════════════════════════════════════════════
  // PRODUCTS TABLE - Green header, product images inside desc
  // ═══════════════════════════════════════════════
  
  // Build table data
  const tableRows: { desc: string[]; qty: string; unit: string; disc: string; total: string; imgIdx: number }[] = [];
  
  data.items.forEach((item, idx) => {
    // Calculate all-inclusive unit price (product + personalization)
    const persUnitCost = item.personalizations?.reduce((sum, p) => {
      const pTotal = p.total_cost || 0;
      return sum + (item.quantity > 0 ? pTotal / item.quantity : 0);
    }, 0) || 0;
    const allInUnitPrice = item.unitPrice + persUnitCost;
    const itemDiscount = item.discount || 0;
    const total = item.quantity * allInUnitPrice - itemDiscount * item.quantity;

    // Line 1: Product name (bold) + Ticket (green, right)
    const lines: string[] = [];
    lines.push(item.name);
    
    // Line 2: Description
    if (item.description) lines.push(item.description);

    // Line 3: Gravação + Material
    const gravLines: string[] = [];
    if (item.personalizations && item.personalizations.length > 0) {
      item.personalizations.forEach(p => {
        let g = `Gravacao: ${p.technique_name}`;
        if (p.colors_count && p.colors_count > 1) g += ` (${p.colors_count} cores)`;
        gravLines.push(g);
        if (p.material || item.material) {
          gravLines.push(`Material: ${p.material || item.material}`);
        }
      });
    } else if (item.material) {
      gravLines.push(`Material: ${item.material}`);
    }
    if (item.color && !item.material) {
      gravLines.push(`Cor: ${item.color}`);
    }

    tableRows.push({
      desc: lines,
      qty: `${item.quantity}.`,
      unit: fmt(allInUnitPrice),
      disc: fmt(itemDiscount),
      total: fmt(total),
      imgIdx: idx,
    });
  });

  // Use autoTable for the products
  const bodyData = tableRows.map(r => {
    // Join desc lines + ticket + gravação info into one cell text
    let cellText = r.desc.join("\n");
    return ["", cellText, r.qty, r.unit, r.disc, r.total];
  });

  autoTable(doc, {
    startY: y,
    head: [["", "Descricao do Produto", "Quant.", "Valor Uni.", "Desconto\nUnitario", "Valor Total"]],
    body: bodyData,
    theme: "plain",
    headStyles: {
      fillColor: GREEN,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
      cellPadding: 5,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: { top: 6, bottom: 6, left: 3, right: 3 },
      lineColor: TABLE_BORDER,
      lineWidth: 0.3,
      minCellHeight: 24,
      textColor: TEXT,
    },
    columnStyles: {
      0: { cellWidth: 22, halign: "center" },  // Image column
      1: { cellWidth: 68, halign: "left" },     // Description
      2: { cellWidth: 18, halign: "center", fontStyle: "bold" },
      3: { cellWidth: 22, halign: "right" },
      4: { cellWidth: 22, halign: "center" },
      5: { cellWidth: 25, halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    didDrawCell: (hookData) => {
      if (hookData.section === "body") {
        const rowIdx = hookData.row.index;
        const row = tableRows[rowIdx];
        
        // Draw product image in first column
        if (hookData.column.index === 0 && row) {
          const imgData = imageMap.get(row.imgIdx);
          if (imgData) {
            const imgSize = Math.min(hookData.cell.height - 4, 18);
            const cx = hookData.cell.x + (hookData.cell.width - imgSize) / 2;
            const cy = hookData.cell.y + 2;
            try {
              doc.addImage(imgData, "JPEG", cx, cy, imgSize, imgSize);
            } catch { /* skip */ }
          }
        }

        // Draw "Ticket: #SKU" in green on description column
        if (hookData.column.index === 1 && row) {
          const item = data.items[row.imgIdx];
          if (item?.sku) {
            doc.setFontSize(8);
            doc.setTextColor(...GREEN);
            doc.setFont("helvetica", "bold");
            const ticketText = `Ticket: #${item.sku}`;
            const ticketX = hookData.cell.x + hookData.cell.width - 3;
            doc.text(ticketText, ticketX, hookData.cell.y + 10, { align: "right" });
            doc.setTextColor(...TEXT);
          }

          // Draw Gravação/Material lines at bottom of cell
          const persLines: string[] = [];
          if (item?.personalizations && item.personalizations.length > 0) {
            item.personalizations.forEach(p => {
              let line = `Gravacao: ${p.technique_name}.`;
              if (p.material || item.material) line += `  Material: ${p.material || item.material}`;
              persLines.push(line);
            });
          } else if (item?.material) {
            persLines.push(`Material: ${item.material}`);
          } else if (item?.color) {
            persLines.push(`Cor: ${item.color}`);
          }

          if (persLines.length > 0) {
            doc.setFontSize(7);
            doc.setTextColor(80, 80, 80);
            doc.setFont("helvetica", "bold");
            const persY = hookData.cell.y + hookData.cell.height - 4;
            persLines.forEach((line, i) => {
              doc.text(line, hookData.cell.x + 3, persY + i * 4);
            });
          }
        }
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 15;

  // ═══════════════════════════════════════════════
  // BOTTOM LEFT: Delivery + Info
  // ═══════════════════════════════════════════════
  let leftY = y;

  if (data.deliveryTime) {
    doc.setFontSize(12);
    doc.setTextColor(...BLACK);
    doc.setFont("helvetica", "bold");
    doc.text(`Previsao de Entrega: ${data.deliveryTime}`, margin, leftY);
    leftY += 6;
  }

  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.text("Orcamento Valido por 15 dias apos o envio", margin, leftY);
  leftY += 10;

  doc.setFontSize(11);
  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "bold");
  doc.text("Informacoes Relevantes:", margin, leftY);
  leftY += 6;

  doc.setFontSize(8.5);
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "normal");
  doc.text("- Todos os valores sao para produtos ja personalizados.", margin, leftY);
  leftY += 5;
  if (data.paymentTerms) {
    doc.text(`- ${data.paymentTerms}`, margin, leftY);
  } else {
    doc.text("- Pagamento feito apos a entrega (A vista/ Boleto/ Pix).", margin, leftY);
  }
  leftY += 5;
  doc.text("- Todos produtos passam por controle de qualidade.", margin, leftY);

  // ═══════════════════════════════════════════════
  // BOTTOM RIGHT: Totals
  // ═══════════════════════════════════════════════
  const rightEdge = pw - margin;
  let rightY = y;
  const labelsX = rightEdge - 65;

  // Sub Total
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "normal");
  doc.text("Sub Total:", labelsX, rightY);
  doc.setFont("helvetica", "bold");
  doc.text(fmt(data.subtotal), rightEdge, rightY, { align: "right" });
  rightY += 7;

  // Valor Frete
  doc.setFont("helvetica", "normal");
  doc.text("Valor Frete:", labelsX, rightY);
  doc.setFont("helvetica", "bold");
  doc.text(data.shippingCost ? fmt(data.shippingCost) : "Cotesia", rightEdge, rightY, { align: "right" });
  rightY += 7;

  // Desconto
  if (data.discount && data.discount > 0) {
    doc.setFont("helvetica", "normal");
    doc.text("Desconto:", labelsX, rightY);
    doc.setFont("helvetica", "bold");
    doc.text(fmt(data.discount), rightEdge, rightY, { align: "right" });
    rightY += 7;
  }

  // Grand total green box
  rightY += 5;
  const totalBoxW = 72;
  const totalBoxH = 28;
  const totalBoxX = rightEdge - totalBoxW;

  doc.setDrawColor(...GREEN);
  doc.setLineWidth(2);
  doc.roundedRect(totalBoxX, rightY, totalBoxW, totalBoxH, 3, 3, "S");

  doc.setFontSize(7);
  doc.setTextColor(...GREEN);
  doc.setFont("helvetica", "bold");
  doc.text("VALOR TOTAL DA PROPOSTA:", totalBoxX + totalBoxW / 2, rightY + 9, { align: "center" });

  doc.setFontSize(18);
  doc.text(fmt(data.total), totalBoxX + totalBoxW / 2, rightY + 22, { align: "center" });

  // ═══════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════
  const footerY = ph - 40;

  // Seller signature (right)
  doc.setFontSize(12);
  doc.setTextColor(...BLACK);
  doc.setFont("helvetica", "bolditalic");
  const sellerName = data.seller.name || "Vendedor";
  doc.text(sellerName, rightEdge, footerY - 2, { align: "right" });

  // Underline
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.5);
  const nameW = doc.getTextWidth(sellerName.toUpperCase());
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(sellerName.toUpperCase(), rightEdge, footerY + 6, { align: "right" });
  const upperW = doc.getTextWidth(sellerName.toUpperCase());
  doc.line(rightEdge - upperW, footerY + 7, rightEdge, footerY + 7);

  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.text("Executivo de Vendas", rightEdge, footerY + 13, { align: "right" });

  // Footer left: contact info with green circles
  const circleY = footerY + 6;
  const circleR = 3;

  // Phone
  doc.setFillColor(...GREEN);
  doc.circle(margin + circleR, circleY, circleR, "F");
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT);
  doc.text(data.seller.phone || "00-00000-0000", margin + circleR * 2 + 3, circleY + 1.5);

  // Website
  const webX = margin + 45;
  doc.setFillColor(...GREEN);
  doc.circle(webX + circleR, circleY, circleR, "F");
  doc.text("promobrindes.com", webX + circleR * 2 + 3, circleY + 1.5);

  // Email
  const emailX = margin + 95;
  doc.setFillColor(...GREEN);
  doc.circle(emailX + circleR, circleY, circleR, "F");
  doc.text("comercial01@gmail.com", emailX + circleR * 2 + 3, circleY + 1.5);

  // CNPJ info
  const cnpjY = footerY + 18;
  doc.setFontSize(7.5);
  doc.setTextColor(...TEXT);
  doc.setFont("helvetica", "bold");
  doc.text("CNPJ: 36.835.552/0001-67", margin, cnpjY);
  doc.text("Razao Social: Brasil Marcas Industria e", margin, cnpjY + 5);
  doc.text("Comercio de Brindes LTDA.", margin, cnpjY + 10);

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
