/**
 * Constantes de tabelas e views do banco externo.
 * Extraído de useExternalDatabase.ts para modularização.
 */

// Tabelas de PRODUTOS (CRUD completo) - SINCRONIZADO COM BD EXTERNO 2026-01-30
export const PRODUCT_TABLES = [
  // Principais
  'products',
  'categories',
  'suppliers',
  'tags',
  // Produto relacionadas
  'product_images',
  'product_videos',
  'product_variants',
  'product_materials',
  'product_tags',
  'product_categories',
  'product_suppliers',
  'product_print_areas',
  'product_kit_components',
  'kit_component_media',
  'product_attributes',
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
  'supplier_product_attributes',
  'category_attributes',
  // Preços e variações
  'price_lists',
  'variant_cost_tiers',
  'variant_sale_prices',
  'variation_types',
  'variation_values',
  'stock_movements',
  // Fornecedor — Filiais
  'supplier_branches',
  // Coleções
  'collections',
  'collection_products',
  // Público Alvo / Ramos de Atividade
  'ramo_atividade',
  'ramo_atividade_filho',
  'produto_ramo_atividade',
  // Setores de negócio
  'business_sectors',
  // Mockups
  'mockup_drafts',
  'generated_mockups',
  // Técnicas de Personalização e Preços
  'personalization_techniques',
  'customization_price_tables',
  'customization_price_tiers',
  // Técnicas de Gravação - BD EXTERNO PROMOBRIND
  'tecnica_gravacao',
  'tecnica_gravacao_variante',
  'tecnica_faixa_area',
  'tecnica_faixa_pontos',
] as const;

// Views e Materialized Views (somente leitura)
export const PRODUCT_VIEWS = [
  'v_products_with_techniques',
  'v_products_with_stock',
  'v_products_with_tags',
  'v_products_min_price',
  'v_customization_price_summary',
  'v_variant_pricing_complete',
  'v_technique_stats',
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
export type ProductView = typeof PRODUCT_VIEWS[number];
export type CompanyTable = typeof COMPANY_TABLES[number];
export type ExternalTable = ProductTable | ProductView | CompanyTable;
