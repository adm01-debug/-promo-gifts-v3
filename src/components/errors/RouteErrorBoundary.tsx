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
      fallback={
        <div className="flex min-h-[400px] w-full items-center justify-center p-8">
          <EmptyState
            variant="error"
            title="Falha no Carregamento"
            description="Não foi possível carregar esta seção. Tente recarregar ou volte ao início."
            action={{ label: 'Recarregar', onClick: () => window.location.reload() }}
          />
        </div>
      }
    >
      {children}
    </EnhancedErrorBoundary>
  );
}
