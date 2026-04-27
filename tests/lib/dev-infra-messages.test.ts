/**
 * Testes do gate SSOT de mensagens técnicas de infra.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  shouldShowDevInfraMessages,
  describeDevInfraMessagesGate,
} from '@/lib/system/dev-infra-messages';

const ORIGINAL_ENV = process.env.VITE_SHOW_DEV_INFRA_MESSAGES;

beforeEach(() => {
  delete process.env.VITE_SHOW_DEV_INFRA_MESSAGES;
  try {
    window.localStorage.removeItem('show_dev_infra_messages');
  } catch {
    /* noop */
  }
});

afterEach(() => {
  if (ORIGINAL_ENV === undefined) delete process.env.VITE_SHOW_DEV_INFRA_MESSAGES;
  else process.env.VITE_SHOW_DEV_INFRA_MESSAGES = ORIGINAL_ENV;
  vi.unstubAllEnvs();
});

describe('shouldShowDevInfraMessages', () => {
  it('por padrão usa o role: dev = true, não-dev = false', () => {
    expect(shouldShowDevInfraMessages(true)).toBe(true);
    expect(shouldShowDevInfraMessages(false)).toBe(false);
    expect(describeDevInfraMessagesGate(false).source).toBe('role');
  });

  it('env VITE_SHOW_DEV_INFRA_MESSAGES=false suprime para todos, inclusive dev', () => {
    vi.stubEnv('VITE_SHOW_DEV_INFRA_MESSAGES', 'false');
    expect(shouldShowDevInfraMessages(true)).toBe(false);
    expect(shouldShowDevInfraMessages(false)).toBe(false);
    expect(describeDevInfraMessagesGate(true).source).toBe('env');
  });

  it('env VITE_SHOW_DEV_INFRA_MESSAGES=true libera para todos', () => {
    vi.stubEnv('VITE_SHOW_DEV_INFRA_MESSAGES', 'true');
    expect(shouldShowDevInfraMessages(false)).toBe(true);
    expect(shouldShowDevInfraMessages(true)).toBe(true);
  });

  it('env auto/vazio cai para o próximo nível', () => {
    vi.stubEnv('VITE_SHOW_DEV_INFRA_MESSAGES', 'auto');
    expect(shouldShowDevInfraMessages(true)).toBe(true);
    expect(shouldShowDevInfraMessages(false)).toBe(false);
  });

  it('localStorage tem precedência sobre o role (mas não sobre env)', () => {
    window.localStorage.setItem('show_dev_infra_messages', 'true');
    expect(shouldShowDevInfraMessages(false)).toBe(true);
    expect(describeDevInfraMessagesGate(false).source).toBe('local');

    window.localStorage.setItem('show_dev_infra_messages', 'false');
    expect(shouldShowDevInfraMessages(true)).toBe(false);
  });

  it('env continua dominando mesmo com localStorage definido', () => {
    vi.stubEnv('VITE_SHOW_DEV_INFRA_MESSAGES', 'false');
    window.localStorage.setItem('show_dev_infra_messages', 'true');
    expect(shouldShowDevInfraMessages(true)).toBe(false);
    expect(describeDevInfraMessagesGate(true).source).toBe('env');
  });

  it('valores inválidos são tratados como auto', () => {
    vi.stubEnv('VITE_SHOW_DEV_INFRA_MESSAGES', 'maybe');
    expect(shouldShowDevInfraMessages(true)).toBe(true);
    expect(shouldShowDevInfraMessages(false)).toBe(false);
  });
});
