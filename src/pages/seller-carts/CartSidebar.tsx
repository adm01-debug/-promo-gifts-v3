/**
 * CartSidebar — Summary panel reorganized in 3 zones:
 * 1) Hero Pricing (subtotal grande + peso/volume)
 * 2) Ação primária (Gerar Orçamento)
 * 3) Mais ações (DropdownMenu) + Health Checklist + Outros carrinhos
 */
import { useState } from "react";
import { type SellerCart } from "@/hooks/useSellerCarts";
import { type CartTemplateItem } from "@/hooks/useCartTemplates";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  formatCurrency, getStatusCfg, SmartSuggestions, ActionHistoryPanel,
} from "@/components/cart/CartUtilComponents";
import { CartHealthChecklist } from "@/components/cart/CartHealthChecklist";
import { CartActionsMenu } from "@/components/cart/CartActionsMenu";
import { cn } from "@/lib/utils";
import {
  ArrowRight, Weight, Box, Building2, Sparkles, Trash2, Package,
} from "lucide-react";
import { motion } from "framer-motion";
import type { UseMutationResult } from "@tanstack/react-query";
import { AvatarLogo } from "@/components/shared/AvatarLogo";

interface CartSidebarProps {
// ... keep existing code
            className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-border/30 hover:border-border/60 hover:bg-muted/20 transition-all text-left"
          >
            <AvatarLogo name={c.company_name} logoUrl={c.company_logo_url} size="md" />
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{c.company_name}</p>
                <p className="text-[10px] text-muted-foreground">{c.items.length} itens</p>
              </div>
              <Badge variant="outline" className={cn("text-[9px] px-1.5", getStatusCfg(c.status).color)}>
                {getStatusCfg(c.status).label}
              </Badge>
            </button>
          ))}
        </Card>
      )}

      {/* Save Template (controlled) */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar Template de Carrinho</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder='Ex: "Kit Onboarding"' value={tplName} onChange={(e) => setTplName(e.target.value)} />
            <Textarea placeholder="Descrição opcional..." value={tplDesc} onChange={(e) => setTplDesc(e.target.value)} rows={2} />
            <p className="text-xs text-muted-foreground">{cart.items.length} itens serão salvos no template</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancelar</Button>
            <Button
              disabled={!tplName.trim()}
              onClick={() => {
                onSaveTemplate(tplName.trim(), tplDesc.trim());
                setSaveOpen(false); setTplName(""); setTplDesc("");
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Template (controlled) */}
      <Dialog open={loadOpen} onOpenChange={setLoadOpen}>
        <DialogContent className="max-w-md max-h-[70vh]">
          <DialogHeader>
            <DialogTitle>Templates Salvos</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            {templates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum template salvo ainda.</p>
            ) : (
              <div className="space-y-2">
                {templates.map(t => (
                  <Card key={t.id} className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{t.name}</p>
                        {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">{t.items.length} itens</p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { onLoadTemplate(t.items); setLoadOpen(false); }}>
                          Aplicar
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => onDeleteTemplate.mutate(t.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
