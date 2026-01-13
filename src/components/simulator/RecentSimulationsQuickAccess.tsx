// src/components/simulator/RecentSimulationsQuickAccess.tsx
// Melhoria #5: Histórico de simulações recentes com quick-access

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { History, Clock, Package, DollarSign, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/hooks/useSimulation";
import type { SavedSimulation } from "@/types/simulation";

interface RecentSimulationsQuickAccessProps {
  simulations: SavedSimulation[] | undefined;
  isLoading: boolean;
  onLoadSimulation: (simulation: SavedSimulation) => void;
  limit?: number;
}

export function RecentSimulationsQuickAccess({
  simulations,
  isLoading,
  onLoadSimulation,
  limit = 5,
}: RecentSimulationsQuickAccessProps) {
  const recentSimulations = useMemo(() => {
    if (!simulations) return [];
    return simulations.slice(0, limit);
  }, [simulations, limit]);

  if (!simulations || simulations.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">Recentes</span>
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
            {Math.min(simulations.length, limit)}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b bg-muted/30">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Simulações Recentes
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Clique para carregar rapidamente
          </p>
        </div>
        
        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <AnimatePresence>
              <div className="divide-y">
                {recentSimulations.map((simulation, idx) => {
                  const bestOption = simulation.simulation_data
                    .sort((a, b) => a.grandTotal - b.grandTotal)[0];
                  
                  return (
                    <motion.button
                      key={simulation.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => onLoadSimulation(simulation)}
                      className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {simulation.product_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {simulation.quantity} un
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(bestOption?.grandTotal || 0)}
                            </span>
                          </div>
                          {simulation.bitrix_clients && (
                            <Badge variant="outline" className="mt-1.5 text-[10px] h-5">
                              {simulation.bitrix_clients.name}
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(simulation.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </AnimatePresence>
          )}
        </ScrollArea>
        
        {simulations.length > limit && (
          <div className="p-2 border-t bg-muted/20 text-center">
            <span className="text-xs text-muted-foreground">
              +{simulations.length - limit} simulações mais antigas
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
