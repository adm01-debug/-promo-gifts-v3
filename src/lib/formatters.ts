/**
 * Utilitários de formatação para moeda, datas, números, etc.
 * Centralizados para consistência em todo o app
 */

// ============== MOEDA ==============

/**
 * Formata valor para moeda brasileira (BRL)
 */
export function formatCurrency(
  value: number | null | undefined,
  options?: {
    showSymbol?: boolean;
    decimals?: number;
    compact?: boolean;
  }
): string {
  const { showSymbol = true, decimals = 2, compact = false } = options || {};

  if (value === null || value === undefined || isNaN(value)) {
    return showSymbol ? 'R$ 0,00' : '0,00';
  }

  if (compact && Math.abs(value) >= 1000) {
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: showSymbol ? 'currency' : 'decimal',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    });
    return formatter.format(value);
  }

  const formatter = new Intl.NumberFormat('pt-BR', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'BRL',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return formatter.format(value);
}

/**
 * Parse string de moeda para número
 */
export function parseCurrency(value: string): number {
  const cleaned = value
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(cleaned) || 0;
}

// ============== NÚMEROS ==============

/**
 * Formata número com separadores
 */
export function formatNumber(
  value: number | null | undefined,
  options?: {
    decimals?: number;
    compact?: boolean;
  }
): string {
  const { decimals = 0, compact = false } = options || {};

  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  if (compact) {
    return new Intl.NumberFormat('pt-BR', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formata porcentagem
 */
export function formatPercent(
  value: number | null | undefined,
  decimals: number = 0
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

// ============== DATAS ==============

/**
 * Formata data para exibição
 */
export function formatDate(
  date: Date | string | null | undefined,
  format: 'short' | 'medium' | 'long' | 'relative' = 'medium'
): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '-';

  if (format === 'relative') {
    return formatRelativeTime(dateObj);
  }

  const options: Intl.DateTimeFormatOptions = {
    short: { day: '2-digit', month: '2-digit', year: '2-digit' },
    medium: { day: '2-digit', month: 'short', year: 'numeric' },
    long: { day: '2-digit', month: 'long', year: 'numeric' },
  }[format];

  return new Intl.DateTimeFormat('pt-BR', options).format(dateObj);
}

/**
 * Formata data e hora
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  options?: { showSeconds?: boolean }
): string {
  const { showSeconds = false } = options || {};

  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: showSeconds ? '2-digit' : undefined,
  }).format(dateObj);
}

/**
 * Formata tempo relativo (há 5 minutos, em 2 dias, etc.)
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  const units: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
    { unit: 'year', seconds: 31536000 },
    { unit: 'month', seconds: 2592000 },
    { unit: 'week', seconds: 604800 },
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 },
  ];

  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

  for (const { unit, seconds } of units) {
    const value = Math.floor(Math.abs(diffInSeconds) / seconds);
    if (value >= 1) {
      return rtf.format(diffInSeconds > 0 ? -value : value, unit);
    }
  }

  return 'agora';
}

// ============== TEXTO ==============

/**
 * Trunca texto com ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || '';
  return `${text.substring(0, maxLength).trim()}...`;
}

/**
 * Capitaliza primeira letra
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Capitaliza cada palavra
 */
export function titleCase(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Gera slug a partir de texto
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Formata CPF
 */
export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata CNPJ
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '');
  return cleaned.replace(
    /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
    '$1.$2.$3/$4-$5'
  );
}

/**
 * Formata telefone
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
}

/**
 * Formata CEP
 */
export function formatCEP(cep: string): string {
  const cleaned = cep.replace(/\D/g, '');
  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
}

// ============== ARQUIVO ==============

/**
 * Formata tamanho de arquivo
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * Extrai extensão de arquivo
 */
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
}
