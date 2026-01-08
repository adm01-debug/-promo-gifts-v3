import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerServiceWorker } from "@/lib/sw-register";
import EnhancedErrorBoundary from "@/components/errors/EnhancedErrorBoundary";
import App from "./App.tsx";
import "./index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error('❌ Elemento root não encontrado no DOM');
}

createRoot(root).render(
  <StrictMode>
    <EnhancedErrorBoundary>
      <App />
    </EnhancedErrorBoundary>
  </StrictMode>
);

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  registerServiceWorker()
    .then(() => {
      if (import.meta.env.DEV) {
        console.log('✅ Service Worker registrado com sucesso');
      }
    })
    .catch((error) => {
      if (import.meta.env.DEV) {
        console.error('❌ Erro ao registrar Service Worker:', error);
      }
    });
}
