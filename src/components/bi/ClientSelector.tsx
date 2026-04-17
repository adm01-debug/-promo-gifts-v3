/**
 * ClientSelector — combobox para escolher cliente do CRM no módulo BI.
 */
import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Building2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCrmCompanies } from "@/hooks/useCrmCompanies";
import { getCompanyDisplayName } from "@/types/crm";

interface ClientSelectorProps {
  value: string | null;
  onChange: (clientId: string | null) => void;
}

export function ClientSelector({ value, onChange }: ClientSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: companies, isLoading } = useCrmCompanies({ is_customer: true });

  const filtered = useMemo(() => {
    if (!companies) return [];
    if (!search.trim()) return companies.slice(0, 50);
    const needle = search.toLowerCase();
    return companies
      .filter((c) => {
        const display = getCompanyDisplayName(c).toLowerCase();
        return (
          display.includes(needle) ||
          c.cnpj?.toLowerCase().includes(needle) ||
          c.ramo_atividade?.toLowerCase().includes(needle)
        );
      })
      .slice(0, 50);
  }, [companies, search]);

  const selected = companies?.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-12 px-4 border-[1.5px] font-display"
        >
          <span className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            {selected ? (
              <span className="truncate">{getCompanyDisplayName(selected)}</span>
            ) : (
              <span className="text-muted-foreground">Selecionar cliente da carteira...</span>
            )}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CNPJ ou ramo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-2 space-y-1">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhum cliente encontrado.
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                  setSearch("");
                }}
                className={cn(
                  "w-full px-3 py-2 text-left flex items-start gap-3 hover:bg-accent transition-colors",
                  value === c.id && "bg-accent",
                )}
              >
                <Check
                  className={cn(
                    "h-4 w-4 mt-1 text-primary shrink-0",
                    value === c.id ? "opacity-100" : "opacity-0",
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{getCompanyDisplayName(c)}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.ramo_atividade ?? "Sem ramo"}{c.cidade ? ` · ${c.cidade}` : ""}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
