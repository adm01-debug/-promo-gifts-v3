/**
 * MockupClientSelector — Combobox com busca na API externa do CRM
 * Reutiliza useCrmCompanySelector + fuzzy search (mesmo padrão do módulo de orçamentos)
 */

import { useState } from "react";
import { useClientFuzzySearch } from "@/hooks/useGenericFuzzySearch";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCrmCompanySelector } from "@/hooks/useCrmCompanies";
import type { MockupClient } from "./MockupConfigPanel";

interface MockupClientSelectorProps {
  selectedClient: MockupClient | null;
  onClientSelect: (client: MockupClient | null) => void;
}

export function MockupClientSelector({ selectedClient, onClientSelect }: MockupClientSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: companies = [], isLoading } = useCrmCompanySelector();

  const { results: filteredCompanies } = useClientFuzzySearch(companies, searchQuery);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-[44px] py-2"
        >
          {selectedClient ? (
            <div className="flex items-center gap-3 text-left">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary"
              >
                {selectedClient.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="font-medium">{selectedClient.name}</span>
                {selectedClient.ramo && (
                  <span className="text-xs text-muted-foreground">{selectedClient.ramo}</span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Selecionar empresa...
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 bg-popover border" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar empresa..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Carregando..." : "Nenhuma empresa encontrada."}
            </CommandEmpty>
            <CommandGroup>
              {filteredCompanies.map((company) => (
                <CommandItem
                  key={company.id}
                  value={company.name}
                  onSelect={() => {
                    onClientSelect({
                      id: company.id,
                      name: company.name,
                      razao_social: company.razao_social,
                      nome_fantasia: company.nome_fantasia,
                      ramo: company.ramo ?? undefined,
                      logo_url: company.logo_url ?? undefined,
                      cnpj: company.cnpj ?? undefined,
                    });
                    setOpen(false);
                    setSearchQuery("");
                  }}
                  className="flex items-center gap-3 py-3"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground bg-primary shrink-0"
                  >
                    {company.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium truncate">{company.name}</span>
                    {company.ramo && (
                      <span className="text-xs text-muted-foreground">{company.ramo}</span>
                    )}
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedClient?.id === company.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
