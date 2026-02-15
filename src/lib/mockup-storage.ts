/**
 * Mockup Storage Utilities
 * 
 * Handles uploading logos and mockup assets to the storage bucket
 * instead of storing base64 in the database.
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Upload a base64 image to the mockup-assets bucket.
 * Returns the public URL of the uploaded file.
 */
export async function uploadLogoToStorage(
  userId: string,
  base64Data: string,
  fileName?: string
): Promise<string | null> {
  try {
    // Convert base64 to blob
    const base64Content = base64Data.split(",")[1];
    if (!base64Content) return null;

    const mimeMatch = base64Data.match(/data:([^;]+);/);
    const mimeType = mimeMatch?.[1] || "image/png";
    const extension = mimeType.split("/")[1] || "png";

    const byteCharacters = atob(base64Content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    // Generate unique file path: userId/logos/timestamp-name.ext
    const safeName = (fileName || "logo").replace(/[^a-zA-Z0-9-_]/g, "_");
    const filePath = `${userId}/logos/${Date.now()}-${safeName}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("mockup-assets")
      .upload(filePath, blob, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[mockup-storage] Upload error:", uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("mockup-assets")
      .getPublicUrl(filePath);

    return urlData?.publicUrl || null;
  } catch (err) {
    console.error("[mockup-storage] Exception during upload:", err);
    return null;
  }
}

/**
 * Download an image from a URL as a blob and trigger browser download.
 * Works for cross-origin URLs by fetching the image first.
 */
export async function downloadImageFromUrl(
  url: string,
  fileName: string
): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Cleanup blob URL after short delay
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (err) {
    console.error("[mockup-storage] Download error:", err);
    // Fallback: open in new tab
    window.open(url, "_blank");
  }
}
