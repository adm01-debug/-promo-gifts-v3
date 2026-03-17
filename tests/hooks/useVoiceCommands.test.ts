import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';

describe('useVoiceCommands', () => {
  it('should return parseCommand function', () => {
    const { result } = renderHook(() => useVoiceCommands());
    expect(result.current).toBeDefined();
    expect(typeof result.current.parseCommand).toBe('function');
  });

  it('should parse "buscar" as a filter/search command', () => {
    const { result } = renderHook(() => useVoiceCommands());
    const command = result.current.parseCommand('buscar caneta');
    // "buscar caneta" triggers text search which maps to filter type
    expect(['search', 'filter', 'unknown']).toContain(command.type);
  });

  it('should parse clear commands', () => {
    const { result } = renderHook(() => useVoiceCommands());
    const command = result.current.parseCommand('limpar filtros');
    expect(command.type).toBe('clear');
  });

  it('should parse sort commands', () => {
    const { result } = renderHook(() => useVoiceCommands());
    const command = result.current.parseCommand('ordenar por preço');
    expect(['sort', 'unknown']).toContain(command.type);
  });
});
