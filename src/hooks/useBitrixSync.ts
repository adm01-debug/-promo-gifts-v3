import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BitrixClient {
  id: string;
  name: string;
  ramo: string;
  nicho: string;
  primaryColor: { name: string; hex: string; group: string };
  email?: string;
  phone?: string;
  deals?: BitrixDeal[];
  totalSpent?: number;
  lastPurchase?: string;
}

interface BitrixDeal {
  id: string;
  title: string;
  value: number;
  stage: string;
  date: string;
}

interface SyncResult {
  clients: BitrixClient[];
  totalCompanies: number;
  totalDeals: number;
  syncedAt: string;
}

export function useBitrixSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async (start = 0): Promise<BitrixClient[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("bitrix-sync", {
        body: { action: "get_companies", data: { start } },
      });

      if (fnError) throw new Error(fnError.message);
      if (data.error) throw new Error(data.error);

      return data.clients || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao buscar clientes";
      setError(message);
      toast.error("Erro ao buscar clientes do CRM", { description: message });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDeals = async (companyId?: string): Promise<BitrixDeal[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("bitrix-sync", {
        body: { action: "get_stored_deals", data: { clientId: companyId } },
      });

      if (fnError) throw new Error(fnError.message);
      if (data.error) throw new Error(data.error);

      return data.deals || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao buscar negócios";
      setError(message);
      toast.error("Erro ao buscar negócios", { description: message });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const syncAll = async (): Promise<SyncResult | null> => {
    setIsSyncing(true);
    setError(null);

    try {
      toast.info("Iniciando sincronização...", { description: "Buscando dados do CRM e salvando no banco" });

      const { data, error: fnError } = await supabase.functions.invoke("bitrix-sync", {
        body: { action: "sync_full" },
      });

      if (fnError) throw new Error(fnError.message);
      if (data.error) throw new Error(data.error);

      setSyncResult(data);
      toast.success("Sincronização concluída!", {
        description: `${data.totalCompanies} empresas e ${data.totalDeals} negócios sincronizados e salvos`,
      });

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro na sincronização";
      setError(message);
      toast.error("Erro ao sincronizar com CRM", { description: message });
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchStoredClients = async (start = 0, limit = 50): Promise<BitrixClient[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("bitrix-sync", {
        body: { action: "get_stored_clients", data: { start, limit } },
      });

      if (fnError) throw new Error(fnError.message);
      if (data.error) throw new Error(data.error);

      return data.clients || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao buscar clientes salvos";
      setError(message);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSyncLogs = async (): Promise<any[]> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("bitrix-sync", {
        body: { action: "get_sync_logs", data: { limit: 10 } },
      });

      if (fnError) throw new Error(fnError.message);
      return data.logs || [];
    } catch (err) {
      console.error("Error fetching sync logs:", err);
      return [];
    }
  };

  const searchClients = async (query: string): Promise<BitrixClient[]> => {
    if (!query.trim()) return [];

    try {
      const { data, error: fnError } = await supabase.functions.invoke("bitrix-sync", {
        body: { action: "search_companies", data: { query } },
      });

      if (fnError) throw new Error(fnError.message);
      if (data.error) throw new Error(data.error);

      return data || [];
    } catch (err) {
      console.error("Search error:", err);
      return [];
    }
  };

  return {
    fetchClients,
    fetchDeals,
    syncAll,
    searchClients,
    fetchStoredClients,
    fetchSyncLogs,
    isLoading,
    isSyncing,
    syncResult,
    error,
  };
}
