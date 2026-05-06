// tests/unit/kit-builder/volume-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { 
  calculateVolume, 
  calculateUsableVolume, 
  checkItemFits,
  parseDimensionsString 
} from '../../../src/lib/kit-builder/volume-calculator';
import type { KitBox, KitItem } from '../../../src/lib/kit-builder/types';

describe('Volume Calculator', () => {
  it('calculates volume correctly', () => {
    expect(calculateVolume(10, 10, 10)).toBe(1000);
  });

  it('parses dimension strings correctly', () => {
    expect(parseDimensionsString('10x20x5')).toEqual({ width: 10, height: 20, depth: 5 });
    expect(parseDimensionsString('10.5 × 20 × 5.2 cm')).toEqual({ width: 10.5, height: 20, depth: 5.2 });
    expect(parseDimensionsString('invalid')).toBeNull();
  });

  const mockBox: KitBox = {
    id: 'box-1',
    name: 'Standard Box',
    internalWidth: 30,
    internalHeight: 20,
    internalDepth: 15,
    internalVolume: 9000,
    weightLimit: 5,
  };

  const mockItem: KitItem = {
    id: 'item-1',
    name: 'T-Shirt',
    width: 25,
    height: 15,
    depth: 5,
    volume: 1875,
    weight: 0.2,
    quantity: 1,
  };

  it('checks if item fits in empty box', () => {
    const result = checkItemFits(mockItem, mockBox, []);
    expect(result.fits).toBe(true);
  });

  it('checks if item fits when box is nearly full', () => {
    const fullItems = Array(3).fill(mockItem); // 1875 * 3 = 5625
    // Usable volume = 9000 * 0.75 = 6750
    const result = checkItemFits(mockItem, mockBox, fullItems); // 5625 + 1875 = 7500 > 6750
    expect(result.fits).toBe(false);
    expect(result.reason).toContain('Volume total excederá');
  });

  it('checks dimensions mismatch', () => {
    const bigItem: KitItem = { ...mockItem, width: 40 }; // 40 > 30 (box width)
    const result = checkItemFits(bigItem, mockBox, []);
    expect(result.fits).toBe(false);
    expect(result.reason).toContain('não cabem na caixa');
  });
});
