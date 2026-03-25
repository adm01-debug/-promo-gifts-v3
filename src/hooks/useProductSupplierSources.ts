import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SupplierSource {
  id: string;
  product_id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_sku: string | null;
  cost_price: number;
  sale_price: number;
  lead_time_days: number | null;
  stock_quantity: number;
  min_order_quantity: number;
  is_preferred: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type SupplierSourceInput = Omit<SupplierSource, 'id' | 'created_at' | 'updated_at'>;

export function useProductSupplierSources(productId?: string) {
  const [sources, setSources] = useState<SupplierSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSources = useCallback(async () => {
    if (!productId) { setSources([]); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_supplier_sources')
        .select('*')
        .eq('product_id', productId)
        .order('is_preferred', { ascending: false })
        .order('sale_price', { ascending: true });
      if (error) throw error;
      setSources((data as SupplierSource[]) || []);
    } catch (err: any) {
      console.error('Error fetching supplier sources:', err);
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  const addSource = useCallback(async (input: SupplierSourceInput) => {
    try {
      const { error } = await supabase
        .from('product_supplier_sources')
        .insert(input as any);
      if (error) throw error;
      toast.success('Fonte de fornecimento adicionada');
      await fetchSources();
      return true;
    } catch (err: any) {
      if (err.code === '23505') {
        toast.error('Este fornecedor já está vinculado a este produto');
      } else {
        toast.error('Erro ao adicionar fonte');
      }
      return false;
    }
  }, [fetchSources]);

  const updateSource = useCallback(async (id: string, updates: Partial<SupplierSourceInput>) => {
    try {
      const { error } = await supabase
        .from('product_supplier_sources')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
      toast.success('Fonte atualizada');
      await fetchSources();
      return true;
    } catch (err: any) {
      toast.error('Erro ao atualizar fonte');
      return false;
    }
  }, [fetchSources]);

  const removeSource = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('product_supplier_sources')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Fonte removida');
      await fetchSources();
      return true;
    } catch (err: any) {
      toast.error('Erro ao remover fonte');
      return false;
    }
  }, [fetchSources]);

  const setPreferred = useCallback(async (id: string) => {
    if (!productId) return false;
    try {
      // Remove preferred de todos
      await supabase
        .from('product_supplier_sources')
        .update({ is_preferred: false, updated_at: new Date().toISOString() } as any)
        .eq('product_id', productId);
      // Define o novo preferred
      await supabase
        .from('product_supplier_sources')
        .update({ is_preferred: true, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      toast.success('Fornecedor preferencial atualizado');
      await fetchSources();
      return true;
    } catch {
      toast.error('Erro ao definir preferencial');
      return false;
    }
  }, [productId, fetchSources]);

  return { sources, isLoading, addSource, updateSource, removeSource, setPreferred, refetch: fetchSources };
}
