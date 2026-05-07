/**
 * FavoritesClientPicker — Seletor leve de cliente CRM para vincular a lista.
 * Reusa a query do CartCompanyPicker mas SEM o efeito colateral de criar carrinho.
 */
import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import Fuse from "fuse.js";
import { Building2, Search, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { selectCrm, searchCrm } from "@/lib/crm-db";
import { getCompanyDisplayName, type CrmCompany } from "@/types/crm";
import { AvatarLogo } from "@/components/shared/AvatarLogo";

interface CompanyItem {
// ... keep existing code
                onClick={() => onSelect({ id: company.id, name: company.name })}
              >
                <AvatarLogo name={company.name} logoUrl={company.logo_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate font-medium">{company.name}</p>
                  {company.ramo && (
                    <p className="text-[10px] text-muted-foreground truncate">{company.ramo}</p>
                  )}
                </div>
              </button>
            ))}
            {list.length === 0 && !isLoading && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhuma empresa encontrada
              </p>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
