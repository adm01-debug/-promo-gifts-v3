# 🎯 PRODUCT DESIGN STRATEGY - ANÁLISE EXAUSTIVA v2.0

**Data:** 07 de Janeiro de 2026  
**Analista:** Product Design Strategist (IA)  
**Projeto:** Gifts Store - Promo Brindes  
**Status:** 🟢 Em Evolução Contínua

---

## 🚀 AÇÕES IMEDIATAS 2026 (TOP 10)

| # | Ação | Impacto | Esforço | Status |
|---|------|---------|---------|--------|
| 1 | **StatusBadge unificado** - Consistência visual em badges de status | 🔥 Alto | ⚡ Baixo | ✅ Implementado |
| 2 | **PageHeader padrão** - Layout consistente em todas as páginas | 🔥 Alto | ⚡ Baixo | ✅ Implementado |
| 3 | **SkipToContent** - Acessibilidade básica (skip links) | 🔥 Alto | ⚡ Baixo | ✅ Implementado |
| 4 | **ConfirmDialog unificado** - Confirmações destrutivas padronizadas | 🔥 Alto | ⚡ Baixo | ✅ Implementado |
| 5 | **DataCard para métricas** - Cards de estatísticas com tendência | 🔥 Alto | ⚡ Baixo | ✅ Implementado |
| 6 | **ActionButton com loading** - Feedback visual em ações | 🔥 Alto | ⚡ Baixo | ✅ Implementado |
| 7 | **Sidebar reorganizado** - Navegação em grupos lógicos | 🔥 Alto | ⚡ Médio | ✅ Implementado |
| 8 | **MobileBottomNav** - Navegação mobile otimizada | 🔥 Alto | ⚡ Médio | ✅ Implementado |
| 9 | **UnifiedEmptyState** - Empty states educativos | 🔥 Alto | ⚡ Baixo | ✅ Implementado |
| 10 | **Spotlight (Cmd+K)** - Busca global rápida | 🔥 Alto | ⚡ Médio | ✅ Implementado |

---

## 📋 ÍNDICE

1. [Ações Imediatas 2026](#-ações-imediatas-2026-top-10)
2. [Resumo Executivo](#-resumo-executivo)
3. [Arquitetura de Informação](#-arquitetura-de-informação)
4. [User Experience (UX)](#-user-experience-ux)
5. [User Interface (UI)](#-user-interface-ui)
6. [Design System](#-design-system)
7. [Performance & Core Web Vitals](#-performance--core-web-vitals)
8. [Acessibilidade (a11y)](#-acessibilidade-a11y)
9. [Mobile Experience](#-mobile-experience)
10. [Micro-interações & Animações](#-micro-interações--animações)
11. [Gamificação](#-gamificação)
12. [Onboarding & Educação](#-onboarding--educação)
13. [Busca & Descoberta](#-busca--descoberta)
14. [Conversão & CTA](#-conversão--cta)
15. [Feedback & Estados](#-feedback--estados)
16. [Internacionalização](#-internacionalização)
17. [Analytics & Métricas](#-analytics--métricas)
18. [Roadmap de Implementação](#-roadmap-de-implementação)

---

## 🎯 RESUMO EXECUTIVO

### Pontos Fortes Atuais ✅
1. **Design System robusto** - Tokens bem definidos, suporte a dark mode
2. **Gamificação implementada** - XP, coins, streaks, achievements
3. **Arquitetura modular** - Componentes bem separados
4. **Acessibilidade básica** - Focus states, reduced-motion support
5. **i18n configurado** - PT-BR, EN-US, ES-ES

### Gaps Críticos ❌
1. **Onboarding incompleto** - Usuários novos ficam perdidos
2. **Empty states pobres** - Falta de orientação quando não há dados
3. **Feedback insuficiente** - Ações silenciosas demais
4. **Mobile experience** - Não otimizado para touch
5. **Busca limitada** - Sem sugestões inteligentes integradas
6. **Navegação confusa** - Muitos itens no sidebar sem hierarquia clara

---

## 🗺️ ARQUITETURA DE INFORMAÇÃO

### Problemas Identificados

#### 1. Sidebar Sobrecarregado
O sidebar tem **14 itens principais** + categorias + itens inferiores. Isso causa:
- Sobrecarga cognitiva
- Dificuldade de encontrar funcionalidades
- Scroll excessivo em telas menores

**Recomendação:**
```
ANTES (14 itens):
├── Dashboard BI
├── Tendências
├── Produtos
├── Coleções
├── Clientes
├── Orçamentos
├── Pedidos
├── Simulador
├── Mockups
├── Magic Up
├── Loja
├── Filtros
├── Favoritos
└── Comparar

DEPOIS (6 grupos lógicos):
├── 📊 Analytics
│   ├── Dashboard BI
│   └── Tendências
├── 📦 Catálogo
│   ├── Produtos
│   ├── Coleções
│   └── Filtros
├── 👥 Vendas
│   ├── Clientes
│   ├── Orçamentos
│   └── Pedidos
├── 🛠️ Ferramentas
│   ├── Simulador
│   ├── Mockups
│   └── Magic Up
├── ⭐ Meus Itens
│   ├── Favoritos
│   └── Comparar
└── 🎁 Recompensas
    └── Loja
```

#### 2. Inconsistência nas URLs
| Atual | Recomendado | Motivo |
|-------|-------------|--------|
| `/produto/:id` | `/produtos/:id` | Consistência com `/produtos` |
| `/orcamentos/novo` | `/orcamentos/criar` | Verbo mais claro |
| `/mockup-generator` | `/mockups` | Simplificação |
| `/loja-recompensas` | `/recompensas` | Mais curto |

#### 3. Breadcrumbs Ausentes
Não há indicação de localização. Usuário se perde em páginas profundas.

**Implementar:**
```tsx
// Exemplo para /orcamentos/123/editar
<Breadcrumb>
  <BreadcrumbItem href="/">Início</BreadcrumbItem>
  <BreadcrumbItem href="/orcamentos">Orçamentos</BreadcrumbItem>
  <BreadcrumbItem href="/orcamentos/123">ORC-2024-001</BreadcrumbItem>
  <BreadcrumbItem current>Editar</BreadcrumbItem>
</Breadcrumb>
```

---

## 🧠 USER EXPERIENCE (UX)

### 1. Jornadas do Usuário - Gaps Identificados

#### Jornada: Criar Orçamento Rápido
```
ATUAL (12 passos):
1. Login → 2. Dashboard → 3. Clique Orçamentos → 4. Clique Novo
5. Selecionar cliente → 6. Buscar produto → 7. Adicionar produto
8. Repetir 6-7 para cada produto → 9. Ajustar quantidades
10. Adicionar personalização → 11. Revisar → 12. Salvar

IDEAL (6 passos):
1. Login → 2. Dashboard (com atalho "Novo Orçamento")
3. Modal Quick Quote → 4. Busca inteligente + Add rápido
5. Revisão inline → 6. Salvar/Enviar
```

**Melhorias:**
- [ ] Implementar Quick Quote flutuante (já criado, não integrado)
- [ ] Adicionar shortcut `Cmd+N` para novo orçamento
- [ ] Salvar rascunhos automaticamente a cada 30s
- [ ] Permitir duplicar orçamentos existentes em 1 clique

#### Jornada: Encontrar Produto Ideal para Cliente
```
ATUAL:
1. Ir para Clientes → 2. Selecionar cliente → 3. Ver perfil
4. Anotar cores preferidas → 5. Voltar para Produtos
6. Filtrar manualmente por cores → 7. Comparar produtos

IDEAL:
1. Selecionar cliente (de qualquer lugar)
2. Sistema filtra automaticamente por cores compatíveis
3. IA sugere produtos com score de match
4. Comparação side-by-side com 1 clique
```

**Melhorias:**
- [ ] Widget de seleção de cliente persistente no header
- [ ] Filtro automático por cores do cliente ativo
- [ ] ProductRecommendations (já criado) integrado no catálogo
- [ ] Badge "Match X%" em cada produto quando cliente selecionado

### 2. Princípios de UX a Implementar

#### Progressive Disclosure
Mostrar informações complexas gradualmente.

```tsx
// Exemplo: Detalhes de Personalização
<Accordion>
  <AccordionItem value="basic">
    <AccordionTrigger>Personalização Básica</AccordionTrigger>
    <AccordionContent>
      {/* Técnica, cores, posição */}
    </AccordionContent>
  </AccordionItem>
  <AccordionItem value="advanced">
    <AccordionTrigger>Opções Avançadas</AccordionTrigger>
    <AccordionContent>
      {/* Mockup, multi-área, setup */}
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

#### Forgiving Format
Aceitar múltiplos formatos de entrada.

```tsx
// Busca de produtos - aceitar variações
const normalizeSearch = (query: string) => {
  return query
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^\w\s]/g, "") // Remove pontuação
    .trim();
};

// "Caneta" = "caneta" = "CANETA" = "câneta"
```

#### Confirmation Before Destruction
Pedir confirmação apenas para ações destrutivas irreversíveis.

```tsx
// Bom: Confirmação para exclusão
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Excluir Orçamento</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta ação não pode ser desfeita. O orçamento ORC-2024-001 
        será permanentemente excluído.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction className="bg-destructive">
        Sim, excluir
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

// Ruim: Confirmação para favoritar (desnecessário)
```

---

## 🎨 USER INTERFACE (UI)

### 1. Hierarquia Visual

#### Problemas Atuais
- Cards de estatísticas têm mesmo peso visual que cards de produtos
- CTAs secundários competem com primários
- Títulos de seções não se destacam suficientemente

#### Recomendações

**Escala Tipográfica Aprimorada:**
```css
/* Atual */
h1: 1.875rem / 2.25rem (30px / 36px)
h2: 1.5rem / 1.875rem (24px / 30px)
h3: 1.25rem / 1.5rem (20px / 24px)

/* Recomendado - Maior contraste */
h1: 2.5rem / 3rem (40px / 48px) - Display, hero
h2: 1.875rem / 2.25rem (30px / 36px) - Títulos de página
h3: 1.5rem / 1.75rem (24px / 28px) - Títulos de seção
h4: 1.25rem / 1.5rem (20px / 24px) - Subtítulos
h5: 1.125rem / 1.375rem (18px / 22px) - Labels importantes
h6: 1rem / 1.25rem (16px / 20px) - Captions
```

**Variantes de Card com Hierarquia:**
```tsx
// Card primário (destaque)
<Card className="border-2 border-primary shadow-lg">

// Card secundário (padrão)
<Card className="border border-border shadow-sm">

// Card terciário (informativo)
<Card className="border-0 bg-muted/50">

// Card interativo (hover states)
<Card className="card-interactive hover:shadow-lg hover:-translate-y-1">
```

### 2. Consistência Visual

#### Inconsistências Encontradas

| Local | Problema | Solução |
|-------|----------|---------|
| Badges | Cores inconsistentes para status | Criar `StatusBadge` com variantes |
| Botões | Tamanhos variáveis em contextos iguais | Padronizar `size="sm"` em tabelas |
| Ícones | Alguns Lucide, alguns emojis | Usar apenas Lucide |
| Espaçamento | `gap-4` misturado com `gap-3` | Usar scale: 2, 4, 6, 8, 12 |
| Bordas | `rounded-lg` vs `rounded-xl` | Padronizar `rounded-lg` para cards |

#### Componentes a Criar

```tsx
// 1. StatusBadge unificado
<StatusBadge status="approved" /> // Verde
<StatusBadge status="pending" />  // Amarelo
<StatusBadge status="rejected" /> // Vermelho
<StatusBadge status="draft" />    // Cinza

// 2. DataCard para estatísticas
<DataCard
  icon={<Package />}
  value={1234}
  label="Total de Produtos"
  trend={{ value: 12, direction: "up" }}
/>

// 3. ActionButton com loading state
<ActionButton
  loading={isSaving}
  loadingText="Salvando..."
  onClick={handleSave}
>
  Salvar
</ActionButton>
```

### 3. Espaço em Branco (Whitespace)

#### Recomendações

```css
/* Seções */
.section-gap { gap: 2rem; }     /* Entre seções */
.content-gap { gap: 1.5rem; }   /* Dentro de seções */
.item-gap { gap: 1rem; }        /* Entre itens de lista */
.inline-gap { gap: 0.5rem; }    /* Elementos inline */

/* Padding de containers */
.container-padding { padding: 1.5rem; }
.card-padding { padding: 1.25rem; }
.compact-padding { padding: 1rem; }

/* Margem de página */
.page-margin { margin: 1.5rem 2rem; }
```

---

## 🎯 DESIGN SYSTEM

### 1. Tokens Faltantes

```css
/* Adicionar ao index.css */

/* ===== FOCUS RINGS ===== */
--focus-ring-width: 2px;
--focus-ring-offset: 2px;
--focus-ring-color: var(--primary);

/* ===== TIMING ===== */
--duration-instant: 0ms;
--duration-fast: 100ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
--duration-slower: 500ms;

/* ===== OPACITY STATES ===== */
--opacity-disabled: 0.5;
--opacity-hover: 0.8;
--opacity-placeholder: 0.6;

/* ===== LINE HEIGHTS ===== */
--leading-none: 1;
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose: 2;

/* ===== LETTER SPACING ===== */
--tracking-tighter: -0.05em;
--tracking-tight: -0.025em;
--tracking-normal: 0;
--tracking-wide: 0.025em;
--tracking-wider: 0.05em;
--tracking-widest: 0.1em;
```

### 2. Componentes Compostos Faltantes

```tsx
// 1. PageHeader - Padrão para todas as páginas
interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  stats?: StatItem[];
}

// 2. DataTable - Tabela com tudo integrado
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  bulkActions?: BulkAction[];
  pagination?: boolean;
  selectable?: boolean;
  exportable?: boolean;
  loading?: boolean;
  emptyState?: ReactNode;
}

// 3. FormSection - Agrupamento de campos
interface FormSectionProps {
  title: string;
  description?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}

// 4. ConfirmationModal - Modal de confirmação reutilizável
interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  loading?: boolean;
}
```

### 3. Padrões de Composição

```tsx
// Layout de página padrão
function StandardPageLayout({ 
  children, 
  header, 
  sidebar, 
  footer 
}: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {header && <header className="sticky top-0 z-50">{header}</header>}
      <div className="flex flex-1">
        {sidebar && <aside className="w-64 shrink-0">{sidebar}</aside>}
        <main className="flex-1 p-6">{children}</main>
      </div>
      {footer && <footer>{footer}</footer>}
    </div>
  );
}

// Card de lista padrão
function ListCard({ 
  title, 
  description, 
  image, 
  actions, 
  badges, 
  metadata 
}: ListCardProps) {
  return (
    <Card className="flex gap-4 p-4">
      {image && <div className="w-20 h-20 rounded-lg overflow-hidden">{image}</div>}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold truncate">{title}</h3>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {badges && <div className="flex gap-1">{badges}</div>}
        </div>
        {metadata && <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">{metadata}</div>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </Card>
  );
}
```

---

## ⚡ PERFORMANCE & CORE WEB VITALS

### 1. Métricas Atuais Estimadas

| Métrica | Atual (Est.) | Meta | Ação |
|---------|--------------|------|------|
| **LCP** | ~2.5s | <2.5s | Otimizar imagens |
| **FID** | ~100ms | <100ms | Code splitting |
| **CLS** | ~0.15 | <0.1 | Reservar espaço para imagens |
| **TTFB** | ~600ms | <600ms | Edge caching |
| **FCP** | ~1.8s | <1.8s | Inline critical CSS |

### 2. Otimizações Recomendadas

#### Imagens
```tsx
// Componente LazyImage otimizado
<LazyImage
  src={product.image}
  alt={product.name}
  width={300}
  height={300}
  placeholder="blur"
  blurDataURL={product.thumbnailBlur}
  loading="lazy"
  decoding="async"
  className="aspect-square object-cover"
/>

// Implementar srcset para responsividade
<img
  src={product.image}
  srcSet={`
    ${product.image_300} 300w,
    ${product.image_600} 600w,
    ${product.image_1200} 1200w
  `}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
/>
```

#### Code Splitting
```tsx
// Já implementado com lazy(), mas melhorar:

// 1. Prefetch de rotas prováveis
const ProductDetail = lazy(() => {
  // Quando usuário hover em produto, prefetch
  return import("./pages/ProductDetail");
});

// 2. Chunk naming para debug
const AdminPanel = lazy(() => 
  import(/* webpackChunkName: "admin" */ "./pages/AdminPanel")
);
```

#### Virtualização
```tsx
// Usar VirtualizedProductGrid para listas grandes
import { VirtualizedProductGrid } from "@/components/virtualized";

// Threshold: >50 itens
{products.length > 50 ? (
  <VirtualizedProductGrid 
    products={products} 
    rowHeight={320}
    overscan={3}
  />
) : (
  <ProductGrid products={products} />
)}
```

### 3. Caching Strategy

```tsx
// React Query cache config
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 minutos
      cacheTime: 30 * 60 * 1000,       // 30 minutos
      refetchOnWindowFocus: false,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Prefetch de dados frequentes
useEffect(() => {
  // Prefetch produtos ao carregar app
  queryClient.prefetchQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });
}, []);
```

---

## ♿ ACESSIBILIDADE (a11y)

### 1. WCAG 2.1 AA - Gaps

| Critério | Status | Correção Necessária |
|----------|--------|---------------------|
| 1.1.1 Non-text Content | ⚠️ Parcial | Adicionar alt em todas imagens |
| 1.3.1 Info and Relationships | ⚠️ Parcial | Usar landmarks semânticos |
| 1.4.3 Contrast (Minimum) | ✅ OK | - |
| 2.1.1 Keyboard | ⚠️ Parcial | Tab order em modais |
| 2.4.1 Bypass Blocks | ❌ Falta | Adicionar skip links |
| 2.4.4 Link Purpose | ⚠️ Parcial | Links genéricos "Ver mais" |
| 4.1.2 Name, Role, Value | ⚠️ Parcial | ARIA labels em ícones |

### 2. Implementações Necessárias

#### Skip Links
```tsx
// Adicionar no topo de MainLayout
<a 
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
             focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground 
             focus:rounded-md"
>
  Pular para conteúdo principal
</a>

// E no main:
<main id="main-content" tabIndex={-1}>
```

#### ARIA Labels em Botões de Ícone
```tsx
// Atual (ruim)
<Button size="icon"><Heart /></Button>

// Correto
<Button size="icon" aria-label="Adicionar aos favoritos">
  <Heart aria-hidden="true" />
</Button>
```

#### Live Regions para Feedback
```tsx
// Anúncios para screen readers
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {announcement}
</div>

// Usar:
const announce = (message: string) => {
  setAnnouncement(message);
  setTimeout(() => setAnnouncement(""), 1000);
};

// Ao adicionar favorito:
announce("Produto adicionado aos favoritos");
```

#### Focus Management em Modais
```tsx
// Usar FocusTrap de @radix-ui ou implementar
import { FocusTrap } from "@radix-ui/react-focus-trap";

<Dialog>
  <DialogContent>
    <FocusTrap>
      {/* Conteúdo do modal */}
      <Button autoFocus>Primeira ação</Button>
    </FocusTrap>
  </DialogContent>
</Dialog>
```

### 3. Checklist de Acessibilidade por Componente

```markdown
## Para cada novo componente, verificar:

- [ ] Contraste de cores (4.5:1 para texto, 3:1 para UI)
- [ ] Navegação por teclado funcional
- [ ] Focus visible em todos elementos interativos
- [ ] ARIA labels em elementos sem texto visível
- [ ] Role correto para elementos customizados
- [ ] Estados (disabled, loading, error) comunicados
- [ ] Suporte a prefers-reduced-motion
- [ ] Funcionando com zoom 200%
- [ ] Touch target mínimo de 44x44px
```

---

## 📱 MOBILE EXPERIENCE

### 1. Touch Targets

```css
/* Mínimo 44x44px para touch */
.touch-target {
  min-width: 44px;
  min-height: 44px;
  padding: 12px;
}

/* Botões de ação em listas */
.action-button-mobile {
  @apply p-3 -m-3; /* Área de toque maior que visual */
}
```

### 2. Gestos a Implementar

```tsx
// 1. Swipe para ações em cards
<SwipeableProductCard
  onSwipeLeft={() => removeFromFavorites(product.id)}
  onSwipeRight={() => addToQuote(product)}
>
  <ProductCard product={product} />
</SwipeableProductCard>

// 2. Pull to refresh
<PullToRefresh onRefresh={refetchProducts}>
  <ProductList products={products} />
</PullToRefresh>

// 3. Pinch to zoom em imagens
<PinchZoomImage src={product.images[0]} />
```

### 3. Bottom Sheet para Ações Mobile

```tsx
// Substituir dropdowns por bottom sheets no mobile
const isMobile = useIsMobile();

{isMobile ? (
  <BottomSheet>
    <BottomSheetTrigger asChild>
      <Button>Ações</Button>
    </BottomSheetTrigger>
    <BottomSheetContent>
      <BottomSheetItem onClick={handleEdit}>Editar</BottomSheetItem>
      <BottomSheetItem onClick={handleDuplicate}>Duplicar</BottomSheetItem>
      <BottomSheetItem onClick={handleDelete} destructive>Excluir</BottomSheetItem>
    </BottomSheetContent>
  </BottomSheet>
) : (
  <DropdownMenu>
    {/* Dropdown normal */}
  </DropdownMenu>
)}
```

### 4. Navegação Mobile

```tsx
// Bottom Navigation Bar (em vez de sidebar)
<nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden 
                bg-background border-t border-border safe-area-pb">
  <div className="flex items-center justify-around h-16">
    <NavItem icon={<Package />} label="Produtos" href="/" />
    <NavItem icon={<Heart />} label="Favoritos" href="/favoritos" />
    <NavItem icon={<Plus />} label="Novo" href="/orcamentos/novo" primary />
    <NavItem icon={<FileText />} label="Orçamentos" href="/orcamentos" />
    <NavItem icon={<User />} label="Perfil" href="/perfil" />
  </div>
</nav>
```

### 5. Adaptações de Layout

```tsx
// Grid responsivo para produtos
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">

// Stack em mobile, row em desktop
<div className="flex flex-col sm:flex-row gap-4">

// Hidden em mobile
<div className="hidden md:block">

// Tamanho de texto responsivo
<h1 className="text-2xl md:text-3xl lg:text-4xl">
```

---

## ✨ MICRO-INTERAÇÕES & ANIMAÇÕES

### 1. Princípios de Motion Design

```css
/* Easing functions */
--ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1);     /* Saída suave */
--ease-in-out-circ: cubic-bezier(0.85, 0, 0.15, 1); /* Entrada/saída */
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Bounce sutil */

/* Durations baseadas em propósito */
--duration-micro: 100ms;   /* Hover, focus */
--duration-short: 200ms;   /* Transições pequenas */
--duration-medium: 300ms;  /* Modais, expansões */
--duration-long: 500ms;    /* Transições de página */
```

### 2. Animações por Contexto

#### Feedback Imediato (100ms)
```tsx
// Hover em botões
<Button className="transition-all duration-100 hover:scale-105">

// Toggle de favorito
<HeartIcon className={cn(
  "transition-transform duration-100",
  isFavorite && "scale-125 fill-red-500"
)} />
```

#### Transições de Estado (200-300ms)
```tsx
// Expandir/colapsar
<motion.div
  initial={false}
  animate={{ height: isOpen ? "auto" : 0 }}
  transition={{ duration: 0.2, ease: [0.04, 0.62, 0.23, 0.98] }}
>

// Troca de views
<AnimatePresence mode="wait">
  {viewMode === 'grid' ? (
    <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <ProductGrid />
    </motion.div>
  ) : (
    <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <ProductList />
    </motion.div>
  )}
</AnimatePresence>
```

#### Celebrações (300-500ms)
```tsx
// Sucesso ao salvar
<SuccessCelebration 
  show={saved}
  type="success"
  message="Orçamento salvo!"
  duration={2000}
/>

// Achievement desbloqueado
<FloatingReward
  show={newAchievement}
  type="trophy"
  value="Primeiro Orçamento!"
/>
```

### 3. Animações de Lista

```tsx
// Stagger animation para items
<motion.ul>
  {items.map((item, index) => (
    <motion.li
      key={item.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {item.content}
    </motion.li>
  ))}
</motion.ul>

// Reorder animation com layout
<Reorder.Group values={items} onReorder={setItems}>
  {items.map((item) => (
    <Reorder.Item key={item.id} value={item} layout>
      <ItemCard item={item} />
    </Reorder.Item>
  ))}
</Reorder.Group>
```

---

## 🎮 GAMIFICAÇÃO

### 1. Análise do Sistema Atual

**Pontos Fortes:**
- Tokens definidos (XP, Coins, Streak)
- Componentes de celebração
- Leaderboard implementado

**Gaps:**
- Falta feedback em tempo real
- Progressão não visível constantemente
- Recompensas não tangíveis

### 2. Melhorias Recomendadas

#### Progress Bar Persistente
```tsx
// No header, mostrar progresso do nível
<div className="flex items-center gap-2">
  <Badge variant="outline" className="bg-gradient-to-r from-xp to-primary">
    Nível {level}
  </Badge>
  <Progress 
    value={(currentXP / nextLevelXP) * 100} 
    className="w-24 h-2"
  />
  <span className="text-xs text-muted-foreground">
    {currentXP}/{nextLevelXP} XP
  </span>
</div>
```

#### Daily Challenges
```tsx
// Widget de desafios diários
<DailyChallenges
  challenges={[
    { 
      id: "quotes-3",
      title: "Criar 3 orçamentos",
      progress: 2,
      target: 3,
      reward: { xp: 50, coins: 10 }
    },
    {
      id: "favorites-5",
      title: "Favoritar 5 produtos",
      progress: 5,
      target: 5,
      completed: true,
      reward: { xp: 30, coins: 5 }
    }
  ]}
/>
```

#### Milestones com Recompensas
```tsx
// Marcos importantes
const milestones = [
  { quotes: 10, reward: "badge_bronze", title: "Vendedor Bronze" },
  { quotes: 50, reward: "badge_silver", title: "Vendedor Prata" },
  { quotes: 100, reward: "badge_gold", title: "Vendedor Ouro" },
  { value: 100000, reward: "badge_elite", title: "Elite R$100k" },
];
```

### 3. Feedback Loops

```tsx
// Hook para gamificação automática
const useGamificationFeedback = () => {
  const { addXP, addCoins, checkAchievements } = useGamification();

  const onQuoteCreated = async (quote: Quote) => {
    // XP base
    await addXP(20, "Orçamento criado");
    
    // Bônus por valor
    if (quote.total > 5000) {
      await addXP(30, "Orçamento de alto valor");
      await addCoins(15, "Bônus R$5k+");
    }
    
    // Check achievements
    await checkAchievements("quotes");
  };

  return { onQuoteCreated };
};
```

---

## 📚 ONBOARDING & EDUCAÇÃO

### 1. First-Time User Experience (FTUE)

```tsx
// Wizard de boas-vindas
<OnboardingWizard
  steps={[
    {
      id: "welcome",
      title: "Bem-vindo ao Gifts Store!",
      content: "Vamos configurar sua conta em 2 minutos",
      illustration: <WelcomeIllustration />,
    },
    {
      id: "profile",
      title: "Complete seu perfil",
      content: <ProfileForm />,
      validation: () => !!profile.name,
    },
    {
      id: "tour",
      title: "Conheça a plataforma",
      content: "Faça um tour guiado pelos recursos principais",
      action: { label: "Iniciar Tour", onClick: startTour },
    },
  ]}
  onComplete={() => {
    markOnboardingComplete();
    addXP(100, "Onboarding completo!");
  }}
/>
```

### 2. Tooltips Contextuais

```tsx
// Feature discovery
<FeatureTooltip
  id="color-filter"
  title="Dica: Filtro por cores"
  content="Selecione um cliente para ver produtos que combinam com as cores da marca dele"
  placement="bottom"
  showOnce
>
  <FilterButton />
</FeatureTooltip>
```

### 3. Empty States Educativos

```tsx
// Em vez de "Nenhum orçamento encontrado"
<EmptyState
  icon={<FileText className="h-12 w-12" />}
  title="Nenhum orçamento ainda"
  description="Crie seu primeiro orçamento para começar a vender!"
  actions={[
    {
      label: "Criar orçamento",
      onClick: () => navigate("/orcamentos/novo"),
      primary: true,
    },
    {
      label: "Ver tutorial",
      onClick: () => openTutorial("quotes"),
    },
  ]}
  tip="Dica: Use Cmd+N para criar um orçamento rapidamente"
/>
```

### 4. Inline Help

```tsx
// Ajuda contextual em campos complexos
<FormField>
  <FormLabel>
    Técnica de Personalização
    <HelpTooltip>
      Escolha como o logo será aplicado no produto.
      <ul className="mt-2 space-y-1">
        <li><strong>Serigrafia:</strong> Ideal para áreas grandes</li>
        <li><strong>Laser:</strong> Para materiais metálicos</li>
        <li><strong>Bordado:</strong> Tecidos de qualidade</li>
      </ul>
    </HelpTooltip>
  </FormLabel>
  <Select {...field} />
</FormField>
```

---

## 🔍 BUSCA & DESCOBERTA

### 1. Search Experience

#### Busca Atual vs Ideal

| Aspecto | Atual | Ideal |
|---------|-------|-------|
| Sugestões | ❌ Nenhuma | ✅ Autocomplete + histórico |
| Fuzzy match | ❌ Exato | ✅ Tolerante a erros |
| Categorização | ❌ Lista única | ✅ Agrupado por tipo |
| Filtros rápidos | ⚠️ Separado | ✅ Integrado na busca |
| Voz | ✅ Criado | ⚠️ Não integrado |
| Visual | ✅ Criado | ⚠️ Não integrado |

#### Command Palette Melhorado

```tsx
<GlobalSearchPalette>
  {/* Resultados agrupados */}
  <SearchGroup title="Produtos" icon={<Package />}>
    {productResults.map(p => <ProductResult key={p.id} product={p} />)}
  </SearchGroup>
  
  <SearchGroup title="Clientes" icon={<Users />}>
    {clientResults.map(c => <ClientResult key={c.id} client={c} />)}
  </SearchGroup>
  
  <SearchGroup title="Orçamentos" icon={<FileText />}>
    {quoteResults.map(q => <QuoteResult key={q.id} quote={q} />)}
  </SearchGroup>
  
  <SearchGroup title="Ações Rápidas" icon={<Zap />}>
    <ActionResult label="Novo orçamento" shortcut="⌘N" />
    <ActionResult label="Ir para admin" shortcut="⌘A" />
  </SearchGroup>
</GlobalSearchPalette>
```

### 2. Filtros Inteligentes

```tsx
// Sugestões baseadas em contexto
<SmartFilters
  suggestions={[
    { 
      label: "Produtos em promoção", 
      filter: { onSale: true },
      count: 23 
    },
    { 
      label: `Produtos ${selectedClient?.name}`, 
      filter: { colorMatch: selectedClient?.colors },
      count: 45,
      highlight: true // Contexto do cliente
    },
    { 
      label: "Novidades da semana", 
      filter: { newArrival: true, dateRange: "week" },
      count: 12 
    },
  ]}
/>
```

### 3. Busca por Voz Integrada

```tsx
// Botão no header de busca
<SearchInput
  placeholder="Buscar produtos..."
  value={query}
  onChange={setQuery}
  rightElement={
    <Button variant="ghost" size="icon" onClick={openVoiceSearch}>
      <Mic className="h-4 w-4" />
    </Button>
  }
/>

// Modal de voz com feedback visual
<VoiceSearchModal
  isOpen={voiceOpen}
  onResult={(text) => setQuery(text)}
  suggestions={voiceSuggestions}
/>
```

---

## 🎯 CONVERSÃO & CTA

### 1. Hierarquia de CTAs

```tsx
// Primário (1 por tela)
<Button size="lg" className="bg-gradient-to-r from-primary to-primary-hover">
  Criar Orçamento
</Button>

// Secundário
<Button variant="secondary">
  Salvar Rascunho
</Button>

// Terciário
<Button variant="ghost">
  Cancelar
</Button>

// Destrutivo
<Button variant="destructive">
  Excluir
</Button>
```

### 2. Urgência e Escassez

```tsx
// Indicador de estoque baixo
{product.stock < 10 && (
  <Badge variant="destructive" className="animate-pulse">
    Últimas {product.stock} unidades!
  </Badge>
)}

// Timer para promoções
<CountdownBadge endDate={promotion.endDate}>
  Oferta termina em
</CountdownBadge>
```

### 3. Friction Reduction

```tsx
// Quick Add - 1 clique para adicionar ao orçamento
<ProductCard>
  <QuickAddButton 
    product={product}
    defaultQuantity={100}
    onClick={(product, qty) => addToQuote(product, qty)}
  />
</ProductCard>

// Sticky CTA em scroll longo
<StickyBottomBar show={showStickyBar}>
  <div className="flex items-center justify-between">
    <span>{itemsInQuote} produtos selecionados</span>
    <Button onClick={goToCheckout}>
      Finalizar Orçamento ({formatCurrency(total)})
    </Button>
  </div>
</StickyBottomBar>
```

---

## 💬 FEEDBACK & ESTADOS

### 1. Loading States

```tsx
// Skeleton matching content shape
<ProductCardSkeleton /> // Já existe, usar consistentemente

// Progress para operações longas
<ProgressDialog
  open={importing}
  title="Importando produtos..."
  progress={importProgress}
  status={`${importedCount}/${totalCount} processados`}
  onCancel={cancelImport}
/>

// Optimistic updates
const addToFavorites = useMutation({
  mutationFn: addFavorite,
  onMutate: async (productId) => {
    // Atualiza UI imediatamente
    queryClient.setQueryData(['favorites'], old => [...old, productId]);
  },
  onError: (err, productId, context) => {
    // Rollback em caso de erro
    queryClient.setQueryData(['favorites'], context.previousFavorites);
    toast.error("Erro ao adicionar favorito");
  },
});
```

### 2. Error States

```tsx
// Error boundary com retry
<ErrorState
  title="Ops! Algo deu errado"
  description="Não foi possível carregar os produtos"
  error={error}
  actions={[
    { label: "Tentar novamente", onClick: refetch, primary: true },
    { label: "Reportar problema", onClick: reportError },
  ]}
/>

// Inline field errors com animação
<FormField>
  <Input {...field} aria-invalid={!!error} />
  <AnimatePresence>
    {error && (
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="text-sm text-destructive mt-1"
      >
        {error.message}
      </motion.p>
    )}
  </AnimatePresence>
</FormField>
```

### 3. Success States

```tsx
// Toast com ação
toast({
  title: "Orçamento criado!",
  description: "ORC-2024-001 foi salvo com sucesso",
  action: (
    <ToastAction altText="Ver orçamento" onClick={() => navigate(`/orcamentos/${id}`)}>
      Ver
    </ToastAction>
  ),
});

// Celebration para marcos
<SuccessCelebration
  show={milestoneReached}
  type="milestone"
  title="🎉 Parabéns!"
  message="Você atingiu R$100.000 em vendas!"
  confetti
/>
```

### 4. Empty States por Contexto

```tsx
const emptyStates = {
  products: {
    icon: <Package />,
    title: "Nenhum produto encontrado",
    actions: [{ label: "Limpar filtros", onClick: clearFilters }],
  },
  favorites: {
    icon: <Heart />,
    title: "Sua lista de favoritos está vazia",
    description: "Adicione produtos que você gosta para acessar rapidamente",
    actions: [{ label: "Explorar produtos", onClick: () => navigate("/") }],
  },
  quotes: {
    icon: <FileText />,
    title: "Nenhum orçamento ainda",
    description: "Crie seu primeiro orçamento para começar a vender",
    actions: [{ label: "Criar orçamento", onClick: () => navigate("/orcamentos/novo"), primary: true }],
  },
};
```

---

## 🌍 INTERNACIONALIZAÇÃO

### 1. Strings Hardcoded a Corrigir

```tsx
// ❌ Errado
<Button>Salvar</Button>
<p>Nenhum produto encontrado</p>

// ✅ Correto
import { useTranslation } from "react-i18next";
const { t } = useTranslation();

<Button>{t("common.save")}</Button>
<p>{t("products.empty")}</p>
```

### 2. Formatação de Dados

```tsx
// Moeda
import { formatCurrency } from "@/lib/i18n/currency-formatter";
formatCurrency(1234.56); // R$ 1.234,56 (PT-BR) / $1,234.56 (EN-US)

// Data
import { formatDate, formatRelativeDate } from "@/lib/i18n/date-formatter";
formatDate(date); // 06/01/2026 (PT-BR) / 01/06/2026 (EN-US)
formatRelativeDate(date); // "há 2 horas" / "2 hours ago"

// Números
import { formatNumber } from "@/lib/i18n/number-formatter";
formatNumber(1234567); // 1.234.567 (PT-BR) / 1,234,567 (EN-US)
```

### 3. Pluralização

```json
// locales/pt-BR.json
{
  "products": {
    "count_one": "{{count}} produto",
    "count_other": "{{count}} produtos"
  },
  "quotes": {
    "count_zero": "Nenhum orçamento",
    "count_one": "{{count}} orçamento",
    "count_other": "{{count}} orçamentos"
  }
}
```

---

## 📊 ANALYTICS & MÉTRICAS

### 1. Eventos a Rastrear

```tsx
// Tracking de eventos
const trackEvent = (event: string, properties?: Record<string, any>) => {
  // Mixpanel, GA, etc.
  analytics.track(event, {
    ...properties,
    timestamp: new Date().toISOString(),
    userId: user?.id,
    sessionId: session.id,
  });
};

// Eventos críticos
trackEvent("quote_created", { value: quote.total, items_count: quote.items.length });
trackEvent("product_viewed", { product_id: product.id, source: "search" });
trackEvent("filter_applied", { filters: activeFilters });
trackEvent("search_performed", { query, results_count: results.length });
trackEvent("feature_used", { feature: "voice_search" });
```

### 2. Funnel Analysis

```
FUNIL DE CONVERSÃO:
1. Visualização de produto     (100%)
2. Adição ao orçamento         (35%)
3. Criação de orçamento        (20%)
4. Envio ao cliente            (15%)
5. Aprovação                   (8%)
6. Pedido gerado               (6%)

MÉTRICAS A MONITORAR:
- Taxa de conversão por etapa
- Tempo médio em cada etapa
- Drop-off points
- Features mais usadas
```

### 3. Health Metrics Dashboard

```tsx
// Widget de saúde do sistema
<HealthMetrics>
  <Metric label="Uptime" value="99.9%" status="healthy" />
  <Metric label="API Latency" value="120ms" status="healthy" />
  <Metric label="Error Rate" value="0.5%" status="warning" />
  <Metric label="Active Users" value="234" status="healthy" />
</HealthMetrics>
```

---

## 🗓️ ROADMAP DE IMPLEMENTAÇÃO

### Sprint 1 (1-2 semanas) - Quick Wins
- [ ] Adicionar breadcrumbs em todas as páginas
- [ ] Implementar skip links para acessibilidade
- [ ] Corrigir ARIA labels em botões de ícone
- [ ] Integrar QuickQuoteProvider no App.tsx
- [ ] Adicionar empty states educativos
- [ ] Implementar toast com ações

### Sprint 2 (2-3 semanas) - UX Core
- [ ] Reorganizar sidebar em grupos lógicos
- [ ] Implementar bottom navigation mobile
- [ ] Criar PageHeader componente padrão
- [ ] Adicionar gestos de swipe em mobile
- [ ] Integrar EnhancedVoiceSearch
- [ ] Implementar busca com autocomplete

### Sprint 3 (2-3 semanas) - Gamificação & Engagement
- [ ] Progress bar de nível no header
- [ ] Daily challenges widget
- [ ] Milestones com celebrações
- [ ] Notificações de achievements
- [ ] Integrar ProductRecommendations

### Sprint 4 (2-3 semanas) - Performance
- [ ] Otimizar imagens (srcset, lazy, blur)
- [ ] Implementar virtualização >50 itens
- [ ] Adicionar prefetch de rotas
- [ ] Configurar service worker caching
- [ ] Auditar e melhorar Core Web Vitals

### Sprint 5 (2-3 semanas) - Polish
- [ ] Refinar animações e transições
- [ ] Completar i18n de todas strings
- [ ] Implementar feature discovery tooltips
- [ ] Criar onboarding wizard
- [ ] Auditar acessibilidade WCAG 2.1 AA

---

## ✅ CHECKLIST DE QUALIDADE

Antes de cada release, verificar:

### Design
- [ ] Hierarquia visual clara
- [ ] Espaçamento consistente
- [ ] Cores do design system
- [ ] Tipografia correta
- [ ] Ícones consistentes

### UX
- [ ] Fluxo intuitivo
- [ ] Feedback em todas ações
- [ ] Estados de loading/empty/error
- [ ] Navegação clara
- [ ] Mobile-friendly

### Acessibilidade
- [ ] Navegação por teclado
- [ ] Screen reader testado
- [ ] Contraste adequado
- [ ] Focus states visíveis
- [ ] ARIA labels

### Performance
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] FID < 100ms
- [ ] Bundle size reasonable
- [ ] Imagens otimizadas

---

## 🏆 COMPONENTES IMPLEMENTADOS

### Componentes de UI Criados
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| StatusBadge | `src/components/ui/StatusBadge.tsx` | Badge unificado para status |
| UnifiedEmptyState | `src/components/ui/UnifiedEmptyState.tsx` | Empty states educativos |
| DataCard | `src/components/ui/stat-card.tsx` | Cards de métricas com tendência |
| LoadingState | `src/components/ui/LoadingState.tsx` | Estado de loading padronizado |
| ConfirmDialog | `src/components/common/ConfirmDialog.tsx` | Confirmações destrutivas |

### Componentes de Layout Criados
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| PageHeader | `src/components/layout/PageHeader.tsx` | Header padrão de páginas |
| SkipToContent | `src/components/common/SkipToContent.tsx` | Skip links acessibilidade |
| MobileBottomNav | `src/components/mobile/MobileBottomNav.tsx` | Navegação mobile |
| SidebarReorganized | `src/components/layout/SidebarReorganized.tsx` | Sidebar em grupos |
| Spotlight | `src/components/common/Spotlight.tsx` | Busca global Cmd+K |

### Componentes de Gamificação
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| XPProgressBar | `src/components/gamification/XPProgressBar.tsx` | Progresso de XP |
| StreakIndicator | `src/components/gamification/StreakIndicator.tsx` | Indicador de streak |
| AchievementToast | `src/components/gamification/AchievementToast.tsx` | Toast de conquistas |

---

## 📈 PRÓXIMOS PASSOS SUGERIDOS

### Curto Prazo (1-2 semanas)
1. **Breadcrumbs automáticos** - Usar `react-router` para gerar breadcrumbs
2. **Toast com ações** - Adicionar botões de ação em toasts
3. **Skeleton loaders** - Skeletons específicos por tipo de conteúdo
4. **Focus trap em modais** - Melhorar navegação por teclado

### Médio Prazo (2-4 semanas)
1. **Virtualização de listas** - Para listas >50 itens
2. **Prefetch de rotas** - Carregar páginas no hover
3. **Service Worker** - Cache offline básico
4. **Analytics avançado** - Funil de conversão

### Longo Prazo (1-2 meses)
1. **PWA completo** - Instalável em dispositivos
2. **Dark mode refinado** - Ajustes de contraste
3. **Gestos mobile** - Swipe, pinch-zoom
4. **IA integrada** - Recomendações personalizadas

---

*Documento gerado por AI Product Design Strategist*
*Última atualização: 07 de Janeiro de 2026*
*Versão: 2.0*
