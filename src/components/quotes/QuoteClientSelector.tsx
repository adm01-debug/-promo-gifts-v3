import { useState, useEffect, useMemo } from "react";
import { useClientFuzzySearch } from "@/hooks/useGenericFuzzySearch";
import { Check, ChevronsUpDown, Building2, Search } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  ramo?: string;
  nicho?: string;
  primary_color_name?: string;
  primary_color_hex?: string;
}

interface QuoteClientSelectorProps {
  selectedClient: Client | null;
  onClientSelect: (client: Client | null) => void;
}

export function QuoteClientSelector({ selectedClient, onClientSelect }: QuoteClientSelectorProps) {
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("bitrix_clients")
        .select("id, name, email, phone, ramo, nicho, primary_color_name, primary_color_hex")
        .order("name")
        .limit(100);

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error("Error fetching clients:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Busca fuzzy de clientes - tolerante a erros de digitação
  const { results: filteredClients } = useClientFuzzySearch(clients, searchQuery);

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
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: selectedClient.primary_color_hex || "hsl(var(--primary))" }}
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
              Selecionar cliente...
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0 bg-popover border" align="start">
        <Command>
          <CommandInput 
            placeholder="Buscar cliente..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Carregando..." : "Nenhum cliente encontrado."}
            </CommandEmpty>
            <CommandGroup>
              {filteredClients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.name}
                  onSelect={() => {
                    onClientSelect(client);
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 py-3"
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: client.primary_color_hex || "hsl(var(--primary))" }}
                  >
                    {client.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium truncate">{client.name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {client.ramo && <span>{client.ramo}</span>}
                      {client.nicho && (
                        <Badge variant="secondary" className="text-xs py-0">
                          {client.nicho}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedClient?.id === client.id ? "opacity-100" : "opacity-0"
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
