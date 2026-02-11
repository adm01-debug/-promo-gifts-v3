/**
 * Seletor de Empresa + Contato para orçamentos
 * - Busca fuzzy com Fuse.js
 * - Carrega contatos vinculados à empresa selecionada
 */

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Fuse from "fuse.js";
import { Building2, User, Search, X, ChevronDown, Loader2, Phone, Mail } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { selectCrm, searchCrm } from "@/lib/crm-db";
import { getCompanyDisplayName, type CrmCompany, type CrmContact, type CrmContactEmail, type CrmContactPhone } from "@/types/crm";

interface CompanyOption {
  id: string;
  name: string;
  razao_social: string;
  nome_fantasia: string | null;
  cidade: string | null;
  estado: string | null;
  cnpj: string | null;
}

interface ContactOption {
  id: string;
  name: string;
  cargo: string | null;
  email: string | null;
  phone: string | null;
}

interface CompanyContactSelectorProps {
  companyId: string;
  contactId?: string;
  onCompanyChange: (companyId: string) => void;
  onContactChange?: (contactId: string) => void;
}

export function CompanyContactSelector({
  companyId,
  contactId,
  onCompanyChange,
  onContactChange,
}: CompanyContactSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounce search for server-side queries
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch companies
  const { data: companies, isLoading: loadingCompanies } = useQuery<CompanyOption[]>({
    queryKey: ["quote-companies-selector"],
    queryFn: async () => {
      const data = await selectCrm<CrmCompany>("companies", {
        select: "id, razao_social, nome_fantasia, title, cidade, estado, cnpj",
        filters: { deleted_at: null },
        orderBy: { column: "razao_social", ascending: true },
        limit: 500,
      });
      return data.map((c) => ({
        id: c.id,
        name: getCompanyDisplayName(c),
        razao_social: c.razao_social,
        nome_fantasia: c.nome_fantasia,
        cidade: c.cidade,
        estado: c.estado,
        cnpj: c.cnpj,
      }));
    },
    staleTime: 15 * 60 * 1000,
  });

  // Fetch contacts for selected company
  const { data: contacts, isLoading: loadingContacts } = useQuery<ContactOption[]>({
    queryKey: ["quote-company-contacts", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      // Fetch contacts
      const contactsData = await selectCrm<CrmContact>("contacts", {
        select: "id, first_name, last_name, full_name, cargo, _deprecated_email, _deprecated_phone",
        filters: { company_id: companyId, deleted_at: null },
        orderBy: { column: "first_name", ascending: true },
        limit: 50,
      });

      // For each contact, try to get primary email/phone
      const enriched = await Promise.all(
        contactsData.map(async (ct) => {
          let email = ct._deprecated_email;
          let phone = ct._deprecated_phone;

          try {
            if (!email) {
              const emails = await selectCrm<CrmContactEmail>("contact_emails", {
                filters: { contact_id: ct.id },
                limit: 1,
              });
              if (emails.length > 0) email = emails[0].email;
            }
            if (!phone) {
              const phones = await selectCrm<CrmContactPhone>("contact_phones", {
                filters: { contact_id: ct.id },
                limit: 1,
              });
              if (phones.length > 0) phone = phones[0].numero;
            }
          } catch {
            // silently fail enrichment
          }

          return {
            id: ct.id,
            name: ct.full_name || [ct.first_name, ct.last_name].filter(Boolean).join(" "),
            cargo: ct.cargo,
            email,
            phone,
          };
        })
      );

      return enriched;
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });

  // Server-side search when local Fuse doesn't find enough
  const { data: serverResults, isLoading: loadingSearch } = useQuery<CompanyOption[]>({
    queryKey: ["quote-companies-search", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      const results = await searchCrm<CrmCompany>("companies", "razao_social", debouncedSearch, {
        select: "id, razao_social, nome_fantasia, title, cidade, estado, cnpj",
        limit: 30,
      });
      return results.map((c) => ({
        id: c.id,
        name: getCompanyDisplayName(c),
        razao_social: c.razao_social,
        nome_fantasia: c.nome_fantasia,
        cidade: c.cidade,
        estado: c.estado,
        cnpj: c.cnpj,
      }));
    },
    enabled: !!debouncedSearch && debouncedSearch.length >= 2,
    staleTime: 2 * 60 * 1000,
  });

  // Fuse.js instance for local quick filtering
  const fuse = useMemo(() => {
    if (!companies) return null;
    return new Fuse(companies, {
      keys: ["name", "razao_social", "nome_fantasia", "cnpj", "cidade"],
      threshold: 0.4,
      distance: 100,
    });
  }, [companies]);

  // Merge local + server results, deduplicated
  const filteredCompanies = useMemo(() => {
    if (!searchTerm.trim()) return companies?.slice(0, 30) || [];

    // Local fuse results
    const localResults = fuse
      ? fuse.search(searchTerm).map((r) => r.item).slice(0, 20)
      : [];

    // Merge with server results
    const seen = new Set(localResults.map((c) => c.id));
    const merged = [...localResults];
    if (serverResults) {
      for (const sr of serverResults) {
        if (!seen.has(sr.id)) {
          merged.push(sr);
          seen.add(sr.id);
        }
      }
    }

    return merged.slice(0, 30);
  }, [companies, searchTerm, fuse, serverResults]);

  // Selected company
  const selectedCompany = useMemo(() => {
    if (!companyId || !companies) return null;
    return companies.find((c) => c.id === companyId) || null;
  }, [companyId, companies]);

  // Selected contact
  const selectedContact = useMemo(() => {
    if (!contactId || !contacts) return null;
    return contacts.find((c) => c.id === contactId) || null;
  }, [contactId, contacts]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCompany = (id: string) => {
    onCompanyChange(id);
    onContactChange?.("");
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearCompany = () => {
    onCompanyChange("");
    onContactChange?.("");
    setSearchTerm("");
  };

  return (
    <div className="space-y-4">
      {/* Company selector */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Empresa
        </Label>
        <div ref={wrapperRef} className="relative">
          {/* Trigger / Display */}
          {!isOpen ? (
            <button
              type="button"
              className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "hover:bg-accent/50 transition-colors"
              )}
              onClick={() => setIsOpen(true)}
            >
              <span className={cn(!selectedCompany && "text-muted-foreground")}>
                {selectedCompany ? selectedCompany.name : "Selecione uma empresa"}
              </span>
              <div className="flex items-center gap-1">
                {selectedCompany && (
                  <span
                    role="button"
                    className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearCompany();
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </span>
                )}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                autoFocus
                placeholder="Buscar empresa por nome, CNPJ, cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-8"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsOpen(false);
                    setSearchTerm("");
                  }
                }}
              />
              <span
                role="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted text-muted-foreground cursor-pointer"
                onClick={() => {
                  setIsOpen(false);
                  setSearchTerm("");
                }}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            </div>
          )}

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-[280px] overflow-y-auto">
              {loadingCompanies ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredCompanies.length === 0 && !loadingSearch ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  {searchTerm.length >= 2 ? "Nenhuma empresa encontrada" : "Digite para buscar..."}
                </div>
              ) : (
                <>
                  {/* "Sem empresa" option */}
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent/50 transition-colors text-left",
                      !companyId && "bg-accent"
                    )}
                    onClick={() => handleSelectCompany("")}
                  >
                    <span className="text-muted-foreground">Sem empresa</span>
                  </button>

                  {filteredCompanies.map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent/50 transition-colors text-left",
                        companyId === company.id && "bg-accent"
                      )}
                      onClick={() => handleSelectCompany(company.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{company.name}</p>
                        {(company.cidade || company.estado) && (
                          <p className="text-xs text-muted-foreground truncate">
                            {[company.cidade, company.estado].filter(Boolean).join("/")}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}

                  {loadingSearch && searchTerm.length >= 2 && (
                    <div className="flex items-center justify-center py-2 text-xs text-muted-foreground gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Buscando no servidor...
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contact selector - shown only when company is selected */}
      {companyId && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Contato
          </Label>

          {loadingContacts ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando contatos...
            </div>
          ) : !contacts || contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">
              Nenhum contato cadastrado para esta empresa
            </p>
          ) : (
            <div className="space-y-1.5">
              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 rounded-md border text-sm text-left transition-colors",
                    contactId === contact.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent/50"
                  )}
                  onClick={() => onContactChange?.(contact.id)}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{contact.name}</p>
                    {contact.cargo && (
                      <p className="text-xs text-muted-foreground">{contact.cargo}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {contact.email && (
                      <Badge variant="outline" className="text-xs gap-1 px-1.5">
                        <Mail className="h-3 w-3" />
                        <span className="hidden sm:inline max-w-[120px] truncate">{contact.email}</span>
                      </Badge>
                    )}
                    {contact.phone && (
                      <Badge variant="outline" className="text-xs gap-1 px-1.5">
                        <Phone className="h-3 w-3" />
                        <span className="hidden sm:inline">{contact.phone}</span>
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
