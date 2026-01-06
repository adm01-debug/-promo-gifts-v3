import { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ============================================
// SkipLink - Link para pular navegação
// ============================================
interface SkipLinkProps {
  targetId: string;
  children?: ReactNode;
}

export function SkipLink({ targetId, children = "Pular para o conteúdo" }: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {children}
    </a>
  );
}

// ============================================
// VisuallyHidden - Oculto visualmente mas acessível
// ============================================
interface VisuallyHiddenProps {
  children: ReactNode;
  as?: keyof JSX.IntrinsicElements;
}

export function VisuallyHidden({ children, as: Tag = "span" }: VisuallyHiddenProps) {
  return <Tag className="sr-only">{children}</Tag>;
}

// ============================================
// FocusTrap - Armadilha de foco para modais
// ============================================
interface FocusTrapProps {
  children: ReactNode;
  active?: boolean;
  className?: string;
}

export function FocusTrap({ children, active = true, className }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    firstFocusable?.focus();

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
    };
  }, [active]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

// ============================================
// LiveRegion - Região para anúncios de leitor de tela
// ============================================
interface LiveRegionProps {
  children: ReactNode;
  politeness?: "polite" | "assertive" | "off";
  atomic?: boolean;
  relevant?: "additions" | "removals" | "text" | "all";
}

export function LiveRegion({
  children,
  politeness = "polite",
  atomic = false,
  relevant = "additions",
}: LiveRegionProps) {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className="sr-only"
    >
      {children}
    </div>
  );
}

// ============================================
// Announcer - Anunciador de mensagens
// ============================================
let announcerInstance: ((message: string) => void) | null = null;

export function Announcer() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    announcerInstance = (msg: string) => {
      setMessage("");
      setTimeout(() => setMessage(msg), 100);
    };
    return () => {
      announcerInstance = null;
    };
  }, []);

  return (
    <LiveRegion politeness="assertive" atomic>
      {message}
    </LiveRegion>
  );
}

export function announce(message: string) {
  announcerInstance?.(message);
}

// ============================================
// ReducedMotion - Wrapper para respeitar preferência de movimento
// ============================================
interface ReducedMotionProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ReducedMotion({ children, fallback }: ReducedMotionProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  if (prefersReducedMotion && fallback) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ============================================
// HighContrastMode - Wrapper para alto contraste
// ============================================
interface HighContrastModeProps {
  children: ReactNode;
  className?: string;
}

export function HighContrastMode({ children, className }: HighContrastModeProps) {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-contrast: more)");
    setPrefersHighContrast(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return (
    <div
      className={cn(
        prefersHighContrast && "high-contrast",
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================
// KeyboardShortcut - Exibição de atalho de teclado
// ============================================
interface KeyboardShortcutProps {
  keys: string[];
  className?: string;
}

export function KeyboardShortcut({ keys, className }: KeyboardShortcutProps) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono bg-muted border border-border rounded",
        className
      )}
    >
      {keys.map((key, index) => (
        <span key={index}>
          {index > 0 && <span className="text-muted-foreground mx-0.5">+</span>}
          <span className="font-semibold">{key}</span>
        </span>
      ))}
    </kbd>
  );
}

// ============================================
// FormErrorSummary - Resumo de erros de formulário
// ============================================
interface FormError {
  field: string;
  message: string;
}

interface FormErrorSummaryProps {
  errors: FormError[];
  className?: string;
}

export function FormErrorSummary({ errors, className }: FormErrorSummaryProps) {
  if (errors.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "p-4 bg-destructive/10 border border-destructive/20 rounded-lg",
        className
      )}
    >
      <h3 className="text-sm font-medium text-destructive mb-2">
        {errors.length === 1
          ? "1 erro encontrado:"
          : `${errors.length} erros encontrados:`}
      </h3>
      <ul className="list-disc list-inside space-y-1">
        {errors.map((error, index) => (
          <li key={index} className="text-sm text-destructive">
            <a
              href={`#${error.field}`}
              className="underline hover:no-underline"
            >
              {error.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================
// AccessibleIcon - Ícone com texto alternativo
// ============================================
interface AccessibleIconProps {
  icon: ReactNode;
  label: string;
  decorative?: boolean;
}

export function AccessibleIcon({ icon, label, decorative = false }: AccessibleIconProps) {
  if (decorative) {
    return <span aria-hidden="true">{icon}</span>;
  }

  return (
    <span role="img" aria-label={label}>
      {icon}
    </span>
  );
}
