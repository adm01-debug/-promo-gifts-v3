// src/lib/locale-config.ts

import { setDefaultOptions } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Configura locale padrão do date-fns para pt-BR
 * Deve ser chamado no início da aplicação (main.tsx)
 */
export function setupLocale() {
  setDefaultOptions({
    locale: ptBR,
    weekStartsOn: 0, // Domingo = 0, Segunda = 1
  });
}
