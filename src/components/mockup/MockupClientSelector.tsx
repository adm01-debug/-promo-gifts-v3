/**
 * MockupClientSelector — Campo unificado de busca + seleção de empresa
 * Um único input que filtra e mostra resultados inline (sem botão separado)
 */

import { useState, useRef, useEffect } from "react";
import { useClientFuzzySearch } from "@/hooks/useGenericFuzzySearch";
import { Check, X, Building2, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCrmCompanySelector } from "@/hooks/useCrmCompanies";
import type { MockupClient } from "./MockupConfigPanel";

interface MockupClientSelectorProps {
  selectedClient: MockupClient | null;
  onClientSelect: (client: MockupClient | null) => void;
}

function CompanyAvatar({ name, logoUrl, size = "md" }: { name: string; logoUrl?: string | null; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-7 h-7 text-[10px]" : "w-8 h-8 text-xs";
  
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={cn(dim, "rounded object-contain bg-background border border-border flex-shrink-0")}
      />
    );
  }
  
  return (
    <div className={cn(dim, "rounded-full flex items-center justify-center font-bold text-primary-foreground bg-primary flex-shrink-0")}>
      {name.substring(0, 2).toUpperCase()}
    </div>
  );
}

export function MockupClientSelector({ selectedClient, onClientSelect }: MockupClientSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: companies = [], isLoading } = useCrmCompanySelector();
  const { results: filteredCompanies } = useClientFuzzySearch(companies, searchQuery);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showDropdown = isFocused && !selectedClient;

  // Se há empresa selecionada, mostrar chip
  if (selectedClient) {
    return (
      <div
        className="flex items-center gap-3 w-full rounded-md border border-border bg-background px-3 py-2 min-h-[44px] cursor-pointer group hover:border-primary/50 transition-colors"
        onClick={() => {
          onClientSelect(null);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
      >
        <CompanyAvatar name={selectedClient.name} logoUrl={selectedClient.logo_url} />
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-medium text-sm truncate">{selectedClient.name}</span>
          {selectedClient.ramo && (
            <span className="text-xs text-muted-foreground truncate">{selectedClient.ramo}</span>
          )}
        </div>
        <X className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Campo de busca unificado */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Buscar empresa..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className="pl-9 h-11"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Dropdown de resultados */}
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 rounded-md border border-border bg-popover shadow-md overflow-hidden">
          <ScrollArea className="h-[260px]">
            {filteredCompanies.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4" />
                {isLoading ? "Carregando..." : "Nenhuma empresa encontrada"}
              </div>
            ) : (
              <div className="py-1">
                {filteredCompanies.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      onClientSelect({
                        id: company.id,
                        name: company.name,
                        razao_social: company.razao_social,
                        nome_fantasia: company.nome_fantasia,
                        ramo: company.ramo ?? undefined,
                        logo_url: company.logo_url ?? undefined,
                        cnpj: company.cnpj ?? undefined,
                      });
                      setSearchQuery("");
                      setIsFocused(false);
                    }}
                  >
                    <CompanyAvatar name={company.name} logoUrl={company.logo_url} size="sm" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">{company.name}</span>
                      {company.ramo && (
                        <span className="text-xs text-muted-foreground truncate">{company.ramo}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
