import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  History,
  Download,
  RefreshCw,
  RotateCcw,
  Trash2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GeneratedMockup {
  id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  technique_id: string | null;
  technique_name: string;
  mockup_url: string;
  logo_url: string;
  position_x: number | null;
  position_y: number | null;
  logo_width_cm: number | null;
  logo_height_cm: number | null;
  created_at: string;
  client_id: string | null;
  bitrix_clients?: { name: string } | null;
}

interface Client {
  id: string;
  name: string;
}

interface Technique {
  id: string;
  name: string;
  code: string | null;
}

interface MockupHistoryGridProps {
  mockups: GeneratedMockup[];
  clients: Client[];
  techniques: Technique[];
  isLoading: boolean;
  onLoad: (mockup: GeneratedMockup) => void;
  onDownload: (url: string) => void;
  onDelete: (id: string) => void;
}

const ITEMS_PER_PAGE = 12;

export function MockupHistoryGrid({
  mockups,
  clients,
  techniques,
  isLoading,
  onLoad,
  onDownload,
  onDelete,
}: MockupHistoryGridProps) {
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterProduct, setFilterProduct] = useState<string>("");
  const [filterTechnique, setFilterTechnique] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter logic
  const filteredMockups = useMemo(() => {
    return mockups.filter((mockup) => {
      // Client filter
      if (filterClient === "none" && mockup.client_id !== null) return false;
      if (filterClient !== "all" && filterClient !== "none" && mockup.client_id !== filterClient) return false;
      
      // Product filter (text search)
      if (filterProduct && !mockup.product_name.toLowerCase().includes(filterProduct.toLowerCase())) return false;
      
      // Technique filter
      const selectedTechnique = techniques.find(t => t.id === filterTechnique);
      if (filterTechnique !== "all" && selectedTechnique && mockup.technique_name !== selectedTechnique.name) return false;
      
      return true;
    });
  }, [mockups, filterClient, filterProduct, filterTechnique, techniques]);

  // Pagination
  const totalPages = Math.ceil(filteredMockups.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedMockups = filteredMockups.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const hasFilters = filterClient !== "all" || filterProduct || filterTechnique !== "all";

  const clearFilters = () => {
    setFilterClient("all");
    setFilterProduct("");
    setFilterTechnique("all");
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-xl border border-border">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-medium">Cliente</Label>
          <Select value={filterClient} onValueChange={(v) => { setFilterClient(v); setCurrentPage(1); }}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Todos os clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              <SelectItem value="none">Sem cliente</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-medium">Produto</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={filterProduct}
              onChange={(e) => { setFilterProduct(e.target.value); setCurrentPage(1); }}
              className="h-10 pl-9"
            />
          </div>
        </div>
        
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground font-medium">Técnica</Label>
          <Select value={filterTechnique} onValueChange={(v) => { setFilterTechnique(v); setCurrentPage(1); }}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Todas as técnicas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as técnicas</SelectItem>
              {techniques.map((technique) => (
                <SelectItem key={technique.id} value={technique.id}>
                  {technique.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Clear filters button */}
      {hasFilters && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredMockups.length} resultado{filteredMockups.length !== 1 ? 's' : ''} encontrado{filteredMockups.length !== 1 ? 's' : ''}
          </p>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1.5" />
            Limpar filtros
          </Button>
        </div>
      )}

      {/* Empty states */}
      {mockups.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <History className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum mockup gerado ainda</p>
          <p className="text-sm mt-1">Gere seu primeiro mockup na aba "Gerar Mockup"</p>
        </div>
      )}

      {mockups.length > 0 && filteredMockups.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum resultado encontrado</p>
          <p className="text-sm mt-1">Tente ajustar os filtros</p>
        </div>
      )}

      {/* Grid */}
      {paginatedMockups.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginatedMockups.map((mockup) => (
            <MockupHistoryCard
              key={mockup.id}
              mockup={mockup}
              onLoad={() => onLoad(mockup)}
              onDownload={() => onDownload(mockup.mockup_url)}
              onDelete={() => onDelete(mockup.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="icon"
                  onClick={() => setCurrentPage(pageNum)}
                  className="h-9 w-9"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Individual mockup card
function MockupHistoryCard({
  mockup,
  onLoad,
  onDownload,
  onDelete,
}: {
  mockup: GeneratedMockup;
  onLoad: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border bg-card overflow-hidden",
        "transition-all duration-200",
        "hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="aspect-square bg-muted/30 relative overflow-hidden">
        <img
          src={mockup.mockup_url}
          alt={mockup.product_name}
          className={cn(
            "w-full h-full object-contain transition-transform duration-300",
            isHovered && "scale-105"
          )}
          loading="lazy"
        />
        
        {/* Hover overlay with actions */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent",
          "flex items-end justify-center gap-2 p-3",
          "transition-opacity duration-200",
          isHovered ? "opacity-100" : "opacity-0"
        )}>
          <Button size="sm" variant="secondary" onClick={onLoad} className="h-8">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Carregar
          </Button>
          <Button size="icon" variant="secondary" onClick={onDownload} className="h-8 w-8">
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="destructive" onClick={onDelete} className="h-8 w-8">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      {/* Info */}
      <div className="p-3 space-y-2">
        <p className="text-sm font-medium text-foreground truncate" title={mockup.product_name}>
          {mockup.product_name}
        </p>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {mockup.technique_name}
          </Badge>
          {mockup.bitrix_clients?.name && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {mockup.bitrix_clients.name}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(mockup.created_at), {
            addSuffix: true,
            locale: ptBR,
          })}
        </div>
      </div>
    </div>
  );
}
