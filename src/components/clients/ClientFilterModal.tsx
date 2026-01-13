import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Fuse from "fuse.js";
import { User, Search, X, Palette, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { CLIENTS, type Client } from "@/data/mockData";

interface ClientFilterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectClient: (client: Client) => void;
  selectedClientId?: string;
}

// Fuse.js config para busca fuzzy de clientes
const clientFuse = new Fuse(CLIENTS, {
  keys: [
    { name: 'name', weight: 0.5 },
    { name: 'ramo', weight: 0.3 },
    { name: 'nicho', weight: 0.2 },
  ],
  threshold: 0.4,
  distance: 100,
  includeScore: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
});

export function ClientFilterModal({
  open,
  onOpenChange,
  onSelectClient,
  selectedClientId,
}: ClientFilterModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return CLIENTS;
    
    const results = clientFuse.search(searchQuery);
    return results.map((r) => r.item);
  }, [searchQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Filtrar por Cliente
          </DialogTitle>
          <DialogDescription>
            Selecione um cliente para destacar produtos com cores compatíveis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente por nome, ramo ou nicho..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Client list */}
          <ScrollArea className="h-80">
            <div className="space-y-2">
              {filteredClients.map((client) => {
                const isSelected = client.id === selectedClientId;
                
                return (
                  <button
                    key={client.id}
                    onClick={() => {
                      onSelectClient(client);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-accent"
                    )}
                  >
                    {/* Logo/Avatar */}
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: client.primaryColor.hex + "20" }}
                    >
                      {client.logo ? (
                        <img
                          src={client.logo}
                          alt={client.name}
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        <span
                          className="text-lg font-bold"
                          style={{ color: client.primaryColor.hex }}
                        >
                          {client.name.charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {client.name}
                        </p>
                        {isSelected && (
                          <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {client.ramo} • {client.nicho}
                      </p>
                      
                      {/* Colors */}
                      <div className="flex items-center gap-1 mt-2">
                        <Palette className="h-3 w-3 text-muted-foreground" />
                        <div
                          className="w-4 h-4 rounded-full border border-border"
                          style={{ backgroundColor: client.primaryColor.hex }}
                          title={client.primaryColor.name}
                        />
                        {client.secondaryColors.slice(0, 3).map((color, idx) => (
                          <div
                            key={idx}
                            className="w-4 h-4 rounded-full border border-border"
                            style={{ backgroundColor: color.hex }}
                            title={color.name}
                          />
                        ))}
                        {client.secondaryColors.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{client.secondaryColors.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}

              {filteredClients.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum cliente encontrado</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
