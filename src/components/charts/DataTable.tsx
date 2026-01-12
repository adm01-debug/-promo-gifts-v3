import React, { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  Filter,
  Download,
  Settings2,
  MoreHorizontal,
  Eye,
  EyeOff,
  ArrowUpDown,
  GripVertical,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

// Column Definition
export interface Column<T> {
  id: string;
  header: string | React.ReactNode;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => any;
  cell?: (props: { row: T; value: any }) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  minWidth?: string | number;
  align?: "left" | "center" | "right";
  sticky?: "left" | "right";
  hidden?: boolean;
}

// Sort Direction
type SortDirection = "asc" | "desc" | null;

interface SortState {
  column: string | null;
  direction: SortDirection;
}

// Data Table Props
interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  searchPlaceholder?: string;
  searchable?: boolean;
  selectable?: boolean;
  onRowClick?: (row: T) => void;
  onSelectionChange?: (selectedRows: T[]) => void;
  rowKey?: keyof T | ((row: T) => string);
  stickyHeader?: boolean;
  striped?: boolean;
  compact?: boolean;
  showColumnToggle?: boolean;
  showExport?: boolean;
  onExport?: (data: T[]) => void;
  pageSize?: number;
  pagination?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns: initialColumns,
  isLoading = false,
  emptyMessage = "Nenhum dado encontrado",
  searchPlaceholder = "Buscar...",
  searchable = true,
  selectable = false,
  onRowClick,
  onSelectionChange,
  rowKey = "id" as keyof T,
  stickyHeader = false,
  striped = false,
  compact = false,
  showColumnToggle = true,
  showExport = false,
  onExport,
  pageSize = 10,
  pagination = true,
}: DataTableProps<T>) {
  // State
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>({ column: null, direction: null });
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(initialColumns.filter((c) => !c.hidden).map((c) => c.id))
  );
  const [currentPage, setCurrentPage] = useState(1);

  // Get row key
  const getRowKey = useCallback(
    (row: T): string => {
      if (typeof rowKey === "function") {
        return rowKey(row);
      }
      return String(row[rowKey]);
    },
    [rowKey]
  );

  // Filtered columns
  const columns = useMemo(
    () => initialColumns.filter((col) => visibleColumns.has(col.id)),
    [initialColumns, visibleColumns]
  );

  // Get cell value
  const getCellValue = useCallback((row: T, column: Column<T>): any => {
    if (column.accessorFn) {
      return column.accessorFn(row);
    }
    if (column.accessorKey) {
      return row[column.accessorKey];
    }
    return null;
  }, []);

  // Filtered data
  const filteredData = useMemo(() => {
    if (!search) return data;
    const searchLower = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const value = getCellValue(row, col);
        return value?.toString().toLowerCase().includes(searchLower);
      })
    );
  }, [data, search, columns, getCellValue]);

  // Sorted data
  const sortedData = useMemo(() => {
    if (!sort.column || !sort.direction) return filteredData;
    const column = columns.find((c) => c.id === sort.column);
    if (!column) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = getCellValue(a, column);
      const bVal = getCellValue(b, column);

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sort, columns, getCellValue]);

  // Paginated data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Handle sort
  const handleSort = (columnId: string) => {
    setSort((prev) => {
      if (prev.column !== columnId) {
        return { column: columnId, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { column: columnId, direction: "desc" };
      }
      return { column: null, direction: null };
    });
  };

  // Handle selection
  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    } else {
      const newSelected = new Set(paginatedData.map(getRowKey));
      setSelectedRows(newSelected);
      onSelectionChange?.(paginatedData);
    }
  };

  const handleSelectRow = (row: T) => {
    const key = getRowKey(row);
    const newSelected = new Set(selectedRows);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedRows(newSelected);
    onSelectionChange?.(paginatedData.filter((r) => newSelected.has(getRowKey(r))));
  };

  // Toggle column visibility
  const toggleColumn = (columnId: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  };

  // Sort Icon
  const SortIcon = ({ columnId }: { columnId: string }) => {
    if (sort.column !== columnId) {
      return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    }
    return sort.direction === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5 text-primary" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-primary" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          {searchable && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          
          {selectedRows.size > 0 && (
            <Badge variant="secondary">
              {selectedRows.size} selecionado(s)
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showColumnToggle && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Colunas
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {initialColumns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={visibleColumns.has(column.id)}
                    onCheckedChange={() => toggleColumn(column.id)}
                  >
                    {typeof column.header === "string" ? column.header : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {showExport && onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport(sortedData)}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className={cn(stickyHeader && "sticky top-0 bg-card z-10")}>
              <TableRow>
                {selectable && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        paginatedData.length > 0 &&
                        selectedRows.size === paginatedData.length
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                )}
                {columns.map((column) => (
                  <TableHead
                    key={column.id}
                    style={{
                      width: column.width,
                      minWidth: column.minWidth,
                    }}
                    className={cn(
                      column.align === "center" && "text-center",
                      column.align === "right" && "text-right",
                      column.sortable && "cursor-pointer hover:bg-muted/50",
                      compact ? "py-2" : "py-3"
                    )}
                    onClick={() => column.sortable && handleSort(column.id)}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        column.align === "center" && "justify-center",
                        column.align === "right" && "justify-end"
                      )}
                    >
                      {column.header}
                      {column.sortable && <SortIcon columnId={column.id} />}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    {selectable && (
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.id}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : paginatedData.length === 0 ? (
                // Empty state
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                // Data rows
                paginatedData.map((row, index) => {
                  const key = getRowKey(row);
                  const isSelected = selectedRows.has(key);

                  return (
                    <TableRow
                      key={key}
                      className={cn(
                        onRowClick && "cursor-pointer hover:bg-muted/50",
                        isSelected && "bg-primary/5",
                        striped && index % 2 === 1 && "bg-muted/30"
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {selectable && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleSelectRow(row)}
                          />
                        </TableCell>
                      )}
                      {columns.map((column) => {
                        const value = getCellValue(row, column);
                        return (
                          <TableCell
                            key={column.id}
                            className={cn(
                              column.align === "center" && "text-center",
                              column.align === "right" && "text-right",
                              compact ? "py-2" : "py-3"
                            )}
                          >
                            {column.cell
                              ? column.cell({ row, value })
                              : value?.toString() ?? "-"}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Mostrando {(currentPage - 1) * pageSize + 1} a{" "}
            {Math.min(currentPage * pageSize, sortedData.length)} de{" "}
            {sortedData.length} resultados
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
            >
              Primeira
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "ghost"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Próxima
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
            >
              Última
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Status Cell Helper
interface StatusCellProps {
  status: string;
  statusConfig: Record<string, { label: string; color: string }>;
}

export function StatusCell({ status, statusConfig }: StatusCellProps) {
  const config = statusConfig[status] || { label: status, color: "bg-muted" };
  return (
    <Badge variant="outline" className={cn("font-normal", config.color)}>
      {config.label}
    </Badge>
  );
}

// Currency Cell Helper
interface CurrencyCellProps {
  value: number;
  currency?: string;
  locale?: string;
}

export function CurrencyCell({
  value,
  currency = "BRL",
  locale = "pt-BR",
}: CurrencyCellProps) {
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(value);

  return <span className="font-medium">{formatted}</span>;
}

// Date Cell Helper
interface DateCellProps {
  value: string | Date;
  format?: "short" | "long" | "relative";
  locale?: string;
}

export function DateCell({
  value,
  format = "short",
  locale = "pt-BR",
}: DateCellProps) {
  const date = typeof value === "string" ? new Date(value) : value;

  if (format === "relative") {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return <span>Hoje</span>;
    if (days === 1) return <span>Ontem</span>;
    if (days < 7) return <span>{days} dias atrás</span>;
  }

  const options: Intl.DateTimeFormatOptions =
    format === "long"
      ? { year: "numeric", month: "long", day: "numeric" }
      : { year: "numeric", month: "2-digit", day: "2-digit" };

  return <span>{date.toLocaleDateString(locale, options)}</span>;
}
