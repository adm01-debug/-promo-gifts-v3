import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DevInfraGate } from '@/lib/system/dev-gate/DevInfraGate';
import { EnvGateProvider, LocalStorageGateProvider, parseGateFlag } from '@/lib/system/dev-gate/providers';
import type { GateFlagProvider } from '@/lib/system/dev-gate/types';

describe('parseGateFlag', () => {
  it('identifica valores verdadeiros', () => {
    expect(parseGateFlag('true')).toBe(true);
    expect(parseGateFlag('1')).toBe(true);
    expect(parseGateFlag('on')).toBe(true);
    expect(parseGateFlag('YES ')).toBe(true);
  });

  it('identifica valores falsos', () => {
    expect(parseGateFlag('false')).toBe(false);
    expect(parseGateFlag('0')).toBe(false);
    expect(parseGateFlag('off')).toBe(false);
    expect(parseGateFlag('no')).toBe(false);
  });

  it('retorna "auto" para valores desconhecidos ou vazios', () => {
    expect(parseGateFlag('maybe')).toBe('auto');
    expect(parseGateFlag('')).toBe('auto');
    expect(parseGateFlag(null)).toBe('auto');
    expect(parseGateFlag(undefined)).toBe('auto');
  });
});

describe('DevInfraGate', () => {
  it('deve retornar isDev quando todos os providers retornam "auto"', () => {
    const mockProvider: GateFlagProvider = { getFlag: () => 'auto' };
    const gate = new DevInfraGate([mockProvider]);
    
    expect(gate.shouldShow(true)).toBe(true);
    expect(gate.shouldShow(false)).toBe(false);
  });

  it('deve respeitar a precedência do primeiro provider que retornar um booleano', () => {
    const p1: GateFlagProvider = { getFlag: () => false };
    const p2: GateFlagProvider = { getFlag: () => true };
    const gate = new DevInfraGate([p1, p2]);
    
    // P1 tem precedência e diz false, ignorando P2 e isDev=true
    expect(gate.shouldShow(true)).toBe(false);
  });

  it('deve passar para o próximo provider se o primeiro for "auto"', () => {
    const p1: GateFlagProvider = { getFlag: () => 'auto' };
    const p2: GateFlagProvider = { getFlag: () => true };
    const gate = new DevInfraGate([p1, p2]);
    
    expect(gate.shouldShow(false)).toBe(true);
  });
});

describe('EnvGateProvider', () => {
  it('lê flag das variáveis de ambiente', () => {
    const provider = new EnvGateProvider();
    
    // Mock global import.meta.env
    const originalEnv = (import.meta as any).env;
    (import.meta as any).env = { VITE_SHOW_DEV_INFRA_MESSAGES: 'false' };
    
    try {
      expect(provider.getFlag()).toBe(false);
    } finally {
      (import.meta as any).env = originalEnv;
    }
  });
});

describe('LocalStorageGateProvider', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lê flag do localStorage', () => {
    const provider = new LocalStorageGateProvider('test_key');
    
    localStorage.setItem('test_key', 'true');
    expect(provider.getFlag()).toBe(true);
    
    localStorage.setItem('test_key', '0');
    expect(provider.getFlag()).toBe(false);
    
    localStorage.removeItem('test_key');
    expect(provider.getFlag()).toBe('auto');
  });

  it('falha silenciosamente se localStorage não estiver disponível', () => {
    const provider = new LocalStorageGateProvider();
    const originalGetItem = Storage.prototype.getItem;
    
    Storage.prototype.getItem = vi.fn(() => { throw new Error('Security Error'); });
    
    expect(provider.getFlag()).toBe('auto');
    
    Storage.prototype.getItem = originalGetItem;
  });
});
