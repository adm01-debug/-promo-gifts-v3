/**
 * QuotesConfigurableList - Lista de orçamentos com colunas reordenáveis e configuráveis
 */

import { useState, useMemo, useCallback } from "react";
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
  MoreVertical,
  Eye,
  Trash2,
  Copy,
  Edit,
  UserPlus,
  AlertTriangle,
  Settings2,
  GripVertical,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Quote } from "@/hooks/useQuotes";
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
  required?: boolean; // Can't be hidden
}

const ALL_COLUMNS: ColumnDef[] = [
  { id: "quote_number", label: "Nº Orçamento", width: "1fr", required: true },
  { id: "client", label: "Cliente / Empresa", width: "1fr" },
  { id: "status", label: "Status", width: "120px" },
  { id: "value", label: "Valor", width: "140px", align: "right" },
  { id: "date", label: "Data", width: "100px", align: "right" },
];

const statusConfig: Record<
  Quote["status"],
  { label: string; className?: string }
> = {
  draft: { label: "Rascunho", className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  pending: { label: "Pendente", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  sent: { label: "Enviado", className: "bg-primary/15 text-primary border-primary/30" },
  approved: { label: "Aprovado", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  rejected: { label: "Rejeitado", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  expired: { label: "Expirado", className: "bg-muted text-muted-foreground border-muted" },
};

function getValidityInfo(validUntil: string | undefined | null) {
  if (!validUntil) return null;
  const date = new Date(validUntil);
  const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const expired = days < 0;

  if (expired) return { label: "Vencido", color: "text-red-400", bgColor: "bg-red-500/10", urgent: true };
  if (days <= 3) return { label: `${days}d restante(s)`, color: "text-red-400", bgColor: "bg-red-500/10", urgent: true };
  if (days <= 7) return { label: `${days}d restantes`, color: "text-yellow-400", bgColor: "bg-yellow-500/10", urgent: true };
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
      <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
      <span>{column.label}</span>
    </div>
  );
}

// ── Props ──
interface QuotesConfigurableListProps {
  quotes: Quote[];
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function QuotesConfigurableList({
  quotes,
  onDelete,
  onDuplicate,
}: QuotesConfigurableListProps) {
  const navigate = useNavigate();

  // Column state: order + visibility
  const [columnOrder, setColumnOrder] = useState<string[]>(ALL_COLUMNS.map((c) => c.id));
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  const visibleColumns = useMemo(
    () => columnOrder.filter((id) => !hiddenColumns.has(id)).map((id) => ALL_COLUMNS.find((c) => c.id === id)!),
    [columnOrder, hiddenColumns]
  );

  const gridTemplate = useMemo(
    () => [...visibleColumns.map((c) => c.width), "44px"].join(" "),
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
      if (next.has(colId)) {
        next.delete(colId);
      } else {
        next.add(colId);
      }
      return next;
    });
  }, []);

  // ── Cell renderer ──
  const renderCell = (quote: Quote, columnId: string) => {
    const hasClient = !!quote.client_name || !!quote.client_company;

    switch (columnId) {
      case "quote_number":
        return (
          <span className="font-semibold text-sm text-foreground truncate">
            #{quote.quote_number}
          </span>
        );
      case "client":
        return hasClient ? (
          <span className="text-sm text-muted-foreground truncate">
            {quote.client_company || quote.client_name}
          </span>
        ) : (
          <button
            className="text-xs text-primary/70 hover:text-primary flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/orcamentos/${quote.id}/editar`);
            }}
          >
            <UserPlus className="h-3 w-3" /> Vincular cliente
          </button>
        );
      case "status":
        return (
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 h-5 ${statusConfig[quote.status]?.className || ""}`}
          >
            {statusConfig[quote.status]?.label}
          </Badge>
        );
      case "value": {
        const validity = getValidityInfo(quote.valid_until);
        return (
          <div className="flex items-center justify-end gap-2">
            {validity?.urgent && (
              <span className={`text-[10px] ${validity.color} ${validity.bgColor} px-1.5 py-0.5 rounded flex items-center gap-0.5`}>
                <AlertTriangle className="h-3 w-3" />
                {validity.label}
              </span>
            )}
            <span className="text-sm font-bold text-foreground">
              {formatCurrency(quote.total || 0)}
            </span>
          </div>
        );
      }
      case "date":
        return (
          <span className="text-xs text-muted-foreground text-right block">
            {quote.created_at
              ? format(new Date(quote.created_at), "dd/MM/yyyy", { locale: ptBR })
              : "—"}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
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
                <label
                  key={col.id}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={!hiddenColumns.has(col.id)}
                    onCheckedChange={() => toggleColumn(col.id)}
                    disabled={col.required}
                  />
                  <span className={col.required ? "text-muted-foreground" : ""}>{col.label}</span>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">
              Arraste os cabeçalhos para reordenar
            </p>
          </PopoverContent>
        </Popover>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Header with DnD */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div
            className="grid gap-2 px-4 py-2.5 bg-muted/50 text-xs font-medium text-muted-foreground border-b border-border"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <SortableContext items={visibleColumns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
              {visibleColumns.map((col) => (
                <SortableHeaderCell key={col.id} column={col} />
              ))}
            </SortableContext>
            <span />
          </div>
        </DndContext>

        {/* Rows */}
        {quotes.map((quote) => (
          <div
            key={quote.id}
            className="grid gap-2 px-4 py-3 items-center border-b border-border/40 hover:bg-muted/30 cursor-pointer transition-colors"
            style={{ gridTemplateColumns: gridTemplate }}
            onClick={() => navigate(`/orcamentos/${quote.id}`)}
          >
            {visibleColumns.map((col) => (
              <div key={col.id} className={col.align === "right" ? "text-right" : ""}>
                {renderCell(quote, col.id)}
              </div>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
    </div>
  );
}
