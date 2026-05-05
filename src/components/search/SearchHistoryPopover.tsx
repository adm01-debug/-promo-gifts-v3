import { useState, useMemo } from "react";
import { Clock, Search, Trash2, X, Pin, PinOff, Loader2, Command as CommandIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useSearchHistory, type HistoryType } from "@/hooks/useSearchHistory";
import { AnimatePresence, motion } from "framer-motion";

interface SearchHistoryPopoverProps {
  type?: HistoryType;
  onSelect?: (term: string) => void;
}

export function SearchHistoryPopover({ type = "general", onSelect }: SearchHistoryPopoverProps) {
  const [open, setOpen] = useState(false);
  const { 
    history, 
    isLoading, 
    removeFromHistory, 
    clearHistory, 
    togglePin 
  } = useSearchHistory(type);

  const itemCount = history.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className={cn(
                  "relative h-11 w-11 shrink-0 rounded-xl border-muted-foreground/20 transition-all duration-200",
                  itemCount > 0 ? "hover:border-primary/50 group" : "opacity-60 hover:opacity-100"
                )}
                aria-label="Histórico de buscas"
              >
                <Clock className={cn(
                  "h-4 w-4 transition-colors",
                  itemCount > 0 ? "text-muted-foreground group-hover:text-primary" : "text-muted-foreground"
                )} />
                {itemCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 bg-primary text-[8px] flex items-center justify-center border-2 border-background shadow-sm">
                    {itemCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent className="bg-primary text-primary-foreground text-[11px] font-medium px-2 py-1 border-none shadow-xl">
            Histórico de buscas ({itemCount})
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent align="end" className="w-80 p-0 overflow-hidden" sideOffset={8}>
        <Command className="rounded-none border-none">
          <div className="flex items-center justify-between p-3 border-b border-border/40 bg-muted/20">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-primary" />
              <span>Histórico de Buscas</span>
            </div>
            <div className="flex items-center gap-1">
              {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground mr-1" />}
              {itemCount > 0 && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearHistory();
                  }}
                  className="h-7 text-[10px] text-muted-foreground hover:text-destructive gap-1 px-1.5"
                >
                  <Trash2 className="h-3 w-3" /> Limpar
                </Button>
              )}
            </div>
          </div>

          <CommandInput placeholder="Filtrar buscas recentes..." className="h-10 border-none focus:ring-0" />
          
          <CommandList className="max-h-[380px] scrollbar-thin">
            <CommandEmpty className="py-8 text-center">
              <div className="flex flex-col items-center justify-center px-4">
                <div className="h-10 w-10 rounded-full bg-muted/40 flex items-center justify-center mb-2">
                  <Clock className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  Nenhuma busca encontrada
                </p>
              </div>
            </CommandEmpty>

            <CommandGroup>
              <AnimatePresence initial={false}>
                {history.map((item, idx) => (
                  <CommandItem
                    key={item.id}
                    value={item.label}
                    onSelect={() => {
                      onSelect?.(item.label);
                      setOpen(false);
                    }}
                    className="group relative flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors"
                  >
                    <Search className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-colors",
                      item.isPinned ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                    )} />
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-tight">
                        {item.label}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground/60">
                          {new Date(item.timestamp).toLocaleDateString('pt-BR')}
                        </span>
                        {item.resultCount !== undefined && (
                          <span className="text-[10px] text-primary/70 font-medium">
                            • {item.resultCount} resultados
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-7 w-7",
                                item.isPinned ? "text-primary bg-primary/10" : "text-muted-foreground"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePin(item.id);
                              }}
                            >
                              {item.isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[10px] py-1 px-2 border-none bg-primary text-primary-foreground">
                            {item.isPinned ? "Desafixar" : "Fixar no topo"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromHistory(item.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </CommandItem>
                ))}
              </AnimatePresence>
            </CommandGroup>
          </CommandList>
          
          {itemCount > 0 && (
            <div className="p-2 bg-muted/10 border-t border-border/40 text-[9px] text-center text-muted-foreground/60">
              Sincronizado entre seus dispositivos
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
