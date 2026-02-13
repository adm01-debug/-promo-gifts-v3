/**
 * Proposal PDF Generator v3 — HTML→PDF via html2canvas + jsPDF
 * 
 * Renders a pixel-perfect HTML template offscreen,
 * captures it with html2canvas, and outputs as PDF.
 */

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import React from "react";
import ReactDOM from "react-dom/client";
import { ProposalHtmlTemplate, type ProposalTemplateData } from "@/components/pdf/ProposalHtmlTemplate";

// Re-export types for backward compatibility
export type { ProposalTemplateData as ProposalDocumentData };
export type { ProposalItem, ProposalItemPersonalization } from "@/components/pdf/ProposalHtmlTemplate";

export async function generateProposalPDFv2(data: ProposalTemplateData): Promise<Blob> {
  // Create offscreen container
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-10000px";
  container.style.left = "-10000px";
  container.style.zIndex = "-9999";
  container.style.pointerEvents = "none";
  document.body.appendChild(container);

  try {
    // Render React component into the container
    const root = ReactDOM.createRoot(container);
    const templateRef = React.createRef<HTMLDivElement>();
    
    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(ProposalHtmlTemplate, { data, ref: templateRef })
      );
      // Wait for render + images to load
      setTimeout(resolve, 500);
    });

    const element = templateRef.current || container.firstElementChild as HTMLElement;
    if (!element) throw new Error("Failed to render proposal template");

    // Wait for all images to load
    const images = element.querySelectorAll("img");
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

    // Capture with html2canvas
    const canvas = await html2canvas(element as HTMLElement, {
      scale: 3, // Ultra high quality
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: 794,
      windowWidth: 794,
    });

    // Convert to PDF (A4)
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgData = canvas.toDataURL("image/png");
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    // If content is taller than one page, we need multiple pages
    if (imgHeight <= pdfHeight) {
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    } else {
      // Multi-page: slice the canvas
      let remainingHeight = canvas.height;
      let srcY = 0;
      const pageCanvasHeight = (canvas.width * pdfHeight) / pdfWidth;
      let pageNum = 0;

      while (remainingHeight > 0) {
        if (pageNum > 0) pdf.addPage();

        const sliceHeight = Math.min(remainingHeight, pageCanvasHeight);
        
        // Create a slice canvas for this page
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const ctx = pageCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(canvas, 0, srcY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        }

        const pageImgData = pageCanvas.toDataURL("image/png");
        const pageImgHeight = (sliceHeight * pdfWidth) / canvas.width;
        pdf.addImage(pageImgData, "PNG", 0, 0, imgWidth, pageImgHeight);

        srcY += sliceHeight;
        remainingHeight -= sliceHeight;
        pageNum++;
      }
    }

    // Cleanup
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
