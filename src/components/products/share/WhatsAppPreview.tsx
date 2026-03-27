import { useMemo } from "react";
import { Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppPreviewProps {
  message: string;
  images: string[];
  selectedImages: Set<number>;
  contactName?: string;
}

/**
 * Renders a message preview styled like a WhatsApp chat bubble.
 * Shows selected photos as a mini gallery + the formatted text message.
 */
export function WhatsAppPreview({
  message,
  images,
  selectedImages,
  contactName,
}: WhatsAppPreviewProps) {
  const selectedPhotos = useMemo(
    () => images.filter((_, i) => selectedImages.has(i)),
    [images, selectedImages]
  );

  // Parse WhatsApp-style bold (*text*) and line breaks
  const formattedMessage = useMemo(() => {
    return message.split("\n").map((line, li) => {
      const parts = line.split(/(\*[^*]+\*)/g).map((part, pi) => {
        if (part.startsWith("*") && part.endsWith("*")) {
          return (
            <strong key={pi} className="font-semibold">
              {part.slice(1, -1)}
            </strong>
          );
        }
        return <span key={pi}>{part}</span>;
      });
      return (
        <span key={li}>
          {li > 0 && <br />}
          {parts}
        </span>
      );
    });
  }, [message]);

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  return (
    <div className="rounded-xl overflow-hidden border border-border">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[hsl(142,40%,28%)]">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {(contactName || "C")[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {contactName || "Cliente"}
          </p>
          <p className="text-[10px] text-white/60">online</p>
        </div>
      </div>

      {/* Chat body — WhatsApp wallpaper */}
      <div
        className="p-4 min-h-[200px] max-h-[360px] overflow-y-auto"
        style={{
          backgroundColor: "hsl(30, 15%, 92%)",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c4bb' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      >
        {/* Photo gallery bubble */}
        {selectedPhotos.length > 0 && (
          <div className="flex justify-end mb-1">
            <div className="bg-[hsl(120,30%,85%)] rounded-lg p-1 max-w-[85%] shadow-sm">
              <div
                className={cn(
                  "grid gap-0.5 rounded-md overflow-hidden",
                  selectedPhotos.length === 1 && "grid-cols-1",
                  selectedPhotos.length === 2 && "grid-cols-2",
                  selectedPhotos.length >= 3 && "grid-cols-2"
                )}
              >
                {selectedPhotos.slice(0, 4).map((img, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "relative bg-black/10 overflow-hidden",
                      selectedPhotos.length === 1 ? "aspect-[4/3]" : "aspect-square",
                      selectedPhotos.length === 3 && idx === 0 && "col-span-2 aspect-[2/1]"
                    )}
                  >
                    <img
                      src={img}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {selectedPhotos.length > 4 && idx === 3 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-white text-lg font-bold">
                          +{selectedPhotos.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end items-center gap-1 px-1 pt-0.5">
                <span className="text-[10px] text-black/45">{timeStr}</span>
                <CheckCheck className="h-3 w-3 text-[hsl(199,80%,55%)]" />
              </div>
            </div>
          </div>
        )}

        {/* Text message bubble */}
        <div className="flex justify-end">
          <div className="bg-[hsl(120,30%,85%)] rounded-lg px-3 py-2 max-w-[85%] shadow-sm relative">
            {/* Tail */}
            <div
              className="absolute -right-1.5 top-0 w-3 h-3 bg-[hsl(120,30%,85%)]"
              style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
            />
            <p className="text-[13px] leading-relaxed text-black/85 whitespace-pre-wrap break-words">
              {formattedMessage}
            </p>
            <div className="flex justify-end items-center gap-1 mt-1">
              <span className="text-[10px] text-black/45">{timeStr}</span>
              <CheckCheck className="h-3 w-3 text-[hsl(199,80%,55%)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
