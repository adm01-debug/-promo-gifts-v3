import { Fragment } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { registerServiceWorker } from "@/lib/sw-register";
import { initWebVitals } from "@/lib/web-vitals";
import EnhancedErrorBoundary from "@/components/errors/EnhancedErrorBoundary";
import App from "./App.tsx";
import "./index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error('❌ Elemento root não encontrado no DOM');
}

createRoot(root).render(
  <Fragment>
    <HelmetProvider>
      <EnhancedErrorBoundary>
        <App />
      </EnhancedErrorBoundary>
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
