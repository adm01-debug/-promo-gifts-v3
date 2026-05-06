/**
 * Regressão estática: garante que elementos interativos do sidebar de
 * navegação têm um anel de foco visível por teclado.
 *
 * Refatorado para remover TODOs de documentação.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const FILE = 'src/components/layout/sidebar/SidebarNavGroup.tsx';

describe('Sidebar — focus-visible por teclado em todos os interativos', () => {
  const content = readFileSync(resolve(process.cwd(), FILE), 'utf8');

  // Conta ocorrências do trio mínimo (ring-2 + ring-primary + ring-offset-2).
  // Cada elemento interativo (botão de grupo, botão de submenu, NavLink) deve ter um.
  const ringMatches = content.match(/focus-visible:ring-2/g) ?? [];
  const primaryMatches = content.match(/focus-visible:ring-primary\b/g) ?? [];
  const offsetMatches = content.match(/focus-visible:ring-offset-2/g) ?? [];

  it('tem pelo menos 3 elementos interativos com ring-2', () => {
    // SidebarNavGroup tem 3 superfícies focáveis: grupo, submenu, item.
    expect(ringMatches.length).toBeGreaterThanOrEqual(3);
  });

  it('todos os ring-2 usam a cor primária (visível em light + dark)', () => {
    expect(primaryMatches.length).toBe(ringMatches.length);
  });

  it('todos os ring-2 têm offset (separação visual do fundo)', () => {
    expect(offsetMatches.length).toBe(ringMatches.length);
  });

  it('não usa outline padrão removido sem ring de substituição', () => {
    // Se houver focus-visible:outline-none, deve ter ring-2 na MESMA classe (linha).
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes('focus-visible:outline-none')) {
        expect(line, `Linha removeu outline mas não tem ring-2: ${line.trim()}`).toMatch(
          /focus-visible:ring-2/,
        );
      }
    }
  });
});
