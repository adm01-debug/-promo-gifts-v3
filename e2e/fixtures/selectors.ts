/**
 * SSOT de seletores E2E.
 *
 * Convenção:
 *  - Sempre prefira `data-testid` para elementos críticos.
 *  - Cada string aqui pode incluir um fallback (ex.: `id=...`, role) durante
 *    a transição. Quando todos os componentes-alvo já tiverem o testid, o
 *    fallback pode ser removido.
 *  - Para criar novo selector: padrão `kebab-case` + sufixo do papel
 *    (`-input`, `-submit`, `-toggle`, `-list`, `-item`, `-card`).
 *
 * Uso:
 *   import { Sel } from "../fixtures/selectors";
 *   await page.fill(Sel.login.email, "user@x.com");
 *   await page.click(Sel.login.submit);
 */

const TID = (id: string) => `[data-testid="${id}"]`;

export const Sel = {
  // ---------- Login ----------
  login: {
    form: `${TID("login-form")}, form:has(#login-email)`,
    email: `${TID("login-email-input")}, #login-email`,
    password: `${TID("login-password-input")}, #login-password`,
    submit: `${TID("login-submit")}, button[type="submit"]`,
    toggle: `${TID("login-password-toggle")}, button[aria-label*="senha" i]`,
    forgot: `${TID("login-forgot-link")}, text=/Esqueci.*senha/i`,
  },

  // ---------- Sidebar / Navegação ----------
  sidebar: {
    /** Link da sidebar por slug (ex.: "produtos") com fallback para texto. */
    link: (slug: string, label?: string) =>
      label
        ? `${TID(`sidebar-link-${slug}`)}, nav >> text=${label}`
        : `${TID(`sidebar-link-${slug}`)}`,
  },

  // ---------- Headings de páginas ----------
  page: {
    /** Title proxy de uma página por slug. Cobertos: orcamentos, pedidos, favoritos, colecoes, carrinhos. */
    title: (slug: string) => `${TID(`page-title-${slug}`)}, h1, h2`,
  },

  // ---------- Catálogo / Produto ----------
  product: {
    card: `${TID("product-card")}, article:has(button[aria-label*="favorit" i]), [role="article"]:has(button[aria-label*="favorit" i])`,
    name: `${TID("product-card-name")}, h1, h2, h3, [data-product-name]`,
    favorite: `button[aria-label="Favoritar" i], button[aria-label*="favorit" i]`,
    favoriteRemove: `button[aria-label="Remover favorito" i]`,
    cartTrigger: `button[aria-label="ShoppingCart" i], button:has(svg.lucide-shopping-cart)`,
    addCartConfirm: 'button:has-text("Adicionar ao Carrinho")',
  },

  // ---------- Orçamentos ----------
  quote: {
    newButton: `${TID("quote-new-button")}, a[href="/orcamentos/novo"], a[href*="orcamentos/novo"]`,
    wizard: `${TID("quote-wizard")}, input, [role="tablist"], [data-testid*="step"]`,
  },

  // ---------- Favoritos ----------
  favorites: {
    list: `${TID("favorites-list")}`,
    item: `${TID("favorite-item")}`,
    remove: `${TID("favorite-remove")}, button[aria-label="Remover favorito" i]`,
    title: TID("page-title-favoritos"),
    icon: TID("favorites-icon"),
    count: TID("favorites-count"),
    countItems: TID("favorites-count-items"),
    countLists: TID("favorites-count-lists"),
  },

  // ---------- Carrinho ----------
  cart: {
    drawer: `${TID("cart-drawer")}, [role="tab"], [data-testid="cart-tab"]`,
    item: `${TID("cart-item")}`,
    qtyBadge: `${TID("cart-qty-badge")}, .tabular-nums`,
    increment: `${TID("cart-qty-increment")}, button:has(svg.lucide-plus)`,
    checkoutCta: `${TID("cart-checkout-cta")}, button:has-text("Gerar Orçamento")`,
    confirmDialog: '[role="alertdialog"], [role="dialog"]',
  },

  // ---------- App genérico ----------
  app: {
    toast: '[data-sonner-toast], [role="status"]',
    errorBanner: '[role="alert"]',
    anyToast: '[data-sonner-toast], [role="status"], [role="alert"]',
  },
} as const;
