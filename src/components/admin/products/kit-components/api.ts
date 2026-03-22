/**
 * API helpers for kit components and print areas
 */
import { supabase } from '@/integrations/supabase/client';
import type { KitComponent, PrintArea } from './types';

export async function fetchKitComponents(productId: string): Promise<KitComponent[]> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'product_kit_components',
      operation: 'select',
      filters: { kit_product_id: productId },
      limit: 100,
      orderBy: { column: 'display_order', ascending: true },
    },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao buscar componentes');
  return data.data?.records || [];
}

export async function createComponent(payload: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'product_kit_components', operation: 'insert', data: payload },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao criar componente');
}

export async function updateComponent(id: string, payload: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'product_kit_components', operation: 'update', id, data: payload },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao atualizar componente');
}

export async function deleteComponent(id: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'product_kit_components', operation: 'delete', id },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao excluir componente');
}

export async function fetchPrintAreas(componentId: string): Promise<PrintArea[]> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'kit_component_print_areas',
      operation: 'select',
      filters: { kit_component_id: componentId },
      limit: 50,
      orderBy: { column: 'display_order', ascending: true },
    },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao buscar áreas');
  return data.data?.records || [];
}

export async function createPrintArea(payload: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'kit_component_print_areas', operation: 'insert', data: payload },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao criar área');
}

export async function updatePrintArea(id: string, payload: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'kit_component_print_areas', operation: 'update', id, data: payload },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao atualizar área');
}

export async function deletePrintArea(id: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'kit_component_print_areas', operation: 'delete', id },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao excluir área');
}
