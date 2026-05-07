/**
 * CartCompanyPicker - Seletor compacto de empresa para criação de carrinho
 */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Fuse from "fuse.js";
import { Building2, Search, Loader2, Clock, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { selectCrm, searchCrm } from "@/lib/crm-db";
import { getCompanyDisplayName, type CrmCompany } from "@/types/crm";
import { useSellerCartContext, type CreateCartInput } from "@/contexts/SellerCartContext";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { AvatarLogo } from "@/components/shared/AvatarLogo";

interface CompanyItem {
// ... keep existing code
              onClick={() => handleSelect(company)}
              disabled={!canCreateCart}
            >
              <AvatarLogo name={company.name} logoUrl={company.logo_url} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate font-medium">{company.name}</p>
                {company.ramo && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {company.ramo}
                  </p>
                )}
              </div>
            </button>
          ))}
          {filteredCompanies.length === 0 && !isLoading && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhuma empresa encontrada
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
