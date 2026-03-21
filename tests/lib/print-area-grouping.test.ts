import { describe, it, expect } from 'vitest';
import { groupPrintAreasToLocations } from '@/lib/print-area-grouping';

const makeArea = (overrides: Record<string, any> = {}) => ({
  area_id: 'area-1',
  area_code: 'LASER-01',
  area_name: 'Fiber Laser',
  component_name: 'Corpo',
  component_code: 'CORPO',
  location_name: 'Lado A',
  location_code: 'LADO-A',
  max_width: 5,
  max_height: 3,
  max_colors: 1,
  display_order: 1,
  is_primary: true,
  is_curved: false,
  customization_price_table_id: 'table-1',
  grupo_tecnica: 'Laser',
  cobra_por_cor: false,
  ...overrides,
});

describe('groupPrintAreasToLocations', () => {
  it('returns empty array for empty input', () => {
    expect(groupPrintAreasToLocations([])).toEqual([]);
  });

  it('groups areas by component_name + location_name', () => {
    const areas = [
      makeArea({ area_id: '1', area_name: 'Laser', display_order: 1 }),
      makeArea({ area_id: '2', area_name: 'UV Digital', display_order: 2 }),
    ];
    const result = groupPrintAreasToLocations(areas as any);
    expect(result).toHaveLength(1);
    expect(result[0].availableTechniques).toHaveLength(2);
  });

  it('creates separate groups for different locations', () => {
    const areas = [
      makeArea({ area_id: '1', location_name: 'Lado A' }),
      makeArea({ area_id: '2', location_name: 'Lado B' }),
    ];
    const result = groupPrintAreasToLocations(areas as any);
    expect(result).toHaveLength(2);
  });

  it('creates separate groups for different components', () => {
    const areas = [
      makeArea({ area_id: '1', component_name: 'Corpo' }),
      makeArea({ area_id: '2', component_name: 'Tampa' }),
    ];
    const result = groupPrintAreasToLocations(areas as any);
    expect(result).toHaveLength(2);
  });

  it('sorts groups by display_order', () => {
    const areas = [
      makeArea({ area_id: '1', component_name: 'Tampa', display_order: 10 }),
      makeArea({ area_id: '2', component_name: 'Corpo', display_order: 1 }),
    ];
    const result = groupPrintAreasToLocations(areas as any);
    expect(result[0].componentName).toBe('Corpo');
    expect(result[1].componentName).toBe('Tampa');
  });

  it('uses max dimensions across grouped areas', () => {
    const areas = [
      makeArea({ area_id: '1', max_width: 5, max_height: 3 }),
      makeArea({ area_id: '2', max_width: 10, max_height: 2 }),
    ];
    const result = groupPrintAreasToLocations(areas as any);
    expect(result[0].maxWidthCm).toBe(10);
    expect(result[0].maxHeightCm).toBe(3);
  });

  it('maps hasPricing from customization_price_table_id', () => {
    const areas = [
      makeArea({ area_id: '1', customization_price_table_id: 'abc' }),
      makeArea({ area_id: '2', customization_price_table_id: null }),
    ];
    const result = groupPrintAreasToLocations(areas as any);
    expect(result[0].availableTechniques[0].hasPricing).toBe(true);
    expect(result[0].availableTechniques[1].hasPricing).toBe(false);
  });

  it('defaults component_name to Principal when null', () => {
    const areas = [makeArea({ component_name: null })];
    const result = groupPrintAreasToLocations(areas as any);
    expect(result[0].componentName).toBe('Principal');
  });

  it('defaults location_name to area_name when null', () => {
    const areas = [makeArea({ location_name: null, area_name: 'Laser' })];
    const result = groupPrintAreasToLocations(areas as any);
    expect(result[0].locationName).toBe('Laser');
  });
});
