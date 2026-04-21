

# Plano — Auditoria automatizada de a11y com jest-axe na Onda 5

Adiciono `jest-axe` ao stack de testes e crio uma suíte que roda axe-core nos componentes da Onda 5, travando regressões de a11y (contraste, ARIA, foco) em CI.

## Dependências novas

- `jest-axe` (runner axe-core para Vitest/Jest)
- `@types/jest-axe` (tipos TS)

Ambos como `devDependencies`. Sem impacto em bundle de produção.

## Arquivos novos

### 1. `tests/a11y/axe-helper.ts`
Helper exportando:
- `axe` configurado com regras WCAG 2.1 AA (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`)
- `toHaveNoViolations` matcher pronto para `expect.extend`
- Configuração que **desabilita** a regra `color-contrast` em jsdom (axe não computa estilos Tailwind no jsdom — contraste é validado por classes em teste separado já existente)
- Mantém ativas: `button-name`, `aria-*`, `label`, `focus-order-semantics`, `nested-interactive`, `role-*`

### 2. `tests/a11y/onda5-a11y.test.tsx`
Suíte com 1 `describe` por componente da Onda 5:

- **MagicUpVariationComparator** (3 cenários)
  - 3 variações com scores → 0 violações axe
  - Estado vazio (`variations.length < 2`, retorna null) → skip
  - Variação ativa + winner badge → 0 violações

- **MagicUpQualityScore** (2 cenários)
  - Score completo com diagnosis → 0 violações
  - Score sem diagnosis (fallback) → 0 violações

- **MagicUpQualityCheck** (2 cenários)
  - Estado de validação OK → 0 violações
  - Estado com warnings → 0 violações

Cada teste:
```ts
const { container } = render(<Component {...props} />);
const results = await axe(container);
expect(results).toHaveNoViolations();
```

### 3. `tests/setup.ts` — extensão
Adicionar no final:
```ts
import { toHaveNoViolations } from "jest-axe";
expect.extend({ toHaveNoViolations });
```

Garante matcher disponível globalmente sem repetir em cada arquivo.

## Configuração CI

`.github/workflows/ci.yml` já roda `npm run test` que executa toda a suíte Vitest, incluindo `tests/a11y/**`. Sem mudanças no workflow.

## Estratégia anti-flaky

- Sem timeouts customizados — axe é síncrono no DOM renderizado
- Sem `waitFor` — componentes Onda 5 não têm async no mount
- `color-contrast` desabilitado no axe (jsdom não aplica CSS) — contraste já é coberto pelos testes de classe `disabled:bg-muted` / `focus-visible:ring-*` existentes em `magic-up-onda5.test.tsx`
- Usa imports e helpers (`baseVariation`, `diagnosis`) já existentes via re-export do arquivo principal de teste

## Restrições

- Sem alterar componentes de produção
- Sem alterar `vitest.config.ts` (jest-axe roda nativamente em jsdom)
- Sem novos mocks
- Coverage thresholds atuais (60%) não mudam

## Entregável

- 2 novos arquivos (`axe-helper.ts`, `onda5-a11y.test.tsx`) + 1 extensão em `tests/setup.ts`
- ~7 testes axe verdes cobrindo 3 componentes Onda 5
- Documentação inline: cada `it()` nomeia a regra WCAG protegida
- Qualquer regressão futura (botão sem `aria-label`, role inválida, nested interactive, label órfã) quebra CI automaticamente
- Total da suíte: 24 → ~31 testes

