import { Fragment, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { registerServiceWorker } from "@/lib/sw-register";
import { installGlobalErrorHandlers } from "@/lib/error-reporter";
import { initSentry } from "@/lib/sentry";
import EnhancedErrorBoundary from "@/components/errors/EnhancedErrorBoundary";
import App from "./App.tsx";
import "./index.css";

// Initialize Sentry FIRST (no-op if VITE_SENTRY_DSN is unset)
initSentry();

// Install global error handlers for unhandled errors/rejections
installGlobalErrorHandlers();

const root = document.getElementById("root");

if (!root) {
  throw new Error('❌ Elemento root não encontrado no DOM');
}

// Overlay de métricas de bridge: APENAS no preview/dev. Lazy import para
// garantir tree-shaking em build de produção (chunk separado, nunca baixado).
const BridgeMetricsOverlay = import.meta.env.PROD
  ? null
  : lazy(() => import("@/components/dev/BridgeMetricsOverlay"));

createRoot(root).render(
  <Fragment>
    <HelmetProvider>
      <EnhancedErrorBoundary>
        <App />
      </EnhancedErrorBoundary>
      {BridgeMetricsOverlay && (
        <Suspense fallback={null}>
          <BridgeMetricsOverlay />
        </Suspense>
      )}
    </HelmetProvider>
  </Fragment>
);

// Registrar Service Worker para PWA (apenas em produção para evitar cache issues no preview)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  registerServiceWorker()
    .catch(() => {
      // SW registration failed silently
    });
} else if ('serviceWorker' in navigator && import.meta.env.DEV) {
  // Em dev, desregistrar SWs antigos que possam estar cacheando
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(r => r.unregister());
  });
}
