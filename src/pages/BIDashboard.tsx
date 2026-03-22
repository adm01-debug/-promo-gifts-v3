import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { useBIMetrics } from "@/hooks/useBIMetrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatCard, MiniStatCard } from "@/components/ui/stat-card";

import { SalesGoalsCard } from "@/components/goals/SalesGoalsCard";
import { NoveltiesSection } from "@/components/novelties/NoveltiesSection";
import {
  Package, 
  Palette, 
  Layers, 
  Tag, 
  TrendingUp,
  DollarSign,
  Star,
  Percent,
  Box,
  Factory,
  FolderOpen,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
];

const STOCK_STATUS_LABELS: Record<string, string> = {
  "in-stock": "Em Estoque",
  "low-stock": "Estoque Baixo",
  "out-of-stock": "Sem Estoque",
  "pre-order": "Pré-venda",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function BIDashboard() {
  const { data: metrics, isLoading } = useBIMetrics();
  const navigate = useNavigate();

  const stockStatusData = metrics?.productsByStockStatus.map((item) => ({
    name: STOCK_STATUS_LABELS[item.status] || item.status,
    value: item.count,
  })) || [];

  return (
    <MainLayout>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Produtos</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do catálogo de produtos
          </p>
        </div>

        {/* 🆕 Seção de Novidades */}
        <NoveltiesSection />

        {/* Main KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </>
          ) : (
            <>
              <StatCard
                title="Total de Produtos"
                value={metrics?.totalProducts?.toLocaleString("pt-BR") || "0"}
                icon={Package}
                variant="orange"
                className="cursor-pointer"
                onClick={() => navigate("/")}
              />
              <StatCard
                title="Produtos Ativos"
                value={metrics?.totalActiveProducts?.toLocaleString("pt-BR") || "0"}
                subtitle={`${metrics?.totalProducts ? Math.round((metrics.totalActiveProducts / metrics.totalProducts) * 100) : 0}% do total`}
                icon={CheckCircle}
                variant="success"
              />
              <StatCard
                title="Kits"
                value={metrics?.totalKits?.toLocaleString("pt-BR") || "0"}
                icon={Layers}
                variant="info"
              />
              <StatCard
                title="Preço Médio"
                value={metrics ? formatCurrency(metrics.averagePrice) : "R$ 0,00"}
                icon={DollarSign}
                variant="warning"
              />
            </>
          )}
        </div>

        {/* Secondary KPIs */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {isLoading ? (
            <>
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </>
          ) : (
            <>
              <MiniStatCard
                title="Destaques"
                value={metrics?.featuredCount || 0}
                icon={Star}
                variant="warning"
              />
              <MiniStatCard
                title="Novidades"
                value={metrics?.newArrivalCount || 0}
                icon={Sparkles}
                variant="success"
              />
              <MiniStatCard
                title="Em Promoção"
                value={metrics?.onSaleCount || 0}
                icon={Percent}
                variant="danger"
              />
              <MiniStatCard
                title="Categorias"
                value={metrics?.productsByCategory?.length || 0}
                icon={FolderOpen}
                variant="info"
              />
              <MiniStatCard
                title="Fornecedores"
                value={metrics?.productsBySupplier?.length || 0}
                icon={Factory}
                variant="orange"
              />
              <MiniStatCard
                title="Cores"
                value={metrics?.productsByColor?.length || 0}
                icon={Palette}
                variant="default"
              />
            </>
          )}
        </div>

        {/* Sales Goals + Charts Row */}
        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sales Goals Card */}
          <SalesGoalsCard />

          {/* Products by Category */}
          {/* Products by Category */}
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
                    <YAxis 
                      type="category" 
                      dataKey="category" 
                      className="text-xs" 
                      width={120}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number) => [value, "Produtos"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products by Stock Status */}
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
                    <Pie
                      data={stockStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {stockStatusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [value, name]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Price Ranges Chart */}
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
                  <Tooltip
                    formatter={(value: number) => [value, "Produtos"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Colors Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Produtos por Cor
            </CardTitle>
            <CardDescription>Top 15 cores mais frequentes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : metrics?.productsByColor.length ? (
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {metrics.productsByColor.map((item) => (
                  <div
                    key={item.color}
                    className="flex flex-col items-center p-3 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <div
                      className="w-10 h-10 rounded-full border-2 border-border shadow-sm mb-2"
                      style={{ backgroundColor: item.hex }}
                    />
                    <span className="text-xs font-medium text-center truncate w-full">
                      {item.color}
                    </span>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {item.count}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhuma cor registrada</p>
            )}
          </CardContent>
        </Card>

        {/* Bottom Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Products by Group */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Produtos por Grupo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : metrics?.productsByGroup.length ? (
                <div className="space-y-3">
                  {metrics.productsByGroup.map((item, index) => (
                    <div key={item.groupName} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm truncate max-w-[150px]">{item.groupName}</span>
                      </div>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Nenhum grupo configurado</p>
              )}
            </CardContent>
          </Card>

          {/* Products by Material */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Produtos por Material
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : metrics?.productsByMaterial.length ? (
                <div className="space-y-3">
                  {metrics.productsByMaterial.map((item, index) => (
                    <div key={item.material} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm truncate max-w-[150px]">{item.material}</span>
                      </div>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Nenhum material registrado</p>
              )}
            </CardContent>
          </Card>

          {/* Products by Supplier */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Produtos por Fornecedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : metrics?.productsBySupplier.length ? (
                <div className="space-y-3">
                  {metrics.productsBySupplier.map((item, index) => (
                    <div key={item.supplier} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm truncate max-w-[150px]">{item.supplier}</span>
                      </div>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Nenhum fornecedor registrado</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Produtos Recentes
            </CardTitle>
            <CardDescription>Últimos produtos adicionados ao catálogo</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : metrics?.recentProducts.length ? (
              <div className="space-y-3">
                {metrics.recentProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border"
                    onClick={() => navigate(`/produto/${product.sku}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>SKU: {product.sku}</span>
                        {product.category_name && (
                          <>
                            <span>•</span>
                            <span>{product.category_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className="font-semibold text-sm text-primary">
                        {formatCurrency(product.price)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {format(parseISO(product.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Nenhum produto encontrado</p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

interface MetricCardProps {
  title: string;
  value: number | string | undefined;
  icon: React.ComponentType<{ className?: string }>;
  subtitle?: string;
  isLoading?: boolean;
  onClick?: () => void;
  isText?: boolean;
}

function MetricCard({
  title,
  value,
  icon: Icon,
  subtitle,
  isLoading,
  onClick,
  isText,
}: MetricCardProps) {
  return (
    <Card
      className={onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold">
                {isText ? value : value?.toLocaleString("pt-BR")}
              </p>
            )}
            {subtitle && !isLoading && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="p-3 bg-primary/10 rounded-lg">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
