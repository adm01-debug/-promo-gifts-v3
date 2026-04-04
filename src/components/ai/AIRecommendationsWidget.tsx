import { useState } from "react";
import { useAIRecommendations } from "@/hooks/useAIRecommendations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, Star, Lightbulb } from "lucide-react";

/**
 * AIRecommendationsWidget — Standalone widget for AI-powered product recommendations.
 * Can be embedded in quote builder, client detail pages, etc.
 */
export function AIRecommendationsWidget({
  products = [],
  onSelectProduct,
}: {
  products?: Array<{ id: string; name: string; category: string; tags?: string[] }>;
  onSelectProduct?: (productId: string) => void;
}) {
  const { recommendations, isLoading, error, getRecommendations, clearRecommendations } = useAIRecommendations();

  const [clientName, setClientName] = useState("");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");
  const [preferences, setPreferences] = useState("");
  const [budget, setBudget] = useState("");

  const handleGenerate = () => {
    if (!clientName.trim()) return;

    getRecommendations(
      {
        name: clientName,
        company: company || undefined,
        industry: industry || undefined,
        preferences: preferences ? preferences.split(",").map((p) => p.trim()) : undefined,
        budget: budget || undefined,
      },
      products
    );
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Recomendações IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!recommendations ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome do Cliente *</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="João Silva"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Empresa</Label>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Empresa Ltda"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Segmento</Label>
                <Input
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Tecnologia"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Orçamento</Label>
                <Input
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="R$ 5.000"
                  className="h-9"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Preferências (separadas por vírgula)</Label>
              <Input
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="canetas, ecológico, premium"
                className="h-9"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={!clientName.trim() || isLoading || products.length === 0}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisando perfil...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Recomendações ({products.length} produtos)
                </>
              )}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </>
        ) : (
          <>
            {/* Insights */}
            {recommendations.insights && (
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">{recommendations.insights}</p>
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="space-y-2">
              {recommendations.recommendations.map((rec, i) => {
                const product = products.find((p) => p.id === rec.productId);
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => onSelectProduct?.(rec.productId)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {product?.name || rec.productId}
                        </p>
                        <Badge variant="secondary" className="shrink-0">
                          <Star className="h-3 w-3 mr-1" />
                          {Math.round(rec.score * 100)}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{rec.reason}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button variant="outline" onClick={clearRecommendations} className="w-full">
              Nova Análise
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
