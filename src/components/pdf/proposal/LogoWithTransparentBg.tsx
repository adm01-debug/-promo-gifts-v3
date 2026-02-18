import React, { useEffect, useRef, useState } from "react";

interface Props {
  src: string;
  style?: React.CSSProperties;
  alt?: string;
}

/**
 * Loads an image, removes white/near-white background via Canvas API,
 * and renders the result as a transparent PNG — compatible with html2canvas.
 */
export function LogoWithTransparentBg({ src, style, alt }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Remove white and near-white pixels (threshold: R,G,B all > 240)
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r > 240 && g > 240 && b > 240) {
          data[i + 3] = 0; // fully transparent
        }
      }

      ctx.putImageData(imageData, 0, 0);
      setDataUrl(canvas.toDataURL("image/png"));
    };
    img.onerror = () => {
      // Fallback: render original
      setDataUrl(src);
    };
    img.src = src;
  }, [src]);

  if (!dataUrl) {
    // Placeholder while processing
    return <div style={{ ...style, opacity: 0 }} />;
  }

  return (
    <img
      src={dataUrl}
      alt={alt || "Logo"}
      style={style}
      crossOrigin="anonymous"
    />
  );
}
