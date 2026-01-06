/**
 * Utilitários diversos para manipulação de dados
 */

// ============== ARRAYS ==============

/**
 * Agrupa array por chave
 */
export function groupBy<T>(array: T[], key: keyof T | ((item: T) => string)): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = typeof key === 'function' ? key(item) : String(item[key]);
    (result[groupKey] = result[groupKey] || []).push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Remove duplicatas de array
 */
export function unique<T>(array: T[], key?: keyof T): T[] {
  if (!key) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter((item) => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

/**
 * Ordena array por múltiplos campos
 */
export function sortBy<T>(
  array: T[],
  ...keys: (keyof T | { key: keyof T; order: 'asc' | 'desc' })[]
): T[] {
  return [...array].sort((a, b) => {
    for (const keyConfig of keys) {
      const key = typeof keyConfig === 'object' ? keyConfig.key : keyConfig;
      const order = typeof keyConfig === 'object' ? keyConfig.order : 'asc';
      
      const valueA = a[key];
      const valueB = b[key];
      
      if (valueA === valueB) continue;
      
      const comparison = valueA < valueB ? -1 : 1;
      return order === 'asc' ? comparison : -comparison;
    }
    return 0;
  });
}

/**
 * Divide array em chunks
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Soma valores de array
 */
export function sum(array: number[]): number;
export function sum<T>(array: T[], key: keyof T): number;
export function sum<T>(array: T[] | number[], key?: keyof T): number {
  if (key) {
    return (array as T[]).reduce((acc, item) => acc + (Number(item[key]) || 0), 0);
  }
  return (array as number[]).reduce((acc, val) => acc + val, 0);
}

/**
 * Calcula média
 */
export function average(array: number[]): number;
export function average<T>(array: T[], key: keyof T): number;
export function average<T>(array: T[] | number[], key?: keyof T): number {
  if (array.length === 0) return 0;
  return sum(array as number[], key as never) / array.length;
}

// ============== OBJETOS ==============

/**
 * Deep clone de objeto
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(deepClone) as T;
  }
  
  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * Remove propriedades undefined/null de objeto
 */
export function omitEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null)
  ) as Partial<T>;
}

/**
 * Pick apenas algumas chaves do objeto
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  return keys.reduce((result, key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
    return result;
  }, {} as Pick<T, K>);
}

/**
 * Omit algumas chaves do objeto
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result as Omit<T, K>;
}

// ============== ASYNC ==============

/**
 * Delay/Sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry com backoff exponencial
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    delay?: number;
    backoff?: number;
  }
): Promise<T> {
  const { maxAttempts = 3, delay = 1000, backoff = 2 } = options || {};
  
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxAttempts) {
        await sleep(delay * Math.pow(backoff, attempt - 1));
      }
    }
  }
  
  throw lastError;
}

// ============== ID/RANDOM ==============

/**
 * Gera ID único simples
 */
export function generateId(prefix?: string): string {
  const random = Math.random().toString(36).substring(2, 9);
  const timestamp = Date.now().toString(36);
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
}

/**
 * Gera cor aleatória em hex
 */
export function randomColor(): string {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
}

// ============== MISC ==============

/**
 * Cria range de números
 */
export function range(start: number, end: number, step: number = 1): number[] {
  const result: number[] = [];
  for (let i = start; i <= end; i += step) {
    result.push(i);
  }
  return result;
}

/**
 * Clamp valor entre min e max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
