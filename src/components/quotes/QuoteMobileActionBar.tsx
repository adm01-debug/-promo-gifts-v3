import { Download, Loader2, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuoteMobileActionBarProps {
  onDownloadPDF: () => void;
  onWhatsApp: () => void;
  onShare: () => void;
  isGeneratingPDF: boolean;
}

export function QuoteMobileActionBar({ onDownloadPDF, onWhatsApp, onShare, isGeneratingPDF }: QuoteMobileActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-md border-t px-4 py-3 flex items-center gap-2 print:hidden">
      <Button
        variant="outline"
        size="sm"
        onClick={onWhatsApp}
        className="flex-1 gap-2 text-emerald-600 border-emerald-600/30 dark:text-emerald-400 dark:border-emerald-400/30"
      >
        <MessageCircle className="h-4 w-4" />
        WhatsApp
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onShare}
        className="gap-2"
      >
        <Share2 className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        onClick={onDownloadPDF}
        disabled={isGeneratingPDF}
        className="flex-1 gap-2"
      >
        {isGeneratingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        PDF
      </Button>
    </div>
  );
}
