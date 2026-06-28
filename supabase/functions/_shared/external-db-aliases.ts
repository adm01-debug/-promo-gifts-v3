// supabase/functions/_shared/external-db-aliases.ts
// Alias resolution and field mapping for external DB schema compatibility

// ============================================
// Table alias detection
// ============================================

export function isTechniqueTableAlias(table: string) {
  return table === 'personalization_techniques' || table === 'tecnica_gravacao';
}

export function isTechniqueVarianteAlias(table: string) {
  return table === 'tecnica_gravacao_variante';
}

export function isCustomizationPriceTablesAlias(table: string) {
  return table === 'customization_price_tables' || table === 'customization_price_tiers';
}

export function isGroupMemberAlias(table: string) {
  return table === 'product_group_members';
}

function isProductsTable(table: string) {
  return table === 'products';
}

// ============================================
// Product read compatibility
// ============================================

const PRODUCT_READ_FIELD_RENAME_MAP: Record<string, string> = {
  active: 'is_active',
};

function mapProductReadFieldToExternal(field: string): string {
  return PRODUCT_READ_FIELD_RENAME_MAP[field] ?? field;
}

function mapProductOrderColumnToExternal(column: string): string {
  return mapProductReadFieldToExternal(column);
}

function mapProductSelectTokenToExternal(rawToken: string): string | null {
  const token = rawToken.trim();
  if (!token) return null;
  if (token === '*') return token;
  if (token.includes('(')) return token;

  const aliasSeparator = token.indexOf(':');
  const alias = aliasSeparator >= 0 ? token.slice(0, aliasSeparator).trim() : '';
  const columnExpression = aliasSeparator >= 0 ? token.slice(aliasSeparator + 1).trim() : token;
  const [baseColumn, ...jsonPathParts] = columnExpression.split('->');
  const externalBaseColumn = mapProductReadFieldToExternal(baseColumn.trim());
  const externalExpression = [externalBaseColumn, ...jsonPathParts].join('->');

  if (alias) return `${alias}:${externalExpression}`;

  // O BD externo usa `is_active`; mantemos `active` como alias virtual para
  // compatibilidade com chamadas antigas sem consultar uma coluna inexistente.
  if (baseColumn.trim() === 'active') return 'active:is_active';
  return externalExpression;
}

export function sanitizeProductSelectForExternal(select: string | undefined) {
  if (!select || select.trim() === '' || select.trim() === '*') return select;
  const mapped = select
    .split(',')
    .map(mapProductSelectTokenToExternal)
    .filter((token): token is string => Boolean(token));
  return mapped.length > 0 ? mapped.join(',') : select;
}

export function mapProductFiltersToExternal(filters: Record<string, unknown> | undefined) {
  if (!filters) return undefined;
  const out: Record<string, unknown> = { ...filters };
  if ('active' in out) {
    if (!('is_active' in out)) out.is_active = out.active;
    delete out.active;
  }
  return out;
}

export function mapProductOrderByToExternal(orderBy: { column: string; ascending?: boolean } | undefined) {
  if (!orderBy) return undefined;
  return { ...orderBy, column: mapProductOrderColumnToExternal(orderBy.column) };
}

// ============================================
// Product field sanitization
// ============================================

const PRODUCT_COLUMNS_NOT_IN_EXTERNAL_SCHEMA = new Set([
  'cest', 'freight_class', 'default_carrier', 'shipping_weight_kg',
  'shipping_width_cm', 'shipping_height_cm', 'shipping_length_cm',
  'cubic_weight', 'requires_special_shipping', 'shipping_notes',
  'cfop', 'csosn', 'icms_rate', 'pis_rate', 'cofins_rate', 'tax_regime',
  'stock_unit', 'has_commercial_packaging',
  'box_internal_height_cm', 'box_internal_width_cm', 'box_internal_length_cm',
  'country_of_origin', 'image_url',
]);

const PRODUCT_FIELD_RENAME_MAP: Record<string, string> = {
  'country_of_origin': 'origin_country',
};

export function sanitizeExternalWriteData(table: string, data: Record<string, unknown>) {
  if (table !== 'products') return data;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'active') {
      if (!Object.prototype.hasOwnProperty.call(data, 'is_active')) result.is_active = value;
      continue;
    }
    if (PRODUCT_COLUMNS_NOT_IN_EXTERNAL_SCHEMA.has(key)) {
      const renamed = PRODUCT_FIELD_RENAME_MAP[key];
      if (renamed) result[renamed] = value;
      continue;
    }
    result[key] = value;
  }
  return result;
}

// ============================================
// Price table mapping (customization_price_tables → tabela_preco_fornecedores_gravacao)
// ============================================

export function mapPriceTableFiltersToExternal(filters: Record<string, unknown> | undefined) {
  if (!filters) return undefined;
  const out: Record<string, unknown> = { ...filters };
  if ('table_code' in out) { out.tecnica_codigo = out.table_code; delete out.table_code; }
  if ('table_code_option' in out) { out.table_code = out.table_code_option; delete out.table_code_option; }
  if ('table_fullcode' in out) { out.table_code = out.table_fullcode; delete out.table_fullcode; }
  if ('technique_id' in out) { delete out.technique_id; }
  if ('customization_type_name' in out) { out.tecnica_codigo = out.customization_type_name; delete out.customization_type_name; }
  return out;
}

// ============================================
// Group member mapping (product_group_members → product_group_members)
// ============================================

export function mapGroupMemberFiltersToExternal(filters: Record<string, unknown> | undefined) {
  if (!filters) return undefined;
  const out: Record<string, unknown> = { ...filters };
  // Rename group_id to product_group_id if it exists in filters
  if ('group_id' in out) {
    out.product_group_id = out.group_id;
    delete out.group_id;
  }
  return out;
}


export function mapPriceTableOrderByToExternal(orderBy: { column: string; ascending?: boolean } | undefined) {
  if (!orderBy) return { column: 'table_code', ascending: true };
  const columnMap: Record<string, string> = {
    'table_code': 'table_code', 'table_code_option': 'table_code',
    'customization_type_name': 'tecnica_codigo', 'max_colors': 'max_colors',
    'display_order': 'table_code', 'is_active': 'is_active',
  };
  return { column: columnMap[orderBy.column] || 'table_code', ascending: orderBy.ascending ?? true };
}

export function mapPriceTableRowToLegacyShape(row: Record<string, unknown>) {
  return {
    ...row,
    id: row.id,
    table_code: row.table_code,
    table_code_option: row.table_code,
    table_fullcode: row.table_code,
    customization_type_name: row.tecnica_codigo,
    tecnica_codigo: row.tecnica_codigo,
    max_colors: row.max_colors,
    max_area_width_cm: row.max_area_width_cm,
    max_area_height_cm: row.max_area_height_cm,
    price_by_color: row.price_by_color ?? false,
    price_by_area: row.price_by_area ?? false,
    setup_price: row.setup_price ?? 0,
    handling_price: 0,
    is_active: row.is_active ?? true,
    min_qty_1: row.min_qty_1, min_qty_2: row.min_qty_2, min_qty_3: row.min_qty_3,
    min_qty_4: row.min_qty_4, min_qty_5: row.min_qty_5,
    price_1: row.price_1, price_2: row.price_2, price_3: row.price_3,
    price_4: row.price_4, price_5: row.price_5,
  };
}

// ============================================
// Technique mapping (personalization_techniques → tabela_preco_gravacao_oficial)
// ============================================

export function mapTechniqueFiltersToExternal(filters: Record<string, unknown> | undefined) {
  if (!filters) return undefined;
  const out: Record<string, unknown> = { ...filters };
  if ('is_active' in out) { out.ativo = out.is_active; delete out.is_active; }
  if ('code' in out) { out.codigo = out.code; delete out.code; }
  if ('name' in out) { out.nome = out.name; delete out.name; }
  if ('description' in out) { out.descricao = out.description; delete out.description; }
  if ('max_colors' in out) { out.max_cores = out.max_colors; delete out.max_colors; }
  if ('estimated_days' in out) { out.tempo_producao_dias = out.estimated_days; delete out.estimated_days; }
  return out;
}

export function mapTechniqueOrderByToExternal(orderBy: { column: string; ascending?: boolean } | undefined) {
  if (!orderBy) return { column: 'nome', ascending: true };
  const columnMap: Record<string, string> = {
    name: 'nome', nome: 'nome', code: 'codigo', codigo: 'codigo',
    is_active: 'ativo', ativo: 'ativo', estimated_days: 'tempo_producao_dias',
    tempo_producao_dias: 'tempo_producao_dias', ordem_exibicao: 'nome', display_order: 'nome',
  };
  return { ...orderBy, column: columnMap[orderBy.column] ?? orderBy.column };
}

export function mapTechniqueRowToLegacyShape(row: Record<string, unknown>) {
  const codigo = (row.codigo as string | undefined) ?? null;
  const nome = (row.nome as string | undefined) ?? '';
  const descricao = (row.descricao as string | undefined) ?? null;
  const ativo = (row.ativo as boolean | undefined) ?? true;
  const tempo = (row.tempo_producao_dias as number | undefined) ?? null;
  const maxCores = typeof row.max_cores === 'number' ? row.max_cores : null;
  const cobraPorCor = (row.cobra_por_cor as boolean | undefined) ?? false;
  const custoSetup = typeof row.custo_setup === 'number' ? row.custo_setup : 0;

  return {
    ...row,
    codigo, codigo_interno: (row.codigo_curto as string | undefined) ?? codigo,
    nome, slug: (row.slug_grupo as string | undefined) ?? '',
    descricao,
    permite_cores: maxCores != null && maxCores > 0,
    max_cores: maxCores, cobra_por_cor: cobraPorCor,
    cobra_por_area: false, cobra_por_pontos: false,
    requer_setup: custoSetup > 0,
    tipo_setup: custoSetup > 0 ? 'arte_digital' : 'nenhum',
    tempo_producao_dias: tempo,
    ordem_exibicao: (row.ordem_exibicao as number | undefined) ?? 0,
    ativo,
    code: codigo, name: nome, description: descricao,
    is_active: ativo, estimated_days: tempo,
    requires_color_count: maxCores != null && maxCores > 0,
    max_colors: maxCores,
    display_order: (row.ordem_exibicao as number | undefined) ?? 0,
    price_by_color: cobraPorCor, price_by_area: false,
    setup_cost: custoSetup, unit_cost: null, min_quantity: null,
    setup_price: custoSetup,
    handling_price: (row.custo_manuseio as number | undefined) ?? 0,
    grupo_tecnica: row.grupo_tecnica, nome_grupo: row.nome_grupo,
    slug_grupo: row.slug_grupo,
    ordem_grupo: (row.ordem_exibicao as number | undefined) ?? 0,
    custo_setup: custoSetup, custo_aplicacao: row.custo_aplicacao,
    cobra_aplicacao: row.cobra_aplicacao,
  };
}

// ============================================
// Resolve alias: returns the real table name and applies filter/order transforms
// ============================================
export interface AliasResolution {
  table: string;
  filters?: Record<string, unknown>;
  orderBy?: { column: string; ascending?: boolean };
  select: string;
  aliasType: 'technique' | 'variante' | 'priceTable' | 'groupMember' | null;
  parentTechniqueId?: unknown;
}

export function resolveTableAlias(
  table: string,
  filters?: Record<string, unknown>,
  orderBy?: { column: string; ascending?: boolean },
  select?: string,
): AliasResolution {
  if (isProductsTable(table)) {
    return {
      table: 'products',
      filters: mapProductFiltersToExternal(filters),
      orderBy: mapProductOrderByToExternal(orderBy),
      select: sanitizeProductSelectForExternal(select) || '*',
      aliasType: null,
    };
  }

  if (isTechniqueTableAlias(table)) {
    return {
      table: 'tabela_preco_gravacao_oficial',
      filters: mapTechniqueFiltersToExternal(filters),
      orderBy: mapTechniqueOrderByToExternal(orderBy),
      select: '*',
      aliasType: 'technique',
    };
  }

  if (isTechniqueVarianteAlias(table)) {
    let parentTechniqueId: unknown;
    const resolvedFilters = filters ? { ...filters } : undefined;
    if (resolvedFilters?.tecnica_gravacao_id) {
      parentTechniqueId = resolvedFilters.tecnica_gravacao_id;
      delete resolvedFilters.tecnica_gravacao_id;
    }
    return {
      table: 'tabela_preco_gravacao_oficial',
      filters: resolvedFilters,
      select: '*',
      aliasType: 'variante',
      parentTechniqueId,
      orderBy,
    };
  }

  if (isCustomizationPriceTablesAlias(table)) {
    return {
      table: 'tabela_preco_fornecedores_gravacao',
      filters: mapPriceTableFiltersToExternal(filters),
      orderBy: mapPriceTableOrderByToExternal(orderBy),
      select: '*',
      aliasType: 'priceTable',
    };
  }

  if (isGroupMemberAlias(table)) {
    return {
      table: 'product_group_members',
      filters: mapGroupMemberFiltersToExternal(filters),
      orderBy,
      select: select || '*',
      aliasType: 'groupMember',
    };
  }

  return { table, filters, orderBy, select: select || '*', aliasType: null };
}
