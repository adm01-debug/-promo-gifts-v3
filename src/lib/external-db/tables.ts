/**
 * Constantes de tabelas e views do banco externo Promobrind.
 * Extraído de useExternalDatabase.ts para modularização.
 * 
 * ATUALIZADO 2026-03-26 — Validado contra schema real do BD externo.
 */

// ============================================
// Tabelas REAIS do BD externo (validadas)
// ============================================
export const PRODUCT_TABLES = [
  // Principais
  'products',
  'categories',
  'suppliers',
  'tags',
  // Produto — relacionamento
  'product_images',
  'product_videos',
  'product_variants',
  'product_materials',
  'product_tags',
  'product_category_assignments',   // antes: product_categories (fantasma)
  'product_kit_components',
  'product_properties',             // antes: product_attributes (fantasma)
  // Cores
  'color_groups',
  'color_nuances',
  'color_equivalences',
  'color_variations',
  'supplier_colors',
  // Materiais
  'material_groups',
  'material_types',
  'material_variations',
  'supplier_materials',
  // Atributos e definições
  'supplier_attribute_definitions',
  'supplier_property_mappings',     // antes: supplier_product_attributes (fantasma)
  'category_attributes',
  // Preços e variações
  'variation_types',
  'variation_values',
  // Estoque e Reposição
  'variant_supplier_sources',
  // Fornecedor — Filiais
  'supplier_branches',
  // Coleções
  'collections',
  'collection_products',
  // Público Alvo / Ramos de Atividade
  'ramo_atividade',
  'ramo_atividade_filho',
  'produto_ramo_atividade',
  // Técnicas de Gravação — tabelas REAIS
  'tecnicas_gravacao',                       // catálogo de técnicas (plural)
  'tabela_preco_gravacao_oficial',           // antes: customization_price_tables (fantasma)
  'tabela_preco_gravacao_oficial_faixa',     // antes: customization_price_tiers (fantasma)
  // Áreas de gravação por produto (SSOT)
  'print_area_techniques',
] as const;

// ============================================
// ALIASES do Bridge — NÃO são tabelas reais.
// O external-db-bridge mapeia esses nomes para tabelas reais.
// Mantidos para que o TypeScript aceite código legado que ainda
// referencia esses nomes até refatoração completa.
// ============================================
export const BRIDGE_ALIASES = [
  'tecnica_gravacao',              // → tabela_preco_gravacao_oficial
  'personalization_techniques',    // → tecnicas_gravacao
  'customization_price_tables',    // → tabela_preco_gravacao_oficial
  'customization_price_tiers',     // → tabela_preco_gravacao_oficial_faixa
] as const;

// Views e Materialized Views (somente leitura) — VALIDADAS
export const PRODUCT_VIEWS = [
  'v_products_with_tags',
  'v_products_min_price',
  'mv_product_compositions',
  'mv_material_group_stats',
  'categories_tree_visual',
] as const;

// Tabelas de EMPRESAS/CLIENTES — MIGRADAS para CRM externo (crm-db-bridge)
export const COMPANY_TABLES = [
  'client_contacts',
  'organizations',
] as const;

export type ProductTable = typeof PRODUCT_TABLES[number];
export type BridgeAlias = typeof BRIDGE_ALIASES[number];
export type ProductView = typeof PRODUCT_VIEWS[number];
export type CompanyTable = typeof COMPANY_TABLES[number];
export type ExternalTable = ProductTable | BridgeAlias | ProductView | CompanyTable;
