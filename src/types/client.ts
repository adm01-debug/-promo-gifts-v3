// src/types/client.ts
// Clientes do CRM (Bitrix)

export interface BitrixClient {
  id: string;
  bitrix_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  ramo: string | null;                     // Ramo de atividade
  nicho: string | null;                    // Nicho de mercado
  primary_color_name: string | null;       // Cor principal da marca
  primary_color_hex: string | null;
  logo_url: string | null;
  total_spent: number | null;
  last_purchase_date: string | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

// Deals/Negócios do Bitrix
export interface BitrixDeal {
  id: string;
  bitrix_id: string;
  bitrix_client_id: string;
  title: string;
  value: number | null;
  currency: string | null;
  stage: string | null;
  close_date: string | null;
  created_at_bitrix: string | null;
  synced_at: string;
  created_at: string;
}

// Filtros de busca
export interface ClientFilters {
  search?: string;
  ramo?: string;
  nicho?: string;
}
