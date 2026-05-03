import { describe, it, expect } from 'vitest';
import { migratePayload } from '../useAutoSaveQuote';

describe('useAutoSaveQuote migration logic', () => {
  const CURRENT_VERSION = 2;

  it('restores null if payload is null', () => {
    expect(migratePayload(null, CURRENT_VERSION)).toBeNull();
  });

  it('migrates v1 (no version) to current version', () => {
    const v1Data = { items: [1, 2, 3] };
    const migrated = migratePayload(v1Data, CURRENT_VERSION);
    
    expect(migrated.version).toBe(CURRENT_VERSION);
    expect(migrated.data).toEqual(v1Data);
    expect(migrated.savedAt).toBeDefined();
  });

  it('accepts same version payload', () => {
    const v2Payload = {
      version: 2,
      data: { test: true },
      savedAt: '2024-01-01'
    };
    const migrated = migratePayload(v2Payload, CURRENT_VERSION);
    expect(migrated).toEqual(v2Payload);
  });

  it('returns null for future versions to avoid corruption', () => {
    const futurePayload = {
      version: 99,
      data: { destructive: true },
      savedAt: '2099-01-01'
    };
    const migrated = migratePayload(futurePayload, CURRENT_VERSION);
    expect(migrated).toBeNull();
  });
});
