/**
 * Seletor de Empresa + Contato para orçamentos
 * - Busca fuzzy com Fuse.js
 * - Carrega contatos vinculados à empresa selecionada
 */

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Fuse from "fuse.js";
import { Building2, User, Search, X, ChevronDown, Loader2, Phone, Mail, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { selectCrm, searchCrm } from "@/lib/crm-db";
import { getCompanyDisplayName, type CrmCompany, type CrmContact, type CrmContactEmail, type CrmContactPhone } from "@/types/crm";

interface CompanyOption {
  id: string;
  name: string;
  razao_social: string;
  nome_fantasia: string | null;
  ramo_atividade: string | null;
  cnpj: string | null;
  logo_url: string | null;
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

interface ContactOption {
  id: string;
  name: string;
  cargo: string | null;
  email: string | null;
  phone: string | null;
}

export interface SelectedCompanyInfo {
  id: string;
  name: string;
  cnpj?: string;
  ramo_atividade?: string;
}

export interface SelectedContactInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cargo?: string;
}

interface CompanyContactSelectorProps {
  companyId: string;
  contactId?: string;
  onCompanyChange: (companyId: string) => void;
  onContactChange?: (contactId: string) => void;
  onCompanyInfoChange?: (info: SelectedCompanyInfo | null) => void;
  onContactInfoChange?: (info: SelectedContactInfo | null) => void;
}

/** Mini dropdown for contact selection (mirrors company dropdown style) */
function ContactDropdown({
  contacts,
  contactId,
  onContactChange,
  onContactInfoChange,
}: {
  contacts: ContactOption[];
  contactId?: string;
  onContactChange?: (id: string) => void;
  onContactInfoChange?: (info: SelectedContactInfo | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = contacts.find((c) => c.id === contactId) || null;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "hover:bg-accent/50 transition-colors"
        )}
        onClick={() => setOpen(!open)}
      >
        <div className={cn("flex items-center gap-2 min-w-0", !selected && "text-muted-foreground")}>
          {selected ? (
            <>
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary">
                <User className="h-3.5 w-3.5" />
              </div>
              <span className="truncate font-medium">{selected.name}</span>
            </>
          ) : (
            <span>Selecione um contato</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg max-h-[280px] overflow-y-auto">
          {contacts.map((contact) => (
            <button
              key={contact.id}
              type="button"
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-accent/50 transition-colors text-left",
                contactId === contact.id && "bg-accent"
              )}
              onClick={() => {
                onContactChange?.(contact.id);
                onContactInfoChange?.({ id: contact.id, name: contact.name, email: contact.email, phone: contact.phone, cargo: contact.cargo });
                setOpen(false);
              }}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                contactId === contact.id ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
              )}>
                {contactId === contact.id ? <Check className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{contact.name}</p>
                {contact.cargo && <p className="text-xs text-muted-foreground">{contact.cargo}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Single contact auto-select component: shows the contact and auto-fires onContactChange/onContactInfoChange
function SingleContactDisplay({
  contact,
  contactId,
  onContactChange,
  onContactInfoChange,
}: {
  contact: ContactOption;
  contactId?: string;
  onContactChange?: (id: string) => void;
  onContactInfoChange?: (info: SelectedContactInfo | null) => void;
}) {
  // Auto-select this contact if not yet selected
  useEffect(() => {
    if (contactId !== contact.id) {
      onContactChange?.(contact.id);
      onContactInfoChange?.({
        id: contact.id,
        name: contact.name,
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        cargo: contact.cargo || undefined,
      });
    }
  }, [contact.id]); // only run when contact changes

  return (
    <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10 text-primary">
          <User className="h-3.5 w-3.5" />
        </div>
        <span className="truncate font-medium">{contact.name}</span>
        {contact.cargo && (
          <span className="text-xs text-muted-foreground hidden sm:inline">· {contact.cargo}</span>
        )}
      </div>
    </div>
  );
}

export function CompanyContactSelector({
  companyId,

  contactId,
  onCompanyChange,
  onContactChange,
  onCompanyInfoChange,
  onContactInfoChange,
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
        select: "id, razao_social, nome_fantasia, ramo_atividade, cnpj, logo_url",
        filters: { deleted_at: null },
        orderBy: { column: "razao_social", ascending: true },
        limit: 500,
      });
      return data.map((c) => ({
        id: c.id,
        name: getCompanyDisplayName(c),
        razao_social: c.razao_social,
        nome_fantasia: c.nome_fantasia,
        ramo_atividade: c.ramo_atividade || null,
        cnpj: c.cnpj,
        logo_url: c.logo_url || null,
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
        select: "id, first_name, last_name, full_name, cargo",
        filters: { company_id: companyId, deleted_at: null },
        orderBy: { column: "first_name", ascending: true },
        limit: 50,
      });

      // For each contact, try to get primary email/phone
      const enriched = await Promise.all(
        contactsData.map(async (ct) => {
          let email: string | null = null;
          let phone: string | null = null;

          try {
            const [emails, phones] = await Promise.all([
              selectCrm<CrmContactEmail>("contact_emails", {
                filters: { contact_id: ct.id },
                limit: 1,
              }),
              selectCrm<CrmContactPhone>("contact_phones", {
                filters: { contact_id: ct.id },
                limit: 1,
              }),
            ]);
            if (emails.length > 0) email = emails[0].email;
            if (phones.length > 0) phone = phones[0].numero;
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
      // Search both razao_social and nome_fantasia for better coverage
      const [byRazao, byNomeFantasia] = await Promise.all([
        searchCrm<CrmCompany>("companies", "razao_social", debouncedSearch, {
        select: "id, razao_social, nome_fantasia, ramo_atividade, cnpj, logo_url",
          limit: 50,
        }),
        searchCrm<CrmCompany>("companies", "nome_fantasia", debouncedSearch, {
          select: "id, razao_social, nome_fantasia, ramo_atividade, cnpj, logo_url",
          limit: 50,
        }),
      ]);
      // Merge and deduplicate
      const seen = new Set<string>();
      const merged: CompanyOption[] = [];
      for (const c of [...byRazao, ...byNomeFantasia]) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          merged.push({
            id: c.id,
            name: getCompanyDisplayName(c),
            razao_social: c.razao_social,
            nome_fantasia: c.nome_fantasia,
            ramo_atividade: c.ramo_atividade || null,
            cnpj: c.cnpj,
            logo_url: c.logo_url || null,
          });
        }
      }
      return merged;
    },
    enabled: !!debouncedSearch && debouncedSearch.length >= 2,
    staleTime: 2 * 60 * 1000,
  });

  // Fuse.js instance for local quick filtering
  const fuse = useMemo(() => {
    if (!companies) return null;
    return new Fuse(companies, {
      keys: ["name", "razao_social", "nome_fantasia", "cnpj", "ramo_atividade"],
      threshold: 0.4,
      distance: 100,
    });
  }, [companies]);

  // Merge server (priority) + local results, deduplicated
  const filteredCompanies = useMemo(() => {
    if (!searchTerm.trim()) return companies || [];

    // Server results take priority (they search all 51k+ records)
    const seen = new Set<string>();
    const merged: CompanyOption[] = [];

    // Add server results first
    if (serverResults) {
      for (const sr of serverResults) {
        if (!seen.has(sr.id)) {
          merged.push(sr);
          seen.add(sr.id);
        }
      }
    }

    // Fill with local fuse results (for instant feedback before server responds)
    if (fuse) {
      const localResults = fuse.search(searchTerm).map((r) => r.item);
      for (const lr of localResults) {
        if (!seen.has(lr.id)) {
          merged.push(lr);
          seen.add(lr.id);
        }
      }
    }

    return merged.slice(0, 100);
  }, [companies, searchTerm, fuse, serverResults]);

  // Fetch selected company by ID if not in local cache
  const { data: fetchedCompany } = useQuery<CompanyOption | null>({
    queryKey: ["quote-company-by-id", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const data = await selectCrm<CrmCompany>("companies", {
        select: "id, razao_social, nome_fantasia, ramo_atividade, cnpj, logo_url",
        filters: { id: companyId },
        limit: 1,
      });
      if (data.length === 0) return null;
      const c = data[0];
      return {
        id: c.id,
        name: getCompanyDisplayName(c),
        razao_social: c.razao_social,
        nome_fantasia: c.nome_fantasia,
        ramo_atividade: (c as any).ramo_atividade || null,
        cnpj: c.cnpj,
        logo_url: (c as any).logo_url || null,
      };
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000,
  });

  // Selected company - find from any source
  const selectedCompany = useMemo(() => {
    if (!companyId) return null;
    return companies?.find((c) => c.id === companyId) 
      || fetchedCompany
      || null;
  }, [companyId, companies, fetchedCompany]);

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
    onContactInfoChange?.(null);
    const found = filteredCompanies.find((c) => c.id === id) || companies?.find((c) => c.id === id);
    onCompanyInfoChange?.(found ? { id: found.id, name: found.name, cnpj: found.cnpj, ramo_atividade: (found as any).ramo_atividade || undefined } : null);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClearCompany = () => {
    onCompanyChange("");
    onContactChange?.("");
    onCompanyInfoChange?.(null);
    onContactInfoChange?.(null);
    setSearchTerm("");
  };

  return (
    <div className="space-y-6">
      {/* Company selector */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Empresa
        </Label>
        <div ref={wrapperRef} className="relative z-40">
          {/* Se há empresa selecionada, mostrar chip */}
          {selectedCompany && !isOpen ? (
            <div
              className="flex items-center gap-3 w-full rounded-md border border-border bg-background px-3 py-2 min-h-[44px] cursor-pointer group hover:border-primary/50 transition-colors"
              onClick={() => {
                handleClearCompany();
                setTimeout(() => setIsOpen(true), 50);
              }}
            >
              <CompanyAvatar name={selectedCompany.name} logoUrl={selectedCompany.logo_url} />
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-medium text-sm truncate">{selectedCompany.name}</span>
                <div className="flex items-center gap-2">
                  {selectedCompany.razao_social && selectedCompany.razao_social !== selectedCompany.name && (
                    <span className="text-xs text-muted-foreground truncate">{selectedCompany.razao_social}</span>
                  )}
                  {selectedCompany.cnpj && (
                    <>
                      {selectedCompany.razao_social && selectedCompany.razao_social !== selectedCompany.name && <span className="text-xs text-muted-foreground">·</span>}
                      <span className="text-xs text-muted-foreground font-mono">{selectedCompany.cnpj}</span>
                    </>
                  )}
                </div>
              </div>
              <X className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </div>
          ) : (
            <>
              {/* Campo de busca — z-50 + isolate para ficar acima do backdrop-blur */}
              <div className="relative z-50 isolate">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  autoFocus={isOpen}
                  placeholder="Buscar empresa por nome, CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsOpen(true)}
                  className="pl-9 h-11 bg-background"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setIsOpen(false);
                      setSearchTerm("");
                    }
                  }}
                />
                {(loadingCompanies || loadingSearch) && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                )}
              </div>

              {/* Backdrop overlay */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px]"
                    onClick={() => {
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Dropdown de resultados */}
              <AnimatePresence>
                {isOpen && (
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
                        {loadingCompanies
                          ? "Carregando..."
                          : searchTerm.trim().length >= 2
                            ? `${filteredCompanies.length} resultado${filteredCompanies.length !== 1 ? "s" : ""}`
                            : `${filteredCompanies.length} empresa${filteredCompanies.length !== 1 ? "s" : ""} disponíve${filteredCompanies.length !== 1 ? "is" : "l"}`
                        }
                      </span>
                      {loadingSearch && searchTerm.length >= 2 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          servidor...
                        </span>
                      )}
                    </div>

                    {/* Lista com scroll */}
                    <div className="relative">
                      <ScrollArea style={{ height: `${Math.min(Math.max((filteredCompanies.length + 1), 2) * 56, 280)}px` }}>
                        {/* "Sem empresa" option */}
                        <button
                          type="button"
                          className={cn(
                            "flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors duration-150",
                            "hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-none",
                            "border-b border-border/30",
                            !companyId && "bg-primary/5"
                          )}
                          onClick={() => handleSelectCompany("")}
                        >
                          <span className="text-sm text-muted-foreground">Sem empresa</span>
                        </button>

                        {filteredCompanies.length === 0 && !loadingCompanies ? (
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
                          <div className="py-0">
                            {filteredCompanies.map((company, index) => (
                              <button
                                key={company.id}
                                type="button"
                                className={cn(
                                  "flex items-center gap-3 w-full px-3 py-2.5 text-left transition-colors duration-150",
                                  "hover:bg-primary/10 focus-visible:bg-primary/10 focus-visible:outline-none",
                                  index < filteredCompanies.length - 1 && "border-b border-border/30",
                                  companyId === company.id && "bg-primary/5"
                                )}
                                onClick={() => handleSelectCompany(company.id)}
                              >
                                <CompanyAvatar name={company.name} logoUrl={company.logo_url} size="sm" />
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="text-sm font-medium truncate">{company.name}</span>
                                  <div className="flex items-center gap-1.5">
                                    {company.razao_social && company.razao_social !== company.name && (
                                      <span className="text-xs text-muted-foreground truncate">{company.razao_social}</span>
                                    )}
                                    {company.cnpj && (
                                      <>
                                        {company.razao_social && company.razao_social !== company.name && <span className="text-xs text-muted-foreground/50">·</span>}
                                        <span className="text-[11px] text-muted-foreground/70 font-mono truncate">{company.cnpj}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </ScrollArea>

                      {filteredCompanies.length > 4 && (
                        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-popover to-transparent pointer-events-none" />
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>

      {/* Contact selector - shown only when company is selected */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Contato
        </Label>

        {!companyId ? (
          <div className={cn(
            "flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
          )}>
            Selecione uma empresa primeiro
          </div>
        ) : loadingContacts ? (
          <div className={cn(
            "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
          )}>
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando...
          </div>
        ) : !contacts || contacts.length === 0 ? (
          <div className={cn(
            "flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
          )}>
            Nenhum contato cadastrado
          </div>
        ) : contacts.length === 1 ? (
          <SingleContactDisplay
            contact={contacts[0]}
            contactId={contactId}
            onContactChange={onContactChange}
            onContactInfoChange={onContactInfoChange}
          />
        ) : (
          <ContactDropdown
            contacts={contacts}
            contactId={contactId}
            onContactChange={onContactChange}
            onContactInfoChange={onContactInfoChange}
          />
        )}
      </div>
    </div>
  );
}
