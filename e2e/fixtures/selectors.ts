/**
 * SSOT de seletores E2E.
 *
 * Política (10/10):
 *  - **Apenas `data-testid`** para elementos do nosso app. Não use texto, role,
 *    aria-label, classes ou ids de DOM como seletor — são frágeis e quebram
 *    em refactors de UI/i18n.
 *  - **Exceção controlada**: bibliotecas externas que expõem data-attributes
 *    estáveis como contrato público (ex.: `data-sonner-toast` da lib `sonner`)
 *    são aceitos. Estão isolados em `Sel.ext.*`.
 *  - Convenção de nomes: `kebab-case` + sufixo do papel
 *    (`-input`, `-submit`, `-toggle`, `-list`, `-item`, `-card`, `-cta`).
 *  - Para grupos dinâmicos (ex.: itens indexados) use prefixo:
 *    `quote-item-${i}`. No spec consulte com `Sel.quote.items` (prefix match)
 *    ou `Sel.quote.item(i)` para um índice específico.
 *  - Sempre que adicionar um seletor novo, primeiro adicione o `data-testid`
 *    no componente React correspondente.
 *
 * Uso:
 *   import { Sel, TID } from "../fixtures/selectors";
 *   await page.fill(Sel.login.email, "user@x.com");
 *   await page.locator(Sel.login.submit).click();
 */

export const TID = (id: string): string => `[data-testid="${id}"]`;
export const TID_PREFIX = (prefix: string): string => `[data-testid^="${prefix}"]`;

export const Sel = {
  // ---------- Login ----------
  login: {
    form: TID("login-form"),
    email: TID("login-email-input"),
    password: TID("login-password-input"),
    submit: TID("login-submit"),
    toggle: TID("login-password-toggle"),
    forgot: TID("login-forgot-link"),
    /** Mensagem de erro de validação (email inválido, etc.) */
    errorMsg: TID("login-error-msg"),
    /** Tela de "Esqueceu sua senha?" (após clicar em forgot). */
    forgotScreen: TID("forgot-password-screen"),
  },

  // ---------- Sidebar / Navegação ----------
  sidebar: {
    /** Link da sidebar por slug (ex.: "produtos"). */
    link: (slug: string) => TID(`sidebar-link-${slug}`),
  },

  // ---------- Headings de páginas ----------
  page: {
    /** Title proxy de uma página por slug. Ex.: orcamentos, pedidos, favoritos, colecoes, carrinhos. */
    title: (slug: string) => TID(`page-title-${slug}`),
  },

  // ---------- Catálogo / Produto ----------
  catalog: {
    /** Input da busca global do catálogo (SmartSearchInput). */
    searchInput: TID("catalog-search-input"),
  },
  product: {
    card: TID("product-card"),
    /** Nome no card do catálogo (ProductCard / EnhancedProductCard). */
    cardName: TID("product-card-name"),
    /** Nome no detalhe do produto (ProductDetailHero h1). */
    name: TID("product-name"),
    /**
     * Botão de favoritar — testid estável presente em:
     *  - card do catálogo (ProductCardActions: product-card-favorite)
     *  - detalhe Hero/Sticky/Mobile, QuickView, ListItem, TableRow (product-favorite)
     */
    favorite: `${TID("product-card-favorite")}, ${TID("product-favorite")}`,
    /** Apenas o botão do detalhe do produto. */
    detailFavorite: TID("product-favorite"),
    favoriteRemove: TID("favorite-remove"),
    /** Trigger de adicionar ao carrinho (atualmente o botão do header). */
    cartTrigger: TID("cart-trigger"),
    /** Toggle "Ações rápidas" do card do catálogo (ProductCardActions). */
    actionsToggle: TID("product-card-actions-toggle"),
    /** Botão final "Adicionar ao Carrinho" dentro do popover QuickAddToQuote. */
    cardAddToCart: TID("product-card-add-to-cart"),
  },

  // ---------- Variant Picker ----------
  variant: {
    /** Botão "Sem cor específica" do SingleVariantPicker. */
    noVariant: TID("variant-picker-no-variant"),
  },

  // ---------- Orçamentos ----------
  quote: {
    newButton: TID("quote-new-button"),
    wizard: TID("quote-wizard"),
    /** Itens do wizard são indexados: quote-item-0, quote-item-1, ... */
    items: TID_PREFIX("quote-item"),
    item: (index: number) => TID(`quote-item-${index}`),
  },

  // ---------- Pedidos ----------
  order: {
    card: TID("order-card"),
  },

  // ---------- Favoritos ----------
  favorites: {
    list: TID("favorites-list"),
    item: TID("favorite-item"),
    remove: TID("favorite-remove"),
    title: TID("page-title-favoritos"),
    icon: TID("favorites-icon"),
    count: TID("favorites-count"),
    countItems: TID("favorites-count-items"),
    countLists: TID("favorites-count-lists"),
    emptyState: TID("favorites-empty-state"),
    emptyCta: TID("favorites-empty-cta"),
  },

  // ---------- Carrinho ----------
  cart: {
    trigger: TID("cart-trigger"),
    drawer: TID("cart-drawer"),
    tab: TID("cart-tab"),
    item: TID("cart-item"),
    qtyBadge: TID("cart-qty-badge"),
    increment: TID("cart-qty-increment"),
    decrement: TID("cart-qty-decrement"),
    checkoutCta: TID("cart-checkout-cta"),
    confirmDialog: TID("cart-confirm-dialog"),
    /** Botão de seleção de empresa no CartCompanyPickerDialog. */
    companyPickerSelect: TID("cart-company-picker-select"),
  },

  // ---------- Diálogos genéricos (ConfirmDialog) ----------
  dialog: {
    /** Botão Confirmar/Sim/Excluir (AlertDialogAction do ConfirmDialog). */
    confirmYes: TID("confirm-dialog-yes"),
    /** Botão Cancelar (AlertDialogCancel do ConfirmDialog). */
    confirmNo: TID("confirm-dialog-no"),
  },

  // ---------- App genérico ----------
  app: {
    /**
     * Toast genérico. Combina `data-sonner-toast` (contrato estável da lib
     * `sonner`) com nosso wrapper `app-toast` quando aplicável.
     */
    toast: `${TID("app-toast")}, [data-sonner-toast]`,
    /** Alias histórico — equivalente a `toast`. */
    anyToast: `${TID("app-toast")}, [data-sonner-toast]`,
    errorBanner: TID("app-error-banner"),
    /** Tela 404 (NotFound page). */
    notFound: TID("app-not-found"),
    /** Tela de acesso negado (DevAccessDeniedPage). */
    accessDenied: TID("app-access-denied"),
  },

  // ---------- Bibliotecas externas (contratos estáveis) ----------
  ext: {
    /** Toast da lib `sonner` — atributo público da lib. */
    sonnerToast: "[data-sonner-toast]",
  },
} as const;
