/**
 * Utilitários de validação
 * Para formulários e inputs
 */

// ============== DOCUMENTOS ==============

/**
 * Valida CPF
 */
export function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');

  if (cleaned.length !== 11) return false;

  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cleaned)) return false;

  // Validar dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cleaned.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cleaned.charAt(10))) return false;

  return true;
}

/**
 * Valida CNPJ
 */
export function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');

  if (cleaned.length !== 14) return false;

  if (/^(\d)\1+$/.test(cleaned)) return false;

  let size = cleaned.length - 2;
  let numbers = cleaned.substring(0, size);
  const digits = cleaned.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = cleaned.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

// ============== CONTATO ==============

/**
 * Valida email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida telefone brasileiro
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || cleaned.length === 11;
}

/**
 * Valida CEP
 */
export function isValidCEP(cep: string): boolean {
  const cleaned = cep.replace(/\D/g, '');
  return cleaned.length === 8;
}

// ============== SENHA ==============

interface PasswordStrength {
  score: number; // 0-4
  label: 'muito-fraca' | 'fraca' | 'media' | 'forte' | 'muito-forte';
  color: string;
  suggestions: string[];
}

/**
 * Avalia força da senha
 */
export function checkPasswordStrength(password: string): PasswordStrength {
  const suggestions: string[] = [];
  let score = 0;

  if (password.length >= 8) {
    score++;
  } else {
    suggestions.push('Mínimo de 8 caracteres');
  }

  if (password.length >= 12) {
    score++;
  }

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score++;
  } else {
    suggestions.push('Use letras maiúsculas e minúsculas');
  }

  if (/\d/.test(password)) {
    score++;
  } else {
    suggestions.push('Adicione números');
  }

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score++;
  } else {
    suggestions.push('Adicione caracteres especiais');
  }

  // Penalizar padrões comuns
  if (/123|abc|qwerty|password/i.test(password)) {
    score = Math.max(0, score - 2);
    suggestions.push('Evite sequências comuns');
  }

  const labels: PasswordStrength['label'][] = [
    'muito-fraca',
    'fraca',
    'media',
    'forte',
    'muito-forte',
  ];

  const colors = [
    'hsl(var(--destructive))',
    'hsl(24, 95%, 53%)',
    'hsl(48, 95%, 53%)',
    'hsl(120, 60%, 45%)',
    'hsl(142, 76%, 36%)',
  ];

  const clampedScore = Math.min(4, Math.max(0, score));

  return {
    score: clampedScore,
    label: labels[clampedScore],
    color: colors[clampedScore],
    suggestions: suggestions.slice(0, 3),
  };
}

// ============== TEXTO ==============

/**
 * Verifica se string está vazia ou só tem espaços
 */
export function isEmpty(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

/**
 * Verifica se é URL válida
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ============== NÚMEROS ==============

/**
 * Verifica se é número positivo
 */
export function isPositiveNumber(value: number | string): boolean {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num > 0;
}

/**
 * Verifica se está dentro de um range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}
