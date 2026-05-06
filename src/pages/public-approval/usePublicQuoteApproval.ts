/**
 * usePublicQuoteApproval — Data fetching + response logic for public quote approval page.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface QuoteData {
  quote: any;
  seller: any;
  token: any;
}

export interface SignatureReceipt {
  signer_name: string;
  signer_document: string;
  signed_at: string;
  signature_hash: string;
  signer_ip: string;
}

export interface PublicQuoteApprovalState {
  data: QuoteData | null;
  isLoading: boolean;
  error: string | null;
  isExpired: boolean;
  alreadyResponded: any;
  responseNotes: string;
  setResponseNotes: (v: string) => void;
  signerName: string;
  setSignerName: (v: string) => void;
  signerDocument: string;
  setSignerDocument: (v: string) => void;
  signatureError: string | null;
  isSubmitting: boolean;
  submitted: string | null;
  signatureReceipt: SignatureReceipt | null;
  handleResponse: (response: "approved" | "rejected") => Promise<void>;
}

function formatDocument(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  // CNPJ: 00.000.000/0000-00
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function usePublicQuoteApproval(token?: string): PublicQuoteApprovalState {
  const [data, setData] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [alreadyResponded, setAlreadyResponded] = useState<any>(null);
  const [responseNotes, setResponseNotes] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerDocumentRaw, setSignerDocumentRaw] = useState("");
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [signatureReceipt, setSignatureReceipt] = useState<SignatureReceipt | null>(null);

  const setSignerDocument = useCallback((v: string) => {
    setSignerDocumentRaw(formatDocument(v));
  }, []);

  useEffect(() => {
    if (!token) return;

    const fetchQuote = async () => {
      setIsLoading(true);
      try {
        const { data: result, error: fnError } = await supabase.functions.invoke(
          "quote-public-view",
          { body: { action: "get_quote", token } }
        );

        if (fnError && !result) throw new Error(fnError.message);

        if (result?.error) {
          if (result.expired) setIsExpired(true);
          else setError(result.error);
          return;
        }

        if (result.already_responded) {
          setAlreadyResponded(result);
          return;
        }

        setData(result);
      } catch (err) {
        setError("Erro ao carregar proposta");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuote();
  }, [token]);

  const handleResponse = useCallback(async (response: "approved" | "rejected") => {
    if (!token) return;
    setSignatureError(null);

    // Client-side validation for approval
    if (response === "approved") {
      if (signerName.trim().length < 3) {
        setSignatureError("Informe seu nome completo para assinar a aprovação.");
        return;
      }
      const docDigits = signerDocumentRaw.replace(/\D/g, "");
      if (docDigits.length !== 11 && docDigits.length !== 14) {
        setSignatureError("Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke(
        "quote-public-view",
        {
          body: {
            action: "respond",
            token,
            response,
            response_notes: responseNotes.trim() || null,
            signer_name: response === "approved" ? signerName.trim() : undefined,
            signer_document: response === "approved" ? signerDocumentRaw.replace(/\D/g, "") : undefined,
          },
        }
      );

      if (fnError && !result) throw new Error(fnError.message);
      if (result?.error) throw new Error(result.error);

      if (result?.signature) setSignatureReceipt(result.signature);
      setSubmitted(response);
    } catch (err: any) {
      setSignatureError(err?.message || "Erro ao enviar resposta");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [token, responseNotes, signerName, signerDocumentRaw]);

  return {
    data, isLoading, error, isExpired, alreadyResponded,
    responseNotes, setResponseNotes,
    signerName, setSignerName,
    signerDocument: signerDocumentRaw, setSignerDocument,
    signatureError,
    isSubmitting, submitted, signatureReceipt,
    handleResponse,
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function calcPersonalizationTotal(item: any): number {
  return (item.personalizations || []).reduce(
    (sum: number, p: any) => sum + (p.total_cost || 0),
    0
  );
}
