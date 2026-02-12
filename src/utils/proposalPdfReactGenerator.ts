/**
 * Proposal PDF Generator (React-PDF)
 * 
 * Utiliza @react-pdf/renderer para gerar PDFs premium.
 * Substitui o gerador jsPDF legado.
 */

import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { ProposalDocument } from "@/components/pdf/ProposalDocument";
import type { ProposalDocumentData } from "@/components/pdf/ProposalDocument";

export type { ProposalDocumentData, ProposalItem, ProposalItemPersonalization } from "@/components/pdf/ProposalDocument";

/**
 * Gera o PDF da proposta comercial como Blob.
 */
export async function generateProposalPDFv2(data: ProposalDocumentData): Promise<Blob> {
  const doc = createElement(ProposalDocument, { data });
  const blob = await pdf(doc).toBlob();
  return blob;
}

/**
 * Faz download de um Blob como arquivo.
 */
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
