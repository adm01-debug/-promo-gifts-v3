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
import { processLogoTransparent } from "@/components/pdf/proposal/LogoWithTransparentBg";


export async function generateProposalPDFv2(data: ProposalTemplateData, options?: { isDraft?: boolean }): Promise<Blob> {
  // ① Pre-process logo BEFORE React renders — guarantees cache is warm
  await processLogoTransparent("/images/promo-brindes-logo.png");

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
      // Wait 3s: 2s for React + images, +1s for Google Fonts to load via @import
      setTimeout(resolve, 3000);
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

    // ── BUG FIX (html2canvas issue #2775) ────────────────────────────────────
    // Tailwind CSS Preflight define globalmente `img { display: block }`.
    // Durante a captura, html2canvas interpreta esse estilo como uma quebra de
    // linha fantasma após cada imagem, deslocando todo o texto subsequente para
    // baixo e desfigurando o layout do PDF (mesmo que o preview no browser
    // apareça corretamente, pois o browser compensa o offset internamente).
    //
    // Solução: injetar temporariamente `img { display: inline-block !important }`
    // apenas durante a captura do canvas, removendo a regra no bloco `finally`
    // para não afetar o restante da UI. Confirmado funcionando em 2026-02.
    // ─────────────────────────────────────────────────────────────────────────
    const imgFixStyle = document.createElement("style");
    imgFixStyle.textContent = "img { display: inline-block !important; }";
    document.head.appendChild(imgFixStyle);

    try {
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();

        const canvas = await html2canvas(pages[i] as HTMLElement, {
          scale: 2,          // 2x = ~190 DPI — qualidade profissional de impressão
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: 794,
          height: 1123,
          windowWidth: 794,
          imageTimeout: 15000,
        });

        // JPEG com qualidade 0.92 — visualmente idêntico ao PNG, ~5-8x menor
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, Math.min(imgHeight, pdfHeight));
      }
    } finally {
      // Always remove the temporary style, even if html2canvas throws
      document.head.removeChild(imgFixStyle);
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
