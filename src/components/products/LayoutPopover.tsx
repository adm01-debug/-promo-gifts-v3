import React from "react";
import { Settings2, LayoutGrid, List, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ColumnSelector, ColumnCount } from "@/components/products/ColumnSelector";
import { cn } from "@/lib/utils";

interface LayoutPopoverProps {
  viewMode: "grid" | "list" | "table";
  setViewMode: (mode: "grid" | "list" | "table") => void;
  gridColumns: ColumnCount;
  setGridColumns: (cols: ColumnCount) => void;
}

export const LayoutPopover = React.forwardRef<HTMLDivElement, LayoutPopoverProps>(
  function LayoutPopover({
    viewMode,
    setViewMode,
    gridColumns,
    setGridColumns,
  }, ref) {
    return (
      <div ref={ref}>
      <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8"
        >
          <Settings2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs">Layout</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-3" sideOffset={8}>
        <div className="space-y-3">
          {/* View Mode */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Visualização</p>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary overflow-hidden">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex-1 h-8 gap-1.5 text-xs whitespace-nowrap overflow-hidden",
                  viewMode === "grid" && "bg-card shadow-sm"
                )}
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Grid
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex-1 h-8 gap-1.5 text-xs whitespace-nowrap overflow-hidden",
                  viewMode === "list" && "bg-card shadow-sm"
                )}
                onClick={() => setViewMode("list")}
              >
                <List className="h-3.5 w-3.5" />
                Lista
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex-1 h-8 gap-1.5 text-xs",
                  viewMode === "table" && "bg-card shadow-sm"
                )}
                onClick={() => setViewMode("table")}
              >
                <Table2 className="h-3.5 w-3.5" />
                Tabela
              </Button>
            </div>
          </div>

          {/* Column Selector - only in grid mode */}
          {viewMode === "grid" && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Colunas</p>
                <ColumnSelector value={gridColumns} onChange={setGridColumns} />
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
    </div>
    );
  }
);
