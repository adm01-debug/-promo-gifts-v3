# 📋 Documentação Completa do Sistema — Promo Brindes

> **Versão:** 2.0  
> **Última atualização:** 07/02/2026  
> **Stack:** React 18 · Vite · TypeScript · Tailwind CSS · Lovable Cloud (Supabase)  
> **Produtos catalogados:** 15.000+  
> **Banco externo:** Promobrind (catálogo, estoque, preços)  
> **Banco local:** Lovable Cloud (transacional, CRM, gamificação)

---

## 📑 Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura do Sistema](#2-arquitetura-do-sistema)
3. [Autenticação & Segurança](#3-autenticação--segurança)
4. [Catálogo de Produtos](#4-catálogo-de-produtos)
5. [Busca & Filtros](#5-busca--filtros)
6. [Favoritos, Comparação & Coleções](#6-favoritos-comparação--coleções)
7. [Orçamentos](#7-orçamentos)
8. [Pedidos](#8-pedidos)
9. [Clientes / CRM](#9-clientes--crm)
10. [Ferramentas de Venda](#10-ferramentas-de-venda)
11. [Administração](#11-administração)
12. [Analytics & Dashboards](#12-analytics--dashboards)
13. [Notificações & Lembretes](#13-notificações--lembretes)
14. [IA & Assistentes](#14-ia--assistentes)
15. [Integrações & Edge Functions](#15-integrações--edge-functions)
16. [Perfil & Configurações](#16-perfil--configurações)
17. [Acessibilidade & UX](#17-acessibilidade--ux)
18. [Componentes Comuns & UX Avançado](#18-componentes-comuns--ux-avançado)
19. [Efeitos Visuais](#19-efeitos-visuais)
20. [Layout & Navegação](#20-layout--navegação)
21. [Bibliotecas & Lógica de Negócio](#21-bibliotecas--lógica-de-negócio)
22. [Utilitários](#22-utilitários)
23. [Serviços](#23-serviços)
24. [Hooks Customizados (Catálogo Completo)](#24-hooks-customizados-catálogo-completo)
25. [Contextos Globais](#25-contextos-globais)
26. [Componentes UI (Design System)](#26-componentes-ui-design-system)
27. [Tipos TypeScript](#27-tipos-typescript)
28. [Testes Automatizados](#28-testes-automatizados)
29. [Edge Functions (Backend)](#29-edge-functions-backend)
30. [Banco de Dados](#30-banco-de-dados)
31. [Regras de Negócio](#31-regras-de-negócio)
32. [Rotas da Aplicação](#32-rotas-da-aplicação)
33. [Design System](#33-design-system)
34. [Secrets & Variáveis de Ambiente](#34-secrets--variáveis-de-ambiente)
35. [Resumo Quantitativo](#35-resumo-quantitativo)

---

## 1. Visão Geral

O **Promo Brindes** é uma plataforma de operações comerciais para vendedores de brindes promocionais. O sistema serve como vitrine digital interna, facilitando a jornada do vendedor na descoberta de produtos que atendam às necessidades dos clientes.

### Objetivo Principal
Facilitar a jornada do **vendedor** (não do cliente final) na busca, simulação, orçamentação e gestão de brindes promocionais personalizados.

### Evolução do Projeto
- **Fase 1:** Catálogo de produtos com filtros e busca
- **Fase 2:** Simulador de personalização e mockups
- **Fase 3:** Orçamentos, pedidos e CRM
- **Fase 4:** Analytics, IA, gamificação e segurança avançada
- **Fase Atual:** Plataforma completa de operações comerciais

---

## 2. Arquitetura do Sistema

### Divisão de Bancos de Dados

```
┌──────────────────────────────────────────┐
│           BANCO EXTERNO (Promobrind)     │
│                                          │
│  • Produtos (catálogo completo)          │
│  • Variantes (cores, SKUs, imagens)      │
│  • Estoque (atual + em trânsito)         │
│  • Categorias (hierárquicas)             │
│  • Materiais (grupos e tipos)            │
│  • Áreas de gravação (print areas)       │
│  • Técnicas de personalização (mestre)   │
│  • Tabelas de preço (v5.1)               │
│  • Fornecedores                          │
│  • Ramos de atividade                    │
│                                          │
│  Acesso via: Edge Function               │
│  "external-db-bridge"                    │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│       BANCO LOCAL (Lovable Cloud)        │
│                                          │
│  • Perfis de usuário (profiles)          │
│  • Roles e permissões (RBAC)             │
│  • Orçamentos (quotes + items)           │
│  • Pedidos (orders + items + history)    │
│  • Clientes Bitrix (bitrix_clients)      │
│  • Empresas (companies + contacts)       │
│  • Notificações                          │
│  • Lembretes de follow-up                │
│  • Mockups gerados                       │
│  • Simulações salvas                     │
│  • Gamificação (achievements, XP)        │
│  • Novidades (product_novelties)         │
│  • Estoque futuro (future_stock_entries) │
│  • Audit log                             │
│  • Segurança (devices, IPs, geo)         │
│  • Conversas com Expert IA               │
│                                          │
│  Acesso via: Supabase Client SDK         │
└──────────────────────────────────────────┘
```

### Arquitetura de Componentes

```
┌─────────────────────────────────────────────────────────┐
│                      App.tsx                            │
│  QueryClientProvider → ThemeProvider → AuthProvider     │
│  → ProductsProvider → CollectionsProvider               │
│  → ComparisonProvider → FavoritesProvider               │
│  → RecentlyViewedProvider → BrowserRouter               │
└─────────────────────────────────────────────────────────┘
         │
         ├── Public Routes: /login, /reset-password,
         │   /approve/:token, /auth/callback
         │
         └── Protected Routes (ProtectedRoute)
              ├── MainLayout (Header + Sidebar + Content)
              ├── 46 páginas lazy-loaded
              └── GlobalCommandBar (Ctrl+K)
```

### Padrão de Camadas

```
Página (Page) → Componente (UI) → Hook (Lógica) → Serviço/Repositório → Edge Function / Supabase Client
```

---

## 3. Autenticação & Segurança

### 3.1 Autenticação

| Funcionalidade | Componente(s) | Descrição |
|---|---|---|
| Login/Cadastro com email | `Auth.tsx` | Formulário de autenticação padrão |
| Reset de senha | `ResetPassword.tsx` | Fluxo de recuperação de senha |
| SSO Callback | `SSOCallbackPage.tsx` | Callback para login social |
| Login Social | `SocialLoginButtons.tsx` | Botões Google, etc. |
| Login com Passkey (WebAuthn) | `PasskeyLogin.tsx` / `useWebAuthn.ts` | Autenticação biométrica/chave de segurança |
| Autenticação 2FA (TOTP) | `TwoFactorSetup.tsx` / `use2FA.ts` | Autenticação em duas etapas |
| CAPTCHA | `CaptchaWidget.tsx` / `useCaptcha.ts` | hCaptcha no login |
| Indicador de força de senha | `PasswordStrengthIndicator.tsx` | Feedback visual de complexidade |
| Verificação de senha vazada | `usePasswordBreachCheck.tsx` | Consulta bancos de senhas comprometidas |
| Reautenticação | `ReauthenticationDialog.tsx` | Dialog para ações sensíveis |
| "Lembrar-me" | `RememberMeCheckbox.tsx` | Persistência de sessão |
| Verificação de email | EF `verify-email` | Backend de verificação |

### 3.2 Segurança

| Funcionalidade | Componente(s) | Descrição |
|---|---|---|
| Central de Segurança | `SecurityDashboard.tsx` | Dashboard unificado de segurança |
| Gerenciador de Passkeys | `PasskeyManager.tsx` | CRUD de chaves de segurança |
| Restrição por IP | `IPRestrictionManager.tsx` / `useAllowedIPs.ts` | Whitelist de IPs |
| Geoblocking | `GeoBlockingManager.tsx` / `useGeoBlocking.ts` | Restrição por país |
| Detecção novo dispositivo | EF `detect-new-device` | Alerta de login em dispositivo novo |
| Dispositivos conhecidos | `KnownDevicesManager.tsx` | Gerenciar dispositivos confiáveis |
| Push Notifications config | `PushNotificationSettings.tsx` | Configurar notificações push |
| Log de auditoria | `useAuditLog.ts` / `AuditHistory.tsx` | Registro de ações sensíveis |
| Validação de IP | `useIPValidation.ts` | Verificação de IP permitido |
| Rate Limit Dashboard | `RateLimitDashboardPage.tsx` | Monitoramento de rate limiting |
| Rate Limit Check | EF `rate-limit-check` / `_shared/rate-limiter.ts` | Limitação de requisições |
| Aprovação de reset (admin) | `PasswordResetApproval.tsx` | Admin aprova resets de senha |
| Permission Gate | `PermissionGate.tsx` | Componente de controle de acesso |

### 3.3 RBAC (Controle de Acesso)

| Papel | Permissões |
|---|---|
| **Vendedor** (seller) | Acesso ao catálogo, simulador, orçamentos, pedidos próprios |
| **Manager** | Vendedor + gestão de equipe, relatórios |
| **Admin** | Acesso total: painel admin, roles, permissões, configurações |

- **Hook:** `useRBAC.tsx` — verifica permissões por ação + recurso
- **Funções DB:** `has_role()`, `get_user_role()`, `can_manage()`
- **Tabelas:** `user_roles`, `permissions`, `role_permissions`

---

## 4. Catálogo de Produtos

### 4.1 Listagem e Visualização

| Funcionalidade | Componente(s) | Descrição |
|---|---|---|
| Listagem principal | `Index.tsx` | Página inicial com grid de produtos |
| Grid de produtos | `ProductGrid.tsx` / `ProductCard.tsx` | Cards visuais (5 colunas em xl) |
| Lista de produtos | `ProductList.tsx` / `ProductListItem.tsx` | Modo lista compacto |
| Grid virtualizado | `VirtualizedProductGrid.tsx` | Performance para grandes listas |
| Enhanced Product Card | `EnhancedProductCard.tsx` | Card com mais detalhes |
| Skeleton loading | `ProductCardSkeleton.tsx` / `ProductListItemSkeleton.tsx` | Loading states |

### 4.2 Detalhe do Produto

| Funcionalidade | Componente(s) | Descrição |
|---|---|---|
| Página de detalhe | `ProductDetail.tsx` | Informações completas do produto |
| Galeria com zoom | `ProductGallery.tsx` / `ZoomableGallery.tsx` | Imagens ampliáveis |
| Seletor de cores | `ProductColorSelector.tsx` | Filtrar por cor disponível |
| Variações | `ProductVariations.tsx` | Variantes do produto |
| Dimensões | `ProductDimensions.tsx` | Medidas e especificações |
| Opções de personalização | `ProductCustomizationOptions.tsx` | Técnicas disponíveis |
| Regras de personalização | `ProductPersonalizationRules.tsx` | Restrições e regras |
| Badges de categoria | `ProductCategoryBadges.tsx` | Tags de categorização |
| Badge de embalagem | `PackagingBadge.tsx` / `PackagingModal.tsx` | Informação de embalagem |
| Badge de novidade | `NoveltyBadge.tsx` | Selo "NOVO" |
| Preview ao hover | `ProductHoverPreview.tsx` | Pré-visualização rápida |
| Quick View | `ProductQuickView.tsx` | Modal de visualização rápida |
| Barra de informações | `ProductInfoBar.tsx` | SKU, fornecedor, ações rápidas |
| Produtos relacionados | `RelatedProducts.tsx` | Sugestões de produtos similares |
| Recomendações inteligentes | `SmartRecommendations.tsx` | Recomendações baseadas em IA |
| Inteligência do produto | `ProductIntelligence.tsx` | Análise inteligente |
| Calculadora inline | `InlinePriceCalculator.tsx` | Cálculo rápido de preço |
| Adicionar ao orçamento | `QuickAddToQuote.tsx` | Atalho para incluir no orçamento |
| Compartilhamento | `ShareActions.tsx` | Compartilhar produto |
| Produtos recentes | `RecentlyViewedBar.tsx` | Barra de produtos visitados |
| Ações mobile | `MobileProductActions.tsx` | Ações otimizadas para mobile |
| Badge de material | `MaterialBadge.tsx` | Identificação visual do material |

### 4.3 Novidades

| Funcionalidade | Componente(s) | Descrição |
|---|---|---|
| Página de novidades | `NoveltiesPage.tsx` | Produtos novos no catálogo |
| Seção de novidades | `NoveltiesSection.tsx` | Componente reutilizável |
| Grid de novidades | `NoveltyProductGrid.tsx` | Grid específico |
| Estatísticas | `NoveltyStatsCards.tsx` | Cards com métricas |
| Widget expirando | `ExpiringNoveltiesWidget.tsx` | Novidades próximas do vencimento |
| Funções DB | `add_product_novelty()`, `get_active_novelties()`, `cleanup_expired_novelties()`, `get_novelties_stats()` | Backend de novidades |

### 4.4 Fornecedores

| Fornecedor | Cor de identificação | Hex |
|---|---|---|
| XBZ | Azul Royal | `#4169E1` |
| SPOT / Stricker | Verde Tiffany | `#0ABAB5` |
| Asia Import | Vermelho Vivo | `#FF3B30` |
| Outros | Laranja (padrão) | — |

- Badges clicáveis redirecionam ao Super Filtro com fornecedor pré-selecionado
- Mapeamento de cores em `lib/supplier-colors.ts`

---

## 5. Busca & Filtros

### 5.1 Modalidades de Busca

| Funcionalidade | Componente(s) | Descrição |
|---|---|---|
| Busca global (Ctrl+K) | `GlobalSearchPalette.tsx` / `GlobalCommandBar.tsx` | Command palette unificada |
| Busca avançada | `AdvancedSearch.tsx` | Busca com múltiplos critérios |
| Busca com sugestões | `SearchWithSuggestions.tsx` / `SmartSuggestions.tsx` | Auto-complete inteligente |
| Smart Search Input | `SmartSearchInput.tsx` | Input com sugestões contextuais |
| Busca por voz | `VoiceSearchOverlay.tsx` | Reconhecimento de fala |
| Busca visual | `VisualSearchButton.tsx` / EF `visual-search` | Busca por imagem |
| Busca semântica | EF `semantic-search` | IA interpreta linguagem natural |
| Busca fuzzy (Fuse.js) | `useFuzzySearch.ts` / `useProductFuzzySearch.ts` | Tolerância a erros (threshold 0.35) |
| Busca por preço | `AdvancedPriceSearchPage.tsx` | Filtro por orçamento total |
| Busca debounced | `useDebounce.ts` / `useDebouncedSearch.ts` | Otimização de requisições |
| Busca semântica (DB) | Função `search_products_semantic()` | Full-text + trigram no PostgreSQL |

### 5.2 Filtros

| Funcionalidade | Componente(s) | Descrição |
|---|---|---|
| Super Filtro (página) | `FiltersPage.tsx` | Página completa de filtros |
| Painel avançado | `AdvancedFilterPanel.tsx` / `useAdvancedFilters.ts` | Filtros combinados |
| Filtro por cor | `ColorFamilyFilter.tsx` / `ColorGroupFilter.tsx` | Hierarquia de cores |
| Sistema de cores | `useColorSystem.ts` / `useColors.ts` | Grupos, variações, nuances |
| Filtro data comemorativa | `CommemorativeDateFilter.tsx` | Dia das Mães, Natal, etc. |
| Filtro categoria externa | `ExternalCategoryFilter.tsx` | Categorias do banco externo |
| Filtro por material | `useMaterialFilter.ts` / `useMaterialGroups.ts` | Estrutura relacional |
| Filtro ramo de atividade | `RamoAtividadeGroupAccordion.tsx` / `SegmentoCheckbox.tsx` | Hierarquia de segmentos |
| Presets de filtros | `PresetManager.tsx` / `PresetsBar.tsx` | Filtros salvos |
| Filtros rápidos | `QuickFiltersBar.tsx` | Barra de acesso rápido |
| Barra sticky | `StickyFilterBar.tsx` | Filtros fixos no scroll |
| Painel de filtros | `FilterPanel.tsx` | Painel lateral |
| Navegação categorias | `CategoryTreeNavigation.tsx` / `CategoryTreeNavigator.tsx` | Árvore de categorias |
| Painel lateral categorias | `CategorySidebarPanel.tsx` | Sidebar de categorias |
| Ícones de categoria | `useCategoryIcons.ts` | Ícones customizáveis |

### 5.3 Busca Fuzzy (Configuração Global)

```
Threshold: 0.35
Pesos:
  - SKU: 0.35
  - Nome: 0.30
  - Marca: 0.15
  - Materiais: 0.10
  - Fornecedores: 0.05
  - Descrição: 0.05
```

---

## 6. Favoritos, Comparação & Coleções

### 6.1 Favoritos

| Funcionalidade | Componente(s) | Descrição |
|---|---|---|
| Página de favoritos | `FavoritesPage.tsx` | Lista de produtos favoritos |
| Sistema de favoritos | `FavoritesContext.tsx` / `useFavorites.ts` | Adicionar/remover/contar |

### 6.2 Comparação

| Funcionalidade | Componente(s) | Descrição |
|---|---|---|
| Página de comparação | `ComparePage.tsx` | Comparação lado a lado |
| Barra flutuante | `FloatingCompareBar.tsx` | Indicador fixo na tela |
| Highlights | `ComparisonHighlights.tsx` | Destaque de diferenças |
| Comparação fornecedores | `SupplierComparisonModal.tsx` | Comparar entre fornecedores |
| Galeria sincronizada | `SyncedZoomGallery.tsx` | Zoom sincronizado |

### 6.3 Coleções

| Funcionalidade | Componente(s) | Descrição |
|---|---|---|
| Página de coleções | `CollectionsPage.tsx` | Listar coleções |
| Detalhe da coleção | `CollectionDetailPage.tsx` | Produtos da coleção |
| Modal adicionar | `AddToCollectionModal.tsx` | Adicionar produto à coleção |
| Coleções externas | `useExternalCollections.ts` | Sync com banco Promobrind |
| Context | `CollectionsContext.tsx` / `useCollections.ts` | Estado global |

---

## 7. Orçamentos

### 7.1 Gestão de Orçamentos

| Funcionalidade | Componente(s) | Rota |
|---|---|---|
| Lista de orçamentos | `QuotesListPage.tsx` | `/orcamentos` |
| Dashboard | `QuotesDashboardPage.tsx` | `/orcamentos/dashboard` |
| Kanban | `QuotesKanbanPage.tsx` / `QuoteKanbanBoard.tsx` | `/orcamentos/kanban` |
| Builder (criar) | `QuoteBuilderPage.tsx` | `/orcamentos/novo` |
| Builder (editar) | `QuoteBuilderPage.tsx` | `/orcamentos/:id/editar` |
| Visualização | `QuoteViewPage.tsx` | `/orcamentos/:id` |
| Templates | `QuoteTemplatesPage.tsx` | `/orcamentos/templates` |
| Aprovação pública | `PublicQuoteApproval.tsx` | `/approve/:token` |

### 7.2 Componentes do Builder

| Componente | Descrição |
|---|---|
| `QuoteClientSelector.tsx` | Selecionar cliente do orçamento |
| `QuoteProductSelector.tsx` | Buscar e adicionar produtos |
| `QuotePersonalizationSelector.tsx` | Configurar personalização |
| `DraggableQuoteItems.tsx` | Reordenar itens (drag & drop) |
| `QuoteItemsList.tsx` | Lista de itens adicionados |
| `QuoteSummary.tsx` | Resumo com totais |
| `QuoteHistoryPanel.tsx` | Histórico de alterações |
| `QuoteAutoSave.tsx` | Salvamento automático |
| `QuoteQRCode.tsx` | QR Code para acesso rápido |
| `TagManager.tsx` | Tags do orçamento |
| `SaveAsTemplateButton.tsx` | Salvar como modelo |
| `QuickQuoteFAB.tsx` | Botão flutuante de orçamento rápido |

### 7.3 Templates

| Componente | Descrição |
|---|---|
| `AdminTemplatesManager.tsx` | Gerenciar templates (admin) |
| `QuoteTemplateForm.tsx` | Formulário de template |
| `QuoteTemplateSelector.tsx` | Seletor de template |
| `QuoteTemplatesList.tsx` | Listagem de templates |

### 7.4 Exportação

| Utilitário | Descrição |
|---|---|
| `proposalPdfGenerator.ts` | Gerar PDF da proposta |
| `templateExport.ts` | Exportar template |

### 7.5 Numeração Automática

Formato: `ORC-YYYYMMDD-XXXX` (sequência `quote_number_seq`)

---

## 8. Pedidos

| Funcionalidade | Componente(s) | Rota |
|---|---|---|
| Lista de pedidos | `OrdersListPage.tsx` | `/pedidos` |
| Detalhe do pedido | `OrderDetailPage.tsx` | `/pedidos/:id` |
| Conversão orçamento → pedido | `useOrders.ts` | Automática ao aprovar |
| Rastreamento fulfillment | `order_history` + timeline | Status + tracking |

### Ciclo de Vida do Pedido

```
Orçamento Aprovado → Pedido Criado → Confirmado → Em Produção → Enviado → Entregue
```

### Numeração

Formato: `PED-YYYYMMDD-XXXX` (sequência `order_number_seq`)

---

## 9. Clientes / CRM

### 9.1 Gestão de Clientes

| Funcionalidade | Componente(s) | Rota |
|---|---|---|
| Lista de clientes | `ClientList.tsx` | `/clientes` |
| Detalhe do cliente | `ClientDetail.tsx` | `/clientes/:id` |
| Filtros de clientes | `ClientFilterModal.tsx` | Modal |
| Timeline de interações | `ClientInteractionsTimeline.tsx` | Detalhe |
| Segmentação RFM | `ClientRFMSegmentation.tsx` / `useRFMAnalysis.tsx` | Análise |
| Mutações | `useClientMutations.ts` | CRUD |

### 9.2 Modelo de Dados (Empresas)

```
companies
  ├── company_contacts
  │     ├── contact_emails
  │     └── contact_phones
  └── company_addresses
```

### 9.3 Segmentação RFM

| Segmento | Descrição |
|---|---|
| Champions | Alta recência, frequência e valor |
| Loyal | Clientes fiéis e recorrentes |
| Potential Loyalist | Novos com potencial |
| At Risk | Clientes em risco de churn |
| Lost | Clientes perdidos |
| + 5 outros segmentos | Classificação automática |

### 9.4 Integração Bitrix24

| Funcionalidade | Componente(s) |
|---|---|
| Sync de clientes/deals | `BitrixSyncPage.tsx` / EF `bitrix-sync` |
| Dados sincronizados | `bitrix_clients`, `bitrix_deals`, `bitrix_sync_logs` |

---

## 10. Ferramentas de Venda

### 10.1 Simulador de Personalização (Wizard)

**Rota:** `/simulador`

| Etapa | Componente | Descrição |
|---|---|---|
| 1. Produto | `wizard/StepProduct.tsx` | Buscar e selecionar produto |
| 2. Local | `wizard/StepLocation.tsx` | Escolher área de gravação |
| 3. Técnica | `wizard/StepTechnique.tsx` | Selecionar técnica |
| 4. Configuração | `wizard/StepOptions.tsx` | Cores, quantidade, opções |
| 5. Resultado | `wizard/StepResult.tsx` | Preço final e resumo |

**Componentes auxiliares:**

| Componente | Descrição |
|---|---|
| `PersonalizationSummary.tsx` | Resumo na sidebar |
| `PersonalizationTabs.tsx` | Abas de múltiplas gravações |
| `TechniqueComparator.tsx` | Comparação entre técnicas |
| `SmartSuggestion.tsx` | Sugestões inteligentes |
| `WizardStepIndicator.tsx` | Indicador de progresso |

**Regra de abas:**
- 1ª aba: "PERSONALIZAÇÃO"
- Subsequentes: "+ [Nome do Local]"
- Botão nova personalização oculto se não há locais disponíveis

### 10.2 Simulador de Preços por Tiragem

**Rota:** `/simulador-precos`

| Componente | Descrição |
|---|---|
| `ProductSearch.tsx` | Busca de produto |
| `ProductVariantSelector.tsx` | Seletor de variante |
| `TechniqueSelector.tsx` | Seletor de técnica |
| `PriceResultV51.tsx` | Resultado com regra v5.1 |
| `MultiEngravingResult.tsx` | Multi-gravação |
| `QuantityAndResult.tsx` | Calculadora |
| `CustomizationOptions.tsx` | Opções de customização |
| `EngravingList.tsx` | Lista de gravações |

### 10.3 Componentes do Simulador (Geral)

| Componente | Descrição |
|---|---|
| `MarginCalculatorCard.tsx` | Calculadora de margem |
| `MarginThermometer.tsx` | Termômetro visual de margem |
| `MultiTechniqueSelector.tsx` | Multi-técnica |
| `MultiProductComparison.tsx` | Multi-produto |
| `ScenarioComparison.tsx` | Comparação de cenários |
| `DecisionMatrixChart.tsx` | Matriz de decisão |
| `OptimalQuantityHighlight.tsx` | Quantidade ótima |
| `UpsellPlusPlus.tsx` | Sugestões de upsell |
| `NicheRecommendationBadge.tsx` | Badge por nicho |
| `RecentSimulationsQuickAccess.tsx` | Acesso rápido |
| `ExportActions.tsx` | Exportação de simulação |
| `SmartProductSearch.tsx` | Busca inteligente |
| `StockAlert.tsx` | Alerta de estoque |
| `SimulatorStepIndicator.tsx` | Indicador de etapa |
| `TechniqueCard.tsx` | Card de técnica |
| `TechniqueSelectionCard.tsx` | Card de seleção |
| `ProductLocationSelector.tsx` | Seletor local/produto |
| `ProductQuantityCard.tsx` | Card de quantidade |
| `SimulationResultsCard.tsx` | Card de resultados |
| `ResultsComparisonCards.tsx` | Comparação de resultados |
| `MockupPreview.tsx` | Preview de mockup |

### 10.4 Dashboard de Estoque

**Rota:** `/estoque`

| Componente | Descrição |
|---|---|
| `StockDashboard.tsx` | Dashboard principal |
| `VariantStockTable.tsx` | Tabela por variante |
| `StockBadge.tsx` | Badges de status |
| `StockFilterChips.tsx` | Filtros rápidos |
| `StockAlertsIndicator.tsx` | Indicador no header |
| `AddFutureStockDialog.tsx` | Adicionar previsão |
| `FutureStockModal.tsx` | Modal de estoque futuro |

**Status de estoque agregado:**
- `in_stock` → Produto com estoque disponível
- `low_stock` → Estoque baixo
- `out_of_stock` → Sem estoque
- `incoming` → Sem estoque atual, mas com reposição prevista

### 10.5 Gerador de Mockups

**Rota:** `/mockup-generator`

| Componente | Descrição |
|---|---|
| `MockupWizard.tsx` | Wizard completo |
| `LogoPositionEditor.tsx` | Editor de posição |
| `MultiAreaManager.tsx` | Multi-área |
| `TemplatePreview.tsx` | Preview de template |
| `GenerateButton.tsx` | Botão de geração |
| `GeneratingOverlay.tsx` | Overlay de processamento |
| `MockupResultCard.tsx` | Card do resultado |
| `MockupSuccessToast.tsx` | Toast de sucesso |
| `KeyboardShortcuts.tsx` | Atalhos de teclado |
| `ProductSearchCombobox.tsx` | Busca de produto |
| `TechniqueTooltip.tsx` | Tooltip de técnica |
| `MockupSkeleton.tsx` | Loading state |
| `AIMockupAssistant.tsx` | Assistente IA |

### 10.6 Magic Up

**Rota:** `/magic-up` — Ferramenta de enriquecimento de produtos com IA

### 10.7 Montador de Kits

**Rota:** `/montar-kit`

| Etapa | Componente | Descrição |
|---|---|---|
| 1. Caixa | `BoxSelector.tsx` | Escolher embalagem |
| 2. Itens | `ItemSelector.tsx` | Adicionar produtos |
| 3. Personalização | `PersonalizationConfig.tsx` | Configurar gravação |
| 4. Resumo | `KitSummary.tsx` | Resumo e preço final |

| Componente auxiliar | Descrição |
|---|---|
| `VolumeIndicator.tsx` | Barra de volume ocupado |
| `WizardSteps.tsx` | Etapas do wizard |
| `KitComposition.tsx` / `KitVisualComposition.tsx` | Composição visual |

**Lógica:**
- `lib/kit-builder/volume-calculator.ts` — cálculo de volume (CABE/NÃO CABE)
- `lib/kit-builder/price-calculator.ts` — preço tudo-incluído

### 10.8 Busca por Preço

**Rota:** `/busca-preco`

Fórmula "Tudo Incluído":
```
Preço Unitário Final = Preço Produto + Custo Gravação + (Setup / Quantidade) + Manuseio
```

---

## 11. Administração

### 11.1 Painel Admin

**Rota:** `/admin`

| Funcionalidade | Componente(s) |
|---|---|
| Gerenciar produtos | `ProductsManager.tsx` |
| Gerenciar técnicas | `TechniquesManager.tsx` |
| Gerenciar grupos | `ProductGroupsManager.tsx` |
| Personalização por grupo | `GroupPersonalizationManager.tsx` |
| Personalização por produto | `ProductPersonalizationManager.tsx` |
| Qualidade do catálogo | `CatalogQualityDashboard.tsx` |
| Upload de imagens | `ImageUploadButton.tsx` |
| Edição inline | `InlineEditField.tsx` |
| Itens ordenáveis | `SortableItem.tsx` (dnd-kit) |
| Aprovação reset senha | `PasswordResetApproval.tsx` |

### 11.2 Cadastro de Produtos

**Rota:** `/cadastro-produtos`

| Componente | Descrição |
|---|---|
| `ProductRegistrationForm.tsx` | Formulário completo |
| `BulkImportPanel.tsx` | Importação em massa |

### 11.3 Gestão de Personalização

**Rota:** `/cadastro-gravacao`

| Componente | Descrição |
|---|---|
| `TechniquesPanel.tsx` | Painel de técnicas |
| `PricingPanel.tsx` | Painel de preços |

### 11.4 Roles & Permissões

| Rota | Página |
|---|---|
| `/admin/permissoes` | `PermissionsPage.tsx` |
| `/admin/roles` | `RolesPage.tsx` |
| `/admin/role-permissoes` | `RolePermissionsPage.tsx` |

---

## 12. Analytics & Dashboards

| Funcionalidade | Rota | Componente(s) |
|---|---|---|
| Dashboard BI | `/bi` | `BIDashboard.tsx` / `useBIMetrics.ts` |
| Tendências | `/tendencias` | `TrendsPage.tsx` |
| Dashboard customizável | `/dashboard` | `CustomizableDashboard.tsx` |
| Dashboard arrastável | — | `DraggableDashboard.tsx` |
| Datas comemorativas | — | `UpcomingDatesWidget.tsx` |
| Metas de vendas | — | `SalesGoalsCard.tsx` / `useSalesGoals.ts` |
| Tracking comportamento | — | `UserBehaviorTracking.tsx` |

---

## 13. Notificações & Lembretes

| Funcionalidade | Componente(s) |
|---|---|
| Central de notificações | `NotificationCenter.tsx` / `NotificationsPopover.tsx` |
| Lembretes de follow-up | `FollowUpRemindersPopover.tsx` / `useFollowUpReminders.ts` |
| Envio de notificação | EF `send-notification` |
| Envio de digest | EF `send-digest` |
| Limpeza | EF `cleanup-notifications` |
| Hook de notificações | `useNotifications.ts` |

---

## 14. IA & Assistentes

| Funcionalidade | Componente(s) |
|---|---|
| Expert Chat (assistente) | `ExpertChatButton.tsx` / `ExpertChatDialog.tsx` |
| Conversas com expert | `useExpertConversations.tsx` |
| Expert Chat (backend) | EF `expert-chat` |
| Recomendações IA | EF `ai-recommendations` |
| Sugestões contextuais | `useContextualSuggestions.ts` |
| Recomendação de técnicas | `useTechniqueRecommendations.ts` |
| Assistente de Mockup IA | `AIMockupAssistant.tsx` |

---

## 15. Integrações & Edge Functions

### 15.1 Edge Functions

| Edge Function | Descrição |
|---|---|
| `external-db-bridge` | **Principal** — ponte com banco Promobrind |
| `external-db-inspect` | Inspeção do banco externo |
| `bitrix-sync` | Sincronização com Bitrix24 CRM |
| `categories-api` | API de categorias |
| `materials-api` | API de materiais |
| `product-webhook` | Webhook de produto |
| `webhook-dispatcher` | Dispatcher de webhooks |
| `generate-mockup` | Geração de mockup |
| `generate-mockup-nanobanana` | Mockup via Nanobanana |
| `expert-chat` | Chat com Expert IA |
| `ai-recommendations` | Recomendações IA |
| `semantic-search` | Busca semântica |
| `visual-search` | Busca visual |
| `send-notification` | Envio de notificação |
| `send-digest` | Envio de digest |
| `cleanup-notifications` | Limpeza de notificações |
| `cleanup-novelties` | Limpeza de novidades expiradas |
| `commemorative-dates` | Datas comemorativas |
| `quote-approval` | Aprovação de orçamento |
| `quote-sync` | Sync de orçamento |
| `detect-new-device` | Detecção de dispositivo |
| `verify-email` | Verificação de email |
| `rate-limit-check` | Rate limiting |
| `dropbox-list` | Listagem Dropbox |
| `github-fix-config` | Fix de config GitHub |
| `process-queue` | Processamento de fila |

### 15.2 Shared

| Arquivo | Descrição |
|---|---|
| `_shared/rate-limiter.ts` | Rate limiter compartilhado |

---

## 16. Perfil & Configurações

| Funcionalidade | Rota | Componente(s) |
|---|---|---|
| Meu Perfil | `/perfil` | `ProfilePage.tsx` |
| Personalização de tema | — | `ThemeCustomization.tsx` |
| Preferências simulador | — | `useSimulatorPreferences.ts` |
| Persistência de formulários | — | `useFormPersistence.ts` |

---

## 17. Acessibilidade & UX

| Funcionalidade | Componente(s) |
|---|---|
| Provider de acessibilidade | `AccessibilityProvider.tsx` |
| AriaLive announcements | `AriaLive.tsx` |
| VisuallyHidden (SR only) | `VisuallyHidden.tsx` |
| Skip to Content | `SkipToContent.tsx` |
| Focus Trap | `FocusTrap.tsx` |
| Tour de onboarding | `OnboardingTour.tsx` / `RestartTourButton.tsx` |
| Command Bar global | `GlobalCommandBar.tsx` |
| Keyboard navigation | `useKeyboardNavigation.ts` / `useKeyPress.ts` |
| Dark/Light mode | `ThemeContext.tsx` |
| Scroll detection | `useScroll.ts` |
| Scroll Progress | `ScrollProgress.tsx` |
| Infinite scroll | `useInfiniteScroll.ts` |
| Breadcrumbs dinâmicos | `DynamicBreadcrumbs.tsx` / `PersistentBreadcrumbs.tsx` |
| Breadcrumbs padrão | `Breadcrumbs.tsx` |
| Loading screen | `LoadingScreen.tsx` |

---

## 18. Componentes Comuns & UX Avançado

| Componente | Descrição |
|---|---|
| `ConfirmDialog.tsx` | Dialog de confirmação reutilizável |
| `ContextualOnboarding.tsx` | Onboarding contextual |
| `ContextualSkeleton.tsx` | Skeleton adaptativo |
| `ContextualTooltips.tsx` | Tooltips contextuais |
| `DarkModeToggle.tsx` | Toggle de tema |
| `EmptyState.tsx` | Estado vazio genérico |
| `EnhancedSpotlight.tsx` | Spotlight aprimorado |
| `EnhancedStatsCard.tsx` | Card de estatísticas |
| `GlassElements.tsx` | Elementos glassmorphism |
| `ImageWithFallback.tsx` | Imagem com fallback |
| `LoadingOverlay.tsx` | Overlay de carregamento |
| `MicroInteractions.tsx` | Micro-interações |
| `SocialProof.tsx` | Prova social |
| `StatusTimeline.tsx` | Timeline de status |
| `StickyFilterBar.tsx` | Barra sticky |
| `SwipeActions.tsx` | Gestos swipe (mobile) |
| `UrgencyBadge.tsx` | Badge de urgência |

---

## 19. Efeitos Visuais

| Componente | Descrição |
|---|---|
| `MiniConfetti.tsx` | Confetti de celebração |
| `PageTransition.tsx` | Transição entre páginas (Framer Motion) |
| `SuccessCelebration.tsx` | Celebração de sucesso |

---

## 20. Layout & Navegação

| Componente | Descrição |
|---|---|
| `MainLayout.tsx` | Layout principal (Header + Sidebar + Content) |
| `SidebarReorganized.tsx` | Sidebar com 4 grupos: Catálogo, Ferramentas, Orçamentos, Meus Itens |
| `Header.tsx` | Header completo (busca, tema, notificações, perfil) |
| `HeaderActionsMenu.tsx` | Menu de ações do header |
| `PageHeader.tsx` | Header reutilizável de página |
| `PanelComponents.tsx` | Componentes de painel |
| `LayoutComponents.tsx` | Componentes de layout |
| `ProtectedRoute.tsx` | Rota protegida (auth check) |
| `SmartMobileNav.tsx` | Navegação mobile inteligente |

---

## 21. Bibliotecas & Lógica de Negócio

### 21.1 Personalização (Pricing v5.1)

| Arquivo | Descrição |
|---|---|
| `lib/personalization/calculators.ts` | Calculadoras de preço |
| `lib/personalization/selectors.ts` | Seletores de dados |
| `lib/personalization/transformers.ts` | Transformadores |
| `lib/personalization/validators.ts` | Validadores |
| `lib/personalization/types.ts` | Tipos específicos |
| `lib/personalization/calculator-result.ts` | Tipo de resultado |
| `repositories/priceTable.repository.ts` | Repositório tabelas de preço |
| `repositories/technique.repository.ts` | Repositório de técnicas |
| `services/pricing.service.ts` | Serviço de pricing |

**Regra de Preço v5.1:**
```
Setup = Faturamento mínimo (piso), não custo aditivo
Preço Final = Max(subtotal_peças, faturamento_mínimo_gravação)
Markup = 115% (organization_markup_customization)
Desconto progressivo = 36% a partir da 2ª cor
Backend RPC: fn_get_customization_price (single source of truth)
```

### 21.2 Kit Builder

| Arquivo | Descrição |
|---|---|
| `lib/kit-builder/volume-calculator.ts` | Cálculo de volume |
| `lib/kit-builder/price-calculator.ts` | Cálculo de preço |
| `lib/kit-builder/types.ts` | Tipos do kit |

### 21.3 Utilitários da Lib

| Arquivo | Descrição |
|---|---|
| `lib/external-db.ts` | Conexão banco externo |
| `lib/external-db-result.ts` | Result type para DB externo |
| `lib/result-pattern.ts` / `lib/result.ts` | Result pattern genérico |
| `lib/supplier-colors.ts` | Cores de fornecedores |
| `lib/date-utils.ts` | Utilitários de data |
| `lib/sw-register.ts` | Registro Service Worker |
| `lib/query-config.ts` | Config do React Query |
| `lib/lazyWithRetry.ts` | Lazy loading com retry |
| `lib/utils.ts` | Utilitários gerais (cn, etc.) |

---

## 22. Utilitários

| Arquivo | Descrição |
|---|---|
| `utils/excelExport.ts` | Exportação para Excel (XLSX) |
| `utils/personalizationExport.ts` | Exportação de personalização |
| `utils/proposalPdfGenerator.ts` | Gerador de PDF de proposta |
| `utils/templateExport.ts` | Exportação de template |
| `utils/colorSorting.ts` | Ordenação de cores |
| `utils/image-utils.ts` | Utilitários de imagem |
| `utils/undoToast.tsx` | Toast com ação de desfazer |

---

## 23. Serviços

| Arquivo | Descrição |
|---|---|
| `services/materialService.ts` | Serviço de materiais (consulta banco externo) |
| `services/ramoAtividadeService.ts` | Serviço de ramos de atividade |

---

## 24. Hooks Customizados (Catálogo Completo)

### 24.1 Produtos & Catálogo

| Hook | Descrição |
|---|---|
| `useProducts.ts` | Busca principal de produtos |
| `useProductsByCategory.ts` | Produtos por categoria |
| `useProductsByMaterial.ts` | Produtos por material |
| `useProductImages.ts` | Imagens do produto |
| `useProductAnalytics.ts` | Analytics do produto |
| `useProductRecommendations.ts` | Recomendações |
| `useProductRegistration.ts` | Cadastro de produto |
| `useProductFuzzySearch.ts` | Busca fuzzy de produtos |
| `useCategories.ts` | Categorias |
| `useCategoriesTree.ts` | Árvore de categorias |
| `useCategoryIcons.ts` | Ícones de categorias |
| `useExternalCategoriesQuery.ts` | Categorias externas |
| `useNovelties.ts` | Novidades |

### 24.2 Personalização & Simulação

| Hook | Descrição |
|---|---|
| `useGravacao.ts` | Gravação (legado) |
| `useGravacaoV2.ts` | Gravação V2 |
| `usePrintAreas.ts` | Áreas de gravação |
| `useCustomizationPricing.ts` | Preço de personalização |
| `useTechniquePricing.ts` | Preço por técnica |
| `useTechniquePricingOptions.ts` | Opções de preço |
| `useTechniqueRecommendations.ts` | Recomendações de técnica |
| `useTechniquesExternal.ts` | Técnicas externas |
| `useTecnicasUnificadas.ts` | Técnicas unificadas |
| `useSimulation.ts` | Simulação |
| `useExternalSimulator.ts` | Simulador externo |
| `useSimulatorPreferences.ts` | Preferências do simulador |
| `useProdutoPersonalizacao.ts` | Personalização do produto |
| `useProdutoRamoAtividade.ts` | Ramo de atividade do produto |
| `useMockupDraft.ts` | Rascunho de mockup |

### 24.3 Hooks de Gravação (subpasta)

| Hook | Descrição |
|---|---|
| `gravacao/useFornecedoresGravacao.ts` | Fornecedores de gravação |
| `gravacao/useTecnicasGravacao.ts` | Técnicas de gravação |
| `gravacao/useVariantesGravacao.ts` | Variantes de gravação |

### 24.4 Hooks de Técnicas (subpasta)

| Hook | Descrição |
|---|---|
| `tecnicas/usePrecoCalculation.ts` | Cálculo de preço |
| `tecnicas/useTabelasPreco.ts` | Tabelas de preço |
| `tecnicas/useTecnicaMutations.ts` | Mutations de técnicas |
| `tecnicas/useTecnicasList.ts` | Lista de técnicas |

### 24.5 Hook do Simulador (subpasta)

| Hook | Descrição |
|---|---|
| `simulator/useSimulatorWizard.ts` | Estado do wizard |

### 24.6 Estoque & Fornecedores

| Hook | Descrição |
|---|---|
| `useStockDashboard.ts` | Dashboard de estoque |
| `useVariantStock.ts` | Estoque por variante |
| `useExternalVariantStock.ts` | Estoque externo |
| `useVariantSupplierSources.ts` | Fontes de fornecedor |
| `useFutureStock.ts` | Estoque futuro |
| `useSuppliers.ts` | Fornecedores |
| `useSupplierComparison.ts` | Comparação de fornecedores |

### 24.7 Cores & Materiais

| Hook | Descrição |
|---|---|
| `useColors.ts` | Cores |
| `useColorSystem.ts` | Sistema de cores completo |
| `useMaterialFilter.ts` | Filtro de materiais |
| `useMaterialGroups.ts` | Grupos de materiais |
| `useMaterialTypes.ts` | Tipos de materiais |

### 24.8 Filtros

| Hook | Descrição |
|---|---|
| `useAdvancedFilters.ts` | Filtros avançados |
| `useRamoAtividade.ts` | Ramo de atividade |
| `useRamoAtividadeFilho.ts` | Sub-ramo |
| `useRamoAtividadeFilter.ts` | Filtro por ramo |
| `useCommemorativeDates.ts` | Datas comemorativas |

### 24.9 Clientes & CRM

| Hook | Descrição |
|---|---|
| `useClients.ts` | Lista de clientes |
| `useClientMutations.ts` | CRUD de clientes |
| `useBitrixSync.ts` | Sync Bitrix |
| `useRFMAnalysis.tsx` | Análise RFM |

### 24.10 Orçamentos & Pedidos

| Hook | Descrição |
|---|---|
| `useQuotes.ts` | Orçamentos |
| `useQuoteTemplates.ts` | Templates |
| `useQuoteHistory.ts` | Histórico |
| `useQuoteApproval.ts` | Aprovação |
| `useOrders.ts` | Pedidos |
| `useAutoSave.tsx` | Auto-save |

### 24.11 Kit Builder

| Hook | Descrição |
|---|---|
| `useKitBuilder.ts` | Estado do montador de kits |

### 24.12 Busca

| Hook | Descrição |
|---|---|
| `useSearch.ts` | Busca geral |
| `useFuzzySearch.ts` | Busca fuzzy |
| `useGenericFuzzySearch.ts` | Fuzzy genérico |
| `useDebouncedSearch.ts` | Busca debounced |
| `useDebounce.ts` | Debounce genérico |
| `useSpeechRecognition.ts` | Reconhecimento de fala |
| `useVoiceCommands.ts` | Comandos de voz |
| `useVoiceFeedback.ts` | Feedback de voz |
| `useVoiceCommandHistory.ts` | Histórico de comandos |

### 24.13 Favoritos & Comparação

| Hook | Descrição |
|---|---|
| `useFavorites.ts` | Favoritos |
| `useComparison.ts` | Comparação |
| `useCollections.ts` | Coleções |
| `useExternalCollections.ts` | Coleções externas |
| `useRecentlyViewed.ts` | Recentemente vistos |
| `useRecentProducts.ts` | Produtos recentes |
| `useRecentItems.ts` | Itens recentes |

### 24.14 Notificações & Lembretes

| Hook | Descrição |
|---|---|
| `useNotifications.ts` | Notificações |
| `useFollowUpReminders.ts` | Lembretes |
| `usePushNotifications.tsx` | Push notifications |

### 24.15 Segurança

| Hook | Descrição |
|---|---|
| `use2FA.ts` | Autenticação 2FA |
| `useWebAuthn.ts` | WebAuthn/Passkeys |
| `useCaptcha.ts` | CAPTCHA |
| `useAllowedIPs.ts` | IPs permitidos |
| `useGeoBlocking.ts` | Geoblocking |
| `useIPValidation.ts` | Validação de IP |
| `useDeviceDetection.ts` | Detecção de dispositivo |
| `usePasswordBreachCheck.tsx` | Verificação de vazamento |
| `useReauthentication.ts` | Reautenticação |
| `usePasswordResetRequests.ts` | Solicitações de reset |

### 24.16 Analytics & BI

| Hook | Descrição |
|---|---|
| `useBIMetrics.ts` | Métricas de BI |
| `useSalesGoals.ts` | Metas de vendas |

### 24.17 Admin & RBAC

| Hook | Descrição |
|---|---|
| `useRBAC.tsx` | Role-Based Access Control |
| `useAuditLog.ts` | Log de auditoria |
| `useOnboarding.ts` | Onboarding |

### 24.18 IA & Expert

| Hook | Descrição |
|---|---|
| `useExpertConversations.tsx` | Conversas Expert |
| `useContextualSuggestions.ts` | Sugestões contextuais |

### 24.19 UI & UX

| Hook | Descrição |
|---|---|
| `use-mobile.tsx` | Detecção mobile |
| `use-toast.ts` | Sistema de toast |
| `useMediaQuery.ts` | Media queries |
| `useScroll.ts` | Detecção de scroll |
| `useInfiniteScroll.ts` | Scroll infinito |
| `useKeyPress.ts` | Teclas pressionadas |
| `useKeyboardNavigation.ts` | Navegação por teclado |
| `useClickOutside.ts` | Click outside |
| `useToggle.ts` | Toggle genérico |
| `useLocalStorage.ts` | Local Storage |
| `useCopyToClipboard.ts` | Copiar para clipboard |
| `useConfirmDialog.tsx` | Dialog de confirmação |
| `useErrorHandler.ts` | Handler de erros |
| `useBulkSelection.ts` | Seleção em massa |
| `usePagination.ts` | Paginação |
| `useFormPersistence.ts` | Persistência de formulário |
| `usePrefetch.ts` | Prefetch de dados |
| `useOptimisticMutation.ts` | Mutation otimística |
| `useOptimisticUpdate.ts` | Update otimístico |

### 24.20 Banco Externo

| Hook | Descrição |
|---|---|
| `useExternalDatabase.ts` | Acesso ao banco externo |
| `useResultQuery.ts` | Query com Result pattern |

---

## 25. Contextos Globais

| Contexto | Descrição |
|---|---|
| `AuthContext.tsx` | Autenticação, perfil, role, isAdmin |
| `ThemeContext.tsx` | Tema (dark/light/auto) |
| `ProductsContext.tsx` | Cache global de produtos (10min) |
| `FavoritesContext.tsx` | Favoritos do usuário |
| `ComparisonContext.tsx` | Lista de comparação (máx. 4) |
| `CollectionsContext.tsx` | Coleções personalizadas |
| `RecentlyViewedContext.tsx` | Produtos recentemente vistos |

---

## 26. Componentes UI (Design System)

### 26.1 Shadcn/Radix (54 componentes)

```
accordion, alert, alert-dialog, aspect-ratio, avatar, badge,
breadcrumb, button, calendar, card, carousel, chart, checkbox,
collapsible, command, context-menu, dialog, drawer, dropdown-menu,
form, hover-card, input, input-otp, label, menubar, navigation-menu,
pagination, popover, progress, radio-group, resizable, scroll-area,
select, separator, sheet, sidebar, skeleton, slider, sonner,
switch, table, tabs, textarea, toast, toaster, toggle, toggle-group,
tooltip
```

### 26.2 Componentes UI Customizados

| Componente | Descrição |
|---|---|
| `DataCard.tsx` | Card de dados |
| `FocusTrap.tsx` | Trap de foco |
| `FormSection.tsx` | Seção de formulário |
| `LoadingButton.tsx` | Botão com loading |
| `LoadingState.tsx` | Estado de carregamento |
| `StatusBadge.tsx` | Badge de status |
| `stat-card.tsx` | Card de estatística |
| `ConfirmDialog.tsx` | Dialog de confirmação |

---

## 27. Tipos TypeScript

### 27.1 Tipos de Domínio

| Arquivo | Descrição |
|---|---|
| `types/domain/gravacao.ts` | Tipos de gravação |
| `types/domain/personalization.ts` | Tipos de personalização |
| `types/domain/simulation.ts` | Tipos de simulação |
| `types/domain/simulator-wizard.ts` | Tipos do wizard |

### 27.2 Tipos de Infraestrutura

| Arquivo | Descrição |
|---|---|
| `types/infrastructure/promobrind.ts` | Tipos do banco Promobrind |

### 27.3 Tipos Gerais

| Arquivo | Descrição |
|---|---|
| `types/category.ts` | Categorias |
| `types/client.ts` | Clientes |
| `types/database.ts` | Banco de dados (legacy) |
| `types/expert.ts` | Expert IA |
| `types/favorite.ts` | Favoritos |
| `types/gravacao-database.ts` | Gravação (BD) |
| `types/gravacao.ts` | Gravação (geral) |
| `types/mockup.ts` | Mockups |
| `types/onboarding.ts` | Onboarding |
| `types/personalization.ts` | Personalização |
| `types/product.ts` | Produtos |
| `types/profile.ts` | Perfil |
| `types/quote.ts` | Orçamentos |
| `types/ramo-atividade.ts` | Ramo de atividade |
| `types/simulation.ts` | Simulação |
| `types/stock.ts` | Estoque |
| `types/tecnica-unificada.ts` | Técnica unificada |

---

## 28. Testes Automatizados

### 28.1 Testes de Hooks (25 testes)

| Teste | Hook testado |
|---|---|
| `useBIMetrics.test.ts` | Métricas BI |
| `useBulkSelection.test.ts` | Seleção em massa |
| `useClickOutside.test.ts` | Click outside |
| `useCollections.test.ts` | Coleções |
| `useComparison.test.ts` | Comparação |
| `useConfirmDialog.test.ts` | Dialog confirmação |
| `useContextualSuggestions.test.ts` | Sugestões |
| `useDebounce.test.ts` | Debounce |
| `useDebouncedSearch.test.ts` | Busca debounced |
| `useErrorHandler.test.ts` | Error handler |
| `useExpertConversations.test.ts` | Expert chat |
| `useFollowUpReminders.test.ts` | Lembretes |
| `useKeyPress.test.ts` | Teclas |
| `useLocalStorage.test.ts` | Local Storage |
| `useMediaQuery.test.ts` | Media query |
| `useNotifications.test.ts` | Notificações |
| `useOnboarding.test.ts` | Onboarding |
| `useOrders.test.ts` | Pedidos |
| `useProductAnalytics.test.ts` | Analytics produto |
| `useQuoteTemplates.test.ts` | Templates orçamento |
| `useSalesGoals.test.ts` | Metas de vendas |
| `useSpeechRecognition.test.ts` | Fala |
| `useSupplierComparison.test.ts` | Comparação fornecedores |
| `useToggle.test.ts` | Toggle |
| `useVoiceCommands.test.ts` | Comandos de voz |

### 28.2 Infraestrutura de Testes

| Arquivo | Descrição |
|---|---|
| `tests/setup.ts` | Setup global (Vitest) |
| `tests/test-utils.tsx` | Utilitários de teste |
| `tests/mocks/server.ts` | MSW server |
| `tests/mocks/handlers.ts` | MSW handlers |
| `tests/fixtures/` | Dados de teste |

---

## 29. Edge Functions (Backend)

### 29.1 Listagem Completa

| # | Função | Descrição | Auth |
|---|---|---|---|
| 1 | `external-db-bridge` | Ponte com banco Promobrind (whitelist de tabelas, RPC, aliases) | JWT |
| 2 | `external-db-inspect` | Inspeção do banco externo | JWT |
| 3 | `bitrix-sync` | Sincronização com Bitrix24 CRM | JWT |
| 4 | `categories-api` | API de categorias hierárquicas | JWT |
| 5 | `materials-api` | API de materiais (slug → IDs) | JWT |
| 6 | `product-webhook` | Webhook de produto (entrada) | Webhook |
| 7 | `webhook-dispatcher` | Dispatcher de webhooks (saída) | JWT |
| 8 | `generate-mockup` | Geração de mockup | JWT |
| 9 | `generate-mockup-nanobanana` | Mockup via API Nanobanana | JWT |
| 10 | `expert-chat` | Chat com Expert IA (Gemini/GPT) | JWT |
| 11 | `ai-recommendations` | Recomendações via IA | JWT |
| 12 | `semantic-search` | Busca semântica com IA | JWT |
| 13 | `visual-search` | Busca por imagem | JWT |
| 14 | `send-notification` | Envio de notificação | Service |
| 15 | `send-digest` | Envio de digest periódico | Service |
| 16 | `cleanup-notifications` | Limpeza de notificações antigas | Service |
| 17 | `cleanup-novelties` | Limpeza de novidades expiradas | Service |
| 18 | `commemorative-dates` | API de datas comemorativas | JWT |
| 19 | `quote-approval` | Aprovação pública de orçamento | Público |
| 20 | `quote-sync` | Sync de orçamento com N8N | JWT |
| 21 | `detect-new-device` | Detecção de login em novo device | JWT |
| 22 | `verify-email` | Verificação de email | Público |
| 23 | `rate-limit-check` | Verificação de rate limit | JWT |
| 24 | `dropbox-list` | Listagem de arquivos Dropbox | JWT |
| 25 | `github-fix-config` | Fix de configuração GitHub | Service |
| 26 | `process-queue` | Processamento de fila assíncrona | Service |

### 29.2 Módulo Compartilhado

| Arquivo | Descrição |
|---|---|
| `_shared/rate-limiter.ts` | Rate limiter reutilizável entre funções |

---

## 30. Banco de Dados

### 30.1 Tabelas Locais (Lovable Cloud)

| Tabela | Descrição |
|---|---|
| `profiles` | Perfis de usuário |
| `user_roles` | Roles de usuário |
| `permissions` | Permissões |
| `achievements` | Conquistas (gamificação) |
| `audit_log` | Log de auditoria |
| `bitrix_clients` | Clientes do Bitrix |
| `bitrix_deals` | Negócios do Bitrix |
| `bitrix_sync_logs` | Logs de sincronização |
| `category_icons` | Ícones de categoria |
| `color_groups` | Grupos de cores |
| `color_variations` | Variações de cores |
| `color_nuances` | Nuances de cores |
| `companies` | Empresas |
| `company_contacts` | Contatos de empresas |
| `company_addresses` | Endereços de empresas |
| `contact_emails` | Emails de contatos |
| `contact_phones` | Telefones de contatos |
| `device_login_notifications` | Notificações de login |
| `expert_conversations` | Conversas com Expert |
| `expert_messages` | Mensagens do Expert |
| `follow_up_reminders` | Lembretes de follow-up |
| `future_stock_entries` | Previsões de estoque |
| `generated_mockups` | Mockups gerados |
| `geo_allowed_countries` | Países permitidos |
| `login_attempts` | Tentativas de login |
| `mockup_drafts` | Rascunhos de mockup |
| `notifications` | Notificações |
| `orders` | Pedidos |
| `order_items` | Itens de pedidos |
| `order_history` | Histórico de pedidos |
| `password_reset_requests` | Solicitações de reset |
| `personalization_locations` | Locais de personalização |
| `personalization_simulations` | Simulações salvas |
| `personalization_sizes` | Tamanhos de personalização |
| `personalization_techniques` | Técnicas de personalização |
| `product_components` | Componentes de produto |
| `product_component_locations` | Locais nos componentes |
| `product_component_location_techniques` | Técnicas por local |
| `product_groups` | Grupos de produto |
| `product_group_components` | Componentes de grupo |
| `product_group_locations` | Locais de grupo |
| `product_group_location_techniques` | Técnicas por local de grupo |
| `quotes` | Orçamentos |
| `user_known_devices` | Dispositivos conhecidos |

### 30.2 Funções do Banco

| Função | Descrição |
|---|---|
| `handle_new_user()` | Trigger: cria perfil + role + onboarding + gamificação |
| `generate_quote_number()` | Trigger: numeração automática de orçamentos |
| `generate_order_number()` | Trigger: numeração automática de pedidos |
| `update_updated_at_column()` | Trigger: atualiza timestamp |
| `has_role()` | Verifica role de usuário |
| `get_user_role()` | Retorna role de usuário |
| `can_manage()` | Verifica se é admin/manager |
| `get_color_filters()` | Retorna filtros de cor (JSON) |
| `add_product_novelty()` | Adiciona novidade |
| `get_active_novelties()` | Lista novidades ativas |
| `cleanup_expired_novelties()` | Limpa expiradas |
| `get_novelties_stats()` | Estatísticas de novidades |
| `search_products_semantic()` | Busca semântica (FTS + trigram) |
| `products_generate_search_vector()` | Trigger: gera vetor de busca |
| `similarity()` / `word_similarity()` | pg_trgm (busca fuzzy no BD) |

### 30.3 Storage Buckets

| Bucket | Público | Uso |
|---|---|---|
| `avatars` | ✅ | Fotos de perfil |
| `personalization-images` | ✅ | Imagens de personalização |

---

## 31. Regras de Negócio

### 31.1 Preço "Tudo Incluído"

```
Preço Unitário = Preço Produto + Custo Gravação + (Setup ÷ Quantidade) + Manuseio
```

### 31.2 Pricing v5.1

```
Setup = Faturamento mínimo (piso, não aditivo)
Preço Final = Max(subtotal_peças, faturamento_mínimo_gravação)
Markup = 115%
Desconto 2ª cor+ = 36%
```

### 31.3 Estoque Agregado

```
if (estoque_atual > 0) → "Em estoque"
if (estoque_atual == 0 && in_transit > 0) → "Chegando"
if (estoque_atual == 0 && in_transit == 0) → "Sem estoque"
```

### 31.4 Materiais

- Campo `materials` pode ser `string` ou `string[]`
- Guardas `Array.isArray()` obrigatórias em toda renderização

### 31.5 Busca Fuzzy

- Threshold global: 0.35
- Pesos: SKU (0.35), Nome (0.30), Marca (0.15), Materiais (0.10)

### 31.6 Numeração Automática

- Orçamentos: `ORC-YYYYMMDD-XXXX`
- Pedidos: `PED-YYYYMMDD-XXXX`

---

## 32. Rotas da Aplicação

### 32.1 Rotas Públicas

| Rota | Página |
|---|---|
| `/login` | Autenticação |
| `/reset-password` | Reset de senha |
| `/approve/:token` | Aprovação pública de orçamento |
| `/auth/callback` | SSO callback |

### 32.2 Rotas Protegidas

| Rota | Página | Grupo |
|---|---|---|
| `/` | Index (catálogo) | Catálogo |
| `/dashboard` | Dashboard customizável | Catálogo |
| `/produtos` | Filtros | Catálogo |
| `/produto/:id` | Detalhe do produto | Catálogo |
| `/filtros` | Super Filtro | Catálogo |
| `/novidades` | Novidades | Catálogo |
| `/favoritos` | Favoritos | Meus Itens |
| `/comparar` | Comparação | Meus Itens |
| `/colecoes` | Coleções | Catálogo |
| `/colecoes/:id` | Detalhe da coleção | Catálogo |
| `/clientes` | Lista de clientes | Orçamentos |
| `/clientes/:id` | Detalhe do cliente | Orçamentos |
| `/orcamentos` | Lista de orçamentos | Orçamentos |
| `/orcamentos/dashboard` | Dashboard orçamentos | Orçamentos |
| `/orcamentos/kanban` | Kanban | Orçamentos |
| `/orcamentos/templates` | Templates | Orçamentos |
| `/orcamentos/novo` | Novo orçamento | Orçamentos |
| `/orcamentos/:id/editar` | Editar orçamento | Orçamentos |
| `/orcamentos/:id` | Ver orçamento | Orçamentos |
| `/pedidos` | Lista de pedidos | Orçamentos |
| `/pedidos/:id` | Detalhe do pedido | Orçamentos |
| `/simulador` | Simulador Wizard | Ferramentas |
| `/simulador-precos` | Preços por tiragem | Ferramentas |
| `/estoque` | Dashboard estoque | Ferramentas |
| `/busca-preco` | Busca por preço | Ferramentas |
| `/montar-kit` | Montador de kits | Ferramentas |
| `/mockup-generator` | Gerador de mockups | Ferramentas |
| `/magic-up` | Magic Up (IA) | Ferramentas |
| `/perfil` | Meu perfil | Usuário |
| `/seguranca` | Central de segurança | Usuário |
| `/bitrix-sync` | Bitrix24 | Config |
| `/admin` | Painel admin | Admin |
| `/cadastro-produtos` | Cadastro de produtos | Admin |
| `/cadastro-gravacao` | Gestão personalização | Admin |
| `/admin/permissoes` | Permissões | Admin |
| `/admin/roles` | Roles | Admin |
| `/admin/role-permissoes` | Role ↔ Permissões | Admin |
| `/admin/rate-limit` | Rate Limit | Admin |
| `/bi` | Dashboard BI | Analytics |
| `/tendencias` | Tendências | Analytics |
| `/status` | Status do sistema | Sistema |
| `/external-db-test` | Teste banco externo | Sistema |

---

## 33. Design System

### 33.1 Tipografia

| Uso | Fonte |
|---|---|
| Display / Títulos | Outfit |
| Body / Textos | Plus Jakarta Sans |

### 33.2 Paleta de Cores (HSL)

| Token | Uso |
|---|---|
| `--primary` | Cor primária (roxo 252°) |
| `--orange` | Cor de destaque / accent |
| `--background` | Fundo principal |
| `--foreground` | Texto principal |
| `--card` | Fundo de cards |
| `--muted` | Elementos secundários |
| `--destructive` | Ações perigosas |

### 33.3 Animações

```
bounce-in, slide, fade, shimmer, float, glow-pulse,
animate-fade-in, animate-scale-in, animate-slide-up
```

### 33.4 Variantes de Card

Base, Elevated, Interactive, Glass, Stat, Featured

### 33.5 Efeitos

- Glassmorphism com backdrop-blur
- Gradientes (7 tipos)
- Sombras xs-xl com custom glows
- Hover effects: lift, scale, glow
- Framer Motion: page transitions, stagger

---

## 34. Secrets & Variáveis de Ambiente

### 34.1 Secrets Configurados

| Secret | Uso |
|---|---|
| `SUPABASE_URL` | URL do Supabase |
| `SUPABASE_ANON_KEY` | Chave anônima |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role |
| `SUPABASE_PUBLISHABLE_KEY` | Chave publicável |
| `SUPABASE_DB_URL` | URL do banco |
| `EXTERNAL_SUPABASE_URL` | URL banco Promobrind |
| `EXTERNAL_SUPABASE_SERVICE_KEY` | Chave banco Promobrind |
| `BITRIX24_WEBHOOK_URL` | Webhook Bitrix24 |
| `N8N_QUOTE_WEBHOOK_URL` | Webhook N8N orçamentos |
| `N8N_PRODUCT_WEBHOOK_SECRET` | Secret webhook produtos |
| `RESEND_API_KEY` | API Resend (emails) |
| `GITHUB_PAT` | GitHub Personal Access Token |
| `LOVABLE_API_KEY` | API Key Lovable |

### 34.2 Variáveis de Ambiente (Frontend)

| Variável | Uso |
|---|---|
| `VITE_SUPABASE_URL` | URL do Supabase (frontend) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave anônima (frontend) |
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto |

---

## 35. Resumo Quantitativo

| Métrica | Quantidade |
|---|---|
| 📄 Páginas | **46** |
| ⚡ Edge Functions | **27** (26 + 1 shared) |
| 🧩 Componentes (total) | **~280+** |
| 🪝 Hooks customizados | **~130+** |
| 🌐 Contextos globais | **7** |
| 📊 Tabelas no banco local | **42+** |
| 🔧 Funções no banco (DB) | **16** |
| 🧪 Testes automatizados | **25** |
| 🎨 Componentes UI (Shadcn) | **54** |
| 📚 Tipos TypeScript | **17 arquivos** |
| 🛠️ Utilitários | **7** |
| 📦 Serviços | **2** |
| 📁 Bibliotecas de negócio | **16 módulos** |
| 🔐 Secrets configurados | **13** |
| 🗄️ Storage buckets | **2** |
| 🛣️ Rotas da aplicação | **46** (4 públicas + 42 protegidas) |

---

> **Documento gerado em 07/02/2026**  
> **Total de funcionalidades mapeadas: ~440+**  
> **Nenhuma funcionalidade foi omitida.** ✅
