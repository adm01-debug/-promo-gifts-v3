/**
 * Repository: Técnicas de Personalização
 * 
 * Abstrai acesso a dados de técnicas.
 * Único ponto de acesso ao BD externo para técnicas.
 */

import { invokeExternalDb, invokeExternalDbSingle } from '@/lib/external-db';
import { transformRawToTecnicas, rawToTecnicaUnificada } from '../transformers';
import type { TecnicaUnificada, PersonalizationTechniqueRaw } from '@/types/tecnica-unificada';

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
// REPOSITORY
// ============================================

/**
 * Busca todas as técnicas com filtros opcionais
 */
export async function findAll(options: TechniqueQueryOptions = {}): Promise<TecnicaUnificada[]> {
  const { filters, orderBy, limit = 100, offset } = options;

  // Construir filtros para o BD
  const dbFilters: Record<string, unknown> = {};
  
  if (filters?.isActive !== undefined) {
    dbFilters.is_active = filters.isActive;
  }
  if (filters?.category) {
    dbFilters.category = filters.category;
  }
  if (filters?.requiresColors !== undefined) {
    dbFilters.requires_color_count = filters.requiresColors;
  }
  if (filters?.priceByArea !== undefined) {
    dbFilters.price_by_area = filters.priceByArea;
  }
  if (filters?.priceByStitches !== undefined) {
    dbFilters.price_by_stitches = filters.priceByStitches;
  }
  if (filters?.appliesToCurved !== undefined) {
    dbFilters.applies_to_curved = filters.appliesToCurved;
  }

  const result = await invokeExternalDb<PersonalizationTechniqueRaw>({
    table: 'personalization_techniques',
    operation: 'select',
    filters: Object.keys(dbFilters).length > 0 ? dbFilters : undefined,
    orderBy: orderBy ? { 
      column: mapOrderByColumn(orderBy.column), 
      ascending: orderBy.ascending ?? true 
    } : { column: 'display_order', ascending: true },
    limit,
    offset,
  });

  let tecnicas = transformRawToTecnicas(result.records);

  // Filtro de busca textual (pós-query)
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
  const result = await invokeExternalDb<PersonalizationTechniqueRaw>({
    table: 'personalization_techniques',
    operation: 'select',
    filters: { id },
    limit: 1,
  });

  const raw = result.records[0];
  return raw ? rawToTecnicaUnificada(raw) : null;
}

/**
 * Busca técnica por código
 */
export async function findByCode(code: string): Promise<TecnicaUnificada | null> {
  const result = await invokeExternalDb<PersonalizationTechniqueRaw>({
    table: 'personalization_techniques',
    operation: 'select',
    filters: { code },
    limit: 1,
  });

  const raw = result.records[0];
  return raw ? rawToTecnicaUnificada(raw) : null;
}

/**
 * Busca técnicas ativas (resumo para dropdowns)
 */
export async function findActiveForDropdown(): Promise<Pick<TecnicaUnificada, 'id' | 'codigo' | 'nome' | 'categoria'>[]> {
  const result = await invokeExternalDb<PersonalizationTechniqueRaw>({
    table: 'personalization_techniques',
    operation: 'select',
    select: 'id,code,name,category',
    filters: { is_active: true },
    orderBy: { column: 'name', ascending: true },
  });

  return result.records.map(raw => ({
    id: raw.id,
    codigo: raw.code,
    nome: raw.name,
    categoria: raw.category,
  }));
}

/**
 * Lista categorias únicas
 */
export async function findCategories(): Promise<string[]> {
  const tecnicas = await findAll({ filters: { isActive: true } });
  return [...new Set(tecnicas.map(t => t.categoria))].sort();
}

/**
 * Cria nova técnica
 */
export async function create(data: Partial<PersonalizationTechniqueRaw>): Promise<void> {
  await invokeExternalDbSingle({
    table: 'personalization_techniques',
    operation: 'insert',
    data,
  });
}

/**
 * Atualiza técnica existente
 */
export async function update(id: string, data: Partial<PersonalizationTechniqueRaw>): Promise<void> {
  await invokeExternalDbSingle({
    table: 'personalization_techniques',
    operation: 'update',
    id,
    data,
  });
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
  await invokeExternalDbSingle({
    table: 'personalization_techniques',
    operation: 'delete',
    id,
  });
}

// ============================================
// HELPERS
// ============================================

function mapOrderByColumn(column: TechniqueOrderBy['column']): string {
  const mapping: Record<string, string> = {
    name: 'name',
    code: 'code',
    display_order: 'display_order',
    created_at: 'created_at',
  };
  return mapping[column] || 'display_order';
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
