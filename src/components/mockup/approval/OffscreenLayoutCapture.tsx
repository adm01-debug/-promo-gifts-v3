/**
 * OffscreenLayoutCapture — Renders the approval template off-screen,
 * captures it with html2canvas, uploads to storage, and updates the DB record.
 * 
 * Usage: set `captureRequest` with the data + record ID. Once captured, it
 * auto-clears and calls `onCaptured`.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MockupApprovalTemplate } from "./MockupApprovalTemplate";
import { supabase } from "@/integrations/supabase/client";
import type { MockupApprovalData } from "@/types/mockup-approval";

export interface LayoutCaptureRequest {
  data: MockupApprovalData;
  recordId: string;
  userId: string;
}

interface OffscreenLayoutCaptureProps {
  request: LayoutCaptureRequest | null;
  onCaptured?: () => void;
}

export function OffscreenLayoutCapture({ request, onCaptured }: OffscreenLayoutCaptureProps) {
  const templateRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const processedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!request || isCapturing || processedRef.current === request.recordId) return;

    const capture = async () => {
      // Wait for template to render and images to load
      await new Promise(r => setTimeout(r, 2000));
      if (!templateRef.current) return;

      setIsCapturing(true);
      processedRef.current = request.recordId;

      try {
        const html2canvas = (await import("html2canvas")).default;
        const canvas = await html2canvas(templateRef.current, {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
        });
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

        // Upload to storage
        const blob = await (await fetch(dataUrl)).blob();
        const fileName = `layout-${Date.now()}.jpg`;
        const storagePath = `mockup-layouts/${request.userId}/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from("mockup-assets")
          .upload(storagePath, blob, { contentType: "image/jpeg", upsert: true });

        if (uploadError) {
          console.error("Layout auto-capture upload error:", uploadError);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("mockup-assets")
          .getPublicUrl(storagePath);

        // Update DB record
        await supabase
          .from("generated_mockups")
          .update({ layout_url: urlData.publicUrl } as any)
          .eq("id", request.recordId);

        console.log("Layout auto-captured for record:", request.recordId);
        onCaptured?.();
      } catch (err) {
        console.error("Layout auto-capture error:", err);
      } finally {
        setIsCapturing(false);
      }
    };

    capture();
  }, [request, isCapturing, onCaptured]);

  if (!request) return null;

  // Render off-screen via portal
  return createPortal(
    <div
      style={{
        position: "fixed",
        left: "-9999px",
        top: 0,
        width: "794px",
        opacity: 0,
        pointerEvents: "none",
        zIndex: -1,
      }}
    >
      <MockupApprovalTemplate ref={templateRef} data={request.data} />
    </div>,
    document.body
  );
}
