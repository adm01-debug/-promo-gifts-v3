import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Building2, Copy, CreditCard, Download, Eye, FileText, History, Link2, Loader2, MapPin, MoreHorizontal, Package, Phone, Mail, Printer, Truck, User, UserPlus } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuotes, Quote } from "@/hooks/useQuotes";

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
import { QuoteNextActionBanner } from "@/components/quotes/QuoteNextActionBanner";
import { QuoteMobileActionBar } from "@/components/quotes/QuoteMobileActionBar";
import { PdfGenerationDialog } from "@/components/quotes/PdfGenerationDialog";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  pending: { label: "Pendente", variant: "outline" },
  sent: { label: "Enviado", variant: "default" },
  approved: { label: "Aprovado", variant: "default" },
  rejected: { label: "Rejeitado", variant: "destructive" },
  expired: { label: "Expirado", variant: "secondary" },
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function QuoteViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchQuote, isLoading } = useQuotes();
  const { user } = useAuth();
  
  const { generateApprovalLink, copyToClipboard, isGenerating } = useQuoteApproval();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [approvalLink, setApprovalLink] = useState<string | null>(null);
  const whatsAppRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (id) {
      loadQuote();
    }
  }, [id]);

  const loadQuote = async () => {
    if (!id) return;
    const data = await fetchQuote(id);
    setQuote(data);
  };

  const proposalData: ProposalTemplateData | null = useMemo(() => {
    if (!quote) return null;
    return {
      quoteNumber: quote.quote_number || "",
      date: quote.created_at ? format(new Date(quote.created_at), "dd/MM/yyyy", { locale: ptBR }) : "",
      validUntil: quote.valid_until ? format(new Date(quote.valid_until), "dd/MM/yyyy", { locale: ptBR }) : "30 dias",
      client: {
        name: quote.client_company || quote.client_name || "Não especificado",
        email: quote.client_email || undefined,
        phone: quote.client_phone || undefined,
        company: quote.client_company || undefined,
        contactName: quote.client_name || undefined,
      },
      seller: {
        name: user?.email || "Vendedor",
      },
      items: quote.items?.map((item) => ({
        name: item.product_name,
        sku: item.product_sku || undefined,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        color: item.color_name || undefined,
        imageUrl: item.product_image_url || undefined,
        personalizations: item.personalizations?.map((p: any) => ({
          technique_name: p.technique_name || "Personalizacao",
          colors_count: p.colors_count || 1,
          width_cm: p.width_cm || undefined,
          height_cm: p.height_cm || undefined,
          area_cm2: p.area_cm2 || undefined,
          unit_cost: p.unit_cost || 0,
          setup_cost: p.setup_cost || 0,
          total_cost: p.total_cost || 0,
        })) || [],
      })) || [],
      subtotal: quote.subtotal || 0,
      discount: quote.discount_amount || undefined,
      total: quote.total || 0,
      notes: quote.notes || undefined,
      paymentTerms: quote.payment_terms || undefined,
      deliveryTime: quote.delivery_time || undefined,
    };
  }, [quote, user]);

  const handleDownloadPDF = async () => {
    if (!proposalData) return;
    setIsGeneratingPDF(true);
    try {
      const blob = await generateProposalPDFv2(proposalData, { isDraft: quote?.status === "draft" });
      downloadPDF(blob, `proposta-${quote?.quote_number || "sem-numero"}.pdf`);
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

  // Check if any items have personalizations
  const hasPersonalizations = quote?.items?.some(item => item.personalizations && item.personalizations.length > 0);

  if (isLoading) {
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
            <div className="hidden md:flex items-center gap-2">
            <QuoteConvertToOrder quoteId={id!} status={quote.status} />
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
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </DropdownMenuItem>
                <Popover>
                  <PopoverTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Link2 className="h-4 w-4 mr-2" />
                      Link de Aprovação
                    </DropdownMenuItem>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium mb-1">Link de Aprovação</h4>
                        <p className="text-sm text-muted-foreground">
                          Gere um link para o cliente aprovar ou rejeitar este orçamento.
                        </p>
                      </div>
                      {approvalLink ? (
                        <div className="space-y-2">
                          <div className="p-2 bg-muted rounded text-xs break-all font-mono">
                            {approvalLink}
                          </div>
                          {/* QR Code inline (#9) */}
                          <div className="flex justify-center py-2">
                            <QuoteQRCode
                              approvalLink={approvalLink}
                              quoteNumber={quote.quote_number}
                              size={140}
                              showActions={false}
                              className="border-0 shadow-none p-0"
                            />
                          </div>
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={() => copyToClipboard(approvalLink)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar Link
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={handleGenerateApprovalLink}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Link2 className="h-4 w-4 mr-2" />
                          )}
                          {isGenerating ? "Gerando..." : "Gerar Link"}
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Next Action Banner — compact inline */}
        <div className="print:hidden">
          <QuoteNextActionBanner 
            status={quote.status} 
            onSendWhatsApp={handleWhatsAppShare}
          />
        </div>

        {/* Status Timeline + Validity Banner */}
        <div className="flex flex-col md:flex-row gap-4 items-start print:hidden">
          <div className="flex-1 bg-card border rounded-lg p-4">
            <QuoteStatusTimeline
              status={quote.status}
              createdAt={quote.created_at}
              updatedAt={quote.updated_at}
              clientResponseAt={quote.client_response_at}
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

            {/* Items Table — subtle header + zebra + hover */}
            <div>
              <h3 className="font-semibold mb-4">Itens do Orçamento</h3>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-primary/15">
                      <th className="text-left p-3 font-semibold text-primary text-sm">Produto</th>
                      <th className="text-left p-3 font-semibold text-primary text-sm">SKU</th>
                      {hasPersonalizations && (
                        <th className="text-left p-3 font-semibold text-primary text-sm">Personalização</th>
                      )}
                      <th className="text-center p-3 font-semibold text-primary text-sm">Qtd</th>
                      <th className="text-right p-3 font-semibold text-primary text-sm">Unitário</th>
                      <th className="text-right p-3 font-semibold text-primary text-sm">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.items?.map((item, index) => {
                      const allPersonalizations = item.personalizations || [];
                      const personalizationCost = allPersonalizations.reduce(
                        (acc, p) => acc + ((p.unit_cost || 0) * item.quantity + (p.setup_cost || 0)), 0
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
                                  className="w-14 h-14 object-cover rounded border border-border print:hidden"
                                />
                              )}
                              <div>
                                <p className="font-medium">{item.product_name}</p>
                                {item.color_name && (
                                  <div className="flex items-center gap-1 mt-1">
                                    {item.color_hex && (
                                      <span 
                                        className="w-3 h-3 rounded-full border" 
                                        style={{ backgroundColor: item.color_hex }}
                                      />
                                    )}
                                    <span className="text-sm text-muted-foreground">{item.color_name}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground font-mono text-sm">{item.product_sku || "-"}</td>
                          {hasPersonalizations && (
                            <td className="p-3">
                              {allPersonalizations.length > 0 ? (
                                <div className="space-y-1.5">
                                  {allPersonalizations.map((p: any, pIdx: number) => (
                                    <div key={pIdx} className={`${pIdx > 0 ? 'pt-1.5 border-t border-border/30' : ''}`}>
                                      <div className="inline-flex flex-col gap-0.5 bg-primary/8 border border-primary/20 rounded-md px-2 py-1.5">
                                        <span className="text-xs font-semibold text-primary flex items-center gap-1">
                                          ✦ {p.technique_name}
                                        </span>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          {p.width_cm && p.height_cm ? (
                                            <span className="font-medium text-foreground/80">{p.width_cm} × {p.height_cm} cm</span>
                                          ) : null}
                                          <span>{p.colors_count || 1} cor{(p.colors_count || 1) > 1 ? "es" : ""}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : <span className="text-muted-foreground text-sm">—</span>}
                            </td>
                          )}
                          <td className="p-3 text-center font-medium">{item.quantity}</td>
                          <td className="p-3 text-right text-muted-foreground">{formatCurrency(item.unit_price)}</td>
                          <td className="p-3 text-right font-semibold">{formatCurrency(itemTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals — progressive breakdown */}
            <div className="flex justify-end">
              <div className="w-full max-w-sm rounded-lg border border-border overflow-hidden">
                <div className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal produtos:</span>
                    <span>{formatCurrency(quote.subtotal)}</span>
                  </div>
                  {hasPersonalizations && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Personalização:</span>
                      <span>{formatCurrency(
                        (quote.items || []).reduce((acc, item) => {
                          return acc + (item.personalizations || []).reduce(
                            (pAcc, p) => pAcc + ((p.unit_cost || 0) * item.quantity + (p.setup_cost || 0)), 0
                          );
                        }, 0)
                      )}</span>
                    </div>
                  )}
                  {quote.discount_amount > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Desconto{quote.discount_percent ? ` (${quote.discount_percent}%)` : ""}:</span>
                      <span>-{formatCurrency(quote.discount_amount)}</span>
                    </div>
                  )}
                </div>
                <div className="bg-muted/50 border-t border-border px-4 py-3">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-lg">Total:</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(quote.total)}</span>
                  </div>
                </div>
              </div>
            </div>

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
                          <p className="text-sm font-medium mt-0.5">{quote.payment_terms}</p>
                        </div>
                      </div>
                    )}
                    {quote.delivery_time && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                        <Package className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prazo de Entrega</p>
                          <p className="text-sm font-medium mt-0.5">{quote.delivery_time}</p>
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
        onShare={handleShareLink}
        isGeneratingPDF={isGeneratingPDF}
      />
    </MainLayout>
  );
}
