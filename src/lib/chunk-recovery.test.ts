import { describe, it, expect, beforeEach, vi } from 'vitest';

// Como o chunk-recovery usa sessionStorage e location, precisamos mockar o ambiente global
const STORAGE_KEY = "__chunk_recovery__";

// Simulação simplificada do que está no chunk-recovery.ts para teste unitário das funções puras
// (Em um cenário real, poderíamos importar se o módulo fosse exportado adequadamente)
interface RecoveryState {
  attempts: number;
  firstAt: number;
  lastUrl?: string;
  version?: string;
}

function readState(): RecoveryState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { attempts: 0, firstAt: 0 };
    const parsed = JSON.parse(raw) as RecoveryState;
    const WINDOW_MS = 30_000;
    if (Date.now() - parsed.firstAt > WINDOW_MS) {
      return { attempts: 0, firstAt: 0 };
    }
    return parsed;
  } catch {
    return { attempts: 0, firstAt: 0 };
  }
}

describe('Chunk Recovery State Logic', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  it('deve retornar estado vazio quando não há nada no storage', () => {
    const state = readState();
    expect(state.attempts).toBe(0);
    expect(state.firstAt).toBe(0);
  });

  it('deve recuperar o estado corretamente do storage', () => {
    const now = Date.now();
    const mockState = { attempts: 1, firstAt: now, version: '1.0.0' };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mockState));
    
    const state = readState();
    expect(state.attempts).toBe(1);
    expect(state.version).toBe('1.0.0');
  });

  it('deve resetar o estado se a janela WINDOW_MS (30s) tiver passado', () => {
    const now = Date.now();
    const mockState = { attempts: 1, firstAt: now - 31_000 }; // 31 segundos atrás
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mockState));
    
    const state = readState();
    expect(state.attempts).toBe(0);
  });

  it('deve lidar com JSON inválido no storage', () => {
    sessionStorage.setItem(STORAGE_KEY, 'invalid-json{');
    const state = readState();
    expect(state.attempts).toBe(0);
  });
});
