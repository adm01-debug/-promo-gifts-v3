/**
 * SSOT de seletores E2E.
 *
 * Política (10/10):
 *  - **Apenas `data-testid`**. Não use texto, role, aria-label, classes ou ids
 *    de DOM como seletor. Esses são frágeis e quebram em refactors de UI/i18n.
 *  - Convenção de nomes: `kebab-case` + sufixo do papel
 *    (`-input`, `-submit`, `-toggle`, `-list`, `-item`, `-card`, `-cta`).
 *  - Para grupos dinâmicos (ex.: itens indexados) use prefixo: `quote-item-${i}`.
 *    No spec consulte com `[data-testid^="quote-item"]` ou via helper.
 *  - Sempre que adicionar um seletor novo, adicione antes o `data-testid` no
 *    componente React correspondente.
 *
 * Uso:
 *   import { Sel, TID } from "../fixtures/selectors";
 *   await page.fill(Sel.login.email, "user@x.com");
 *   await page.click(Sel.login.submit);
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
    favoriteRemove: TID("favorite-remove"),
  },

  // ---------- Orçamentos ----------
  quote: {
    newButton: TID("quote-new-button"),
    wizard: TID("quote-wizard"),
    /** Itens do wizard são indexados: quote-item-0, quote-item-1, ... */
    items: TID_PREFIX("quote-item"),
    item: (index: number) => TID(`quote-item-${index}`),
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
    checkoutCta: TID("cart-checkout-cta"),
    /** Diálogos de confirmação seguem o padrão de testid. */
    confirmDialog: TID("cart-confirm-dialog"),
  },

  // ---------- App genérico ----------
  app: {
    toast: TID("app-toast"),
    errorBanner: TID("app-error-banner"),
  },
} as const;
