/**
 * BIDashboardCharts — Chart sections extracted from BIDashboard
 */
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Palette, Tag, Factory, FolderOpen, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--chart-1))", "hsl(var(--chart-2))",
  "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))",
  "#8884d8", "#82ca9d", "#ffc658", "#ff7300",
];

const STOCK_STATUS_LABELS: Record<string, string> = {
  "in-stock": "Em Estoque",
  "low-stock": "Estoque Baixo",
  "out-of-stock": "Sem Estoque",
  "pre-order": "Pré-venda",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
};

interface ChartsSectionProps {
  metrics: any;
  isLoading: boolean;
}

export function CategoryChart({ metrics, isLoading }: ChartsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Produtos por Categoria</CardTitle>
        <CardDescription>Top 10 categorias</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : metrics?.productsByCategory.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.productsByCategory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" />
              <YAxis type="category" dataKey="category" className="text-xs" width={120} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => [value, "Produtos"]} contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">Nenhum dado disponível</div>
        )}
      </CardContent>
    </Card>
  );
}

export function StockStatusChart({ metrics, isLoading }: ChartsSectionProps) {
  const stockStatusData = metrics?.productsByStockStatus.map((item: any) => ({
    name: STOCK_STATUS_LABELS[item.status] || item.status,
    value: item.count,
  })) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Status de Estoque</CardTitle>
        <CardDescription>Distribuição por disponibilidade</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : stockStatusData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={stockStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                {stockStatusData.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [value, name]} contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">Nenhum dado disponível</div>
        )}
      </CardContent>
    </Card>
  );
}

export function PriceRangeChart({ metrics, isLoading }: ChartsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Distribuição por Faixa de Preço</CardTitle>
        <CardDescription>Quantidade de produtos por faixa</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[250px] w-full" />
        ) : metrics?.priceRanges.length ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={metrics.priceRanges}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="range" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip formatter={(value: number) => [value, "Produtos"]} contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">Nenhum dado disponível</div>
        )}
      </CardContent>
    </Card>
  );
}

export function ColorsSection({ metrics, isLoading }: ChartsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Palette className="h-5 w-5" />Produtos por Cor
        </CardTitle>
        <CardDescription>Top 15 cores mais frequentes</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : metrics?.productsByColor.length ? (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {metrics.productsByColor.map((item: any) => (
              <div key={item.color} className="flex flex-col items-center p-3 rounded-lg border bg-card hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-full border-2 border-border shadow-sm mb-2" style={{ backgroundColor: item.hex }} />
                <span className="text-xs font-medium text-center truncate w-full">{item.color}</span>
                <Badge variant="secondary" className="mt-1 text-xs">{item.count}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Nenhuma cor registrada</p>
        )}
      </CardContent>
    </Card>
  );
}

function RankedList({ items, nameKey, isLoading, icon: Icon, title }: { items: any[]; nameKey: string; isLoading: boolean; icon: any; title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><Icon className="h-5 w-5" />{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : items?.length ? (
          <div className="space-y-3">
            {items.map((item: any, index: number) => (
              <div key={item[nameKey]} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-sm truncate max-w-[150px]">{item[nameKey]}</span>
                </div>
                <Badge variant="secondary">{item.count}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Nenhum dado registrado</p>
        )}
      </CardContent>
    </Card>
  );
}

export function BottomSection({ metrics, isLoading }: ChartsSectionProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <RankedList items={metrics?.productsByGroup} nameKey="groupName" isLoading={isLoading} icon={FolderOpen} title="Produtos por Grupo" />
      <RankedList items={metrics?.productsByMaterial} nameKey="material" isLoading={isLoading} icon={Tag} title="Produtos por Material" />
      <RankedList items={metrics?.productsBySupplier} nameKey="supplier" isLoading={isLoading} icon={Factory} title="Produtos por Fornecedor" />
    </div>
  );
}

export function RecentProductsCard({ metrics, isLoading }: ChartsSectionProps) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />Produtos Recentes
        </CardTitle>
        <CardDescription>Últimos produtos adicionados ao catálogo</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : metrics?.recentProducts.length ? (
          <div className="space-y-3">
            {metrics.recentProducts.map((product: any) => (
              <div key={product.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border" role="button" tabIndex={0} onClick={() => navigate(`/produto/${product.sku}`)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/produto/${product.sku}`); } }} aria-label={`Ver produto ${product.name}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>SKU: {product.sku}</span>
                    {product.category_name && (<><span>•</span><span>{product.category_name}</span></>)}
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <span className="font-semibold text-sm text-primary">{formatCurrency(product.price)}</span>
                  <Badge variant="outline" className="text-xs">{(() => { if (!product.created_at) return "—"; const d = parseISO(product.created_at); return isValid(d) ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "—"; })()}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Nenhum produto encontrado</p>
        )}
      </CardContent>
    </Card>
  );
}
