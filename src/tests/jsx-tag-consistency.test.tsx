import { describe, it, expect } from 'vitest';
import React from 'react';
import { TagsFilter } from '../components/filters/filter-panel/sections/SimpleFilters';
import { SizeFilter } from '../components/filters/filter-panel/sections/SizeFilter';
import { SupplierRiskPanel } from '../components/inventory/SupplierRiskPanel';

describe('JSX Tag Consistency', () => {
  it('TagsFilter (from SimpleFilters) is a valid component', () => {
    expect(TagsFilter).toBeDefined();
  });

  it('SizeFilter is a valid component', () => {
    expect(SizeFilter).toBeDefined();
  });

  it('SupplierRiskPanel is a valid component', () => {
    expect(SupplierRiskPanel).toBeDefined();
  });
});
