
Análise como Product Designer Strategist do módulo `/carrinhos/novo` (visto nos screenshots) + código atual (`SellerCartsPage.tsx`, `CartSidebar.tsx`, `CartCompanyPicker.tsx`).

**Problemas reais observados** (screenshots + código):
- **Header denso**: ícone 48x48 + título + subtítulo com 3 informações + atalho ocupam altura excessiva
- **Picker de empresa explode a tela**: 2 níveis de "Cancelar", lista vertical longa empurrando todo o conteúdo, sem busca por CNPJ/segmento, sem favoritos/recentes
- **Tabs de carrinhos sem contexto**: contador "0" não diferencia de "1+", sem indicação de status, sem reordenação
- **Cart info bar redundante**: repete logo+nome que já está na tab; status como botão pequeno difícil de descobrir
- **Empty state genérico**: "Carrinho vazio" + único CTA, sem sugestões inteligentes (templates, último carrinho, kits populares)
- **Sidebar 340px pesada**: 8 botões empilhados (Compartilhar/Duplicar/CSV/PDF/Salvar/Carregar/Limpar/Adicionar), sem hierarquia visual
- **Notas escondidas**: collapsible quase invisível, alta fricção para input crítico de contexto comercial
- **Sem visão analítica**: nenhum gráfico de evolução, nenhuma métrica de saúde do carrinho exposta

# Plano: Carrinhos — Onda Excelência UX (8 itens)

## Onda A — Header & Picker (compactação + inteligência)
1. **Header compactado** estilo `/orcamentos`: H1 + métricas inline (X carrinhos · Y itens · R$ Z total agregado), KPIs minúsculos à direita, atalho `Ctrl+K` como tooltip discreto. Reduz altura ~40%.
2. **CompanyPicker repensado** — dialog modal (não inline empurrando conteúdo), com 3 abas: **Recentes** (últimas 5 empresas usadas), **Favoritas** (estrela), **Buscar todas** (CNPJ + nome + segmento). Inclui mini-card com últimos 3 produtos comprados pela empresa.

## Onda B — Tabs & Cart Header (clareza)
3. **Tabs ricas**: badge de status colorido (pequeno dot), contador com cor (cinza=0, primary=1+), indicador "follow-up necessário" (clock laranja), drag para reordenar, botão `+` no fim para criar.
4. **Cart Header inline** — fundir info bar com tabs (remove redundância de logo). Cart ativo expande com: status como `Select` óbvio, valor total grande, idade, ações rápidas (compartilhar, duplicar, excluir) em 1 linha.

## Onda C — Conteúdo (produtividade)
5. **Empty state inteligente** — 3 CTAs lado a lado: **Aplicar template** (mostra os 3 mais usados com preview), **Duplicar último carrinho** desta empresa, **Explorar catálogo**. Reduz tempo até primeira ação.
6. **Notas sempre visíveis** — campo textarea inline acima dos produtos (não collapsible), com placeholder rotativo de exemplos ("Cliente quer entrega para evento dia X...", "Negociar prazo 30/60/90..."). Salva em onBlur com debounce visual.

## Onda D — Sidebar & Insights
7. **Sidebar reorganizada em 3 zonas**: 
   - **Hero Pricing** (subtotal grande + peso/volume) 
   - **Ação primária única** (Gerar Orçamento full-width)  
   - **Menu de ações** colapsado em DropdownMenu "Mais ações" (CSV/PDF/Compartilhar/Duplicar/Templates/Limpar) — reduz de 8 botões para 1 botão + 1 menu
8. **Painel de Saúde do Carrinho** — substitui o "Score" atual por checklist visual: ✅ Empresa vinculada, ✅ ≥3 produtos, ⚠️ Sem notas, ⚠️ Sem variantes selecionadas, ✅ Pronto para orçamento. Cada item clicável leva à correção. Mais acionável que um número abstrato.

## Arquivos esperados
- **Novos**: `src/components/cart/CartCompanyPickerDialog.tsx`, `src/components/cart/CartHealthChecklist.tsx`, `src/components/cart/CartEmptyStateSmart.tsx`, `src/components/cart/CartTabsRich.tsx`, `src/components/cart/CartActionsMenu.tsx`.
- **Modificados**: `src/pages/SellerCartsPage.tsx` (header compacto, fluxo dialog), `src/pages/seller-carts/CartSidebar.tsx` (3 zonas + menu), `src/pages/seller-carts/useSellerCartsPage.ts` (recentes/favoritas), `src/components/cart/CartCompanyPicker.tsx` (refator pra dialog).

Sem migrações novas — usa tabela `seller_carts` existente + `localStorage` para favoritas/recentes (consistente com padrão do projeto). Após aprovação executo os 8 itens sequencialmente até build TS limpo.
