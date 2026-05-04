import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useGenericFuzzySearch } from './useGenericFuzzySearch';

describe('useGenericFuzzySearch', () => {
  const mockItems = [
    { id: 1, name: 'Caneta Esferográfica', category: 'Escrita' },
    { id: 2, name: 'Caderno Espiral', category: 'Papelaria' },
    { id: 3, name: 'Lápis de Cor', category: 'Escrita' },
    { id: 4, name: 'Caneca Térmica', category: 'Utensílios' },
  ];

  it('returns all items when query is empty', () => {
    const { result } = renderHook(() => 
      useGenericFuzzySearch(mockItems, '', ['name'])
    );
    expect(result.current.results).toHaveLength(4);
    expect(result.current.hasSearch).toBe(false);
  });

  it('filters items correctly with an exact match', () => {
    const { result } = renderHook(() => 
      useGenericFuzzySearch(mockItems, 'Caneta', ['name'])
    );
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].name).toBe('Caneta Esferográfica');
    expect(result.current.hasSearch).toBe(true);
  });

  it('performs fuzzy matching for typos', () => {
    // "Cantea" instead of "Caneta"
    const { result } = renderHook(() => 
      useGenericFuzzySearch(mockItems, 'Cantea', ['name'])
    );
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].name).toBe('Caneta Esferográfica');
  });

  it('respects minChars option', () => {
    const { result } = renderHook(() => 
      useGenericFuzzySearch(mockItems, 'Ca', ['name'], { minChars: 3 })
    );
    expect(result.current.results).toHaveLength(4); // Not searching yet
    expect(result.current.hasSearch).toBe(false);
  });

  it('searches across multiple keys with weights', () => {
    const { result } = renderHook(() => 
      useGenericFuzzySearch(mockItems, 'Escrita', [
        { name: 'name', weight: 0.1 },
        { name: 'category', weight: 0.9 }
      ])
    );
    // Should find Caneta and Lápis
    expect(result.current.results).toHaveLength(2);
    expect(result.current.results.every(i => i.category === 'Escrita')).toBe(true);
  });

  it('limits results with maxResults option', () => {
    const { result } = renderHook(() => 
      useGenericFuzzySearch(mockItems, 'C', ['name'], { maxResults: 2 })
    );
    expect(result.current.results).toHaveLength(2);
  });

  it('handles null/undefined query gracefully', () => {
    const { result } = renderHook(() => 
      // @ts-ignore
      useGenericFuzzySearch(mockItems, null, ['name'])
    );
    expect(result.current.results).toHaveLength(4);
    expect(result.current.hasSearch).toBe(false);
  });
});
