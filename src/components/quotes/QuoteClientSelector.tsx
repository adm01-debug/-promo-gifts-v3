/**
 * QuoteClientSelector — Campo unificado de busca + seleção de empresa
 * Mesmo padrão visual do MockupClientSelector
 */

import { useState, useRef, useEffect } from "react";
import { useClientFuzzySearch } from "@/hooks/useGenericFuzzySearch";
import { X, Building2, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCrmCompanySelector } from "@/hooks/useCrmCompanies";
import { motion, AnimatePresence } from "framer-motion";

interface Client {
  id: string;
  name: string;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  email?: string;
  phone?: string;
  ramo?: string;
  nicho?: string;
  primary_color_name?: string;
  primary_color_hex?: string;
  logo_url?: string | null;
  cnpj?: string | null;
}

interface QuoteClientSelectorProps {
  selectedClient: Client | null;
  onClientSelect: (client: Client | null) => void;
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

export function QuoteClientSelector({ selectedClient, onClientSelect }: QuoteClientSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: clients = [], isLoading } = useCrmCompanySelector();
  const { results: filteredClients } = useClientFuzzySearch(clients, searchQuery);

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
          <div className="flex items-center gap-2">
            {selectedClient.ramo && (
              <span className="text-xs text-muted-foreground truncate">{selectedClient.ramo}</span>
            )}
            {selectedClient.cnpj && (
              <>
                {selectedClient.ramo && <span className="text-xs text-muted-foreground">·</span>}
                <span className="text-xs text-muted-foreground font-mono">{selectedClient.cnpj}</span>
              </>
            )}
          </div>
        </div>
        <X className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
    );
  }

  const itemHeight = 56;
  const maxVisibleItems = 5;
  const dynamicHeight = Math.min(filteredClients.length, maxVisibleItems) * itemHeight;
  const dropdownHeight = filteredClients.length === 0 ? 80 : Math.max(dynamicHeight, 80);

  return (
    <div ref={containerRef} className="relative w-full z-40">
      {/* Campo de busca — z-50 + isolate para ficar acima do backdrop-blur */}
      <div className="relative z-50 isolate">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Buscar empresa..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className="pl-9 h-11 bg-background"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Backdrop overlay */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px]"
            onClick={() => setIsFocused(false)}
          />
        )}
      </AnimatePresence>

      {/* Dropdown de resultados */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-50 w-full mt-1 rounded-lg border border-primary/30 bg-popover shadow-xl shadow-black/25 overflow-hidden ring-1 ring-primary/10"
          >
            {/* Header com contagem */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30">
              <span className="text-xs text-muted-foreground font-medium">
                {isLoading
                  ? "Carregando..."
                  : searchQuery.trim().length >= 2
                    ? `${filteredClients.length} resultado${filteredClients.length !== 1 ? "s" : ""}`
                    : `${filteredClients.length} empresa${filteredClients.length !== 1 ? "s" : ""} disponíve${filteredClients.length !== 1 ? "is" : "l"}`
                }
              </span>
            </div>

            {/* Lista com scroll */}
            <div className="relative">
              <ScrollArea style={{ height: `${dropdownHeight}px` }}>
                {filteredClients.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-6 text-center px-4">
                    <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-muted-foreground/60" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Nenhuma empresa encontrada
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        Tente buscar por nome, CNPJ ou ramo de atividade
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-1">
                    {filteredClients.map((client, index) => (
                      <button
                        key={client.id}
                        type="button"
                        className={cn(
                          "flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors duration-150",
                          "hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-none",
                          index < filteredClients.length - 1 && "border-b border-border/30"
                        )}
                        onClick={() => {
                          onClientSelect({
                            id: client.id,
                            name: client.name,
                            razao_social: client.razao_social,
                            nome_fantasia: client.nome_fantasia,
                            ramo: client.ramo ?? undefined,
                            logo_url: client.logo_url ?? undefined,
                            cnpj: client.cnpj ?? undefined,
                          });
                          setSearchQuery("");
                          setIsFocused(false);
                        }}
                      >
                        <CompanyAvatar name={client.name} logoUrl={client.logo_url} size="sm" />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm font-medium truncate">{client.name}</span>
                          <div className="flex items-center gap-1.5">
                            {client.razao_social && client.razao_social !== client.name && (
                              <span className="text-xs text-muted-foreground truncate">{client.razao_social}</span>
                            )}
                            {client.cnpj && (
                              <>
                                {client.razao_social && client.razao_social !== client.name && <span className="text-xs text-muted-foreground/50">·</span>}
                                <span className="text-[11px] text-muted-foreground/70 font-mono truncate">{client.cnpj}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {filteredClients.length > maxVisibleItems && (
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-popover to-transparent pointer-events-none" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
