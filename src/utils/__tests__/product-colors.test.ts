import { describe, it, expect } from 'vitest';
import { findKnownHex, detectColorGroup, normalizeColors } from '../product-colors';

describe('product-colors utilities', () => {
  describe('findKnownHex', () => {
    it('should return correct hex for exact name', () => {
      expect(findKnownHex('Preto')).toBe('#000000');
      expect(findKnownHex('Azul Marinho')).toBe('#000080');
    });

    it('should be case and accent insensitive', () => {
      expect(findKnownHex('café')).toBe('#6F4E37');
      expect(findKnownHex('CAFE')).toBe('#6F4E37');
    });

    it('should return hex for partial matches', () => {
      // 'azul' matches #0000FF, 'azul royal' matches #4169E1.
      // The implementation iterates through KNOWN_COLOR_HEX.
      expect(findKnownHex('Azul Royal Intenso')).toBeTruthy();
    });

    it('should return null for unknown colors', () => {
      expect(findKnownHex('Cor Inexistente')).toBeNull();
    });
  });

  describe('detectColorGroup', () => {
    it('should detect group based on keywords', () => {
      expect(detectColorGroup('azul marinho')).toBe('Azul');
      expect(detectColorGroup('verde menta')).toBe('Verde');
      expect(detectColorGroup('bordô')).toBe('Vermelho');
    });

    it('should fallback to capitalized first word', () => {
      expect(detectColorGroup('bege-claro')).toBe('Marrom'); // 'bege' is a keyword for Marrom
      expect(detectColorGroup('fúcsia')).toBe('Rosa'); // 'fúcsia' (with accent) is a keyword for Rosa
      expect(detectColorGroup('madeira')).toBe('Madeira');
    });
  });

  describe('normalizeColors', () => {
    it('should normalize string array', () => {
      const input = ['Azul', 'Verde'];
      const result = normalizeColors(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ name: 'Azul', group: 'Azul', hex: '#0000FF' });
    });

    it('should normalize object array', () => {
      const input = [{ name: 'Preto', hex: '#000000' }, { color_name: 'Branco' }];
      const result = normalizeColors(input);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Preto');
      expect(result[1].name).toBe('Branco');
      expect(result[1].hex).toBe('#FFFFFF');
    });

    it('should handle undefined or invalid input', () => {
      expect(normalizeColors(undefined)).toEqual([]);
      expect(normalizeColors([] as any)).toEqual([]);
    });
  });
});
