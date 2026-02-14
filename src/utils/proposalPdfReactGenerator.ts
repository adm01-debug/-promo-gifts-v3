/**
 * Proposal PDF Generator v3 — HTML→PDF via html2canvas + jsPDF
 * 
 * Renders pixel-perfect HTML template offscreen (multi-page),
 * captures each page with html2canvas, and outputs as PDF.
 */

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import React from "react";
import ReactDOM from "react-dom/client";
import { type ProposalTemplateData } from "@/components/pdf/ProposalHtmlTemplate";
import { PropostaComercialTailwind } from "@/components/pdf/PropostaComercialTailwind";


export async function generateProposalPDFv2(data: ProposalTemplateData, options?: { isDraft?: boolean }): Promise<Blob> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-10000px";
  container.style.left = "-10000px";
  container.style.zIndex = "-9999";
  container.style.pointerEvents = "none";
  document.body.appendChild(container);

  try {
    const root = ReactDOM.createRoot(container);
    const templateRef = React.createRef<HTMLDivElement>();
    
    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(PropostaComercialTailwind, { data, ref: templateRef, isDraft: options?.isDraft || false })
      );
      setTimeout(resolve, 1200);
    });

    const wrapper = templateRef.current || container.firstElementChild as HTMLElement;
    if (!wrapper) throw new Error("Failed to render proposal template");

    // Wait for all images to load
    const images = wrapper.querySelectorAll("img");
    await Promise.all(
      Array.from(images).map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
      )
    );

    // Find all page elements
    const pageElements = wrapper.querySelectorAll(".proposal-page");
    const pages = pageElements.length > 0 ? Array.from(pageElements) : [wrapper];

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();

      const canvas = await html2canvas(pages[i] as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 794,
        height: 1123,
        windowWidth: 794,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, Math.min(imgHeight, pdfHeight));
    }

    root.unmount();
    return pdf.output("blob");
  } finally {
    document.body.removeChild(container);
  }
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
