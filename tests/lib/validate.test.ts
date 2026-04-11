import { describe, it, expect } from 'vitest';
import { safeParseBody, validateRequired, isNonEmptyString, isPositiveNumber } from '../../../supabase/functions/_shared/validate';

describe('safeParseBody', () => {
  it('parses valid JSON', async () => {
    const req = new Request('http://test.com', {
      method: 'POST',
      body: JSON.stringify({ foo: 'bar' }),
    });
    const result = await safeParseBody(req);
    expect(result).toEqual({ foo: 'bar' });
  });

  it('returns null for empty body', async () => {
    const req = new Request('http://test.com', { method: 'POST', body: '' });
    const result = await safeParseBody(req);
    expect(result).toBeNull();
  });

  it('returns null for invalid JSON', async () => {
    const req = new Request('http://test.com', { method: 'POST', body: 'not json' });
    const result = await safeParseBody(req);
    expect(result).toBeNull();
  });
});

describe('validateRequired', () => {
  it('returns null when all fields present', () => {
    expect(validateRequired({ name: 'John', email: 'j@j.com' }, ['name', 'email'])).toBeNull();
  });

  it('returns error for missing fields', () => {
    const result = validateRequired({ name: 'John' }, ['name', 'email']);
    expect(result).toContain('email');
  });

  it('returns error for null body', () => {
    expect(validateRequired(null, ['name'])).toBe('Request body is required');
  });

  it('catches empty string values', () => {
    const result = validateRequired({ name: '' }, ['name']);
    expect(result).toContain('name');
  });
});

describe('isNonEmptyString', () => {
  it('returns true for non-empty strings', () => {
    expect(isNonEmptyString('hello')).toBe(true);
  });
  it('returns false for empty/whitespace', () => {
    expect(isNonEmptyString('')).toBe(false);
    expect(isNonEmptyString('   ')).toBe(false);
  });
  it('returns false for non-strings', () => {
    expect(isNonEmptyString(123)).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
  });
});

describe('isPositiveNumber', () => {
  it('returns true for positive numbers', () => {
    expect(isPositiveNumber(5)).toBe(true);
    expect(isPositiveNumber(0.1)).toBe(true);
  });
  it('returns false for zero/negative/NaN', () => {
    expect(isPositiveNumber(0)).toBe(false);
    expect(isPositiveNumber(-1)).toBe(false);
    expect(isPositiveNumber(NaN)).toBe(false);
    expect(isPositiveNumber(Infinity)).toBe(false);
  });
});
