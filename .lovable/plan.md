
# Kit Maker — Auditoria de Design 10/10 (Product Designer Strategist)

A funcionalidade está rica, mas o **design visual** ainda comunica como ferramenta interna. Para chegar a um produto premium nível Notion / Linear / Figma, identifiquei melhorias em **8 dimensões** de design.

---

## 1. Hierarquia visual & Densidade
**Problema:** Header denso (8 botões em linha), wizard, conteúdo e sidebar competem pela atenção. Sem ponto focal.
**Melhorias:**
- Agrupar ações secundárias (Undo/Redo/Duplicar/IA/Campeões) em um **menu "···"** ou *toolbar* lateral discreta.
- Header com **2 níveis claros**: linha 1 = identidade do kit (nome editável inline + status); linha 2 = ações primárias (Salvar, Próximo).
- Reduzir altura do header em 30% — atualmente consome ~180px do viewport.

## 2. Sistema de cor & Estado emocional
**Problema:** Tudo `primary` (laranja). Validações, sucesso, alertas, CTA misturam.
**Melhorias:**
- Aplicar **paleta semântica estrita**: success (verde) só em "kit válido/salvo", warning (âmbar) em capacidade >80%, destructive em conflitos, primary reservado para CTA único por tela.
- **Glow sutil** `var(--primary)` apenas no card ativo do wizard step (já tem token, falta aplicar).
- Background da página com **gradiente noise sutil** (não chapado) — diferencia do catálogo.

## 3. Tipografia & Microcopy
**Problema:** Títulos `text-xl` sem peso, copies utilitárias ("Selecione a Embalagem").
**Melhorias:**
- Títulos de step em `text-3xl font-display tracking-tight` com **número ordinal grande** (estilo "01") como elemento gráfico.
- Subtítulos com tom consultivo: *"Toda boa entrega começa pela embalagem certa"* em vez de instrução seca.
- `tabular-nums` em todos os preços/percentuais para alinhamento perfeito.

## 4. Wizard & Sensação de progresso
**Problema:** WizardSteps é funcional mas estático.
**Melhorias:**
- Barra de progresso **contínua** abaixo dos steps (0→100%) com animação ao avançar.
- Cada step exibe **mini-resumo** do que foi configurado (caixa: thumbnail + nome; itens: contador + peso).
- **Transição entre steps** com `motion` slide horizontal sutil (já existe `animate-fade-in`, falta direção).

## 5. Sidebar de resumo (desktop)
**Problema:** Sidebar `lg:col-span-1` empilha cards sem hierarquia — Stats, Visual, Saúde, Composição, Pricing tudo igual.
**Melhorias:**
- **Sticky** com scroll independente.
- Topo: card hero com **preço unitário gigante** + total + badge de saúde.
- Acordeões colapsáveis para detalhamento (composição, breakdown, simulador) — usuário escolhe profundidade.
- Mini-preview isométrico **always-on** no topo (180px), expansível em modal.

## 6. Cards & Superfícies
**Problema:** Todos os cards com `border` + `shadow-sm` idênticos. Falta camada.
**Melhorias:**
- 3 níveis de elevação: superfície base (sem borda), card secundário (`border-border/40`), card destacado (`border-primary/30 shadow-glow`).
- Cantos `rounded-2xl` no hero, `rounded-xl` no resto (consistência com `mem://ui/catalog`).
- **Backdrop-blur** em cards flutuantes (sticky bar mobile, FAB).

## 7. Empty states & Onboarding visual
**Problema:** Step Itens sem caixa selecionada apenas desabilita; templates só aparecem em `box && empty`.
**Melhorias:**
- Empty state ilustrado com **SVG isométrico custom** (caixa aberta) + 3 CTAs: Templates, IA, Manual.
- Skeleton loaders com **forma do conteúdo final** (não retângulos genéricos).
- "Estado de sucesso" celebrativo ao validar kit (confete sutil + badge animado).

## 8. Microinterações & Polimento
**Problema:** Pouca recompensa visual nas ações.
**Melhorias:**
- **Item adicionado** anima do grid → mini-preview da caixa (`layoutId` framer-motion).
- Hover nos cards de item com **lift sutil** + revelação de quick-actions.
- **Haptic-style feedback** visual em botões (ripple discreto).
- Toasts com ícones contextuais e action button ("Desfazer").
- Loading do salvamento como **morphing icon** (Save → Cloud → Check).

## 9. Mobile (bonus crítico)
- Bottom-sheet existente é bom, mas falta **drag handle** visual e snap points (40%/90%).
- Wizard horizontal com swipe nativo entre steps.
- FAB de "Próximo" sticky em vez de botão no fluxo.

## 10. Refinamentos finais
- **Dark mode** ajuste de tokens (alguns cards perdem contraste).
- Favicon dinâmico do Kit Maker.
- **Empty header** quando kit ainda não nomeado: placeholder elegante "Kit sem nome" em itálico.
- Atalho `?` abre modal com **todos os shortcuts** ilustrados.

---

## Roadmap de Execução (autônomo, 1 melhoria por vez)

**Onda A — Identidade visual (alto impacto, baixo esforço)**
1. Header 2 linhas + agrupamento ações em menu
2. Sistema cor semântica estrita + glow no step ativo
3. Tipografia hero (numerais grandes nos steps + tabular-nums)
4. Background com noise/gradiente sutil

**Onda B — Sidebar premium**
5. Sidebar sticky com hero pricing + acordeões
6. Mini-preview isométrico always-on no topo
7. 3 níveis de elevação de cards (rounded-2xl/xl)

**Onda C — Wizard & Progresso**
8. Barra de progresso contínua animada + mini-resumos por step
9. Transições motion slide horizontal entre steps
10. Empty states ilustrados + skeletons com forma

**Onda D — Microinterações**
11. Animação item → caixa (layoutId)
12. Hover lift nos cards + quick-actions reveladas
13. Morphing icons (Save/Cloud/Check)
14. Toasts contextuais com action

**Onda E — Mobile & Polimento final**
15. Bottom-sheet com drag handle + snap points
16. Swipe horizontal entre steps
17. Modal global de atalhos (tecla `?`)
18. Ajuste fino dark mode + microdetalhes

## Padrões aplicados a tudo
- Tokens semânticos (`var(--primary)`), zero hex hardcoded — `mem://architecture/skins-factory`
- `font-display` (Outfit), `tabular-nums` em números — `mem://style/design-system-spec`
- A11y: role/tabIndex/onKeyDown + foco visível — `mem://ui/accessibility`
- Componentes <300 LOC, lazy load do pesado — `mem://architecture/component-refactoring`
- Sem redesigns destrutivos sem confirmação — `mem://constraints/ui-redesign-protocol` (este plano JÁ é a confirmação)

## Próximo passo
Execução autônoma sequencial (Onda A → E), uma melhoria por vez, com QA visual após cada uma. Diga **"executar"** que sigo do item 1 ao 18 sem pausas até atingir 10/10 visual.
