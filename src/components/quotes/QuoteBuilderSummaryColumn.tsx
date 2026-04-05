/**
 * QuoteBuilderSummaryColumn — Coluna 3: Resumo com cards de itens, desconto e CTAs
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Edit, Loader2, Package, Save, Send, ShoppingCart, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuoteItem } from "@/hooks/useQuotes";

interface Props {
  items: QuoteItem[];
  activeItemIndex: number | null;
  setActiveItemIndex: (i: number | null) => void;
  removeItem: (i: number) => void;
  discountType: "percent" | "amount";
  setDiscountType: (v: "percent" | "amount") => void;
  discountValue: number;
  setDiscountValue: (v: number) => void;
  discountAmount: number;
  total: number;
  isFormValid: boolean;
  isDraftValid: boolean;
  validationErrors: string[];
  quotesLoading: boolean;
  isEditMode: boolean;
  formatCurrency: (v: number) => string;
  calculateItemPersonalizationTotal: (item: QuoteItem) => number;
  calculateItemTotal: (item: QuoteItem) => number;
  onSave: (status: "draft" | "pending") => void;
}

export function QuoteBuilderSummaryColumn({
  items, activeItemIndex, setActiveItemIndex, removeItem,
  discountType, setDiscountType, discountValue, setDiscountValue,
  discountAmount, total, isFormValid, isDraftValid, validationErrors,
  quotesLoading, isEditMode, formatCurrency,
  calculateItemPersonalizationTotal, calculateItemTotal, onSave,
}: Props) {
  return (
    <div className="lg:col-span-4">
      <div className="sticky top-24">
        <div className="flex flex-col rounded-2xl border border-border/50 bg-card shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 p-4 pb-3 shrink-0">
            <div className="p-2 rounded-lg bg-primary/10">
              <ShoppingCart className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-base">Resumo</h3>
          </div>

          {/* Product Cards */}
          <div className="flex-1 min-h-0 px-4 overflow-y-auto max-h-[50vh]">
            <div className="space-y-3 pr-1">
              {items.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed border-muted-foreground/30 text-center">
                  <Package className="h-5 w-5 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">Nenhum item adicionado</p>
                </div>
              ) : items.map((item, idx) => {
                const persTotal = calculateItemPersonalizationTotal(item);
                const isActive = activeItemIndex === idx;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-xl border transition-all cursor-pointer",
                      isActive ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : "border-border/60 bg-muted/30 hover:border-border"
                    )}
                    onClick={() => setActiveItemIndex(idx)}
                  >
                    <div className="p-3 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0">
                          {item.product_image_url ? (
                            <img src={item.product_image_url} alt={item.product_name} className="w-12 h-12 object-cover rounded-lg bg-muted"  loading="lazy" />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight truncate">{item.product_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono">{item.product_sku}</Badge>
                            {item.color_name && (
                              <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 rounded-full border border-border/50" style={{ backgroundColor: item.color_hex || '#CCC' }} />
                                <span className="text-[10px] text-muted-foreground">{item.color_name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className={cn("h-6 w-6", isActive ? "text-primary" : "text-muted-foreground")} onClick={(e) => { e.stopPropagation(); setActiveItemIndex(idx); }}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={(e) => {
                            e.stopPropagation(); removeItem(idx);
                            if (activeItemIndex === idx) setActiveItemIndex(null);
                            else if (activeItemIndex !== null && activeItemIndex > idx) setActiveItemIndex(activeItemIndex - 1);
                          }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Qtd:</span>
                        <span className="font-medium">{item.quantity}</span>
                        <span className="text-muted-foreground">×</span>
                        <span className="font-medium">{formatCurrency(item.unit_price)}</span>
                        <span className="ml-auto font-semibold text-foreground tabular-nums">{formatCurrency(item.quantity * item.unit_price)}</span>
                      </div>
                    </div>
                    {item.personalizations && item.personalizations.length > 0 && (
                      <div className="px-3 pb-3 pt-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Gravações ({item.personalizations.length})</span>
                          <span className="font-semibold text-xs text-primary tabular-nums">{formatCurrency(persTotal)}</span>
                        </div>
                        <div className="space-y-1">
                          {item.personalizations.map((p, pIdx) => (
                            <div key={pIdx} className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg border border-border/40 bg-card text-xs">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 shrink-0 font-bold">{pIdx + 1}</Badge>
                                <div className="min-w-0">
                                  <span className="text-primary font-medium truncate text-[11px] block">{p.technique_name}</span>
                                  <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                                    {p.width_cm && p.height_cm && <span>{p.width_cm}×{p.height_cm}cm</span>}
                                    {p.personalized_quantity && <span>• {p.personalized_quantity} pç(s)</span>}
                                  </div>
                                </div>
                              </div>
                              <span className="font-bold text-foreground tabular-nums shrink-0">{formatCurrency(p.total_cost || 0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Discount */}
          {items.length > 0 && (
            <div className="px-4 pt-3 space-y-2">
              <div className="flex items-center gap-2">
                <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percent" | "amount")}>
                  <SelectTrigger className="w-16 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">%</SelectItem>
                    <SelectItem value="amount">R$</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" min={0} step={discountType === "percent" ? 1 : 0.01} max={discountType === "percent" ? 100 : undefined} value={discountValue || ""} onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)} placeholder="Desconto" className="h-8 text-sm" />
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-destructive">
                  <span>Desconto aplicado</span>
                  <span className="font-semibold tabular-nums">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="shrink-0 pt-3 mt-3 border-t border-border/50 px-4 pb-4 space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <span className="font-bold text-base">Total</span>
                {items.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    ≈{formatCurrency(items.reduce((s, i) => s + i.quantity, 0) > 0 ? total / items.reduce((s, i) => s + i.quantity, 0) : 0)}/un.
                  </p>
                )}
              </div>
              <span className="font-bold text-xl text-primary tabular-nums">{formatCurrency(total)}</span>
            </div>

            {!isFormValid && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 space-y-1">
                <p className="text-xs font-semibold text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Campos obrigatórios pendentes:
                </p>
                <ul className="text-xs text-destructive/80 space-y-0.5 list-disc list-inside">
                  {validationErrors.includes("empresa") && <li>Empresa</li>}
                  {validationErrors.includes("contato") && <li>Contato</li>}
                  {validationErrors.includes("prazo_pagamento") && <li>Prazo de Pagamento</li>}
                  {validationErrors.includes("prazo_entrega") && <li>Prazo de Entrega</li>}
                  {validationErrors.includes("frete") && <li>Frete</li>}
                  {validationErrors.includes("valor_frete") && <li>Valor do Frete</li>}
                  {validationErrors.includes("itens") && <li>Itens do Orçamento</li>}
                </ul>
              </div>
            )}

            <Button size="lg" className="w-full gap-2 h-12 text-sm font-bold bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20" onClick={() => onSave("pending")} disabled={quotesLoading || !isFormValid}>
              {quotesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              {isEditMode ? "Salvar" : "Criar"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => onSave("draft")} disabled={quotesLoading || !isDraftValid}>
              {quotesLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {isEditMode ? "Salvar Alterações" : "Salvar Rascunho"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
