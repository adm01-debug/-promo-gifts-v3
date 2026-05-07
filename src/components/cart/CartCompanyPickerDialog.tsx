/**
 * CartCompanyPickerDialog - Modal de seleção de empresa com Recentes/Favoritas/Buscar.
 * Substitui o picker inline que empurrava conteúdo. Usa localStorage para persistência leve.
 */
import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Fuse from "fuse.js";
import { Building2, Search, Loader2, Star, Clock, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { selectCrm, searchCrm } from "@/lib/crm-db";
import { getCompanyDisplayName, type CrmCompany } from "@/types/crm";
import { useSellerCartContext, type CreateCartInput } from "@/contexts/SellerCartContext";
import { AvatarLogo } from "@/components/shared/AvatarLogo";

interface CompanyItem {
// ... keep existing code
  const renderRow = (company: CompanyItem) => (
    <button
      key={company.id}
      type="button"
      data-testid="cart-company-picker-select"
      data-company-id={company.id}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left",
        "hover:bg-accent/60 transition-colors group"
      )}
      onClick={() => handleSelect(company)}
      disabled={!canCreateCart}
    >
      <AvatarLogo name={company.name} logoUrl={company.logo_url} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{company.name}</p>
        {company.ramo && <p className="text-[11px] text-muted-foreground truncate">{company.ramo}</p>}
      </div>
      <button
        type="button"
        onClick={(e) => toggleFavorite(company, e)}
        className={cn(
          "h-7 w-7 rounded-md flex items-center justify-center transition-colors flex-shrink-0",
          isFavorite(company.id)
            ? "text-warning"
            : "text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-warning"
        )}
        aria-label={isFavorite(company.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      >
        <Star className={cn("h-4 w-4", isFavorite(company.id) && "fill-current")} />
      </button>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="font-display text-lg">Vincular a uma empresa</DialogTitle>
          <DialogDescription className="text-xs">Escolha uma empresa para criar o carrinho.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
          <div className="px-5">
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="recent" className="text-xs gap-1.5"><Clock className="h-3.5 w-3.5" />Recentes</TabsTrigger>
              <TabsTrigger value="favorites" className="text-xs gap-1.5"><Star className="h-3.5 w-3.5" />Favoritas</TabsTrigger>
              <TabsTrigger value="search" className="text-xs gap-1.5"><Globe className="h-3.5 w-3.5" />Todas</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="recent" className="m-0 px-3 pt-3 pb-4">
            <ScrollArea className="h-[340px] pr-2">
              {isLoading ? (
                <div className="space-y-1 py-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
                      <Skeleton className="w-9 h-9 rounded-lg opacity-20" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-3/4 opacity-15" />
                        <Skeleton className="h-2 w-1/2 opacity-10" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recents.length > 0 ? (
                <div className="space-y-0.5">{recents.map(renderRow)}</div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-12">Sem empresas recentes ainda.</p>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="favorites" className="m-0 px-3 pt-3 pb-4">
            <ScrollArea className="h-[340px] pr-2">
              {isLoading ? (
                <div className="space-y-1 py-1">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
                      <Skeleton className="w-9 h-9 rounded-lg opacity-20" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-3/4 opacity-15" />
                        <Skeleton className="h-2 w-1/2 opacity-10" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : favorites.length > 0 ? (
                <div className="space-y-0.5">{favorites.map(renderRow)}</div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-12">Marque empresas como favoritas usando a estrela.</p>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="search" className="m-0 px-3 pt-3 pb-4 space-y-3">
            <div className="relative px-2">
              <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome, CNPJ ou segmento..."
                className="h-9 pl-8 text-sm bg-muted/20 border-border/40 focus:bg-background transition-colors"
              />
              {isLoading && <Loader2 className="absolute right-4.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground opacity-50" />}
            </div>
            <ScrollArea className="h-[290px] pr-2">
              {isLoading && filteredCompanies.length === 0 ? (
                <div className="space-y-1 px-1">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
                      <Skeleton className="w-9 h-9 rounded-lg opacity-20" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-3/4 opacity-15" />
                        <Skeleton className="h-2 w-1/2 opacity-10" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredCompanies.length > 0 ? (
                <div className="space-y-0.5">{filteredCompanies.map(renderRow)}</div>
              ) : !isLoading ? (
                <p className="text-xs text-muted-foreground text-center py-12">Nenhuma empresa encontrada.</p>
              ) : null}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border/40">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
