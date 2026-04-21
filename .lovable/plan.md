

# Plano — Auditoria de acessibilidade da Onda 5

Vou auditar os 4 componentes novos da Onda 5 (`MagicUpQualityScore`, `MagicUpQualityChecklist`, `MagicUpCurationStatus`, `MagicUpVariationComparator`) + os pontos de integração no `MagicUpResultPanel` e `AdImageResult` (botão "Reanalisar Magic Score"), e corrigir tudo numa única passada.

## Critérios auditados

Para cada elemento interativo:
- **`aria-label`** descritivo quando o conteúdo visual não é suficiente (ícones puros, badges clicáveis)
- **Navegação por teclado** — `<button>` nativo, `tabIndex` correto, `Enter`/`Space` funcionando
- **Estados de foco** — `focus-visible:ring-2 focus-visible:ring-ring` ou equivalente do design system
- **Roles e landmarks** — `role="group"`, `aria-pressed`, `aria-current`, `aria-label` em `<section>`
- **Contraste de status** — selo "Melhor score", origem "IA"/"Heurístico", curadoria ativa
- **Leitura por screen reader** — score numérico exposto como texto, não só visual

## Componentes que serão revisados

| Arquivo | Falhas prováveis a corrigir |
|---|---|
| `MagicUpQualityScore.tsx` | `<section>` ok, mas `Progress` precisa de `aria-valuenow/min/max/label` explícito; badge de origem precisa de `title`/`aria-label` |
| `MagicUpQualityChecklist.tsx` | Lista deveria ser `<ul>/<li>` com `role="list"`; ícones de status precisam de `aria-hidden` + texto sr-only ("aprovado"/"reprovado"); score numérico precisa de `aria-label` ("Score 94 de 100") |
| `MagicUpCurationStatus.tsx` | Botões precisam de `aria-pressed` quando ativo; container `role="radiogroup"` ou manter `group` mas reforçar `aria-label`; scroll horizontal precisa de `tabIndex={0}` quando overflow |
| `MagicUpVariationComparator.tsx` | Cards clicáveis precisam de `aria-pressed`/`aria-current="true"`; "Marcar vencedora" precisa de `aria-label` único por variação; selo "Melhor score" precisa estar associado semanticamente |
| `MagicUpResultPanel.tsx` | Dots de paginação ✅ já têm aria-label; thumbnails ✅ ok; verificar `aria-current` nos dots |
| `AdImageResult.tsx` (apenas botão Reanalisar e bloco curadoria) | Confirmar `aria-label`, `disabled` correto e foco visível |

## Plano de execução

1. **Audit pass** — `code--view` em cada um dos 5 arquivos, anotar exatamente quais linhas falham em quais critérios
2. **Correções cirúrgicas** via `code--line_replace` (sem refator visual; só atributos a11y e classes `focus-visible:*`)
3. **Atualização do teste** `tests/components/magic-up-onda5.test.tsx` para cobrir as novas asserts (`aria-pressed`, `aria-current`, `role="list"`, score com `aria-label`)
4. **Re-run** dos testes Onda 5 para garantir 0 regressão
5. **Relatório final** listando: falhas encontradas → correções aplicadas → testes atualizados

## Restrições

- **Sem mudanças visuais** — apenas atributos ARIA, `role`, `tabIndex`, `aria-hidden` e classes `focus-visible:*` que já existem no design system
- **Sem alteração de comportamento** — handlers `onClick` permanecem idênticos
- **Sem dependência de browser** — auditoria por código + testes unitários, suficiente para validar a11y estática

## Entregável

Resumo por componente com:
- 🐛 falhas detectadas (linha + critério)
- ✅ correção aplicada (atributo adicionado)
- 🧪 teste novo cobrindo a regra
- Status final: "Onda 5 a11y compliant"

