import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { SimpleFilters } from '../components/filters/filter-panel/sections/SimpleFilters';
import { SizeFilter } from '../components/filters/filter-panel/sections/SizeFilter';
import { SupplierRiskPanel } from '../components/inventory/SupplierRiskPanel';
import { ThemeProvider } from '../contexts/ThemeContext';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock filters state
const mockFilters = {
  tags: [],
  suppliers: [],
  categories: [],
  search: '',
};

const queryClient = new QueryClient();

describe('JSX Tag Consistency', () => {
  it('SimpleFilters renders without crashing', () => {
    // If there were mismatched tags, the component wouldn't even transpile/load
    // but rendering it ensures the current version is valid
    render(
      <QueryClientProvider client={queryClient}>
        <SimpleFilters 
          filters={mockFilters as any} 
          toggleArrayFilter={() => {}} 
        />
      </QueryClientProvider>
    );
  });

  it('SizeFilter renders without crashing', () => {
    render(
      <SizeFilter 
        selectedSizes={[]} 
        onToggleSize={() => {}} 
      />
    );
  });

  it('SupplierRiskPanel renders without crashing', () => {
    render(
      <BrowserRouter>
        <SupplierRiskPanel 
          supplierId="test" 
          isOpen={true} 
          onOpenChange={() => {}} 
        />
      </BrowserRouter>
    );
  });
});
