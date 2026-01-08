import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  truncate,
  capitalize,
  titleCase,
  slugify,
  formatCPF,
  formatCNPJ,
  formatPhone,
  formatCEP,
  formatFileSize,
  parseCurrency,
} from '@/lib/formatters';

describe('formatCurrency', () => {
  it('should format BRL currency correctly', () => {
    expect(formatCurrency(1000)).toContain('1.000');
    expect(formatCurrency(1000)).toContain('R$');
  });

  it('should handle null/undefined values', () => {
    expect(formatCurrency(null)).toBe('R$ 0,00');
    expect(formatCurrency(undefined)).toBe('R$ 0,00');
  });

  it('should format without symbol when specified', () => {
    const result = formatCurrency(100, { showSymbol: false });
    expect(result).not.toContain('R$');
  });

  it('should format compact numbers', () => {
    const result = formatCurrency(1500000, { compact: true });
    expect(result).toBeTruthy();
  });
});

describe('parseCurrency', () => {
  it('should parse BRL currency string', () => {
    expect(parseCurrency('R$ 1.000,00')).toBe(1000);
    expect(parseCurrency('1.234,56')).toBe(1234.56);
  });
});

describe('formatNumber', () => {
  it('should format numbers with thousand separators', () => {
    expect(formatNumber(1000)).toBe('1.000');
    expect(formatNumber(1000000)).toBe('1.000.000');
  });

  it('should handle null/undefined values', () => {
    expect(formatNumber(null)).toBe('0');
    expect(formatNumber(undefined)).toBe('0');
  });

  it('should format compact numbers', () => {
    const result = formatNumber(1500000, { compact: true });
    expect(result).toBeTruthy();
  });
});

describe('formatPercent', () => {
  it('should format percentages', () => {
    expect(formatPercent(50)).toBe('50%');
  });

  it('should handle null/undefined values', () => {
    expect(formatPercent(null)).toBe('0%');
  });
});

describe('formatDate', () => {
  it('should format date in pt-BR format', () => {
    const result = formatDate('2024-03-15');
    expect(result).toBeTruthy();
  });

  it('should handle null values', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('should format relative dates', () => {
    const result = formatDate(new Date(), 'relative');
    expect(result).toBeTruthy();
  });
});

describe('formatDateTime', () => {
  it('should format datetime correctly', () => {
    const date = new Date('2024-03-15T14:30:00');
    const result = formatDateTime(date);
    expect(result).toContain('15');
  });

  it('should handle null values', () => {
    expect(formatDateTime(null)).toBe('-');
  });
});

describe('Text Formatting', () => {
  it('should truncate text', () => {
    expect(truncate('Hello World Test', 8)).toBe('Hello...');
    expect(truncate('Short', 10)).toBe('Short');
  });

  it('should capitalize text', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('HELLO')).toBe('Hello');
  });

  it('should convert to title case', () => {
    expect(titleCase('hello world')).toBe('Hello World');
  });

  it('should slugify text', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('Café & Açúcar')).toBe('cafe-acucar');
  });
});

describe('Document Formatting', () => {
  it('should format CPF correctly', () => {
    expect(formatCPF('12345678901')).toBe('123.456.789-01');
  });

  it('should format CNPJ correctly', () => {
    expect(formatCNPJ('12345678000190')).toBe('12.345.678/0001-90');
  });
});

describe('Phone Formatting', () => {
  it('should format mobile phone (11 digits)', () => {
    expect(formatPhone('11999887766')).toBe('(11) 99988-7766');
  });

  it('should format landline (10 digits)', () => {
    expect(formatPhone('1133445566')).toBe('(11) 3344-5566');
  });
});

describe('Address Formatting', () => {
  it('should format CEP correctly', () => {
    expect(formatCEP('01234567')).toBe('01234-567');
  });
});

describe('File Size Formatting', () => {
  it('should format file sizes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
  });
});
