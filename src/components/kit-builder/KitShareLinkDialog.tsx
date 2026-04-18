/**
 * KitShareLinkDialog — gera/copia link público do kit para apresentar ao cliente.
 * Usa useKitShare; mostra link expirando em 30d e permite revogação.
 */
import { useState } from 'react';
import { Share2, Copy, Check, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useKitShare } from '@/hooks/useKitShare';
import { toast } from 'sonner';

interface Props {
  kitId: string | undefined;
  kitName: string;
}

export function KitShareLinkDialog({ kitId, kitName }: Props) {
  const { generateShareLink, isLoading } = useKitShare();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [copied, setCopied] = useState(false);

  const disabled = !kitId;

  const handleGenerate = async () => {
    if (!kitId) return;
    const url = await generateShareLink(kitId, clientName || undefined);
    if (url) setLink(url);
  };

  const handleCopy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setLink(null); }}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={disabled}
                className="gap-2"
                aria-label="Compartilhar kit"
              >
                <Share2 className="h-4 w-4" />
                <span className="hidden md:inline">Compartilhar</span>
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {disabled ? 'Salve o kit antes de compartilhar' : 'Gerar link público do kit'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Compartilhar apresentação</DialogTitle>
          <DialogDescription>
            Gere um link público de "{kitName || 'seu kit'}" para enviar ao cliente. O link expira em 30 dias e
            esconde preços de custo.
          </DialogDescription>
        </DialogHeader>

        {!link ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="client-name" className="text-xs">Nome do cliente (opcional)</Label>
              <Input
                id="client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex.: Acme S.A."
                className="h-9"
              />
            </div>
            <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />}
              Gerar link de apresentação
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Label className="text-xs">Link público</Label>
            <div className="flex gap-2">
              <Input value={link} readOnly className="h-9 font-mono text-xs" />
              <Button size="sm" variant="outline" onClick={handleCopy} aria-label="Copiar link">
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="outline" asChild aria-label="Abrir link">
                <a href={link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Expira em 30 dias. Você pode revogar a qualquer momento na biblioteca de kits.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
