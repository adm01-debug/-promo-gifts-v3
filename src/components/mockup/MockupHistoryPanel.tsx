/**
 * MockupHistoryPanel — History grid with filters and pagination
 * 
 * Extracted from MockupGenerator.tsx.
 * Includes: filters (client, product, technique, date), grid, pagination.
 */

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  History,
  Download,
  RotateCcw,
  Trash2,
  Clock,
  Search,
  RefreshCw,
  Wand2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Columns2,
  X,
  Ruler,
  MapPin,
  Palette,
  FileImage,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MockupHistorySkeleton } from "./MockupSkeleton";
import { MockupCompareDialog } from "./MockupCompareDialog";
import { ShareMenu } from "./ShareMenu";

interface GeneratedMockup {
  id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  technique_id: string | null;
  technique_name: string;
  mockup_url: string;
  layout_url: string | null;
  logo_url: string;
  position_x: number | null;
  position_y: number | null;
  logo_width_cm: number | null;
  logo_height_cm: number | null;
  location_name: string | null;
  colors_count: number | null;
  created_at: string;
  client_id: string | null;
  client_name: string | null;
  annotations: any | null;
  bitrix_clients?: { name: string } | null;
}

interface Technique {
  id: string;
  name: string;
  code: string | null;
}

interface Client {
  id: string;
  name: string;
}

interface MockupHistoryPanelProps {
  mockupHistory: GeneratedMockup[];
  isLoading: boolean;
  clients: Client[];
  techniques: Technique[];
  onLoadFromHistory: (mockup: GeneratedMockup) => void;
  onDownload: (url: string) => void;
  onDelete: (id: string) => void;
  onShare?: (mockup: GeneratedMockup) => void;
}

const ITEMS_PER_PAGE = 12;

export function MockupHistoryPanel({
  mockupHistory,
  isLoading,
  clients,
  techniques,
  onLoadFromHistory,
  onDownload,
  onDelete,
  onShare,
}: MockupHistoryPanelProps) {
  const [filterClient, setFilterClient] = useState("all");
  const [filterProduct, setFilterProduct] = useState("");
  const [filterTechnique, setFilterTechnique] = useState("all");
  const [filterDateRange, setFilterDateRange] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);

  const toggleCompareSelection = (id: string) => {
    setSelectedForCompare(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  };

  const compareMode = selectedForCompare.size > 0;
  const compareMockups = mockupHistory.filter(m => selectedForCompare.has(m.id));

  const filteredMockups = useMemo(() => {
    return mockupHistory.filter((mockup) => {
      // Client filter: check client_id OR client_name for matching
      const mockupClientName = mockup.client_name || mockup.bitrix_clients?.name;
      const hasClient = mockup.client_id || mockupClientName;
      if (filterClient === "none" && hasClient) return false;
      if (filterClient !== "all" && filterClient !== "none") {
        // Match by client_id or by client_name (for entries without FK)
        if (mockup.client_id !== filterClient && mockupClientName !== filterClient) return false;
      }
      if (filterProduct) {
        const q = filterProduct.toLowerCase();
        const matchName = mockup.product_name.toLowerCase().includes(q);
        const matchSku = mockup.product_sku?.toLowerCase().includes(q);
        if (!matchName && !matchSku) return false;
      }
      
      const selectedTech = techniques.find(t => t.id === filterTechnique);
      if (filterTechnique !== "all" && selectedTech && mockup.technique_name !== selectedTech.name) return false;

      // Date range filter
      if (filterDateRange !== "all") {
        const created = new Date(mockup.created_at);
        const now = new Date();
        const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        if (filterDateRange === "7d" && diffDays > 7) return false;
        if (filterDateRange === "30d" && diffDays > 30) return false;
        if (filterDateRange === "90d" && diffDays > 90) return false;
      }

      return true;
    });
  }, [mockupHistory, filterClient, filterProduct, filterTechnique, filterDateRange, techniques]);

  const totalPages = Math.ceil(filteredMockups.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedMockups = filteredMockups.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const hasFilters = filterClient !== "all" || filterProduct || filterTechnique !== "all" || filterDateRange !== "all";

  const clearFilters = () => {
    setFilterClient("all");
    setFilterProduct("");
    setFilterTechnique("all");
    setFilterDateRange("all");
    setCurrentPage(1);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Histórico de Mockups
            </CardTitle>
            <CardDescription>Mockups gerados anteriormente</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {compareMode && (
              <>
                <Badge variant="secondary">{selectedForCompare.size} selecionados</Badge>
                <Button size="sm" onClick={() => setShowCompare(true)} disabled={selectedForCompare.size < 2}>
                  <Columns2 className="h-4 w-4 mr-1" /> Comparar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedForCompare(new Set())}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Cliente</Label>
            <Select value={filterClient} onValueChange={(v) => { setFilterClient(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                <SelectItem value="none">Sem cliente</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Produto</Label>
            <Input
              placeholder="Buscar por nome ou SKU..."
              value={filterProduct}
              onChange={(e) => { setFilterProduct(e.target.value); setCurrentPage(1); }}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Técnica</Label>
            <Select value={filterTechnique} onValueChange={(v) => { setFilterTechnique(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as técnicas</SelectItem>
                {techniques.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Período
            </Label>
            <Select value={filterDateRange} onValueChange={(v) => { setFilterDateRange(v); setCurrentPage(1); }}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todo período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <RefreshCw className="h-4 w-4 mr-1" /> Limpar filtros
            </Button>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <MockupHistorySkeleton count={8} />
        ) : mockupHistory.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Wand2 className="h-10 w-10 text-primary/60" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum mockup gerado ainda</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Comece criando seu primeiro mockup!
            </p>
          </div>
        ) : filteredMockups.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <Search className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum resultado</h3>
            <p className="text-muted-foreground mb-4">Ajuste os filtros de busca.</p>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <RefreshCw className="h-4 w-4 mr-2" /> Limpar filtros
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredMockups.length)} de {filteredMockups.length}
              </span>
              {totalPages > 1 && <span>Página {currentPage} de {totalPages}</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedMockups.map((mockup) => (
                <div
                  key={mockup.id}
                  className={cn(
                    "group relative border rounded-xl overflow-hidden hover:ring-2 hover:ring-primary/30 hover:shadow-lg transition-all duration-300 bg-card",
                    selectedForCompare.has(mockup.id) && "ring-2 ring-primary shadow-lg"
                  )}
                >
                  {/* Compare checkbox */}
                  <div className="absolute top-2 left-2 z-10">
                    <div
                      className={cn(
                        "flex items-center justify-center w-6 h-6 rounded-md border-2 bg-background/80 backdrop-blur-sm cursor-pointer transition-all",
                        selectedForCompare.has(mockup.id) ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 opacity-0 group-hover:opacity-100"
                      )}
                      onClick={(e) => { e.stopPropagation(); toggleCompareSelection(mockup.id); }}
                    >
                      {selectedForCompare.has(mockup.id) && <span className="text-xs font-bold">✓</span>}
                    </div>
                  </div>

                  <div className="aspect-[3/4] bg-muted/30 overflow-hidden">
                    <img
                      src={mockup.layout_url || mockup.mockup_url}
                      alt={`Mockup de ${mockup.product_name}`}
                      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    {mockup.layout_url && (
                      <div className="absolute bottom-1 left-1">
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-background/80 backdrop-blur-sm">
                          <FileImage className="h-2.5 w-2.5 mr-0.5" />
                          Layout
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="p-3 space-y-1.5 border-t bg-gradient-to-t from-muted/50 to-transparent">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="font-medium text-sm truncate cursor-default block">{mockup.product_name}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{mockup.product_name}</p>
                        {mockup.product_sku && <p className="text-xs text-muted-foreground">SKU: {mockup.product_sku}</p>}
                      </TooltipContent>
                    </Tooltip>

                    {mockup.product_sku && (
                      <span className="text-[10px] text-muted-foreground font-mono">{mockup.product_sku}</span>
                    )}

                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{mockup.technique_name}</Badge>
                      {mockup.location_name && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                          <MapPin className="h-2.5 w-2.5" />
                          {mockup.location_name}
                        </Badge>
                      )}
                    </div>

                    {(mockup.logo_width_cm || mockup.logo_height_cm) && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Ruler className="h-2.5 w-2.5" />
                        {mockup.logo_width_cm?.toFixed(1)}×{mockup.logo_height_cm?.toFixed(1)} cm
                        {mockup.colors_count && (
                          <span className="flex items-center gap-0.5 ml-1">
                            <Palette className="h-2.5 w-2.5" />
                            {mockup.colors_count} cor{mockup.colors_count > 1 ? "es" : ""}
                          </span>
                        )}
                      </div>
                    )}

                    {(mockup.client_name || mockup.bitrix_clients?.name) && (
                      <p className="text-xs text-primary truncate font-medium">👤 {mockup.client_name || mockup.bitrix_clients?.name}</p>
                    )}

                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(mockup.created_at), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>

                  {/* Overlay actions */}
                  <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="secondary" className="h-8 w-8 shadow-md" onClick={() => onLoadFromHistory(mockup)}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Regenerar</TooltipContent>
                    </Tooltip>

                    <ShareMenu mockupUrl={mockup.mockup_url} productName={mockup.product_name} techniqueName={mockup.technique_name} className="h-8 w-8 p-0 shadow-md [&>svg]:h-4 [&>svg]:w-4" />

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="secondary" className="h-8 w-8 shadow-md" onClick={() => onDownload(mockup.mockup_url)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Baixar</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="icon" variant="destructive" className="h-8 w-8 shadow-md" onClick={() => onDelete(mockup.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Excluir</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                  Primeira
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                  Última
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Compare Dialog */}
      <MockupCompareDialog
        open={showCompare}
        onOpenChange={setShowCompare}
        mockups={compareMockups}
        onDownload={onDownload}
      />
    </Card>
  );
}
