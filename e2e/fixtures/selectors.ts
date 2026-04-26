/**
 * SSOT de seletores E2E — concentra strings frágeis num só lugar.
 * Prefira data-testid quando disponível; fallback para role/text.
 */
export const Sel = {
  login: {
    email: "#login-email",
    password: "#login-password",
    submit: 'button[type="submit"]',
    forgot: "text=Esqueci minha senha",
  },
  app: {
    sidebarLink: (label: string) => `nav >> text=${label}`,
    toast: '[data-sonner-toast], [role="status"]',
    errorBanner: '[role="alert"]',
  },
  quotes: {
    newButton: 'a[href="/orcamentos/novo"], a[href*="orcamentos/novo"]',
  },
} as const;
