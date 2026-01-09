import { supabase } from "@/integrations/supabase/client";

// Tipos
export interface MaterialGroup {
  group_id: string;
  group_name: string;
  group_slug: string;
  group_description: string | null;
  group_hex_code: string | null;
  group_icon: string | null;
  display_order: number;
  total_materials: number;
  products_using: number;
}

export interface MaterialType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  properties: Record<string, any> | null;
  display_order: number;
  is_active: boolean;
  group_id: string;
  group_name?: string;
  group_slug?: string;
}

export interface MaterialComplete {
  type_id: string;
  type_name: string;
  type_slug: string;
  type_description: string | null;
  type_properties: Record<string, any> | null;
  type_display_order: number;
  group_id: string;
  group_name: string;
  group_slug: string;
  group_description: string | null;
  group_hex_code: string | null;
  group_icon: string | null;
  group_display_order: number;
}

// Service para chamadas à API de materiais
class MaterialService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/materials-api`;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || ''}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    };
  }

  private async callApi<T>(action: string, params: Record<string, any> = {}): Promise<T> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, ...params }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao buscar materiais');
    }

    const result = await response.json();
    // A API retorna diretamente os dados (ex: { groups, count })
    return result;
  }

  // Buscar todos os grupos de materiais com estatísticas
  async getGroups(): Promise<{ groups: MaterialGroup[]; count: number }> {
    return this.callApi('groups');
  }

  // Buscar todos os tipos de materiais
  async getTypes(): Promise<{ types: MaterialType[]; count: number }> {
    return this.callApi('types');
  }

  // Buscar tipos de um grupo específico por slug
  async getTypesByGroupSlug(groupSlug: string): Promise<{ types: MaterialType[]; count: number; groupSlug: string }> {
    return this.callApi('types_by_group', { groupId: groupSlug });
  }

  // Buscar materiais completos (tipos + grupos)
  async getComplete(): Promise<{ materials: MaterialComplete[]; count: number }> {
    return this.callApi('complete');
  }

  // Buscar estatísticas gerais
  async getStats(): Promise<{ 
    groups: MaterialGroup[]; 
    summary: { totalGroups: number; totalMaterials: number; totalProducts: number } 
  }> {
    return this.callApi('stats');
  }

  // Buscar materiais por termo
  async search(searchTerm: string): Promise<{ types: MaterialComplete[]; count: number; search: string }> {
    return this.callApi('search', { search: searchTerm });
  }

  // Buscar materiais de um produto específico
  async getProductMaterials(productId: string): Promise<{ materials: any[]; count: number; productId: string }> {
    return this.callApi('product_materials', { productId });
  }
}

export const materialService = new MaterialService();
