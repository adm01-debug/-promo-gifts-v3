import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Check,
  X,
  ArrowUpDown,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Types
export interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (value: any, row: T, index: number) => React.ReactNode;
}

export interface TableEnhancedProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onRowClick?: (item: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  exportable?: boolean;
  onExport?: () => void;
  loading?: boolean;
  emptyMessage?: string;
  stickyHeader?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  className?: string;
}

type SortDirection = "asc" | "desc" | null;

export function TableEnhanced<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  onRowClick,
  searchable = false,
  searchPlaceholder = "Buscar...",
  exportable = false,
  onExport,
  loading = false,
  emptyMessage = "Nenhum dado encontrado",
  stickyHeader = false,
  striped = false,
  hoverable = true,
  compact = false,
  className,
}: TableEnhancedProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) =>
        columns.some((col) => {
          const value = item[col.key as keyof T];
          return String(value).toLowerCase().includes(query);
        })
      );
    }

    // Apply sorting
    if (sortKey && sortDirection) {
      result.sort((a, b) => {
        const aVal = a[sortKey as keyof T];
        const bVal = b[sortKey as keyof T];

        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        const comparison = aVal < bVal ? -1 : 1;
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchQuery, sortKey, sortDirection, columns]);

  // Handle sort
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  // Handle selection
  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    if (selectedIds.length === processedData.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(processedData.map(keyExtractor));
    }
  };

  const handleSelectRow = (id: string) => {
    if (!onSelectionChange) return;

    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  // Render sort icon
  const renderSortIcon = (key: string) => {
    if (sortKey !== key) {
      return <ChevronsUpDown className="h-4 w-4 opacity-50" />;
    }
    if (sortDirection === "asc") {
      return <ChevronUp className="h-4 w-4" />;
    }
    return <ChevronDown className="h-4 w-4" />;
  };

  const isAllSelected =
    processedData.length > 0 && selectedIds.length === processedData.length;
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      {(searchable || exportable || selectedIds.length > 0) && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {searchable && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            )}

            {selectedIds.length > 0 && (
              <Badge variant="secondary">
                {selectedIds.length} selecionado(s)
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {exportable && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader className={cn(stickyHeader && "sticky top-0 z-10 bg-background")}>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Selecionar todos"
                    className={cn(isSomeSelected && "data-[state=checked]:bg-muted")}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  style={{ width: column.width }}
                  className={cn(
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right",
                    column.sortable && "cursor-pointer select-none hover:bg-muted/50"
                  )}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                >
                  <div
                    className={cn(
                      "flex items-center gap-1",
                      column.align === "center" && "justify-center",
                      column.align === "right" && "justify-end"
                    )}
                  >
                    {column.header}
                    {column.sortable && renderSortIcon(String(column.key))}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    {selectable && (
                      <TableCell>
                        <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={String(col.key)}>
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : processedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                processedData.map((item, index) => {
                  const id = keyExtractor(item);
                  const isSelected = selectedIds.includes(id);

                  return (
                    <motion.tr
                      key={id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.02 }}
                      className={cn(
                        "border-b transition-colors",
                        striped && index % 2 === 1 && "bg-muted/30",
                        hoverable && "hover:bg-muted/50",
                        isSelected && "bg-primary/5",
                        onRowClick && "cursor-pointer",
                        compact ? "h-10" : "h-14"
                      )}
                      onClick={() => onRowClick?.(item)}
                    >
                      {selectable && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleSelectRow(id)}
                            aria-label={`Selecionar linha ${index + 1}`}
                          />
                        </TableCell>
                      )}
                      {columns.map((column) => {
                        const value = item[column.key as keyof T];
                        return (
                          <TableCell
                            key={String(column.key)}
                            className={cn(
                              column.align === "center" && "text-center",
                              column.align === "right" && "text-right"
                            )}
                          >
                            {column.render
                              ? column.render(value, item, index)
                              : String(value ?? "")}
                          </TableCell>
                        );
                      })}
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Row Actions Component
interface RowActionsProps {
  actions: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: "default" | "destructive";
  }[];
}

export function RowActions({ actions }: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action, index) => (
          <DropdownMenuItem
            key={index}
            onClick={action.onClick}
            className={cn(action.variant === "destructive" && "text-destructive")}
          >
            {action.icon}
            <span className="ml-2">{action.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Status Cell Component
interface StatusCellProps {
  status: string;
  variant?: "default" | "success" | "warning" | "error" | "info";
}

export function StatusCell({ status, variant = "default" }: StatusCellProps) {
  const variants = {
    default: "bg-muted text-muted-foreground",
    success: "bg-green-500/10 text-green-600",
    warning: "bg-yellow-500/10 text-yellow-600",
    error: "bg-red-500/10 text-red-600",
    info: "bg-blue-500/10 text-blue-600",
  };

  return (
    <Badge className={cn("font-medium", variants[variant])}>{status}</Badge>
  );
}
