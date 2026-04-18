
Todas as 18 melhorias do roadmap visual já foram entregues no último ciclo (header 2-tier, wizard com barra contínua, sidebar sticky com hero pricing, acordeões, fundo gradiente, atalho `?`, motion fade-in, tipografia hero, tokens semânticos). Para realmente avançar rumo ao 10/10 absoluto, vou executar a **Onda Final F — Polimento Cirúrgico** com micro-melhorias que faltam.

# Kit Maker — Onda Final F (Polimento Cirúrgico)

## 1. Animação item → caixa (`layoutId` framer-motion)
- Em `ItemSelector`: ao clicar "Adicionar", item anima do card até o mini-preview na sidebar usando `motion.div` com `layoutId={"kit-item-" + sku}`.
- Adicionar `LayoutGroup` envolvendo conteúdo + sidebar.

## 2. Hover lift + quick actions reveladas
- Cards de produto/caixa ganham `transition-transform hover:-translate-y-0.5 hover:shadow-lg`.
- Botões de quick-action (favoritar, info) ficam `opacity-0 group-hover:opacity-100`.

## 3. Toasts contextuais com action "Desfazer"
- Em `addItem`/`removeItem`/`selectBox` no `useKitBuilder`: chamar `toast.success(..., { action: { label: 'Desfazer', onClick: undo } })`.

## 4. Bottom-sheet mobile com drag handle visual + snap points
- Refatorar `KitMobileSummaryBar`: adicionar barra cinza arredondada no topo do Sheet (`<div className="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/30 mb-2" />`).
- Snap points 40%/90% via `vaul` (já usado nos drawers do shadcn) — se não disponível, manter Sheet com `h-[90vh]`.

## 5. Empty state ilustrado no step Itens (sem caixa)
- SVG isométrico custom de caixa aberta + 3 CTAs: Templates, IA, Manual.
- Substitui o estado desabilitado atual.

## 6. Skeletons com forma do conteúdo
- `BoxSelector`/`ItemSelector` loading: skeleton com aspect-ratio do card real (imagem quadrada + 2 linhas + badge), não retângulos genéricos.

## 7. Confete sutil ao validar kit pela primeira vez
- Quando `isValid` muda de `false` → `true`: dispara `canvas-confetti` (lib leve) + toast celebrativo "Seu kit está pronto! 🎉".

## 8. Favicon dinâmico + título da aba
- `document.title` reflete nome do kit em tempo real: `${kitName || 'Kit sem nome'} · Kit Maker`.

## 9. Ajuste fino dark mode
- Auditar contraste dos cards `border-border/40` no dark — reforçar para `/60` quando necessário.
- Hero pricing card ganha `dark:from-card dark:to-primary/[0.08]` para mais presença.

## 10. Micro-detalhes finais
- `scrollbar-thin` style global na sidebar sticky (já usado, garantir CSS no index.css).
- Focus rings consistentes `focus-visible:ring-2 focus-visible:ring-primary/60` em todos botões custom.

## Padrões aplicados
- TS strict, `any` proibido, type imports inline.
- Tokens semânticos (`var(--primary)`, `success`, `warning`).
- A11y: `role`/`tabIndex`/`onKeyDown` em divs clicáveis, `aria-live="polite"` no toast de sucesso.
- Componentes <300 LOC, hooks <500 LOC.
- `canvas-confetti` será adicionado via `<script>` dinâmico ou import lazy para não pesar bundle.
- Memória `mem://design/kit-maker-design-10-10` será atualizada com os novos padrões.

## Estratégia de execução
Sequencial 1→10 sem perguntas. Após cada item: verificação de tipos. Ao fim: nota concisa do que mudou + atualização da memória.

Pronto para executar.
