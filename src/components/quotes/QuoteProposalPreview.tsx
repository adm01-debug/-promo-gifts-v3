import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProposalHtmlTemplate, ProposalTemplateData } from "@/components/pdf/ProposalHtmlTemplate";

interface QuoteProposalPreviewProps {
  proposalData: ProposalTemplateData | null;
}

export function QuoteProposalPreview({ proposalData }: QuoteProposalPreviewProps) {
  const [showPreview, setShowPreview] = useState(false);

  if (!proposalData) return null;

  return (
    <div className="print:hidden">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowPreview(!showPreview)}
        className="gap-2"
      >
        {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {showPreview ? "Ocultar Preview" : "Preview da Proposta"}
      </Button>

      {showPreview && (
        <Card className="mt-4 overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[80vh] bg-background">
              <div className="origin-top-left scale-[0.65] md:scale-75 lg:scale-90" style={{ transformOrigin: "top center" }}>
                <ProposalHtmlTemplate data={proposalData} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
