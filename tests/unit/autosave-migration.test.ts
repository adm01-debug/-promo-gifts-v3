import { describe, it, expect } from 'vitest';
import { migratePayload } from '../../src/hooks/useAutoSaveQuote';

describe('AutoSave Migration (Unit Tests)', () => {
  const CURRENT_VERSION = 2;

  it('deve restaurar corretamente um payload antigo sem versão (v1)', () => {
    const oldData = { items: [{ id: '1', name: 'Product' }], customerId: '123' };
    const migrated = migratePayload(oldData, CURRENT_VERSION);

    expect(migrated).not.toBeNull();
    expect(migrated.version).toBe(CURRENT_VERSION);
    expect(migrated.data).toEqual(oldData);
    expect(migrated.savedAt).toBeDefined();
  });

  it('deve manter um payload que já está na versão atual', () => {
    const currentPayload = {
      version: CURRENT_VERSION,
      data: { items: [] },
      savedAt: '2024-01-01T00:00:00.000Z'
    };
    const migrated = migratePayload(currentPayload, CURRENT_VERSION);

    expect(migrated).toEqual(currentPayload);
  });

  it('deve retornar null para payloads de versões futuras por segurança', () => {
    const futurePayload = {
      version: CURRENT_VERSION + 1,
      data: { something: 'new' },
      savedAt: '2024-01-01T00:00:00.000Z'
    };
    const migrated = migratePayload(futurePayload, CURRENT_VERSION);

    expect(migrated).toBeNull();
  });

  it('deve retornar null para payloads nulos ou indefinidos', () => {
    expect(migratePayload(null)).toBeNull();
    expect(migratePayload(undefined)).toBeNull();
  });
});
