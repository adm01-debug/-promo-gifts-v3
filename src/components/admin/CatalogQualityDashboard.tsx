import { useMemo } from "react";
import {
  ImageOff,
  FileText,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  TrendingUp,
  Package,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  sku: string;
  images?: { url: string }[] | null;
  description?: string | null;
  price?: number;
  category_name?: string | null;
}

interface CatalogQualityDashboardProps {
  products: Product[];
  className?: string;
}

interface QualityMetric {
  label: string;
  value: number;
  total: number;
  percentage: number;
  status: "success" | "warning" | "error";
  icon: React.ReactNode;
  items?: { id: string; name: string; sku: string }[];
}

export function CatalogQualityDashboard({
  products,
  className,
}: CatalogQualityDashboardProps) {
  const metrics = useMemo<QualityMetric[]>(() => {
    const total = products.length;
    if (total === 0) return [];

    // Products without images
    const withoutImages = products.filter(
      p => !p.images || p.images.length === 0
    );

    // Products without description
    const withoutDescription = products.filter(
      p => !p.description || p.description.trim().length < 10
    );

    // Products without price
    const withoutPrice = products.filter(
      p => !p.price || p.price === 0
    );

    // Products without category
    const withoutCategory = products.filter(
      p => !p.category_name
    );

    // Complete products (has everything)
    const complete = products.filter(
      p =>
        p.images &&
        p.images.length > 0 &&
        p.description &&
        p.description.trim().length >= 10 &&
        p.price &&
        p.price > 0 &&
        p.category_name
    );

    const getStatus = (percentage: number): "success" | "warning" | "error" => {
      if (percentage <= 5) return "success";
      if (percentage <= 15) return "warning";
      return "error";
    };

    return [
      {
        label: "Sem Imagens",
        value: withoutImages.length,
        total,
        percentage: (withoutImages.length / total) * 100,
        status: getStatus((withoutImages.length / total) * 100),
        icon: <ImageOff className="h-4 w-4" />,
        items: withoutImages.map(p => ({ id: p.id, name: p.name, sku: p.sku })),
      },
      {
        label: "Sem Descrição",
        value: withoutDescription.length,
        total,
        percentage: (withoutDescription.length / total) * 100,
        status: getStatus((withoutDescription.length / total) * 100),
        icon: <FileText className="h-4 w-4" />,
        items: withoutDescription.map(p => ({ id: p.id, name: p.name, sku: p.sku })),
      },
      {
        label: "Sem Preço",
        value: withoutPrice.length,
        total,
        percentage: (withoutPrice.length / total) * 100,
        status: getStatus((withoutPrice.length / total) * 100),
        icon: <AlertTriangle className="h-4 w-4" />,
        items: withoutPrice.map(p => ({ id: p.id, name: p.name, sku: p.sku })),
      },
      {
        label: "Sem Categoria",
        value: withoutCategory.length,
        total,
        percentage: (withoutCategory.length / total) * 100,
        status: getStatus((withoutCategory.length / total) * 100),
        icon: <Package className="h-4 w-4" />,
        items: withoutCategory.map(p => ({ id: p.id, name: p.name, sku: p.sku })),
      },
      {
        label: "Completos",
        value: complete.length,
        total,
        percentage: (complete.length / total) * 100,
        status: complete.length / total >= 0.85 ? "success" : complete.length / total >= 0.6 ? "warning" : "error",
        icon: <CheckCircle2 className="h-4 w-4" />,
      },
    ];
  }, [products]);

  const overallScore = useMemo(() => {
    if (products.length === 0) return 0;
    const completeMetric = metrics.find(m => m.label === "Completos");
    return completeMetric?.percentage || 0;
  }, [metrics, products.length]);

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getStatusColor = (status: "success" | "warning" | "error") => {
    switch (status) {
      case "success":
        return "bg-success/10 text-success border-success/20";
      case "warning":
        return "bg-warning/10 text-warning border-warning/20";
      case "error":
        return "bg-destructive/10 text-destructive border-destructive/20";
    }
  };

  if (products.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-muted-foreground">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum produto para análise</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-primary" />
          Qualidade do Catálogo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Score */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Score Geral
              </span>
              <span className={cn("text-2xl font-bold", getScoreColor(overallScore))}>
                {overallScore.toFixed(0)}%
              </span>
            </div>
            <Progress
              value={overallScore}
              className={cn(
                "h-2",
                overallScore >= 85 && "[&>div]:bg-green-500",
                overallScore >= 60 && overallScore < 85 && "[&>div]:bg-amber-500",
                overallScore < 60 && "[&>div]:bg-red-500"
              )}
            />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Porcentagem de produtos com dados completos</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2">
          {metrics.slice(0, 4).map(metric => (
            <TooltipProvider key={metric.label}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "p-3 rounded-lg cursor-help transition-colors",
                      getStatusColor(metric.status)
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {metric.icon}
                      <span className="text-xs font-medium">{metric.label}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold">{metric.value}</span>
                      <span className="text-xs opacity-70">/{metric.total}</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  {metric.items && metric.items.length > 0 ? (
                    <ScrollArea className="max-h-32">
                      <p className="font-medium mb-1">
                        Produtos {metric.label.toLowerCase()}:
                      </p>
                      <ul className="text-xs space-y-0.5">
                        {metric.items.slice(0, 10).map(item => (
                          <li key={item.id} className="truncate">
                            {item.sku} - {item.name}
                          </li>
                        ))}
                        {metric.items.length > 10 && (
                          <li className="text-muted-foreground">
                            e mais {metric.items.length - 10}...
                          </li>
                        )}
                      </ul>
                    </ScrollArea>
                  ) : (
                    <p>Nenhum produto nesta categoria</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

        {/* Complete products highlight */}
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Produtos Completos</p>
                <p className="text-xs text-muted-foreground">
                  Com imagem, descrição, preço e categoria
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg font-bold">
              {metrics.find(m => m.label === "Completos")?.value || 0}
            </Badge>
          </div>
        </div>

        {/* Improvement suggestion */}
        {overallScore < 85 && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-700">
            <div className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-300">
                  Dica para melhorar
                </p>
                <p className="text-amber-700 dark:text-amber-400">
                  {metrics[0]?.value > 0
                    ? `Adicione imagens em ${metrics[0].value} produtos para aumentar conversões.`
                    : metrics[1]?.value > 0
                    ? `Complete a descrição de ${metrics[1].value} produtos.`
                    : "Continue mantendo a qualidade do catálogo!"}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
