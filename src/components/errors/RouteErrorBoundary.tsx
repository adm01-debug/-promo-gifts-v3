import React, { type ReactNode } from 'react';
import { EnhancedErrorBoundary } from './EnhancedErrorBoundary';
import { EmptyState } from '@/components/common/EmptyState';

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

/**
 * RouteErrorBoundary — Especialização para uso em nível de rota no App.tsx.
 * Fornece um fallback discreto que não quebra o layout global.
 */
export function RouteErrorBoundary({ children }: RouteErrorBoundaryProps) {
  return (
    <EnhancedErrorBoundary
      fallback={(error) => (
        <div className="flex min-h-[400px] w-full items-center justify-center p-8">
          <EmptyState
            variant="error"
            title="Falha no Carregamento"
            description="Não foi possível carregar esta seção. Tente recarregar ou volte ao início."
            action={{ label: 'Recarregar', onClick: () => window.location.reload() }}
          >
            <div className="mt-4 overflow-hidden rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-left">
              <p className="mb-2 font-mono text-xs font-bold text-destructive">
                {error.message}
              </p>
              {error.stack && (
                <pre className="max-h-40 overflow-auto font-mono text-[10px] text-destructive/70">
                  {error.stack}
                </pre>
              )}
            </div>
          </EmptyState>
        </div>
      )}
    >
      {children}
    </EnhancedErrorBoundary>
  );
}
