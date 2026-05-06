import { describe, it, expect } from 'vitest';
import React from 'react';
import { 
  TagsFilter, 
  TechniquesFilter, 
  QuickOptionsFilter,
  SearchableCheckboxList
} from '../components/filters/filter-panel/sections/SimpleFilters';
import { SizeFilter } from '../components/filters/filter-panel/sections/SizeFilter';
import { SupplierRiskPanel } from '../components/inventory/SupplierRiskPanel';

describe('JSX Tag Consistency & Component Integrity', () => {
  describe('SimpleFilters', () => {
    it('TagsFilter is defined and correctly exported', () => {
      expect(TagsFilter).toBeDefined();
    });

    it('TechniquesFilter is defined and correctly exported', () => {
      expect(TechniquesFilter).toBeDefined();
    });

    it('QuickOptionsFilter is defined and correctly exported', () => {
      expect(QuickOptionsFilter).toBeDefined();
    });

    it('SearchableCheckboxList is defined and correctly exported', () => {
      expect(SearchableCheckboxList).toBeDefined();
    });
  });

  describe('SizeFilter', () => {
    it('SizeFilter is defined and correctly exported', () => {
      expect(SizeFilter).toBeDefined();
    });
  });

  describe('Inventory', () => {
    it('SupplierRiskPanel is defined and correctly exported', () => {
      expect(SupplierRiskPanel).toBeDefined();
    });
  });

  it('All components should not have JSX parse errors in their files', () => {
    // This is implicitly tested by the imports above
    // If there were mismatched tags, Vitest would fail during test collection
    expect(true).toBe(true);
  });
});
