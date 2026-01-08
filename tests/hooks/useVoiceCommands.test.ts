import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';

describe('useVoiceCommands', () => {
  it('should return parseCommand function', () => {
    const { result } = renderHook(() => useVoiceCommands());
    
    expect(result.current).toBeDefined();
    expect(typeof result.current.parseCommand).toBe('function');
  });

  it('should parse search commands', () => {
    const { result } = renderHook(() => useVoiceCommands());
    
    const command = result.current.parseCommand('buscar caneta');
    expect(command.type).toBe('search');
  });

  it('should parse clear commands', () => {
    const { result } = renderHook(() => useVoiceCommands());
    
    const command = result.current.parseCommand('limpar filtros');
    expect(command.type).toBe('clear');
  });
});
