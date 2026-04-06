/**
 * QuotesConfigurableList - Lista de orçamentos com colunas reordenáveis, paginação e seleção em massa
 */

import { useState, useMemo, useCallback } from "react";
import { formatDeliveryTime } from "@/components/pdf/ProposalHtmlTemplate";
import { QUOTE_STATUS_CONFIG } from "@/lib/quote-status-config";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MoreVertical,
  Eye,
  Trash2,
  Copy,
  Edit,
  UserPlus,
  AlertTriangle,
  Settings2,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Quote } from "@/hooks/useQuotes";
import { BulkActionsBar, type BulkAction } from "@/components/common/BulkActionsBar";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Column definitions ──
export interface ColumnDef {
  id: string;
  label: string;
  width: string;
  align?: "left" | "right" | "center";
  required?: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  { id: "status", label: "Status", width: "110px" },
  { id: "client", label: "Empresa", width: "minmax(120px, 0.7fr)", required: true },
  { id: "contact", label: "Contato", width: "120px" },
  { id: "date", label: "Data", width: "100px" },
  { id: "time", label: "Hora", width: "70px" },
  { id: "value", label: "Valor", width: "140px", align: "right" },
  { id: "delivery", label: "Entrega", width: "150px" },
  { id: "quote_number", label: "Nº Orçamento", width: "200px" },
];



const statusConfig = Object.fromEntries(
  Object.entries(QUOTE_STATUS_CONFIG).map(([k, v]) => [k, { label: v.label, className: v.badgeClassName }])
) as Record<Quote["status"], { label: string; className?: string }>;

function getValidityInfo(validUntil: string | undefined | null) {
  if (!validUntil) return null;
  const date = new Date(validUntil);
  const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const expired = days < 0;
  if (expired) return { label: "Vencido", color: "text-destructive", bgColor: "bg-destructive/10", urgent: true };
  if (days <= 3) return { label: `${days}d restante(s)`, color: "text-destructive", bgColor: "bg-destructive/10", urgent: true };
  if (days <= 7) return { label: `${days}d restantes`, color: "text-warning", bgColor: "bg-warning/10", urgent: true };
  return null;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

// ── Sortable Header Cell ──
function SortableHeaderCell({ column }: { column: ColumnDef }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 select-none cursor-grab active:cursor-grabbing ${
        column.align === "right" ? "justify-end" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-3 w-3 opacity-50 shrink-0" />
      <span>{column.label}</span>
    </div>
  );
}

// ── Props ──
interface QuotesConfigurableListProps {
  quotes: Quote[];
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkStatusChange?: (ids: string[], status: string) => void;
  onBulkExport?: (ids: string[]) => void;
  onDuplicate: (id: string) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function QuotesConfigurableList({
  quotes,
  onDelete,
  onBulkDelete,
  onBulkStatusChange,
  onBulkExport,
  onDuplicate,
}: QuotesConfigurableListProps) {
  const navigate = useNavigate();

  // ── Pagination ──
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const totalPages = Math.max(1, Math.ceil(quotes.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedQuotes = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return quotes.slice(start, start + pageSize);
  }, [quotes, safePage, pageSize]);

  // ── Bulk selection (operates on paginated items) ──
  const { selectedIds, selectedCount, toggleItem, toggleAll, clearSelection, isSelected, isAllSelected } =
    useBulkSelection(paginatedQuotes as (Quote & { id: string })[]);

  // "Select ALL across all pages" state
  const [allPagesSelected, setAllPagesSelected] = useState(false);
  const showSelectAllBanner = isAllSelected && quotes.length > 0 && !allPagesSelected;

  const handleSelectAllPages = () => {
    setAllPagesSelected(true);
  };

  const handleClearSelection = () => {
    clearSelection();
    setAllPagesSelected(false);
  };

  const effectiveSelectedCount = allPagesSelected ? quotes.length : selectedCount;
  const effectiveSelectedIds = allPagesSelected ? quotes.map((q) => q.id!) : selectedIds;

  // Reset allPagesSelected when page/selection changes
  const handleToggleAll = () => {
    setAllPagesSelected(false);
    toggleAll();
  };

  // ── Column state ──
  const [columnOrder, setColumnOrder] = useState<string[]>(ALL_COLUMNS.map((c) => c.id));
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  const visibleColumns = useMemo(
    () => columnOrder.filter((id) => !hiddenColumns.has(id)).map((id) => ALL_COLUMNS.find((c) => c.id === id)!),
    [columnOrder, hiddenColumns]
  );

  const gridTemplate = useMemo(
    () => ["40px", ...visibleColumns.map((c) => c.width), "44px"].join(" "),
    [visibleColumns]
  );

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumnOrder((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }, []);

  const toggleColumn = useCallback((colId: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  }, []);

  // Reset page when pageSize changes
  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
    handleClearSelection();
  };

  // ── Cell renderer ──
  const renderCell = (quote: Quote, columnId: string) => {
    const hasClient = !!quote.client_name || !!quote.client_company;
    switch (columnId) {
      case "quote_number":
        return (
          <span className="text-xs text-muted-foreground truncate font-mono">
            {quote.quote_number}
          </span>
        );
      case "client":
        return hasClient ? (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">
              {quote.client_company || quote.client_name}
            </span>
            {quote.client_cnpj && (
              <span className="text-[10px] text-muted-foreground/70 font-mono truncate">
                {quote.client_cnpj}
              </span>
            )}
          </div>
        ) : (
          <button
            className="text-xs text-primary/70 hover:text-primary flex items-center gap-1"
            onClick={(e) => { e.stopPropagation(); navigate(`/orcamentos/${quote.id}/editar`); }}
          >
            <UserPlus className="h-3 w-3" /> Vincular cliente
          </button>
        );
      case "contact":
        return quote.client_name && quote.client_company ? (
          <span className="text-[0.975rem] text-muted-foreground truncate">{quote.client_name}</span>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        );
      case "status":
        return (
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 gap-1 ${statusConfig[quote.status]?.className || ""}`}>
            {quote.status === "pending" && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-info opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-info" />
              </span>
            )}
            {statusConfig[quote.status]?.label}
          </Badge>
        );
      case "value": {
        return (
          <div className="flex items-center justify-end gap-2">
            <span className="text-sm font-bold text-foreground">{formatCurrency(quote.total || 0)}</span>
          </div>
        );
      }
      case "date":
        return (
          <span className="text-xs text-muted-foreground block">
            {quote.created_at ? format(new Date(quote.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
          </span>
        );
      case "time":
        return (
          <span className="text-xs text-muted-foreground block">
            {quote.created_at ? format(new Date(quote.created_at), "HH:mm", { locale: ptBR }) : "—"}
          </span>
        );
      case "delivery": {
        const full = quote.delivery_time ? formatDeliveryTime(quote.delivery_time) : "—";
        // Compact: "28 dias após aprovação" → "28d"
        const compact = quote.delivery_time
          ? quote.delivery_time.startsWith("date:")
            ? full
            : full.replace(/\s*dias?\s*após\s*aprovação/i, "d").replace(/\s*dias?\s*úteis/i, "d")
          : "—";
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground truncate block cursor-default">
                {compact}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{full}</TooltipContent>
          </Tooltip>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      {/* Bulk action bar */}
      <BulkActionsBar
        selectedCount={effectiveSelectedCount}
        selectedIds={effectiveSelectedIds}
        entityLabel="orçamento"
        onClear={handleClearSelection}
        showSelectAllBanner={showSelectAllBanner}
        totalCount={quotes.length}
        onSelectAll={handleSelectAllPages}
        actions={[
          ...(onBulkStatusChange
            ? [
                {
                  id: "mark-pending",
                  label: "Marcar Pendente",
                  icon: <RefreshCw className="h-3.5 w-3.5" />,
                  variant: "outline" as const,
                  onClick: (ids: string[]) => {
                    onBulkStatusChange(ids, "pending");
                    handleClearSelection();
                  },
                },
              ]
            : []),
          ...(onBulkExport
            ? [
                {
                  id: "export",
                  label: "Exportar",
                  icon: <Download className="h-3.5 w-3.5" />,
                  variant: "outline" as const,
                  onClick: (ids: string[]) => {
                    onBulkExport(ids);
                  },
                },
              ]
            : []),
          {
            id: "delete",
            label: "Excluir",
            icon: <Trash2 className="h-3.5 w-3.5" />,
            variant: "destructive" as const,
            onClick: (ids: string[]) => {
              onBulkDelete([...ids]);
              handleClearSelection();
            },
          },
        ]}
      />

      {/* Column settings button */}
      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground">
              <Settings2 className="h-3.5 w-3.5" />
              Colunas
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Exibir colunas</p>
            <div className="space-y-2">
              {ALL_COLUMNS.map((col) => (
                <label key={col.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={!hiddenColumns.has(col.id)}
                    onCheckedChange={() => toggleColumn(col.id)}
                    disabled={col.required}
                  />
                  <span className={col.required ? "text-muted-foreground" : ""}>{col.label}</span>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">Arraste os cabeçalhos para reordenar</p>
          </PopoverContent>
        </Popover>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-x-hidden overflow-y-auto max-h-[calc(100vh-420px)]">
        {/* Header */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div
            className="grid gap-4 px-4 py-3 bg-primary text-primary-foreground text-sm font-semibold border-b border-primary/80 sticky top-0 z-10"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <div className="flex items-center justify-center">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleToggleAll}
                className="border-primary-foreground/50 data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary"
              />
            </div>
            <SortableContext items={visibleColumns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
              {visibleColumns.map((col) => (
                <SortableHeaderCell key={col.id} column={col} />
              ))}
            </SortableContext>
            <span />
          </div>
        </DndContext>

        {/* Rows */}
        {paginatedQuotes.map((quote) => (
          <div
            key={quote.id}
            className={`grid gap-4 px-4 py-3 items-center border-b border-border/40 hover:bg-muted/30 cursor-pointer transition-colors ${
              isSelected(quote.id!) || allPagesSelected ? "bg-primary/5" : ""
            }`}
            style={{ gridTemplateColumns: gridTemplate }}
            onClick={() => navigate(`/orcamentos/${quote.id}`)}
          >
            <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected(quote.id!) || allPagesSelected}
                onCheckedChange={() => {
                  if (allPagesSelected) {
                    setAllPagesSelected(false);
                    // select all on page except this one
                    toggleAll();
                    toggleItem(quote.id!);
                  } else {
                    toggleItem(quote.id!);
                  }
                }}
              />
            </div>
            {visibleColumns.map((col) => (
              <div key={col.id} className={col.align === "right" ? "text-right" : ""}>
                {renderCell(quote, col.id)}
              </div>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Mais opções"><MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => navigate(`/orcamentos/${quote.id}`)}>
                  <Eye className="h-4 w-4 mr-2" /> Visualizar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/orcamentos/${quote.id}/editar`)}>
                  <Edit className="h-4 w-4 mr-2" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(quote.id!)}>
                  <Copy className="h-4 w-4 mr-2" /> Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(quote.id!)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-2 py-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Exibindo</span>
          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>de {quotes.length} resultado(s)</span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground mr-2">
            Página {safePage} de {totalPages}
          </span>
          <Button variant="outline" size="icon" aria-label="ChevronsLeft" className="h-8 w-8" disabled={safePage <= 1} onClick={() => setCurrentPage(1)}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Voltar" className="h-8 w-8" disabled={safePage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Avançar" className="h-8 w-8" disabled={safePage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="ChevronsRight" className="h-8 w-8" disabled={safePage >= totalPages} onClick={() => setCurrentPage(totalPages)}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
