import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface UseCopyToClipboardOptions {
  successMessage?: string;
  errorMessage?: string;
  showToast?: boolean;
}

/**
 * Hook para copiar texto para a área de transferência
 * Com feedback visual automático
 */
export function useCopyToClipboard(options: UseCopyToClipboardOptions = {}) {
  const {
    successMessage = 'Copiado!',
    errorMessage = 'Erro ao copiar',
    showToast = true,
  } = options;

  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      if (!navigator?.clipboard) {
        console.warn('Clipboard not supported');
        if (showToast) {
          toast({
            title: 'Não suportado',
            description: 'Seu navegador não suporta copiar para área de transferência',
            variant: 'destructive',
          });
        }
        return false;
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopiedText(text);
        setIsCopied(true);

        if (showToast) {
          toast({
            title: successMessage,
            description: text.length > 50 ? `${text.substring(0, 50)}...` : text,
          });
        }

        // Reset após 2 segundos
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);

        return true;
      } catch (error) {
        console.warn('Failed to copy:', error);
        setCopiedText(null);
        setIsCopied(false);

        if (showToast) {
          toast({
            title: errorMessage,
            description: 'Tente novamente',
            variant: 'destructive',
          });
        }

        return false;
      }
    },
    [successMessage, errorMessage, showToast]
  );

  const reset = useCallback(() => {
    setCopiedText(null);
    setIsCopied(false);
  }, []);

  return {
    copy,
    reset,
    copiedText,
    isCopied,
  };
}
