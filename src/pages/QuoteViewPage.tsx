import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Building2, Copy, CreditCard, Download, Edit2, Eye, FileText, History, Link2, Loader2, MapPin, MoreHorizontal, Package, Phone, Mail, Printer, RefreshCw, Truck, Undo2, User, UserPlus } from "lucide-react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuotes, Quote } from "@/hooks/useQuotes";
import { selectCrmById } from "@/lib/crm-db";

import { generateProposalPDFv2, downloadPDF } from "@/utils/proposalPdfReactGenerator";
import { ProposalHtmlTemplate, ProposalTemplateData } from "@/components/pdf/ProposalHtmlTemplate";
import { useAuth } from "@/contexts/AuthContext";
import { QuoteHistoryPanel } from "@/components/quotes/QuoteHistoryPanel";
import { QuoteQRCode } from "@/components/quotes/QuoteQRCode";
import { useQuoteApproval } from "@/hooks/useQuoteApproval";
import { toast } from "sonner";

import { QuoteStatusTimeline } from "@/components/quotes/QuoteStatusTimeline";
import { QuoteValidityBanner } from "@/components/quotes/QuoteValidityBanner";
import { QuoteConvertToOrder } from "@/components/quotes/QuoteConvertToOrder";

import { QuoteMobileActionBar } from "@/components/quotes/QuoteMobileActionBar";
import { QuoteItemDetailSheet } from "@/components/quotes/QuoteItemDetailSheet";
import { QuoteCommentsSection } from "@/components/quotes/QuoteCommentsSection";
import { QuoteApprovalLinkCard } from "@/components/quotes/QuoteApprovalLinkCard";

function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  if (digits.length === 14) {
    return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12,14)}`;
  }
  return cnpj; // return as-is if not 14 digits
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

/** Recalculate personalization total using rounded unit price to match UI display */
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
  // bitrix_company_id = numeric Bitrix ID from companies.bitrix_id (string in DB)
  const [bitrixCompanyId, setBitrixCompanyId] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [approvalLink, setApprovalLink] = useState<string | null>(null);
  const whatsAppRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (id) {
      loadQuote();
    }
  }, [id]);

  const loadQuote = async () => {
    if (!id) return;
    setIsLoadingQuote(true);
    const data = await fetchQuote(id);
    setQuote(data);
    setIsLoadingQuote(false);
    // Fetch company data from CRM (CNPJ + bitrix_id for Bitrix sync)
    if (data?.client_id) {
      try {
        const company = await selectCrmById<any>("companies", data.client_id);
        if (company?.cnpj) setClientCnpj(formatCNPJ(company.cnpj));
        // Campo correto no CRM externo é bitrix_company_id (número inteiro)
        const bId = company?.bitrix_company_id ?? company?.bitrix_id;
        if (bId) setBitrixCompanyId(String(bId));
      } catch {
        // Company not found, keep undefined
      }
    }
  };

  const proposalData: ProposalTemplateData | null = useMemo(() => {
    if (!quote) return null;

    // Recalculate totals client-side to ensure discount covers products + personalization
    const prodSub = (quote.items || []).reduce((s, i) => s + i.quantity * i.unit_price, 0);
    const persSub = (quote.items || []).reduce((s, i) =>
      s + (i.personalizations || []).reduce((ps, p) => ps + calcPersTotal(p.total_cost || 0, i.quantity), 0), 0
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
          ? item.color_name
            ? `${item.product_sku}-${item.color_name}`
            : item.product_sku
          : undefined,
        colorHex: item.color_hex || undefined,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        color: item.color_name || undefined,
        imageUrl: item.product_image_url || undefined,
        bitrix_product_id: item.bitrix_product_id ?? null,
        kit_group_id: item.kit_group_id || null,
        kit_name: item.kit_name || null,
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

  const handleDownloadPDF = async () => {
    if (!proposalData) return;
    setIsGeneratingPDF(true);
    try {
      const blob = await generateProposalPDFv2(proposalData, { isDraft: quote?.status === "draft" });
      downloadPDF(blob, `proposta-${(quote?.quote_number || "sem-numero").replace(/\s+/g, "")}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleGenerateApprovalLink = async () => {
    if (!id) return;
    const link = await generateApprovalLink(id);
    if (link) {
      setApprovalLink(link);
    }
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

    // Tenta buscar bitrix_id novamente caso não tenha carregado
    let effectiveBitrixCompanyId = bitrixCompanyId;
    if (!effectiveBitrixCompanyId && quote.client_id) {
      try {
        const company = await selectCrmById<any>("companies", quote.client_id);
        const bId = company?.bitrix_company_id ?? company?.bitrix_id;
        if (bId) {
          effectiveBitrixCompanyId = String(bId);
          setBitrixCompanyId(String(bId));
        }
      } catch {
        // ignore
      }
    }

    if (!effectiveBitrixCompanyId) {
      toast.error("Empresa sem ID Bitrix24", {
        description: "Esta empresa não possui um vínculo com o Bitrix24. Verifique se a empresa foi sincronizada no CRM antes de enviar o orçamento.",
      });
      return;
    }

    // ── Spec §3: produtos sem bitrix_product_id são excluídos do payload ───────
    const itemsSemBitrixId = quote.items?.filter(item => !item.bitrix_product_id) || [];
    const itensSincronizaveis = quote.items?.filter(item => !!item.bitrix_product_id) || [];

    if (itensSincronizaveis.length === 0) {
      toast.error("Nenhum produto com ID Bitrix24", {
        description: "Nenhum produto desta proposta possui ID no Bitrix24. Aguarde a importação do catálogo.",
        duration: 8000,
      });
      return;
    }

    if (itemsSemBitrixId.length > 0) {
      const nomes = itemsSemBitrixId.map(i => `${i.product_name}${i.color_name ? ` - ${i.color_name}` : ''}`).join(", ");
      toast.warning(`${itemsSemBitrixId.length} produto(s) excluído(s) da sincronização`, {
        description: `Sem ID Bitrix24: ${nomes}. Os demais serão sincronizados normalmente.`,
        duration: 7000,
      });
    }

    setIsSyncing(true);

    // ── Log: início da sincronização (fire-and-forget — não bloqueia) ───────
    logQuoteHistory(quote.id, "sync_started", "Sincronização com Bitrix24 iniciada").catch(() => {});

    try {
      // ── 1. Generate PDF blob client-side ────────────────────────────────────
      let pdfStorageUrl: string | undefined;
      let filename: string | undefined;
      try {
        const blob = await generateProposalPDFv2(proposalData, { isDraft: quote.status === "draft" });
        filename = `proposta-${(quote.quote_number || quote.id).replace(/\s+/g, "")}.pdf`;

        // ── 2. Upload PDF to Storage (avoids sending base64 through edge function) ──
        const storagePath = `quotes/${quote.id}/${filename}`;
        const { error: uploadError } = await supabase.storage
          .from("art-files")
          .upload(storagePath, blob, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadError) {
          logger.warn("PDF upload failed, syncing without PDF:", uploadError);
          logQuoteHistory(quote.id, "sync_pdf_error", `Falha no upload do PDF: ${uploadError.message}`).catch(() => {});
        } else {
          const { data: urlData } = supabase.storage
            .from("art-files")
            .getPublicUrl(storagePath);
          pdfStorageUrl = urlData.publicUrl;
          logQuoteHistory(quote.id, "sync_pdf_ok", `PDF gerado e enviado: ${filename}`, {
            newValue: pdfStorageUrl,
          }).catch(() => {});
        }
      } catch (pdfErr: any) {
        logger.warn("PDF generation failed, syncing without PDF:", pdfErr);
        logQuoteHistory(quote.id, "sync_pdf_error", `Erro ao gerar PDF: ${pdfErr?.message || "desconhecido"}`).catch(() => {});
      }

      // ── 3. Invoke edge function with URL only (no base64 in body) ───────────
      const { data, error } = await supabase.functions.invoke("sync-quote-bitrix", {
        body: {
          quote,
          proposalData,
          pdfUrl: pdfStorageUrl,   // URL instead of base64
          filename,
          bitrixCompanyId: effectiveBitrixCompanyId,
          sellerEmail: user?.email,
          shippingType: quote.shipping_type,   // decoded by useQuotes
          shippingCost: quote.shipping_cost,   // decoded by useQuotes
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Erro desconhecido");
      }

      const result = data.result;

      // ── Correção 1: Salvar bitrix_quote_id no CRM externo ───────────────
      const parsedBitrixId = result?.quote_id ? Number(result.quote_id) : null;
      const bitrixQuoteIdFromResponse = parsedBitrixId && !isNaN(parsedBitrixId) ? parsedBitrixId : null;

      const crmUpdates: Record<string, any> = { status: "sent" };
      if (bitrixQuoteIdFromResponse) {
        crmUpdates.bitrix_quote_id = bitrixQuoteIdFromResponse;
      }

      try {
        await supabase.from("quotes").update(crmUpdates as Record<string, unknown>).eq("id", quote.id);
      } catch (updateErr) {
        logger.warn("Falha ao atualizar quote no CRM após sync:", updateErr);
      }

      // ── Log: sincronização concluída ────────────────────────────────────
      await logQuoteHistory(
        quote.id,
        "sync_success",
        `Sincronizado com Bitrix24 com sucesso${bitrixQuoteIdFromResponse ? ` — ID Bitrix: ${bitrixQuoteIdFromResponse}` : ""}`,
        {
          newValue: bitrixQuoteIdFromResponse ? String(bitrixQuoteIdFromResponse) : undefined,
          metadata: {
            bitrix_quote_id: bitrixQuoteIdFromResponse,
            pdf_url: pdfStorageUrl,
            filename,
          },
        }
      );

      // Atualizar estado local imediatamente (UI)
      setQuote((prev) =>
        prev
          ? {
              ...prev,
              status: "sent",
              ...(bitrixQuoteIdFromResponse ? { bitrix_quote_id: bitrixQuoteIdFromResponse } : {}),
            }
          : prev
      );

      toast.success(
        result?.message || `Orçamento sincronizado com Bitrix24!`,
        {
          description: result?.quote_id
            ? `ID Bitrix: ${result.quote_id}`
            : undefined,
        }
      );
    } catch (err: any) {
      console.error("Sync error:", err);

      // ── Log: falha na sincronização ─────────────────────────────────────
      await logQuoteHistory(
        quote.id,
        "sync_error",
        `Falha na sincronização com Bitrix24: ${err.message || "erro desconhecido"}`,
        { metadata: { error: err.message } }
      );

      toast.error("Erro ao sincronizar", { description: err.message });
    } finally {
      setIsSyncing(false);
    }
  };

  // Check if any items have personalizations
  const hasPersonalizations = quote?.items?.some(item => item.personalizations && item.personalizations.length > 0);

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
            <h2 className="text-xl font-semibold">Orçamento não encontrado</h2>
            <p className="text-muted-foreground mt-2">O orçamento solicitado não existe ou foi removido.</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/orcamentos")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Orçamentos
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const status = statusConfig[quote.status] || statusConfig.draft;

  return (
    <MainLayout>
      <PageSEO title={`Orçamento ${quote.quote_number}`} description={`Visualização do orçamento ${quote.quote_number}`} path={`/orcamentos/${id}`} noIndex />
      <div className="container py-6 space-y-6 pb-24 md:pb-6 print:py-0 print:max-w-none print:px-0">
        {/* Header — Reorganized (#1) */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/orcamentos")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Orçamento {quote.quote_number}</h1>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <p className="text-muted-foreground">
                Criado em {quote.created_at ? format(new Date(quote.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "-"}
              </p>
            </div>
          </div>

          {/* Primary CTAs + Dropdown for secondary (#1) */}
          <div className="flex items-center gap-2">
            {/* Desktop-only buttons */}
            <div className="hidden md:flex items-center gap-2">

            <QuoteConvertToOrder quoteId={id!} status={quote.status} onConverted={() => { if (id) fetchQuote(id).then(setQuote); }} />

            {/* Sincronizar com Bitrix24 */}
            <Button
              onClick={handleSyncBitrix}
              disabled={isSyncing}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isSyncing ? "Sincronizando..." : "Sincronizar"}
            </Button>
            </div>{/* end hidden md:flex */}

            <PdfGenerationDialog
              proposalData={proposalData}
              quoteNumber={quote.quote_number}
              quoteStatus={quote.status}
              clientPhone={quote.client_phone}
              approvalLink={approvalLink}
              onWhatsApp={handleWhatsAppShare}
              onShareLink={handleShareLink}
              trigger={
                <Button className="gap-2">
                  <Eye className="h-4 w-4" />
                  Preview Proposta
                </Button>
              }
            />

            {/* Secondary actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(quote.status === "sent" || isSyncing) && (
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        await supabase.from("quotes").update({ status: "pending" } as Record<string, unknown>).eq("id", quote.id);
                        await logQuoteHistory(quote.id, "status_change", "Sincronização cancelada — status revertido para Pendente", {
                          oldValue: "sent",
                          newValue: "pending",
                        });
                        setQuote((prev) => prev ? { ...prev, status: "pending" } : prev);
                        toast.success("Sincronização cancelada", { description: "Status revertido para Pendente" });
                      } catch (err: any) {
                        toast.error("Erro ao cancelar sincronização", { description: err.message });
                      }
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Undo2 className="h-4 w-4 mr-2" />
                    Cancelar Sincronização
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate(`/orcamentos/${id}/editar`)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={async () => {
                  const newQuote = await duplicateQuote(id!);
                  if (newQuote?.id) navigate(`/orcamentos/${newQuote.id}`);
                }}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
                <Sheet>
                  <SheetTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <History className="h-4 w-4 mr-2" />
                      Histórico
                    </DropdownMenuItem>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Histórico de Alterações</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <QuoteHistoryPanel quoteId={id!} />
                    </div>
                  </SheetContent>
                </Sheet>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status Timeline + Validity Banner */}
        <div className="flex flex-col md:flex-row gap-4 items-start print:hidden">
          <div className="flex-1 bg-card border rounded-lg p-4">
            <QuoteStatusTimeline
              status={quote.status}
              createdAt={quote.created_at}
              updatedAt={quote.updated_at}
              clientResponseAt={quote.client_response_at}
              isSyncing={isSyncing}
            />
          </div>
          <QuoteValidityBanner validUntil={quote.valid_until} status={quote.status} />
        </div>

        {/* Quote Content */}
        <Card className="print:hidden">
          <Separator />
          <CardContent className="pt-6 space-y-6">
            {/* Client Info — 2 columns with icons */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Empresa</h3>
                </div>
                {quote.client_company || quote.client_name ? (
                  (() => {
                    const company = quote.client_company || "Não especificado";
                    const parts = company.split(" | ");
                    const companyName = parts[0];
                    const cityState = parts[1];
                    return (
                      <div className="space-y-1">
                        <p className="text-foreground font-bold text-lg">{companyName}</p>
                        {cityState && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{cityState}</span>
                          </div>
                        )}
                        {clientCnpj && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>CNPJ: {clientCnpj}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-muted-foreground/30 print:hidden">
                    <UserPlus className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Nenhum cliente vinculado</p>
                      <p className="text-xs text-muted-foreground/70">Edite o orçamento para vincular um cliente</p>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Contato</h3>
                </div>
                {quote.client_name ? (
                  <div className="space-y-1.5">
                    <p className="text-foreground font-medium">{quote.client_name}</p>
                    {quote.client_email && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        <span>{quote.client_email}</span>
                      </div>
                    )}
                    {quote.client_phone && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{quote.client_phone}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Nenhum contato vinculado</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Items Table — grouped by kit + loose items */}
            <div>
              <h3 className="font-semibold mb-4">Itens do Orçamento</h3>
              {(() => {
                const allItems = quote.items || [];
                // Group items: kit groups first, then loose items
                const kitGroups = new Map<string, { name: string; items: typeof allItems }>();
                const looseItems: typeof allItems = [];
                
                allItems.forEach(item => {
                  if (item.kit_group_id && item.kit_name) {
                    const group = kitGroups.get(item.kit_group_id) || { name: item.kit_name, items: [] };
                    group.items.push(item);
                    kitGroups.set(item.kit_group_id, group);
                  } else {
                    looseItems.push(item);
                  }
                });

                const colCount = hasPersonalizations ? 6 : 5;

                const renderItemRow = (item: typeof allItems[0], index: number) => {
                  const allPersonalizations = item.personalizations || [];
                  const personalizationCost = allPersonalizations.reduce(
                    (acc, p) => acc + calcPersTotal(p.total_cost || 0, item.quantity), 0
                  );
                  const itemTotal = item.quantity * item.unit_price + personalizationCost;

                  return (
                    <tr 
                      key={item.id || `item-${index}`} 
                      className={`border-b border-border/50 transition-colors hover:bg-muted/40 ${index % 2 === 1 ? 'bg-muted/20' : ''}`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {item.product_image_url && (
                            <img 
                              src={item.product_image_url} 
                              alt={item.product_name}
                              className="w-16 h-16 object-cover rounded border border-border print:hidden"
                            />
                          )}
                          <div>
                            {item.product_sku && (
                              <span 
                                className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded-md border mb-1"
                                style={{ 
                                  backgroundColor: item.color_hex ? `${item.color_hex}22` : undefined,
                                  borderColor: item.color_hex || 'hsl(var(--border))',
                                  color: item.color_hex || 'hsl(var(--foreground))'
                                }}
                              >
                                {item.color_hex && (
                                  <span className="w-2.5 h-2.5 rounded-full border border-border/50" style={{ backgroundColor: item.color_hex }} />
                                )}
                                {item.product_sku}{item.color_name ? `-${item.color_name}` : ''}
                              </span>
                            )}
                            <p className="font-medium">{item.product_name}</p>
                          </div>
                        </div>
                      </td>
                      
                      {hasPersonalizations && (
                        <td className="p-3">
                          {allPersonalizations.length > 0 ? (
                            <div className="space-y-1.5">
                              {allPersonalizations.map((p: any, pIdx: number) => {
                                const notesRaw = p.notes || "";
                                const [locationPart, dimPart] = notesRaw.split(" | ");
                                const locationLabel = locationPart ? locationPart.split(" — ")[0] : null;
                                let dimLabel: string | null = null;
                                if (dimPart) {
                                  dimLabel = dimPart.replace("cm", " cm");
                                } else if (p.width_cm && p.height_cm) {
                                  dimLabel = `${p.width_cm} × ${p.height_cm} cm`;
                                }
                                return (
                                  <div key={pIdx} className={`${pIdx > 0 ? 'pt-1.5 border-t border-border/30' : ''}`}>
                                    <div className="inline-flex flex-col gap-0.5 bg-primary/8 border border-primary/20 rounded-md px-2 py-1.5">
                                      <span className="text-xs font-semibold text-primary flex items-center gap-1">
                                        ✦ {p.technique_name}
                                      </span>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                        {locationLabel && <span className="font-medium text-foreground/70">{locationLabel}</span>}
                                        {dimLabel && <span className="font-medium text-foreground/80">{dimLabel}</span>}
                                        <span>{p.colors_count || 1} cor{(p.colors_count || 1) > 1 ? "es" : ""}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : <span className="text-muted-foreground text-sm">—</span>}
                        </td>
                      )}
                      <td className="p-3 text-center font-semibold text-sm w-20">{item.quantity}</td>
                      <td className="p-3 text-left text-muted-foreground tabular-nums w-28">
                        {formatCurrency(item.unit_price + (allPersonalizations.reduce((sum, p) => {
                          const pTotal = p.total_cost || 0;
                          return sum + (item.quantity > 0 ? Math.round((pTotal / item.quantity) * 100) / 100 : 0);
                        }, 0)))}
                      </td>
                      <td className="p-3 text-left font-bold text-base tabular-nums w-32">{formatCurrency(itemTotal)}</td>
                      <td className="p-3 text-center print:hidden">
                        <QuoteItemDetailSheet item={item} />
                      </td>
                    </tr>
                  );
                };

                return (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-primary/15">
                          <th className="text-left p-3 font-semibold text-primary text-sm">Produto</th>
                          {hasPersonalizations && (
                            <th className="text-left p-3 font-semibold text-primary text-sm">Personalização</th>
                          )}
                          <th className="text-center p-3 font-semibold text-primary text-sm w-20">Qtd</th>
                          <th className="text-left p-3 font-semibold text-primary text-sm w-28">Unitário</th>
                          <th className="text-left p-3 font-semibold text-primary text-sm w-32">Total</th>
                          <th className="text-center p-3 font-semibold text-primary text-sm print:hidden w-24"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Kit groups */}
                        {Array.from(kitGroups.entries()).map(([groupId, group]) => (
                          <React.Fragment key={groupId}>
                            <tr className="bg-accent/60 border-b border-border">
                              <td colSpan={colCount} className="p-3">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-primary" />
                                  <span className="font-bold text-sm text-primary">Kit: {group.name}</span>
                                  <Badge variant="outline" className="text-xs ml-1">{group.items.length} itens</Badge>
                                </div>
                              </td>
                            </tr>
                            {group.items.map((item, idx) => renderItemRow(item, idx))}
                          </React.Fragment>
                        ))}
                        {/* Loose items */}
                        {kitGroups.size > 0 && looseItems.length > 0 && (
                          <tr className="bg-muted/30 border-b border-border">
                            <td colSpan={colCount} className="p-2 px-3">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Itens Avulsos</span>
                            </td>
                          </tr>
                        )}
                        {looseItems.map((item, idx) => renderItemRow(item, idx))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Totals — progressive breakdown */}
            {(() => {
              const productSubtotal = (quote.items || []).reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
              const personalizationTotal = (quote.items || []).reduce((acc, item) => {
                return acc + (item.personalizations || []).reduce(
                  (pAcc, p) => pAcc + calcPersTotal(p.total_cost || 0, item.quantity), 0
                );
              }, 0);
              const fullSubtotal = productSubtotal + personalizationTotal;
              const discountValue = quote.discount_percent
                ? Math.round(fullSubtotal * (quote.discount_percent / 100) * 100) / 100
                : (quote.discount_amount || 0);
              const shippingValue = (quote.shipping_type === "fob" || quote.shipping_type === "fob_pre")
                ? (quote.shipping_cost || 0) : 0;
              const computedTotal = fullSubtotal - discountValue + shippingValue;

              return (
            <div className="flex justify-end">
              <div className="w-full max-w-sm rounded-lg border border-border overflow-hidden">
                <div className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal produtos:</span>
                    <span>{formatCurrency(productSubtotal)}</span>
                  </div>
                  {hasPersonalizations && personalizationTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Personalização:</span>
                      <span>{formatCurrency(personalizationTotal)}</span>
                    </div>
                  )}
                  {discountValue > 0 && (
                    <div className="flex justify-between text-sm text-destructive">
                      <span>Desconto{quote.discount_percent ? ` (${quote.discount_percent}%)` : ""}:</span>
                      <span>-{formatCurrency(discountValue)}</span>
                    </div>
                  )}
                  {quote.shipping_type && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Frete:</span>
                      <span>{
                        quote.shipping_type === "cif" ? "CIF — Cortesia" :
                        quote.shipping_type === "fob" && !quote.shipping_cost ? "FOB — Por conta do cliente" :
                        quote.shipping_type === "fob" || quote.shipping_type === "fob_pre" ? `FOB — Repassado ao cliente (${formatCurrency(quote.shipping_cost || 0)})` :
                        formatCurrency(quote.shipping_cost || 0)
                      }</span>
                    </div>
                  )}
                </div>
                <div className="bg-muted/50 border-t border-border px-4 py-3">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-lg">Total:</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(computedTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
              );
            })()}

            {/* Condições Comerciais */}
            {(quote.payment_terms || quote.delivery_time) && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-4">Condições Comerciais</h3>
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

            {/* Notes */}
            {quote.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Observações</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{quote.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Approval Link */}
        {id && quote && (
          <QuoteApprovalLinkCard
            quoteId={id}
            clientName={quote.client_name}
            clientEmail={quote.client_email}
          />
        )}

        {/* Comments Section */}
        {id && <QuoteCommentsSection quoteId={id} />}


        {/* Print-only: render the same template used for PDF */}
        {proposalData && (
          <div className="hidden print:block print:p-0">
            <ProposalHtmlTemplate data={proposalData} />
          </div>
        )}
      </div>

      {/* Mobile Action Bar (#7) */}
      <QuoteMobileActionBar
        onDownloadPDF={handleDownloadPDF}
        onWhatsApp={handleWhatsAppShare}
        onSync={handleSyncBitrix}
        isSyncing={isSyncing}
        onShare={handleShareLink}
        isGeneratingPDF={isGeneratingPDF}
      />
    </MainLayout>
  );
}
