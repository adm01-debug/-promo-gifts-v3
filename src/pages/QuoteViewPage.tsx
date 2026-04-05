import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Copy, CreditCard, Edit2, Eye, FileText, History, Loader2, Monitor, MoreHorizontal, Package, RefreshCw, Truck, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { formatPaymentTerms, formatDeliveryTime } from "@/components/pdf/ProposalHtmlTemplate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuotes, Quote } from "@/hooks/useQuotes";
import { selectCrmById } from "@/lib/crm-db";

import { generateProposalPDFv2, downloadPDF } from "@/utils/proposalPdfReactGenerator";
import { ProposalHtmlTemplate, ProposalTemplateData } from "@/components/pdf/ProposalHtmlTemplate";
import { useAuth } from "@/contexts/AuthContext";
import { QuoteHistoryPanel } from "@/components/quotes/QuoteHistoryPanel";
import { useQuoteApproval } from "@/hooks/useQuoteApproval";
import { toast } from "sonner";

import { QuoteStatusTimeline } from "@/components/quotes/QuoteStatusTimeline";
import { QuoteValidityBanner } from "@/components/quotes/QuoteValidityBanner";
import { QuoteConvertToOrder } from "@/components/quotes/QuoteConvertToOrder";

import { QuoteMobileActionBar } from "@/components/quotes/QuoteMobileActionBar";
import { QuoteCommentsSection } from "@/components/quotes/QuoteCommentsSection";
import { QuoteApprovalLinkCard } from "@/components/quotes/QuoteApprovalLinkCard";
import { QuoteVersionHistory } from "@/components/quotes/QuoteVersionHistory";
import { PresentationMode } from "@/components/presentation/PresentationMode";

import { QuoteClientInfo } from "@/components/quotes/QuoteClientInfo";
import { QuoteItemsTable } from "@/components/quotes/QuoteItemsTable";
import { QuoteTotalsSummary } from "@/components/quotes/QuoteTotalsSummary";

function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length === 14) {
    return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12,14)}`;
  }
  return cnpj;
}
import { PdfGenerationDialog } from "@/components/quotes/PdfGenerationDialog";
import { logger } from "@/lib/logger";

import { QUOTE_STATUS_CONFIG } from "@/lib/quote-status-config";

const statusConfig = Object.fromEntries(
  Object.entries(QUOTE_STATUS_CONFIG).map(([k, v]) => [k, { label: v.label, variant: v.badgeVariant }])
) as Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }>;

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcPersTotal(totalCost: number, qty: number): number {
  if (qty <= 0) return totalCost;
  const roundedUnit = Math.round((totalCost / qty) * 100) / 100;
  return Math.round(roundedUnit * qty * 100) / 100;
}

export default function QuoteViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchQuote, logQuoteHistory, duplicateQuote } = useQuotes();
  const { user, profile } = useAuth();
  
  const { generateApprovalLink, copyToClipboard, isGenerating } = useQuoteApproval();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(true);
  const [clientCnpj, setClientCnpj] = useState<string | undefined>(undefined);
  const [bitrixCompanyId, setBitrixCompanyId] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [approvalLink, setApprovalLink] = useState<string | null>(null);
  const [showPresentation, setShowPresentation] = useState(false);

  useEffect(() => {
    if (id) loadQuote();
  }, [id]);

  const loadQuote = async () => {
    if (!id) return;
    setIsLoadingQuote(true);
    const data = await fetchQuote(id);
    setQuote(data);
    setIsLoadingQuote(false);
    if (data?.client_id) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const company = await selectCrmById<any>("companies", data.client_id);
        if (company?.cnpj) setClientCnpj(formatCNPJ(company.cnpj));
        const bId = company?.bitrix_company_id ?? company?.bitrix_id;
        if (bId) setBitrixCompanyId(String(bId));
      } catch {
        // Company not found
      }
    }
  };

  const proposalData: ProposalTemplateData | null = useMemo(() => {
    if (!quote) return null;
    const prodSub = (quote.items || []).reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const persSub = (quote.items || []).reduce((s, i) =>
      s + (i.personalizations || []).reduce((ps: number, p: { total_cost?: number }) => ps + calcPersTotal(p.total_cost || 0, i.quantity), 0), 0
    );
    const fullSubtotal = prodSub + persSub;
    const discountValue = quote.discount_percent
      ? Math.round(fullSubtotal * (quote.discount_percent / 100) * 100) / 100
      : (quote.discount_amount || 0);
    const shipValue = (quote.shipping_type === "fob" || quote.shipping_type === "fob_pre") ? (quote.shipping_cost || 0) : 0;
    const computedTotal = fullSubtotal - discountValue + shipValue;

    return {
      quoteNumber: (quote.quote_number || "").replace(/\s+/g, ""),
      date: quote.created_at ? format(new Date(quote.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "",
      validUntil: quote.valid_until ? format(new Date(quote.valid_until), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "30 dias",
      client: {
        name: quote.client_company || quote.client_name || "Não especificado",
        phone: quote.client_phone || undefined,
        company: quote.client_company || undefined,
        contactName: quote.client_name || undefined,
        cnpj: clientCnpj,
      },
      seller: {
        name: profile?.full_name || user?.email || "Vendedor",
        email: user?.email || undefined,
        signatureUrl: profile?.signature_url || undefined,
      },
      items: quote.items?.map((item) => ({
        name: item.product_name,
        sku: item.product_sku || undefined,
        supplier_sku: item.product_sku || undefined,
        composedCode: item.product_sku
          ? item.color_name ? `${item.product_sku}-${item.color_name}` : item.product_sku
          : undefined,
        colorHex: item.color_hex || undefined,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        color: item.color_name || undefined,
        imageUrl: item.product_image_url || undefined,
        bitrix_product_id: item.bitrix_product_id ?? null,
        kit_group_id: item.kit_group_id || null,
        kit_name: item.kit_name || null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        personalizations: item.personalizations?.map((p: any) => ({
          technique_name: p.technique_name || "Personalizacao",
          colors_count: p.colors_count || 1,
          width_cm: p.width_cm || undefined,
          height_cm: p.height_cm || undefined,
          area_cm2: p.area_cm2 || undefined,
          unit_cost: p.unit_cost || 0,
          setup_cost: p.setup_cost || 0,
          total_cost: p.total_cost || 0,
          notes: p.notes || undefined,
        })) || [],
      })) || [],
      subtotal: fullSubtotal,
      discount: discountValue || undefined,
      shippingCost: quote.shipping_cost || undefined,
      shippingType: quote.shipping_type || undefined,
      total: computedTotal,
      notes: quote.notes || undefined,
      paymentTerms: quote.payment_terms || undefined,
      deliveryTime: quote.delivery_time || undefined,
    };
  }, [quote, user, profile, clientCnpj]);

  // ── Action Handlers ──
  const handleDownloadPDF = async () => {
    if (!proposalData) return;
    setIsGeneratingPDF(true);
    try {
      const blob = await generateProposalPDFv2(proposalData, { isDraft: quote?.status === "draft" });
      downloadPDF(blob, `proposta-${(quote?.quote_number || "sem-numero").replace(/\s+/g, "")}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch {
      toast.error("Erro ao gerar PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGenerateApprovalLink = async () => {
    if (!id) return;
    const link = await generateApprovalLink(id);
    if (link) setApprovalLink(link);
  };

  const handleWhatsAppShare = () => {
    const lines = [
      `📋 *Proposta Comercial ${quote?.quote_number || ""}*`,
      "",
      `💰 Valor Total: *${formatCurrency(quote?.total || 0)}*`,
    ];
    if (quote?.valid_until) {
      lines.push(`📅 Válida até: ${format(new Date(quote.valid_until), "dd/MM/yyyy", { locale: ptBR })}`);
    }
    if (approvalLink) {
      lines.push("", `✅ Aprovar proposta: ${approvalLink}`);
    }
    lines.push("", "Qualquer dúvida, estou à disposição! 😊");
    const message = encodeURIComponent(lines.join("\n"));
    const phone = quote?.client_phone?.replace(/\D/g, "") || "";
    const url = phone ? `https://wa.me/55${phone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, "_blank");
    toast.success("WhatsApp aberto!");
  };

  const handleShareLink = async () => {
    if (approvalLink) {
      await copyToClipboard(approvalLink);
    } else {
      const link = await generateApprovalLink(id!);
      if (link) {
        setApprovalLink(link);
        await copyToClipboard(link);
      }
    }
  };

  const handleSyncBitrix = async () => {
    if (!quote || !proposalData) return;

    let effectiveBitrixCompanyId = bitrixCompanyId;
    if (!effectiveBitrixCompanyId && quote.client_id) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const company = await selectCrmById<any>("companies", quote.client_id);
        const bId = company?.bitrix_company_id ?? company?.bitrix_id;
        if (bId) {
          effectiveBitrixCompanyId = String(bId);
          setBitrixCompanyId(String(bId));
        }
      } catch { /* ignore */ }
    }

    if (!effectiveBitrixCompanyId) {
      toast.error("Empresa sem ID Bitrix24", {
        description: "Esta empresa não possui um vínculo com o Bitrix24.",
      });
      return;
    }

    const itemsSemBitrixId = quote.items?.filter(item => !item.bitrix_product_id) || [];
    const itensSincronizaveis = quote.items?.filter(item => !!item.bitrix_product_id) || [];

    if (itensSincronizaveis.length === 0) {
      toast.error("Nenhum produto com ID Bitrix24");
      return;
    }

    if (itemsSemBitrixId.length > 0) {
      const nomes = itemsSemBitrixId.map(i => `${i.product_name}${i.color_name ? ` - ${i.color_name}` : ''}`).join(", ");
      toast.warning(`${itemsSemBitrixId.length} produto(s) excluído(s) da sincronização`, {
        description: `Sem ID Bitrix24: ${nomes}`,
        duration: 7000,
      });
    }

    setIsSyncing(true);
    logQuoteHistory(quote.id, "sync_started", "Sincronização com Bitrix24 iniciada").catch(() => {});

    try {
      let pdfStorageUrl: string | undefined;
      let filename: string | undefined;
      try {
        const blob = await generateProposalPDFv2(proposalData, { isDraft: quote.status === "draft" });
        filename = `proposta-${(quote.quote_number || quote.id).replace(/\s+/g, "")}.pdf`;
        const storagePath = `quotes/${quote.id}/${filename}`;
        const { error: uploadError } = await supabase.storage
          .from("art-files")
          .upload(storagePath, blob, { contentType: "application/pdf", upsert: true });

        if (uploadError) {
          logger.warn("PDF upload failed:", uploadError);
        } else {
          const { data: urlData } = supabase.storage.from("art-files").getPublicUrl(storagePath);
          pdfStorageUrl = urlData.publicUrl;
        }
      } catch (pdfErr) {
        logger.warn("PDF generation failed:", pdfErr);
      }

      const { data, error } = await supabase.functions.invoke("sync-quote-bitrix", {
        body: {
          quote, proposalData, pdfUrl: pdfStorageUrl, filename,
          bitrixCompanyId: effectiveBitrixCompanyId, sellerEmail: user?.email,
          shippingType: quote.shipping_type, shippingCost: quote.shipping_cost,
        },
      });

      if (error || !data?.success) throw new Error(data?.error || error?.message || "Erro desconhecido");

      const result = data.result;
      const parsedBitrixId = result?.quote_id ? Number(result.quote_id) : null;
      const bitrixQuoteIdFromResponse = parsedBitrixId && !isNaN(parsedBitrixId) ? parsedBitrixId : null;

      const crmUpdates: Record<string, unknown> = { status: "sent" };
      if (bitrixQuoteIdFromResponse) crmUpdates.bitrix_quote_id = bitrixQuoteIdFromResponse;

      try {
        await supabase.from("quotes").update(crmUpdates).eq("id", quote.id);
      } catch { /* ignore */ }

      await logQuoteHistory(quote.id, "sync_success",
        `Sincronizado com Bitrix24${bitrixQuoteIdFromResponse ? ` — ID Bitrix: ${bitrixQuoteIdFromResponse}` : ""}`,
        { newValue: bitrixQuoteIdFromResponse ? String(bitrixQuoteIdFromResponse) : undefined }
      );

      setQuote((prev) => prev ? { ...prev, status: "sent", ...(bitrixQuoteIdFromResponse ? { bitrix_quote_id: bitrixQuoteIdFromResponse } : {}) } : prev);
      toast.success(result?.message || "Orçamento sincronizado com Bitrix24!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "erro desconhecido";
      await logQuoteHistory(quote.id, "sync_error", `Falha: ${msg}`);
      toast.error("Erro ao sincronizar", { description: msg });
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Render ──
  if (isLoadingQuote) {
    return (
      <MainLayout>
        <div className="container py-6 space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!quote) {
    return (
      <MainLayout>
        <div className="container py-6">
          <div className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="font-display text-xl font-semibold">Orçamento não encontrado</h2>
            <p className="text-muted-foreground mt-2">O orçamento solicitado não existe ou foi removido.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/orcamentos")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Orçamentos
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const status = statusConfig[quote.status] || statusConfig.draft;

  return (
    <>
    <MainLayout>
      <PageSEO title={`Orçamento ${quote.quote_number}`} description={`Visualização do orçamento ${quote.quote_number}`} path={`/orcamentos/${id}`} noIndex />
      <div className="container py-6 space-y-6 pb-24 md:pb-6 print:py-0 print:max-w-none print:px-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => navigate("/orcamentos")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display text-2xl font-bold">Orçamento {quote.quote_number}</h1>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <p className="text-muted-foreground">
                Criado em {quote.created_at ? format(new Date(quote.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "-"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <QuoteConvertToOrder quoteId={id!} status={quote.status} onConverted={() => { if (id) fetchQuote(id).then(setQuote); }} />
              <Button onClick={handleSyncBitrix} disabled={isSyncing} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {isSyncing ? "Sincronizando..." : "Sincronizar"}
              </Button>
            </div>

            <PdfGenerationDialog
              proposalData={proposalData}
              quoteNumber={quote.quote_number}
              quoteStatus={quote.status}
              clientPhone={quote.client_phone}
              approvalLink={approvalLink}
              onWhatsApp={handleWhatsAppShare}
              onShareLink={handleShareLink}
              trigger={<Button className="gap-2"><Eye className="h-4 w-4" /> Preview Proposta</Button>}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Mais opções"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(quote.status === "sent" || isSyncing) && (
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        await supabase.from("quotes").update({ status: "pending" } as Record<string, unknown>).eq("id", quote.id);
                        await logQuoteHistory(quote.id, "status_change", "Status revertido para Pendente", { oldValue: "sent", newValue: "pending" });
                        setQuote((prev) => prev ? { ...prev, status: "pending" } : prev);
                        toast.success("Sincronização cancelada");
                      } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : "Erro";
                        toast.error("Erro ao cancelar", { description: msg });
                      }
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Undo2 className="h-4 w-4 mr-2" /> Cancelar Sincronização
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate(`/orcamentos/${id}/editar`)}>
                  <Edit2 className="h-4 w-4 mr-2" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  const newQuote = await duplicateQuote(id!);
                  if (newQuote?.id) navigate(`/orcamentos/${newQuote.id}`);
                }}>
                  <Copy className="h-4 w-4 mr-2" /> Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowPresentation(true)}>
                  <Monitor className="h-4 w-4 mr-2" /> Modo Apresentação
                </DropdownMenuItem>
                <Sheet>
                  <SheetTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <History className="h-4 w-4 mr-2" /> Histórico
                    </DropdownMenuItem>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader><SheetTitle>Histórico de Alterações</SheetTitle></SheetHeader>
                    <div className="mt-6"><QuoteHistoryPanel quoteId={id!} /></div>
                  </SheetContent>
                </Sheet>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status Timeline + Validity Banner */}
        <div className="flex flex-col md:flex-row gap-4 items-start print:hidden">
          <div className="flex-1 bg-card border rounded-lg p-4">
            <QuoteStatusTimeline status={quote.status} createdAt={quote.created_at} updatedAt={quote.updated_at} clientResponseAt={quote.client_response_at} isSyncing={isSyncing} />
          </div>
          <QuoteValidityBanner validUntil={quote.valid_until} status={quote.status} />
        </div>

        {/* Quote Content */}
        <Card className="print:hidden">
          <Separator />
          <CardContent className="pt-6 space-y-6">
            <QuoteClientInfo
              clientCompany={quote.client_company}
              clientName={quote.client_name}
              clientEmail={quote.client_email}
              clientPhone={quote.client_phone}
              clientCnpj={clientCnpj}
            />

            <Separator />

            <QuoteItemsTable items={quote.items || []} />

            <QuoteTotalsSummary
              items={quote.items || []}
              discountPercent={quote.discount_percent}
              discountAmount={quote.discount_amount}
              shippingType={quote.shipping_type}
              shippingCost={quote.shipping_cost}
            />

            {/* Condições Comerciais */}
            {(quote.payment_terms || quote.delivery_time) && (
              <>
                <Separator />
                <div>
                  <h3 className="font-display font-semibold mb-4">Condições Comerciais</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {quote.payment_terms && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                        <CreditCard className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pagamento</p>
                          <p className="text-sm font-medium mt-0.5">{formatPaymentTerms(quote.payment_terms) || quote.payment_terms}</p>
                        </div>
                      </div>
                    )}
                    {quote.delivery_time && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                        <Package className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prazo de Entrega</p>
                          <p className="text-sm font-medium mt-0.5">{formatDeliveryTime(quote.delivery_time) || quote.delivery_time}</p>
                        </div>
                      </div>
                    )}
                    {quote.shipping_method && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                        <Truck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Frete</p>
                          <p className="text-sm font-medium mt-0.5">{quote.shipping_method}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {quote.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="font-display font-semibold mb-2">Observações</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{quote.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {id && <QuoteVersionHistory quoteId={id} currentQuoteId={id} />}
        {id && quote && <QuoteApprovalLinkCard quoteId={id} clientName={quote.client_name} clientEmail={quote.client_email} />}
        {id && <QuoteCommentsSection quoteId={id} />}

        {proposalData && (
          <div className="hidden print:block print:p-0">
            <ProposalHtmlTemplate data={proposalData} />
          </div>
        )}
      </div>

      <QuoteMobileActionBar
        onDownloadPDF={handleDownloadPDF}
        onWhatsApp={handleWhatsAppShare}
        onSync={handleSyncBitrix}
        isSyncing={isSyncing}
        onShare={handleShareLink}
        isGeneratingPDF={isGeneratingPDF}
      />
    </MainLayout>

    {showPresentation && quote?.items && quote.items.length > 0 && (
      <PresentationMode
        title={`Proposta ${quote.quote_number || ""}`}
        subtitle={quote.client_company || quote.client_name || undefined}
        brandName="Promo Brindes"
        onClose={() => setShowPresentation(false)}
        slides={quote.items.map((item) => ({
          id: item.id || item.product_id,
          title: item.product_name,
          subtitle: item.product_sku ? `SKU: ${item.product_sku}` : undefined,
          imageUrl: item.product_image_url || null,
          badge: item.kit_name || (item.color_name || null),
          details: [
            ...(item.quantity ? [{ label: "Quantidade", value: String(item.quantity) }] : []),
            ...(item.color_name ? [{ label: "Cor", value: item.color_name }] : []),
            ...(item.personalizations?.length ? [{ label: "Personalização", value: item.personalizations.map(p => p.technique_name).filter(Boolean).join(", ") || "Sim" }] : []),
          ],
        }))}
      />
    )}
    </>
  );
}
