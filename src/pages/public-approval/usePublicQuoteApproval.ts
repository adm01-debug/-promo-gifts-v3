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

export interface PublicQuoteApprovalState {
  data: QuoteData | null;
  isLoading: boolean;
  error: string | null;
  isExpired: boolean;
  alreadyResponded: any;
  responseNotes: string;
  setResponseNotes: (v: string) => void;
  isSubmitting: boolean;
  submitted: string | null;
  handleResponse: (response: "approved" | "rejected") => Promise<void>;
}

export function usePublicQuoteApproval(token?: string): PublicQuoteApprovalState {
  const [data, setData] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [alreadyResponded, setAlreadyResponded] = useState<any>(null);
  const [responseNotes, setResponseNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchQuote = async () => {
      setIsLoading(true);
      try {
        const { data: result, error: fnError } = await supabase.functions.invoke(
          "quote-public-view",
          { body: { action: "get_quote", token } }
        );

        if (fnError && !result) {
          throw new Error(fnError.message);
        }

        if (result?.error) {
          if (result.expired) {
            setIsExpired(true);
          } else {
            setError(result.error);
          }
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
          },
        }
      );

      if (fnError && !result) throw new Error(fnError.message);
      if (result?.error) throw new Error(result.error);

      setSubmitted(response);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [token, responseNotes]);

  return {
    data, isLoading, error, isExpired, alreadyResponded,
    responseNotes, setResponseNotes, isSubmitting, submitted,
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
