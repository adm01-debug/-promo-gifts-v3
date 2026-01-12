/**
 * Interactive Charts Components
 * Enhanced chart interactions and exports
 */

import { useState, useRef, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Download,
  Maximize2,
  Minimize2,
  RefreshCw,
  Settings,
  ZoomIn,
  ZoomOut,
  Image,
  FileText,
  Table,
  MoreVertical,
  Eye,
  EyeOff,
  Filter,
  Calendar,
  TrendingUp,
  BarChart2,
  PieChart,
  LineChart,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Chart Container with Controls
interface ChartContainerProps {
  title?: string;
  description?: string;
  children: ReactNode;
  onRefresh?: () => void;
  onExport?: (format: "png" | "svg" | "csv" | "pdf") => void;
  isLoading?: boolean;
  className?: string;
  showControls?: boolean;
  allowFullscreen?: boolean;
}

export function ChartContainer({
  title,
  description,
  children,
  onRefresh,
  onExport,
  isLoading,
  className,
  showControls = true,
  allowFullscreen = true,
}: ChartContainerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative rounded-lg border bg-card",
        isFullscreen && "fixed inset-0 z-50 rounded-none",
        className
      )}
    >
      {/* Header */}
      {(title || showControls) && (
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            {title && <h3 className="font-semibold">{title}</h3>}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>

          {showControls && (
            <div className="flex items-center gap-1">
              {onRefresh && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onRefresh}
                        disabled={isLoading}
                      >
                        <RefreshCw
                          className={cn("h-4 w-4", isLoading && "animate-spin")}
                        />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Atualizar</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {onExport && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onExport("png")}>
                      <Image className="h-4 w-4 mr-2" />
                      Exportar PNG
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onExport("svg")}>
                      <FileText className="h-4 w-4 mr-2" />
                      Exportar SVG
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onExport("csv")}>
                      <Table className="h-4 w-4 mr-2" />
                      Exportar CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onExport("pdf")}>
                      <FileText className="h-4 w-4 mr-2" />
                      Exportar PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {allowFullscreen && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={toggleFullscreen}
                      >
                        {isFullscreen ? (
                          <Minimize2 className="h-4 w-4" />
                        ) : (
                          <Maximize2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>
      )}

      {/* Chart Content */}
      <div className={cn("p-4", isFullscreen && "h-[calc(100%-60px)]")}>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// Zoomable Chart
interface ZoomableChartProps {
  children: ReactNode;
  minZoom?: number;
  maxZoom?: number;
  className?: string;
}

export function ZoomableChart({
  children,
  minZoom = 0.5,
  maxZoom = 3,
  className,
}: ZoomableChartProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, maxZoom));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, minZoom));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className={cn("relative", className)}>
      {/* Zoom Controls */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1 border">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomOut}
                disabled={zoom <= minZoom}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Diminuir zoom</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <span className="text-xs font-medium px-2 min-w-[48px] text-center">
          {Math.round(zoom * 100)}%
        </span>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleZoomIn}
                disabled={zoom >= maxZoom}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Aumentar zoom</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="w-px h-4 bg-border mx-1" />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleReset}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Resetar</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Chart */}
      <div
        ref={containerRef}
        className="overflow-hidden cursor-grab active:cursor-grabbing"
      >
        <motion.div
          style={{
            scale: zoom,
            x: pan.x,
            y: pan.y,
          }}
          drag
          dragConstraints={containerRef}
          onDragEnd={(_, info) =>
            setPan((prev) => ({
              x: prev.x + info.offset.x,
              y: prev.y + info.offset.y,
            }))
          }
          className="origin-center"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

// Chart Legend Toggle
interface LegendItem {
  id: string;
  label: string;
  color: string;
  visible: boolean;
}

interface ChartLegendProps {
  items: LegendItem[];
  onToggle: (id: string) => void;
  onToggleAll?: () => void;
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export function ChartLegend({
  items,
  onToggle,
  onToggleAll,
  className,
  orientation = "horizontal",
}: ChartLegendProps) {
  const allVisible = items.every((item) => item.visible);

  return (
    <div
      className={cn(
        "flex gap-3 flex-wrap",
        orientation === "vertical" && "flex-col",
        className
      )}
    >
      {onToggleAll && (
        <button
          onClick={onToggleAll}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {allVisible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          {allVisible ? "Ocultar todos" : "Mostrar todos"}
        </button>
      )}

      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onToggle(item.id)}
          className={cn(
            "flex items-center gap-2 text-sm transition-all",
            !item.visible && "opacity-50"
          )}
        >
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className={cn(!item.visible && "line-through")}>
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// Chart Type Selector
type ChartType = "line" | "bar" | "pie" | "area";

interface ChartTypeSelectorProps {
  value: ChartType;
  onChange: (type: ChartType) => void;
  availableTypes?: ChartType[];
  className?: string;
}

export function ChartTypeSelector({
  value,
  onChange,
  availableTypes = ["line", "bar", "pie", "area"],
  className,
}: ChartTypeSelectorProps) {
  const icons: Record<ChartType, ReactNode> = {
    line: <LineChart className="h-4 w-4" />,
    bar: <BarChart2 className="h-4 w-4" />,
    pie: <PieChart className="h-4 w-4" />,
    area: <TrendingUp className="h-4 w-4" />,
  };

  const labels: Record<ChartType, string> = {
    line: "Linha",
    bar: "Barras",
    pie: "Pizza",
    area: "Área",
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {availableTypes.map((type) => (
        <TooltipProvider key={type}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={value === type ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => onChange(type)}
              >
                {icons[type]}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{labels[type]}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}

// Mini Dashboard Widget
interface MiniDashboardProps {
  widgets: {
    id: string;
    title: string;
    value: string | number;
    change?: number;
    changeLabel?: string;
    icon?: ReactNode;
    chart?: ReactNode;
  }[];
  columns?: number;
  className?: string;
}

export function MiniDashboard({
  widgets,
  columns = 4,
  className,
}: MiniDashboardProps) {
  return (
    <div
      className={cn("grid gap-4", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {widgets.map((widget) => (
        <motion.div
          key={widget.id}
          whileHover={{ y: -2 }}
          className="p-4 rounded-lg border bg-card"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{widget.title}</span>
            {widget.icon && (
              <div className="text-muted-foreground">{widget.icon}</div>
            )}
          </div>
          <div className="text-2xl font-bold">{widget.value}</div>
          {widget.change !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              <span
                className={cn(
                  "text-sm font-medium",
                  widget.change >= 0 ? "text-green-500" : "text-red-500"
                )}
              >
                {widget.change >= 0 ? "+" : ""}
                {widget.change}%
              </span>
              {widget.changeLabel && (
                <span className="text-xs text-muted-foreground">
                  {widget.changeLabel}
                </span>
              )}
            </div>
          )}
          {widget.chart && <div className="mt-3 h-16">{widget.chart}</div>}
        </motion.div>
      ))}
    </div>
  );
}

// Chart Drill Down
interface DrillDownChartProps {
  children: (level: number, data: unknown) => ReactNode;
  levels: { title: string; data: unknown }[];
  className?: string;
}

export function DrillDownChart({
  children,
  levels,
  className,
}: DrillDownChartProps) {
  const [currentLevel, setCurrentLevel] = useState(0);
  const [history, setHistory] = useState<number[]>([0]);

  const drillDown = (newLevel: number) => {
    setHistory((prev) => [...prev, newLevel]);
    setCurrentLevel(newLevel);
  };

  const drillUp = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      setHistory(newHistory);
      setCurrentLevel(newHistory[newHistory.length - 1]);
    }
  };

  return (
    <div className={className}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4">
        {history.map((levelIndex, i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground">/</span>}
            <button
              onClick={() => {
                setHistory(history.slice(0, i + 1));
                setCurrentLevel(levelIndex);
              }}
              className={cn(
                "text-sm",
                i === history.length - 1
                  ? "font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {levels[levelIndex]?.title || `Nível ${levelIndex + 1}`}
            </button>
          </div>
        ))}
      </div>

      {/* Chart */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentLevel}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {children(currentLevel, levels[currentLevel]?.data)}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      {history.length > 1 && (
        <Button variant="outline" size="sm" className="mt-4" onClick={drillUp}>
          ← Voltar
        </Button>
      )}
    </div>
  );
}

// Chart Data Table (for accessibility)
interface ChartDataTableProps {
  data: Record<string, unknown>[];
  columns: { key: string; label: string }[];
  className?: string;
}

export function ChartDataTable({
  data,
  columns,
  className,
}: ChartDataTableProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setIsOpen(true)}
      >
        <Table className="h-4 w-4" />
        Ver dados
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Dados do Gráfico</DialogTitle>
          </DialogHeader>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {columns.map((col) => (
                  <th key={col.key} className="text-left p-2 font-medium">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="border-b">
                  {columns.map((col) => (
                    <td key={col.key} className="p-2">
                      {String(row[col.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Chart Export Hook
export function useChartExport(chartRef: React.RefObject<HTMLDivElement>) {
  const exportToPNG = useCallback(async () => {
    if (!chartRef.current) return;

    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(chartRef.current);
    const link = document.createElement("a");
    link.download = "chart.png";
    link.href = canvas.toDataURL();
    link.click();
  }, [chartRef]);

  const exportToSVG = useCallback(() => {
    if (!chartRef.current) return;

    const svg = chartRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = "chart.svg";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [chartRef]);

  const exportToCSV = useCallback((data: Record<string, unknown>[]) => {
    if (!data.length) return;

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = "chart-data.csv";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  return { exportToPNG, exportToSVG, exportToCSV };
}
