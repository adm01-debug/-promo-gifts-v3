/**
 * Repository: Técnicas de Personalização
 * 
 * Abstrai acesso a dados de técnicas.
 * NOTA: Usa Supabase LOCAL (personalization_techniques existe aqui, não no BD externo)
 */

import { supabase } from '@/integrations/supabase/client';
import type { TecnicaUnificada } from '@/types/tecnica-unificada';

// ============================================
// TYPES
// ============================================

export interface TechniqueFilters {
  isActive?: boolean;
  category?: string;
  requiresColors?: boolean;
  priceByArea?: boolean;
  priceByStitches?: boolean;
  appliesToCurved?: boolean;
  search?: string;
}

export interface TechniqueOrderBy {
  column: 'name' | 'code' | 'display_order' | 'created_at';
  ascending?: boolean;
}

export interface TechniqueQueryOptions {
  filters?: TechniqueFilters;
  orderBy?: TechniqueOrderBy;
  limit?: number;
  offset?: number;
}

// ============================================
// TRANSFORMER
// ============================================

type LocalTechniqueRow = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  is_active: boolean | null;
  setup_cost: number | null;
  unit_cost: number | null;
  min_quantity: number | null;
  estimated_days: number | null;
  created_at: string;
  updated_at: string;
};

function localToTecnicaUnificada(row: LocalTechniqueRow): TecnicaUnificada {
  return {
    id: row.id,
    codigo: row.code || '',
    codigoFornecedor: null,
    codigoStricker: null,
    nome: row.name,
    descricao: row.description,
    categoria: 'geral',
    icone: null,
    permiteCores: true,
    minCores: 1,
    maxCores: 12,
    precoPorCor: false,
    precoCorExtra: 0,
    precoPorArea: false,
    precoPorPontos: false,
    areaMinimaCm2: null,
    areaMaximaCm2: null,
    pontosMaximos: null,
    custoSetup: row.setup_cost || 0,
    custoManuseio: 0,
    multiplicadorCusto: 1,
    quantidadeMinima: row.min_quantity,
    prazoEstimado: row.estimated_days,
    aplicaSuperficieCurva: false,
    promptSuffix: null,
    ativo: row.is_active ?? true,
    ordemExibicao: 0,
    fonte: 'externo',
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

// ============================================
// REPOSITORY
// ============================================

/**
 * Busca todas as técnicas com filtros opcionais
 */
export async function findAll(options: TechniqueQueryOptions = {}): Promise<TecnicaUnificada[]> {
  const { filters, orderBy, limit = 100 } = options;

  let query = supabase
    .from('personalization_techniques')
    .select('*');

  // Filtros diretos
  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  // Ordenação
  if (orderBy) {
    const colMap: Record<string, string> = {
      name: 'name',
      code: 'code',
      display_order: 'name', // BD local não tem display_order
      created_at: 'created_at',
    };
    query = query.order(colMap[orderBy.column] || 'name', { ascending: orderBy.ascending ?? true });
  } else {
    query = query.order('name', { ascending: true });
  }

  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error('Repository findAll error:', error);
    throw error;
  }

  let tecnicas = (data || []).map(localToTecnicaUnificada);

  // Filtros pós-query
  if (filters?.search) {
    const search = filters.search.toLowerCase();
    tecnicas = tecnicas.filter(t =>
      t.nome.toLowerCase().includes(search) ||
      t.codigo.toLowerCase().includes(search) ||
      t.descricao?.toLowerCase().includes(search)
    );
  }

  return tecnicas;
}

/**
 * Busca técnica por ID
 */
export async function findById(id: string): Promise<TecnicaUnificada | null> {
  const { data, error } = await supabase
    .from('personalization_techniques')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Repository findById error:', error);
    throw error;
  }

  return data ? localToTecnicaUnificada(data) : null;
}

/**
 * Busca técnica por código
 */
export async function findByCode(code: string): Promise<TecnicaUnificada | null> {
  const { data, error } = await supabase
    .from('personalization_techniques')
    .select('*')
    .eq('code', code)
    .maybeSingle();

  if (error) {
    console.error('Repository findByCode error:', error);
    throw error;
  }

  return data ? localToTecnicaUnificada(data) : null;
}

/**
 * Busca técnicas ativas (resumo para dropdowns)
 */
export async function findActiveForDropdown(): Promise<Pick<TecnicaUnificada, 'id' | 'codigo' | 'nome' | 'categoria'>[]> {
  const { data, error } = await supabase
    .from('personalization_techniques')
    .select('id, code, name')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Repository findActiveForDropdown error:', error);
    throw error;
  }

  return (data || []).map(row => ({
    id: row.id,
    codigo: row.code || '',
    nome: row.name,
    categoria: 'geral',
  }));
}

/**
 * Lista categorias únicas
 */
export async function findCategories(): Promise<string[]> {
  // BD local não tem campo categoria - retorna default
  return ['geral'];
}

/**
 * Cria nova técnica
 */
export async function create(data: { 
  name: string; 
  code?: string; 
  description?: string;
  setup_cost?: number;
  unit_cost?: number;
  min_quantity?: number;
  estimated_days?: number;
  is_active?: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from('personalization_techniques')
    .insert(data);

  if (error) {
    console.error('Repository create error:', error);
    throw error;
  }
}

/**
 * Atualiza técnica existente
 */
export async function update(id: string, data: Partial<{
  name: string;
  code: string;
  description: string;
  setup_cost: number;
  unit_cost: number;
  min_quantity: number;
  estimated_days: number;
  is_active: boolean;
}>): Promise<void> {
  const { error } = await supabase
    .from('personalization_techniques')
    .update(data)
    .eq('id', id);

  if (error) {
    console.error('Repository update error:', error);
    throw error;
  }
}

/**
 * Alterna status ativo/inativo
 */
export async function toggleActive(id: string, isActive: boolean): Promise<void> {
  await update(id, { is_active: isActive });
}

/**
 * Remove técnica
 */
export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('personalization_techniques')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Repository remove error:', error);
    throw error;
  }
}

// ============================================
// EXPORTS
// ============================================

export const TechniqueRepository = {
  findAll,
  findById,
  findByCode,
  findActiveForDropdown,
  findCategories,
  create,
  update,
  toggleActive,
  remove,
};

export default TechniqueRepository;
