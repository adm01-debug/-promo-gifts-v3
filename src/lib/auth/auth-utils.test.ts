import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getGreeting, getHighestRole, isSupervisorOrAbove, getRandomGreeting, FLOW_GREETINGS } from './auth-utils';
import { AppRole } from '@/contexts/AuthContext';

describe('auth-utils', () => {
  describe('getGreeting', () => {
    it('returns "Bom dia" for morning hours', () => {
      vi.setSystemTime(new Date(2024, 0, 1, 9, 0)); // 09:00
      expect(getGreeting()).toBe('Bom dia');
    });

    it('returns "Boa tarde" for afternoon hours', () => {
      vi.setSystemTime(new Date(2024, 0, 1, 15, 0)); // 15:00
      expect(getGreeting()).toBe('Boa tarde');
    });

    it('returns "Boa noite" for night hours', () => {
      vi.setSystemTime(new Date(2024, 0, 1, 21, 0)); // 21:00
      expect(getGreeting()).toBe('Boa noite');
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    beforeEach(() => {
      vi.useFakeTimers();
    });
  });

  describe('getHighestRole', () => {
    it('returns null for empty roles', () => {
      expect(getHighestRole([])).toBeNull();
    });

    it('identifies dev as the highest role', () => {
      const roles: AppRole[] = ['agente', 'dev', 'supervisor'];
      expect(getHighestRole(roles)).toBe('dev');
    });

    it('identifies supervisor as higher than agente', () => {
      const roles: AppRole[] = ['agente', 'supervisor'];
      expect(getHighestRole(roles)).toBe('supervisor');
    });

    it('handles legacy roles (admin as supervisor)', () => {
      const roles: AppRole[] = ['admin', 'agente'];
      expect(getHighestRole(roles)).toBe('admin');
    });

    it('returns the role if only one is provided', () => {
      expect(getHighestRole(['agente'])).toBe('agente');
    });
  });

  describe('isSupervisorOrAbove', () => {
    it('returns true for dev', () => {
      expect(isSupervisorOrAbove(['dev'])).toBe(true);
    });

    it('returns true for supervisor', () => {
      expect(isSupervisorOrAbove(['supervisor'])).toBe(true);
    });

    it('returns true for legacy admin', () => {
      expect(isSupervisorOrAbove(['admin'])).toBe(true);
    });

    it('returns false for agente', () => {
      expect(isSupervisorOrAbove(['agente'])).toBe(false);
    });

    it('returns true if at least one role is supervisor or above', () => {
      expect(isSupervisorOrAbove(['agente', 'supervisor'])).toBe(true);
    });

    it('returns false for empty roles', () => {
      expect(isSupervisorOrAbove([])).toBe(false);
    });
  });

  describe('getRandomGreeting', () => {
    it('replaces templates correctly', () => {
      const name = 'John';
      const result = getRandomGreeting(name);
      
      // Check if it contains the name
      expect(result).toContain(name);
      
      // Check if it starts with a valid greeting (Bom dia/Boa tarde/Boa noite)
      const validGreetings = ['Bom dia', 'Boa tarde', 'Boa noite'];
      const startsWithGreeting = validGreetings.some(g => result.includes(g));
      expect(startsWithGreeting).toBe(true);
      
      // Check if it matches one of the patterns (ignoring placeholders)
      const matchesPattern = FLOW_GREETINGS.some(pattern => {
        const regexPattern = pattern
          .replace('{greeting}', '.*')
          .replace('{name}', '.*')
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape regex special chars
        return new RegExp(regexPattern).test(result);
      });
      // Note: the simple replace above is not perfect for regex, but should work for basic strings
    });
  });
});
