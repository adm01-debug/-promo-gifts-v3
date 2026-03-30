import { describe, it, expect } from 'vitest';

// Test the badge derivation logic directly
describe('useProductIntelligenceBadges logic', () => {
  const deriveBadges = (abc: 'A' | 'B' | 'C', trend: number | null, isStockoutRisk: boolean, currentStock: number) => {
    const badges: Array<{ type: string; label: string }> = [];

    if (abc === 'A') badges.push({ type: 'best-seller', label: 'Best-Seller' });
    else if (abc === 'B') badges.push({ type: 'popular', label: 'Popular' });
    else badges.push({ type: 'normal', label: 'Normal' });

    if (trend != null && trend > 1.3) badges.push({ type: 'emergente', label: 'Emergente' });
    if (isStockoutRisk && currentStock > 0) badges.push({ type: 'last-units', label: 'Últimas Unidades' });

    return badges;
  };

  it('should show Best-Seller for ABC A', () => {
    const badges = deriveBadges('A', 1.0, false, 500);
    expect(badges[0].type).toBe('best-seller');
    expect(badges).toHaveLength(1);
  });

  it('should show Popular for ABC B', () => {
    const badges = deriveBadges('B', 1.0, false, 500);
    expect(badges[0].type).toBe('popular');
  });

  it('should show Normal for ABC C', () => {
    const badges = deriveBadges('C', 0.8, false, 500);
    expect(badges[0].type).toBe('normal');
  });

  it('should add Emergente when trend > 1.3', () => {
    const badges = deriveBadges('B', 1.5, false, 500);
    expect(badges).toHaveLength(2);
    expect(badges[1].type).toBe('emergente');
  });

  it('should NOT add Emergente when trend <= 1.3', () => {
    const badges = deriveBadges('A', 1.3, false, 500);
    expect(badges).toHaveLength(1);
  });

  it('should add Últimas Unidades when stockout risk + stock > 0', () => {
    const badges = deriveBadges('C', 0.9, true, 50);
    expect(badges).toHaveLength(2);
    expect(badges[1].type).toBe('last-units');
  });

  it('should NOT add Últimas Unidades when stock is 0', () => {
    const badges = deriveBadges('C', 0.9, true, 0);
    expect(badges).toHaveLength(1);
  });

  it('should combine all badges: Best-Seller + Emergente + Last Units', () => {
    const badges = deriveBadges('A', 2.0, true, 30);
    expect(badges).toHaveLength(3);
    expect(badges.map(b => b.type)).toEqual(['best-seller', 'emergente', 'last-units']);
  });

  it('should handle null trend gracefully', () => {
    const badges = deriveBadges('B', null, false, 500);
    expect(badges).toHaveLength(1);
    expect(badges[0].type).toBe('popular');
  });
});
