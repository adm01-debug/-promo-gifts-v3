/**
 * QA visual do sidebar — dev-only.
 *
 * Renderiza réplicas estáticas dos estilos do sidebar (mesmas classes
 * Tailwind usadas em `SidebarNavGroup.tsx`) em todos os estados visuais
 * relevantes (default, hover, active, focus-visible, collapsed) e em
 * múltiplas larguras representativas (320 / 768 / 1024 / 1502 px), em
 * light e dark mode lado a lado.
 *
 * Use para validar contraste e ausência de sombras/brilho rapidamente
 * sem precisar abrir o app real.
 */
import { useState } from "react";
import { Home, Package, ShoppingCart, Settings, ChevronDown, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageSEO } from "@/components/seo/PageSEO";

const VIEWPORT_WIDTHS = [
  { label: "Mobile 320", value: 320 },
  { label: "Tablet 768", value: 768 },
  { label: "Desktop 1024", value: 1024 },
  { label: "Wide 1502", value: 1502 },
] as const;

const STATES = ["default", "hover", "active", "focus", "collapsed"] as const;
type State = (typeof STATES)[number];

/** Réplica do NavLink ativo/inativo do SidebarNavGroup (mesmas classes). */
function NavItemSample({
  state,
  collapsed,
}: {
  state: State;
  collapsed: boolean;
}) {
  const isActive = state === "active";
  const forceHover = state === "hover";
  const forceFocus = state === "focus";

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative",
        // hover simulado via classes não-prefixadas
        forceHover && !isActive && "bg-sidebar-accent/70 text-sidebar-foreground",
        // focus-visible simulado via ring estático
        forceFocus && "ring-2 ring-primary ring-offset-2",
        isActive
          ? "bg-orange/15 text-orange font-bold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-orange"
          : "text-sidebar-foreground/75 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-0 before:w-[2px] before:rounded-r-full before:bg-orange/50",
      )}
    >
      <Package
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          isActive ? "text-orange" : "text-sidebar-foreground/60",
        )}
      />
      {!collapsed && <span className="truncate text-sm flex-1">Produtos</span>}
    </div>
  );
}

/** Réplica do botão de grupo (Collapsible). */
function GroupHeaderSample({ active }: { active: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all duration-200",
        "hover:bg-sidebar-accent/60 text-sidebar-foreground/70 hover:text-sidebar-foreground",
        active && "text-orange bg-orange/15",
      )}
    >
      <ShoppingCart
        className={cn(
          "h-4 w-4 shrink-0",
          active ? "text-orange" : "text-sidebar-foreground/40",
        )}
      />
      <span className="flex-1 text-left text-xs font-semibold uppercase tracking-wider">
        Vendas
      </span>
      <ChevronDown className="h-3 w-3 text-sidebar-foreground/30" />
    </button>
  );
}

/** Sidebar inteiro replicado em uma largura X, com estados forçados. */
function SidebarPreview({ width, dark }: { width: number; dark: boolean }) {
  const collapsed = width < 768;
  return (
    <div
      className={cn(
        "rounded-xl border border-border overflow-hidden",
        dark ? "dark" : "",
      )}
      style={{ width: collapsed ? 72 : Math.min(width, 280) }}
    >
      <div className="bg-sidebar text-sidebar-foreground p-3 space-y-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
            {collapsed ? (
              <span className="text-[10px] font-bold text-primary-foreground">PG</span>
            ) : (
              <Gift className="h-4 w-4 text-primary-foreground" />
            )}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-sidebar-foreground">
                Promo Gifts
              </span>
              <span className="text-[10px] text-sidebar-foreground/40 uppercase tracking-widest">
                Plataforma
              </span>
            </div>
          )}
        </div>

        {!collapsed && <GroupHeaderSample active />}

        <div className="space-y-1">
          {STATES.map((s) => (
            <div key={s}>
              <div
                className={cn(
                  "text-[9px] uppercase tracking-wider font-semibold mb-1 px-2",
                  dark ? "text-white/40" : "text-black/40",
                )}
              >
                {s}
              </div>
              <NavItemSample state={s} collapsed={collapsed} />
            </div>
          ))}
        </div>
      </div>
      <div
        className={cn(
          "px-3 py-1.5 text-[10px] font-mono",
          dark ? "bg-black/40 text-white/60" : "bg-black/5 text-black/50",
        )}
      >
        {width}px {dark ? "· dark" : "· light"}
      </div>
    </div>
  );
}

export default function SidebarQAPage() {
  const [showSideBySide, setShowSideBySide] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      <PageSEO title="QA — Sidebar | Promo Gifts" description="Validação visual do sidebar" noindex />
      <div className="max-w-[1920px] mx-auto p-6 space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="text-xl font-bold tracking-tight"
              data-testid="page-title-sidebar-qa"
            >
              QA Visual — Sidebar
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Estados (default · hover · active · focus · collapsed) ×
              breakpoints ({VIEWPORT_WIDTHS.map((v) => v.value).join(" · ")} px)
              × light/dark.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              ✓ Sem efeitos de brilho ou sombras neon. Foco usa <code>ring-2 ring-primary ring-offset-2</code>.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showSideBySide}
              onChange={(e) => setShowSideBySide(e.target.checked)}
            />
            Light + Dark lado a lado
          </label>
        </header>

        <section className="space-y-8">
          {VIEWPORT_WIDTHS.map((vp) => (
            <div key={vp.value} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {vp.label}
              </h2>
              <div className="flex flex-wrap items-start gap-6">
                <SidebarPreview width={vp.value} dark={false} />
                {showSideBySide && (
                  <SidebarPreview width={vp.value} dark={true} />
                )}
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-border p-4 space-y-2 text-sm text-muted-foreground">
          <h3 className="font-semibold text-foreground">Checklist de validação</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Item <strong>active</strong>: fundo laranja sólido translúcido + indicador lateral 3px (totalmente plano, sem brilho).</li>
            <li>Item <strong>hover</strong>: fundo accent ~70% + texto mais forte (sem brilho).</li>
            <li>Item <strong>focus</strong>: ring sólido primário 2px com offset (visível em qualquer fundo).</li>
            <li>Item <strong>collapsed</strong> (320px): apenas ícone + indicadores; sem texto.</li>
            <li>Texto inativo legível em light e dark (foreground/75 ≥ WCAG AA).</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
