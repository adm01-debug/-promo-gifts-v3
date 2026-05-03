import { describe, it, expect } from 'vitest';
import { 
  calculateItemPersonalizationTotal, 
  calculateItemTotal, 
  calculateSubtotal, 
  applyMarkup, 
  calculateDiscountAmount,
  calculateRealDiscountPercent
} from '../../src/logic/quotes/calculations';

describe('Cálculos de Orçamento (Unit Tests)', () => {
  
  describe('calculateItemPersonalizationTotal', () => {
    it('deve somar corretamente os custos de personalização', () => {
      const item = {
        personalizations: [
          { total_cost: 10.50 },
          { total_cost: 5.00 }
        ]
      };
      expect(calculateItemPersonalizationTotal(item)).toBe(15.50);
    });

    it('deve retornar 0 se não houver personalizações', () => {
      expect(calculateItemPersonalizationTotal({ personalizations: [] })).toBe(0);
      expect(calculateItemPersonalizationTotal({})).toBe(0);
    });
  });

  describe('calculateItemTotal', () => {
    it('deve calcular o total do item (quantidade * preço + gravações)', () => {
      const params = {
        quantity: 100,
        unitPrice: 2.50,
        personalizations: [{ total_cost: 50 }]
      };
      // (100 * 2.5) + 50 = 250 + 50 = 300
      expect(calculateItemTotal(params)).toBe(300);
    });

    it('caso de borda: quantidade zero', () => {
      expect(calculateItemTotal({ quantity: 0, unitPrice: 10 })).toBe(0);
    });
  });

  describe('applyMarkup', () => {
    it('deve aplicar markup corretamente', () => {
      expect(applyMarkup(100, 10)).toBe(110);
      expect(applyMarkup(100, 50)).toBe(150);
    });

    it('deve limitar o markup ao máximo de 50%', () => {
      expect(applyMarkup(100, 60)).toBe(150);
    });

    it('deve ignorar markups negativos', () => {
      expect(applyMarkup(100, -10)).toBe(100);
    });
    
    it('deve arredondar para 2 casas decimais', () => {
      expect(applyMarkup(33.33, 10)).toBe(36.66); // 33.33 * 1.1 = 36.663 -> 36.66
    });
  });

  describe('calculateDiscountAmount', () => {
    it('deve calcular desconto percentual', () => {
      expect(calculateDiscountAmount(200, 'percent', 10)).toBe(20);
    });

    it('deve retornar valor fixo se for tipo "amount"', () => {
      expect(calculateDiscountAmount(200, 'amount', 50)).toBe(50);
    });
  });

  describe('calculateRealDiscountPercent', () => {
    it('deve calcular o desconto real sobre o subtotal original', () => {
      // Subtotal real: 100, Subtotal apresentado (com markup): 120, Desconto: 30
      // Valor final: 120 - 30 = 90
      // Desconto sobre o real: (100 - 90) / 100 = 10%
      expect(calculateRealDiscountPercent(100, 120, 30)).toBe(10);
    });

    it('deve retornar 0 se o subtotal real for 0', () => {
      expect(calculateRealDiscountPercent(0, 100, 10)).toBe(0);
    });
  });

  describe('Casos de Borda e Precisão', () => {
    it('deve lidar com descontos negativos (tratar como zero)', () => {
      expect(calculateDiscountAmount(100, 'percent', -10)).toBe(0);
      expect(calculateDiscountAmount(100, 'amount', -50)).toBe(0);
    });

    it('deve limitar markup excessivo ao teto de 50%', () => {
      expect(applyMarkup(100, 1000)).toBe(150);
    });

    it('deve lidar com valores nulos ou undefined em applyMarkup', () => {
      // @ts-ignore
      expect(applyMarkup(100, null)).toBe(100);
      // @ts-ignore
      expect(applyMarkup(null, 10)).toBe(0);
    });

    it('deve manter alta precisão e arredondamento correto (ABNT/Financeiro)', () => {
      // 10.125 deve arredondar para 10.13 se usarmos Math.round com 2 casas
      // 10.125 * 100 = 1012.5 -> Math.round = 1013 -> / 100 = 10.13
      expect(applyMarkup(10, 1.25)).toBe(10.13); 
      
      // Teste com muitos decimais
      expect(applyMarkup(10.123456789, 10)).toBe(11.14); // 10.123456789 * 1.1 = 11.135802... -> 11.14
    });

    it('deve lidar com quantidades fracionadas (se permitido pelo sistema)', () => {
      const params = {
        quantity: 0.5,
        unitPrice: 10.55
      };
      // 0.5 * 10.55 = 5.275 -> calculateItemTotal não arredonda, o subtotal ou final deve arredondar
      // Mas o calculateItemTotal atual faz apenas a multiplicação
      expect(calculateItemTotal(params)).toBe(5.275);
    });
  });
});

