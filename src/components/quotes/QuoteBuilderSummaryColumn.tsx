/**
 * QuoteBuilderSummaryColumn — Coluna 3: Resumo com cards de itens, desconto e CTAs
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Edit, Loader2, Package, Save, Send, ShoppingCart, Trash2, Percent, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
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
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="lg:col-span-4">
      <div className="sticky top-24">
        <div className="flex flex-col rounded-2xl border border-border/50 bg-card shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-3 shrink-0 border-b border-border/30">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                <ShoppingCart className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base">Resumo</h3>
                {items.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">{items.length} {items.length === 1 ? 'item' : 'itens'} • {totalQty} pç(s)</p>
                )}
              </div>
            </div>
          </div>

          {/* Product Cards */}
          <div className="flex-1 min-h-0 px-3 pt-3 overflow-y-auto max-h-[50vh]">
            <div className="space-y-2 pr-1">
              <AnimatePresence mode="popLayout">
                {items.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-xl border border-dashed border-muted-foreground/20 text-center"
                  >
                    <Package className="h-6 w-6 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground/60 font-medium">Nenhum item adicionado</p>
                  </motion.div>
                ) : items.map((item, idx) => {
                  const persTotal = calculateItemPersonalizationTotal(item);
                  const isActive = activeItemIndex === idx;
                  return (
                    <motion.div
                      key={item.product_id + '-' + idx}
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, x: -20 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                      className={cn(
                        "rounded-xl border transition-all cursor-pointer group",
                        isActive
                          ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20 shadow-sm shadow-primary/5"
                          : "border-border/40 bg-muted/20 hover:border-border/60 hover:bg-muted/40"
                      )}
                      onClick={() => setActiveItemIndex(idx)}
                    >
                      <div className="p-3 space-y-2">
                        <div className="flex items-start gap-2.5">
                          <div className="shrink-0">
                            {item.product_image_url ? (
                              <img src={item.product_image_url} alt={item.product_name} className="w-11 h-11 object-cover rounded-lg bg-muted ring-1 ring-border/10" />
                            ) : (
                              <div className="w-11 h-11 bg-muted rounded-lg flex items-center justify-center ring-1 ring-border/10">
                                <Package className="h-4 w-4 text-muted-foreground/40" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold leading-tight truncate">{item.product_name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-muted-foreground/50 font-mono">{item.product_sku}</span>
                              {item.color_name && (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full ring-1 ring-border/30" style={{ backgroundColor: item.color_hex || '#CCC' }} />
                                  <span className="text-[10px] text-muted-foreground/60">{item.color_name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); setActiveItemIndex(idx); }}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={(e) => {
                              e.stopPropagation(); removeItem(idx);
                              if (activeItemIndex === idx) setActiveItemIndex(null);
                              else if (activeItemIndex !== null && activeItemIndex > idx) setActiveItemIndex(activeItemIndex - 1);
                            }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground/60">{item.quantity}×</span>
                          <span className="font-medium text-muted-foreground">{formatCurrency(item.unit_price)}</span>
                          <span className="ml-auto font-bold text-foreground tabular-nums">{formatCurrency(item.quantity * item.unit_price)}</span>
                        </div>
                      </div>
                      {item.personalizations && item.personalizations.length > 0 && (
                        <div className="px-3 pb-2.5 pt-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Gravações ({item.personalizations.length})</span>
                            <span className="font-bold text-[11px] text-primary tabular-nums">+{formatCurrency(persTotal)}</span>
                          </div>
                          <div className="space-y-1">
                            {item.personalizations.map((p, pIdx) => (
                              <div key={pIdx} className="flex items-center justify-between gap-1 px-2 py-1 rounded-lg bg-muted/30 text-[11px]">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <span className="text-primary font-semibold truncate">{p.technique_name}</span>
                                  {p.width_cm && p.height_cm && (
                                    <span className="text-muted-foreground/50 text-[9px] shrink-0">{p.width_cm}×{p.height_cm}cm</span>
                                  )}
                                </div>
                                <span className="font-bold text-foreground tabular-nums shrink-0">{formatCurrency(p.total_cost || 0)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Discount */}
          {items.length > 0 && (
            <div className="px-4 pt-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg bg-muted/50 p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDiscountType("percent")}
                    className={cn(
                      "px-2 py-1 rounded-md text-xs font-medium transition-all",
                      discountType === "percent"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Percent className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("amount")}
                    className={cn(
                      "px-2 py-1 rounded-md text-xs font-medium transition-all",
                      discountType === "amount"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <DollarSign className="h-3 w-3" />
                  </button>
                </div>
                <Input
                  type="number" min={0}
                  step={discountType === "percent" ? 1 : 0.01}
                  max={discountType === "percent" ? 100 : undefined}
                  value={discountValue || ""}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  placeholder="Desconto"
                  className="h-8 text-sm"
                />
              </div>
              <AnimatePresence>
                {discountAmount > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex justify-between text-xs text-destructive">
                      <span>Desconto aplicado</span>
                      <span className="font-bold tabular-nums">-{formatCurrency(discountAmount)}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Footer */}
          <div className="shrink-0 pt-3 mt-3 border-t border-border/30 px-4 pb-4 space-y-3">
            {/* Total */}
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <span className="font-display font-bold text-base">Total</span>
                {items.length > 0 && (
                  <p className="text-[10px] text-muted-foreground/60 tabular-nums">
                    ≈{formatCurrency(totalQty > 0 ? total / totalQty : 0)}/un.
                  </p>
                )}
              </div>
              <motion.span
                key={total}
                initial={{ scale: 1.05, color: "hsl(var(--primary))" }}
                animate={{ scale: 1, color: "hsl(var(--primary))" }}
                className="font-display font-extrabold text-xl tabular-nums"
              >
                {formatCurrency(total)}
              </motion.span>
            </div>

            {/* Validation errors */}
            <AnimatePresence>
              {!isFormValid && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 space-y-1.5">
                    <p className="text-[11px] font-bold text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Campos obrigatórios pendentes:
                    </p>
                    <ul className="text-[11px] text-destructive/70 space-y-0.5 list-disc list-inside">
                      {validationErrors.includes("empresa") && <li>Empresa</li>}
                      {validationErrors.includes("contato") && <li>Contato</li>}
                      {validationErrors.includes("prazo_pagamento") && <li>Prazo de Pagamento</li>}
                      {validationErrors.includes("prazo_entrega") && <li>Prazo de Entrega</li>}
                      {validationErrors.includes("frete") && <li>Frete</li>}
                      {validationErrors.includes("valor_frete") && <li>Valor do Frete</li>}
                      {validationErrors.includes("itens") && <li>Itens do Orçamento</li>}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA Buttons */}
            <Button
              size="lg"
              className="w-full gap-2 h-12 text-sm font-bold bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              onClick={() => onSave("pending")}
              disabled={quotesLoading || !isFormValid}
            >
              {quotesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              {isEditMode ? "Salvar Orçamento" : "Criar Orçamento"}
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2 hover:bg-muted/50 transition-colors"
              onClick={() => onSave("draft")}
              disabled={quotesLoading || !isDraftValid}
            >
              {quotesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Rascunho
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
