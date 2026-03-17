import { describe, it, expect } from 'vitest';
import { PRODUCT_TABLES, PRODUCT_VIEWS, COMPANY_TABLES } from '@/lib/external-db/tables';

describe('External DB Tables constants', () => {
  it('contains core product tables', () => {
    expect(PRODUCT_TABLES).toContain('products');
    expect(PRODUCT_TABLES).toContain('categories');
    expect(PRODUCT_TABLES).toContain('suppliers');
    expect(PRODUCT_TABLES).toContain('product_images');
    expect(PRODUCT_TABLES).toContain('product_variants');
  });

  it('contains personalization technique tables', () => {
    expect(PRODUCT_TABLES).toContain('personalization_techniques');
    expect(PRODUCT_TABLES).toContain('customization_price_tables');
    expect(PRODUCT_TABLES).toContain('tecnica_gravacao');
  });

  it('contains color tables', () => {
    expect(PRODUCT_TABLES).toContain('color_groups');
    expect(PRODUCT_TABLES).toContain('color_variations');
    expect(PRODUCT_TABLES).toContain('supplier_colors');
  });

  it('contains material tables', () => {
    expect(PRODUCT_TABLES).toContain('material_groups');
    expect(PRODUCT_TABLES).toContain('material_types');
  });

  it('has views for aggregated data', () => {
    expect(PRODUCT_VIEWS).toContain('v_products_with_techniques');
    expect(PRODUCT_VIEWS).toContain('v_products_with_stock');
    expect(PRODUCT_VIEWS).toContain('mv_product_compositions');
  });

  it('has CRM company tables', () => {
    expect(COMPANY_TABLES).toContain('client_contacts');
    expect(COMPANY_TABLES).toContain('organizations');
  });

  it('has no duplicates', () => {
    const allTables = [...PRODUCT_TABLES, ...PRODUCT_VIEWS, ...COMPANY_TABLES];
    const uniqueTables = new Set(allTables);
    expect(uniqueTables.size).toBe(allTables.length);
  });
});
