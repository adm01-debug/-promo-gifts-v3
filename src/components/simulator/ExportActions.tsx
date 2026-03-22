// src/components/simulator/ExportActions.tsx
// Melhoria #1: Exportação para PDF/Imagem e compartilhamento

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Share2, 
  FileText, 
  MessageCircle, 
  Download, 
  Copy, 
  Check,
  Loader2,
  Mail,
  Printer,
  Image as ImageIcon,
  FileImage,
  Trophy,
  Clock,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/hooks/useSimulation";
import type { SimulationOption, Product } from "@/types/simulation";

interface ExportActionsProps {
  simulationOptions: SimulationOption[];
  selectedProduct: Product | undefined;
  quantity: number;
  effectiveProductPrice: number;
  bestOption: SimulationOption | null;
  clientName?: string;
}

export function ExportActions({
  simulationOptions,
  selectedProduct,
  quantity,
  effectiveProductPrice,
  bestOption,
  clientName,
}: ExportActionsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  if (simulationOptions.length === 0) return null;

  const sortedOptions = [...simulationOptions].sort((a, b) => a.grandTotal - b.grandTotal);

  // Generate text for sharing
  const generateShareText = (format: 'whatsapp' | 'email' | 'clipboard') => {
    const header = format === 'email' 
      ? `Simulação de Personalização\n${'='.repeat(30)}\n`
      : `*Simulação de Personalização*\n`;

    const productInfo = format === 'email'
      ? `Produto: ${selectedProduct?.name}\nSKU: ${selectedProduct?.sku}\nQuantidade: ${quantity} unidades\nPreço unitário: ${formatCurrency(effectiveProductPrice)}\n`
      : `📦 *${selectedProduct?.name}* (${selectedProduct?.sku})\n📊 ${quantity} unidades • ${formatCurrency(effectiveProductPrice)}/un\n`;

    const divider = format === 'email' ? `\n${'─'.repeat(30)}\n` : '\n───────────\n';

    const optionsText = sortedOptions.map((opt, idx) => {
      const isBest = opt.id === bestOption?.id;
      const prefix = isBest ? (format === 'email' ? '★ ' : '🏆 ') : `${idx + 1}. `;
      
      if (format === 'email') {
        return `${prefix}${opt.techniqueName}
   • Configuração: ${opt.colors} cor(es), ${opt.width}x${opt.height}cm, ${opt.positions} posição(ões)
   • Personalização/un: ${formatCurrency(opt.costPerUnit)}
   • Setup: ${formatCurrency(opt.setupCost)}
   • Total geral: ${formatCurrency(opt.grandTotal)}
   • Custo final/un: ${formatCurrency(opt.grandTotalPerUnit)}
   • Prazo: ~${opt.estimatedDays} dias úteis`;
      }

      return `${prefix}*${opt.techniqueName}*
   Pers.: ${formatCurrency(opt.costPerUnit)}/un • Setup: ${formatCurrency(opt.setupCost)}
   *Total: ${formatCurrency(opt.grandTotal)}* (${formatCurrency(opt.grandTotalPerUnit)}/un)
   ⏱️ ~${opt.estimatedDays} dias`;
    }).join(divider);

    const footer = format === 'email'
      ? `\n\nMelhor opção: ${bestOption?.techniqueName} - ${formatCurrency(bestOption?.grandTotal || 0)}\n\n---\nGerado pelo Simulador de Personalização`
      : `\n\n✅ *Melhor opção: ${bestOption?.techniqueName}*\n💰 Total: ${formatCurrency(bestOption?.grandTotal || 0)}`;

    return header + productInfo + divider + optionsText + footer;
  };

  // Copy to clipboard
  const handleCopy = async () => {
    const text = generateShareText('clipboard');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado para área de transferência");
    setTimeout(() => setCopied(false), 2000);
  };

  // Share via WhatsApp
  const handleWhatsApp = () => {
    const text = generateShareText('whatsapp');
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  // Share via Email
  const handleEmail = () => {
    const subject = encodeURIComponent(`Simulação de Personalização - ${selectedProduct?.name}`);
    const body = encodeURIComponent(generateShareText('email'));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Generate PDF
  const handlePDF = async () => {
    setIsExporting(true);
    try {
      const [jsPDFModule, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      const jsPDF = jsPDFModule.default;
      const autoTable = autoTableModule.default;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(20);
      doc.setTextColor(30, 64, 175);
      doc.text('Simulação de Personalização', pageWidth / 2, 20, { align: 'center' });

      // Date
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, 28, { align: 'center' });

      // Product info
      doc.setFontSize(12);
      doc.setTextColor(60, 60, 60);
      doc.text(`Produto: ${selectedProduct?.name} (${selectedProduct?.sku})`, 14, 40);
      doc.text(`Quantidade: ${quantity} unidades`, 14, 47);
      doc.text(`Preço unitário: ${formatCurrency(effectiveProductPrice)}`, 14, 54);
      
      if (clientName) {
        doc.text(`Cliente: ${clientName}`, 14, 61);
      }

      // Table
      const tableData = sortedOptions.map((opt, idx) => [
        idx === 0 ? '🏆 ' + opt.techniqueName : opt.techniqueName,
        `${opt.colors} cor | ${opt.width}x${opt.height}cm | ${opt.positions} pos`,
        formatCurrency(opt.costPerUnit),
        formatCurrency(opt.setupCost),
        formatCurrency(opt.grandTotal),
        formatCurrency(opt.grandTotalPerUnit),
        `${opt.estimatedDays}d`,
      ]);

      autoTable(doc, {
        startY: clientName ? 70 : 63,
        head: [['Técnica', 'Configuração', 'Pers./Un', 'Setup', 'Total', 'Final/Un', 'Prazo']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [30, 64, 175],
          textColor: [255, 255, 255],
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 45 },
          2: { cellWidth: 22, halign: 'right' },
          3: { cellWidth: 20, halign: 'right' },
          4: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
          5: { cellWidth: 22, halign: 'right' },
          6: { cellWidth: 15, halign: 'center' },
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
      });

      // Best option highlight
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(14, finalY, pageWidth - 28, 25, 3, 3, 'F');
      doc.setFontSize(11);
      doc.setTextColor(22, 163, 74);
      doc.text('Melhor Opção', 20, finalY + 8);
      doc.setFontSize(14);
      doc.setTextColor(30, 64, 175);
      doc.text(`${bestOption?.techniqueName}: ${formatCurrency(bestOption?.grandTotal || 0)}`, 20, finalY + 18);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`(${formatCurrency(bestOption?.grandTotalPerUnit || 0)}/un • ~${bestOption?.estimatedDays} dias)`, 120, finalY + 18);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Documento gerado pelo Simulador de Personalização', 14, doc.internal.pageSize.getHeight() - 10);

      // Save
      const filename = `simulacao-${selectedProduct?.sku || 'personalização'}-${quantity}un.pdf`;
      doc.save(filename);
      toast.success("PDF gerado com sucesso!");

    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Erro ao gerar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  // Generate Image (HTML to Canvas)
  const handleImage = async () => {
    setIsGeneratingImage(true);
    setShowPreview(true);
    
    // Wait for preview to render
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      
      if (!previewRef.current) throw new Error('Preview not found');
      
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      const link = document.createElement('a');
      link.download = `simulacao-${selectedProduct?.sku || 'personalização'}-${quantity}un.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success("Imagem gerada com sucesso!");
      setShowPreview(false);
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error("Erro ao gerar imagem. Tente o PDF.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Share2 className="h-4 w-4" />
              Compartilhar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleCopy} className="gap-2 cursor-pointer">
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              Copiar texto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleWhatsApp} className="gap-2 cursor-pointer">
              <MessageCircle className="h-4 w-4 text-green-500" />
              WhatsApp
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleEmail} className="gap-2 cursor-pointer">
              <Mail className="h-4 w-4 text-blue-500" />
              E-mail
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handlePDF} disabled={isExporting} className="gap-2 cursor-pointer">
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 text-red-500" />
              )}
              Baixar PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleImage} disabled={isGeneratingImage} className="gap-2 cursor-pointer">
              {isGeneratingImage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileImage className="h-4 w-4 text-purple-500" />
              )}
              Baixar Imagem
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handlePrint} className="gap-2 cursor-pointer">
              <Printer className="h-4 w-4" />
              Imprimir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hidden Preview for Image Generation */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerando imagem...</DialogTitle>
            <DialogDescription>Aguarde enquanto a imagem é processada</DialogDescription>
          </DialogHeader>
          <div 
            ref={previewRef}
            className="p-6 bg-white rounded-lg"
            style={{ minWidth: 600 }}
          >
            {/* Image Preview Content */}
            <div className="space-y-4">
              {/* Header */}
              <div className="text-center pb-4 border-b">
                <h2 className="text-xl font-bold text-primary">Simulação de Personalização</h2>
                <p className="text-sm text-muted-foreground">
                  Gerado em {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>

              {/* Product Info */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-4">
                  {selectedProduct?.image_url && (
                    <img 
                      src={selectedProduct.image_url} 
                      alt={selectedProduct.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold">{selectedProduct?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      SKU: {selectedProduct?.sku} • {quantity} un • {formatCurrency(effectiveProductPrice)}/un
                    </p>
                    {clientName && (
                      <p className="text-sm text-primary">Cliente: {clientName}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {sortedOptions.map((opt, idx) => {
                  const isBest = idx === 0;
                  return (
                    <div 
                      key={opt.id}
                      className={`p-3 rounded-lg border ${isBest ? 'bg-success/10 border-success/30' : 'bg-muted/20'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isBest && <Trophy className="h-4 w-4 text-success" />}
                          <span className="font-medium">{opt.techniqueName}</span>
                        </div>
                        <div className="text-right">
                          <span className={`font-bold ${isBest ? 'text-success' : ''}`}>
                            {formatCurrency(opt.grandTotal)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({formatCurrency(opt.grandTotalPerUnit)}/un)
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>{opt.colors} cor(es)</span>
                        <span>{opt.width}×{opt.height}cm</span>
                        <span>~{opt.estimatedDays} dias</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Best Option Highlight */}
              {bestOption && (
                <div className="p-4 bg-success/10 rounded-lg border border-success/30 text-center">
                  <p className="text-sm text-success font-medium">Melhor Opção</p>
                  <p className="text-2xl font-bold text-success">
                    {bestOption.techniqueName}: {formatCurrency(bestOption.grandTotal)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(bestOption.grandTotalPerUnit)}/un • ~{bestOption.estimatedDays} dias
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
