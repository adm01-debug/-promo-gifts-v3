import { describe, it, expect } from 'vitest';

// Common formatting utilities that should exist or be created
describe('Currency Formatting', () => {
  const formatCurrency = (value: number, locale = 'pt-BR', currency = 'BRL') => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(value);
  };

  it('should format BRL currency correctly', () => {
    expect(formatCurrency(1000)).toContain('1.000');
    expect(formatCurrency(1000)).toContain('R$');
  });

  it('should handle zero value', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });

  it('should handle decimal values', () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain('1.234');
  });

  it('should handle negative values', () => {
    const result = formatCurrency(-500);
    expect(result).toContain('500');
  });

  it('should handle large numbers', () => {
    const result = formatCurrency(1000000);
    expect(result).toContain('1.000.000');
  });
});

describe('Date Formatting', () => {
  const formatDate = (date: Date | string, locale = 'pt-BR') => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(locale);
  };

  const formatDateTime = (date: Date | string, locale = 'pt-BR') => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString(locale);
  };

  const formatRelativeTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays} dias atrás`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`;
    return `${Math.floor(diffDays / 365)} anos atrás`;
  };

  it('should format date in pt-BR format', () => {
    const date = new Date('2024-03-15');
    const result = formatDate(date);
    expect(result).toMatch(/15\/03\/2024|15\/3\/2024/);
  });

  it('should handle string dates', () => {
    const result = formatDate('2024-01-01');
    expect(result).toBeTruthy();
  });

  it('should format datetime correctly', () => {
    const date = new Date('2024-03-15T14:30:00');
    const result = formatDateTime(date);
    expect(result).toContain('15');
    expect(result).toContain('03');
  });

  it('should format relative time for today', () => {
    const today = new Date();
    expect(formatRelativeTime(today)).toBe('Hoje');
  });

  it('should format relative time for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatRelativeTime(yesterday)).toBe('Ontem');
  });

  it('should format relative time for days ago', () => {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - 3);
    expect(formatRelativeTime(daysAgo)).toBe('3 dias atrás');
  });
});

describe('Number Formatting', () => {
  const formatNumber = (value: number, locale = 'pt-BR') => {
    return new Intl.NumberFormat(locale).format(value);
  };

  const formatPercentage = (value: number, decimals = 1) => {
    return `${value.toFixed(decimals)}%`;
  };

  const formatCompactNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  it('should format numbers with thousand separators', () => {
    expect(formatNumber(1000)).toBe('1.000');
    expect(formatNumber(1000000)).toBe('1.000.000');
  });

  it('should format percentages', () => {
    expect(formatPercentage(75.5)).toBe('75.5%');
    expect(formatPercentage(100)).toBe('100.0%');
    expect(formatPercentage(0)).toBe('0.0%');
  });

  it('should format compact numbers', () => {
    expect(formatCompactNumber(1500)).toBe('1.5K');
    expect(formatCompactNumber(1500000)).toBe('1.5M');
    expect(formatCompactNumber(500)).toBe('500');
  });
});

describe('Text Formatting', () => {
  const capitalize = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const truncate = (str: string, maxLength: number, suffix = '...') => {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - suffix.length) + suffix;
  };

  const slugify = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  it('should capitalize text', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('HELLO')).toBe('Hello');
    expect(capitalize('hELLO wORLD')).toBe('Hello world');
  });

  it('should truncate long text', () => {
    expect(truncate('Hello World', 8)).toBe('Hello...');
    expect(truncate('Short', 10)).toBe('Short');
  });

  it('should handle custom suffix in truncate', () => {
    expect(truncate('Hello World', 8, '…')).toBe('Hello W…');
  });

  it('should slugify text', () => {
    expect(slugify('Hello World')).toBe('hello-world');
    expect(slugify('Café & Açúcar')).toBe('cafe-acucar');
    expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
  });
});

describe('Phone Formatting', () => {
  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return phone;
  };

  it('should format mobile phone (11 digits)', () => {
    expect(formatPhone('11999887766')).toBe('(11) 99988-7766');
  });

  it('should format landline (10 digits)', () => {
    expect(formatPhone('1133445566')).toBe('(11) 3344-5566');
  });

  it('should handle already formatted phones', () => {
    expect(formatPhone('(11) 99988-7766')).toBe('(11) 99988-7766');
  });
});

describe('CPF/CNPJ Formatting', () => {
  const formatCPF = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatCNPJ = (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, '');
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  it('should format CPF correctly', () => {
    expect(formatCPF('12345678901')).toBe('123.456.789-01');
  });

  it('should format CNPJ correctly', () => {
    expect(formatCNPJ('12345678000190')).toBe('12.345.678/0001-90');
  });
});
