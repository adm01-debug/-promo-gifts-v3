import { useState, useMemo, ReactNode, useCallback } from "react";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  Filter,
  MoreHorizontal,
  Download,
  Eye,
  Edit,
  Trash2,
  Copy,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "./skeleton";

export interface SmartTableColumn<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  sortable?: boolean;
  searchable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  sticky?: boolean;
  renderCell?: (value: unknown, row: T, rowIndex: number) => ReactNode;
  className?: string;
}

export interface SmartTableAction<T> {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: (row: T) => void;
  variant?: "default" | "destructive";
  show?: (row: T) => boolean;
}

interface SmartTableProps<T> {
  data: T[];
  columns: SmartTableColumn<T>[];
  actions?: SmartTableAction<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  selectable?: boolean;
  onSelectionChange?: (selected: T[]) => void;
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
  striped?: boolean;
  compact?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
  rowClassName?: string | ((row: T, index: number) => string);
  getRowId?: (row: T) => string;
  bulkActions?: Array<{
    id: string;
    label: string;
    icon: ReactNode;
    onClick: (selected: T[]) => void;
    variant?: "default" | "destructive";
  }>;
}

type SortDirection = "asc" | "desc" | null;

export function SmartTable<T extends Record<string, unknown>>({
  data,
  columns,
  actions,
  isLoading = false,
  emptyMessage = "Nenhum dado encontrado",
  emptyIcon,
  selectable = false,
  onSelectionChange,
  onRowClick,
  stickyHeader = false,
  striped = false,
  compact = false,
  searchable = false,
  searchPlaceholder = "Buscar...",
  className,
  rowClassName,
  getRowId = (row) => String(row.id || Math.random()),
  bulkActions,
}: SmartTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Handle sorting
  const handleSort = useCallback((columnId: string) => {
    if (sortColumn === columnId) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(columnId);
      setSortDirection("asc");
    }
  }, [sortColumn, sortDirection]);

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          if (!col.searchable && col.searchable !== undefined) return false;
          const value =
            typeof col.accessor === "function"
              ? col.accessor(row)
              : row[col.accessor];
          return String(value).toLowerCase().includes(searchLower);
        })
      );
    }

    // Sort
    if (sortColumn && sortDirection) {
      const column = columns.find((c) => c.id === sortColumn);
      if (column) {
        result.sort((a, b) => {
          const aValue =
            typeof column.accessor === "function"
              ? column.accessor(a)
              : a[column.accessor];
          const bValue =
            typeof column.accessor === "function"
              ? column.accessor(b)
              : b[column.accessor];

          if (aValue === bValue) return 0;
          if (aValue === null || aValue === undefined) return 1;
          if (bValue === null || bValue === undefined) return -1;

          const comparison = String(aValue).localeCompare(String(bValue), undefined, {
            numeric: true,
            sensitivity: "base",
          });

          return sortDirection === "asc" ? comparison : -comparison;
        });
      }
    }

    return result;
  }, [data, columns, searchQuery, sortColumn, sortDirection]);

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedRows.size === processedData.length) {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    } else {
      const allIds = new Set(processedData.map(getRowId));
      setSelectedRows(allIds);
      onSelectionChange?.(processedData);
    }
  }, [processedData, selectedRows.size, getRowId, onSelectionChange]);

  const handleSelectRow = useCallback(
    (row: T) => {
      const id = getRowId(row);
      const newSelected = new Set(selectedRows);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setSelectedRows(newSelected);
      onSelectionChange?.(
        processedData.filter((r) => newSelected.has(getRowId(r)))
      );
    },
    [processedData, selectedRows, getRowId, onSelectionChange]
  );

  // Render sort icon
  const renderSortIcon = (columnId: string) => {
    if (sortColumn !== columnId) {
      return <ChevronsUpDown className="h-4 w-4 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  // Cell value extraction
  const getCellValue = (row: T, column: SmartTableColumn<T>) => {
    if (typeof column.accessor === "function") {
      return column.accessor(row);
    }
    return row[column.accessor];
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={cn("rounded-lg border bg-card", className)}>
        {searchable && (
          <div className="p-4 border-b">
            <Skeleton className="h-10 w-full max-w-sm" />
          </div>
        )}
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Skeleton className="h-4 w-4" />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead key={col.id} style={{ width: col.width }}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
              {actions && actions.length > 0 && (
                <TableHead className="w-12">
                  <Skeleton className="h-4 w-4" />
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {selectable && (
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell key={col.id}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
                {actions && actions.length > 0 && (
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border bg-card overflow-hidden", className)}>
      {/* Search & Bulk Actions Bar */}
      {(searchable || (bulkActions && selectedRows.size > 0)) && (
        <div className="flex items-center justify-between gap-4 p-4 border-b bg-muted/30">
          {searchable && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}

          <AnimatePresence>
            {bulkActions && selectedRows.size > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2"
              >
                <Badge variant="secondary">
                  {selectedRows.size} selecionado(s)
                </Badge>
                {bulkActions.map((action) => (
                  <Button
                    key={action.id}
                    size="sm"
                    variant={action.variant === "destructive" ? "destructive" : "outline"}
                    onClick={() =>
                      action.onClick(
                        processedData.filter((r) => selectedRows.has(getRowId(r)))
                      )
                    }
                    className="gap-1"
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedRows(new Set());
                    onSelectionChange?.([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className={cn(stickyHeader && "sticky top-0 z-10 bg-card")}>
            <TableRow className="hover:bg-transparent">
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      processedData.length > 0 &&
                      selectedRows.size === processedData.length
                    }
                    onCheckedChange={handleSelectAll}
                    aria-label="Selecionar todos"
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    column.sortable && "cursor-pointer select-none hover:bg-muted/50",
                    column.sticky && "sticky left-0 bg-card z-10",
                    column.className
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div
                    className={cn(
                      "flex items-center gap-2",
                      column.align === "center" && "justify-center",
                      column.align === "right" && "justify-end"
                    )}
                  >
                    <span>{column.header}</span>
                    {column.sortable && renderSortIcon(column.id)}
                  </div>
                </TableHead>
              ))}
              {actions && actions.length > 0 && (
                <TableHead className="w-12 text-center">Ações</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {processedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
                    className="h-32 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      {emptyIcon || <Search className="h-10 w-10 opacity-50" />}
                      <p>{emptyMessage}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                processedData.map((row, rowIndex) => {
                  const rowId = getRowId(row);
                  const isSelected = selectedRows.has(rowId);
                  const customRowClass =
                    typeof rowClassName === "function"
                      ? rowClassName(row, rowIndex)
                      : rowClassName;

                  return (
                    <motion.tr
                      key={rowId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15, delay: rowIndex * 0.02 }}
                      className={cn(
                        "border-b transition-colors",
                        striped && rowIndex % 2 === 1 && "bg-muted/30",
                        isSelected && "bg-primary/5",
                        onRowClick && "cursor-pointer hover:bg-muted/50",
                        compact ? "h-10" : "h-14",
                        customRowClass
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {selectable && (
                        <TableCell
                          className="w-12"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleSelectRow(row)}
                            aria-label={`Selecionar linha ${rowIndex + 1}`}
                          />
                        </TableCell>
                      )}
                      {columns.map((column) => {
                        const value = getCellValue(row, column);
                        return (
                          <TableCell
                            key={column.id}
                            className={cn(
                              column.sticky && "sticky left-0 bg-card",
                              column.align === "center" && "text-center",
                              column.align === "right" && "text-right",
                              column.className
                            )}
                          >
                            {column.renderCell
                              ? column.renderCell(value, row, rowIndex)
                              : (value as ReactNode)}
                          </TableCell>
                        );
                      })}
                      {actions && actions.length > 0 && (
                        <TableCell
                          className="w-12 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {actions
                                .filter((action) => !action.show || action.show(row))
                                .map((action) => (
                                  <DropdownMenuItem
                                    key={action.id}
                                    onClick={() => action.onClick(row)}
                                    className={cn(
                                      "gap-2 cursor-pointer",
                                      action.variant === "destructive" &&
                                        "text-destructive focus:text-destructive"
                                    )}
                                  >
                                    {action.icon}
                                    {action.label}
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {/* Footer with count */}
      <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-sm text-muted-foreground">
        <span>
          {processedData.length} de {data.length} registro(s)
        </span>
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="h-7 text-xs"
          >
            Limpar busca
          </Button>
        )}
      </div>
    </div>
  );
}
