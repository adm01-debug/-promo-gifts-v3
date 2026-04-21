

# Plano — Testes de classes de foco visível nos componentes Onda 5

Adiciono testes que validam, via inspeção de `className`, que cada botão interativo dos componentes da Onda 5 expõe `focus-visible:ring-*` e `focus-visible:ring-offset-*`, garantindo anel de foco perceptível para usuários de teclado.

## Arquivo único alterado

`tests/components/magic-up-onda5.test.tsx` — novo bloco `describe("MagicUpVariationComparator focus-visible classes")` com 3 testes.

## Casos cobertos

1. **Botão "Marcar vencedora" expõe ring + ring-offset no foco**
   - Renderiza com 3 variações
   - Para cada botão "Marcar variação N como vencedora":
     - `className` contém `focus-visible:ring-2`
     - `className` contém `focus-visible:ring-ring`
     - `className` contém `focus-visible:ring-offset-2`
     - `className` contém `focus-visible:ring-offset-background`

2. **Card de variação não fica invisível ao foco**
   - Para cada `<button>` "Selecionar variação N":
     - `className` contém `focus-visible:outline-none` (remove default)
     - `className` contém `focus-visible:ring-2` E `focus-visible:ring-ring` (substitui com anel visível)
   - Garante que `outline-none` nunca aparece sozinho sem `ring-*` compensatório

3. **Estado disabled mantém contraste legível**
   - Renderiza variações
   - Para botão "Marcar vencedora": `className` contém `disabled:bg-muted`, `disabled:text-muted-foreground`, `disabled:opacity-100`
   - Trava regressão para `opacity-50` padrão do shadcn (que reduz contraste abaixo do mínimo WCAG)

## Helpers reutilizados

- `baseVariation()` já criado nos snapshot tests
- `screen.getAllByRole("button", { name: /Marcar variação/ })` e `/Selecionar variação/`

## Estratégia

- Inspeção direta de `element.className` via `toContain()` — sem depender de `getComputedStyle` (jsdom não aplica Tailwind)
- Sem `fireEvent.focus()` — testamos a presença das classes, que é o contrato; o navegador aplica o estilo quando `:focus-visible` ativa
- Documenta no nome de cada `it()` o requisito WCAG protegido (visível ao teclado, contraste mínimo)

## Restrições

- Sem alterar `MagicUpVariationComparator.tsx` nem outros componentes de produção
- Sem novos mocks, sem dependência de browser, sem novos imports
- Reutiliza imports e helpers já existentes no arquivo de teste

## Entregável

- 3 novos testes verdes
- Total do arquivo: 21 → 24 testes
- Cobertura explícita: ring visível em todos os interativos + disabled legível
- Qualquer remoção futura de `focus-visible:ring-*` ou troca para `disabled:opacity-50` quebra o teste

