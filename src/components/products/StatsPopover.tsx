import { BarChart3, Package, Layers, Users, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface StatItem {
  id: string;
  label: string;
  value: number;
  icon: React.ReactNode;
}

interface StatsPopoverProps {
  stats: StatItem[];
}

export function StatsPopover({ stats }: StatsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs">Resumo</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-3" sideOffset={8}>
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Estatísticas</p>
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="flex items-center justify-between py-1.5"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-primary">{stat.icon}</span>
                {stat.label}
              </div>
              <span className="text-sm font-bold">
                {stat.value.toLocaleString("pt-BR")}
              </span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
