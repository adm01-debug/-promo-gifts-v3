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
import { Badge } from "@/components/ui/badge";
import { useCrmCompanySelector } from "@/hooks/useCrmCompanies";

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  ramo?: string;
  nicho?: string;
  primary_color_name?: string;
  primary_color_hex?: string;
  logo_url?: string | null;
}

interface QuoteClientSelectorProps {
  selectedClient: Client | null;
  onClientSelect: (client: Client | null) => void;
}

function CompanyAvatar({ name, logoUrl, colorHex }: { name: string; logoUrl?: string | null; colorHex?: string | null }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        className="w-8 h-8 rounded object-contain bg-background border border-border flex-shrink-0"
      />
    );
  }
  
  return (
    <div 
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0"
      style={{ backgroundColor: colorHex || "hsl(var(--primary))" }}
    >
      {name.substring(0, 2).toUpperCase()}
    </div>
  );
}

export function QuoteClientSelector({ selectedClient, onClientSelect }: QuoteClientSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: clients = [], isLoading } = useCrmCompanySelector();

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
              <CompanyAvatar 
                name={selectedClient.name} 
                logoUrl={selectedClient.logo_url} 
                colorHex={selectedClient.primary_color_hex} 
              />
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
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover border" align="start">
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
              {filteredClients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.name}
                  onSelect={() => {
                    onClientSelect({
                      ...client,
                      logo_url: client.logo_url,
                    });
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 py-2"
                >
                  <CompanyAvatar 
                    name={client.name} 
                    logoUrl={client.logo_url} 
                    colorHex={client.primary_color_hex} 
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-medium truncate">{client.name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {client.ramo && <span className="truncate">{client.ramo}</span>}
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
