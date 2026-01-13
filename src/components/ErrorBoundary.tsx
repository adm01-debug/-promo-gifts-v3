/**
 * Error Boundary Component
 * 
 * Captura erros de renderização React e exibe fallback amigável.
 * Integra com logging e permite retry.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  title?: string;
  description?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showStackTrace: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showStackTrace: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log para console em dev
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Callback customizado
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showStackTrace: false,
    });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  toggleStackTrace = (): void => {
    this.setState(prev => ({ showStackTrace: !prev.showStackTrace }));
  };

  render(): ReactNode {
    const { hasError, error, errorInfo, showStackTrace } = this.state;
    const { children, fallback, showDetails = false, title, description } = this.props;

    if (hasError) {
      // Fallback customizado
      if (fallback) {
        return fallback;
      }

      // Fallback padrão
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">
                {title || 'Algo deu errado'}
              </CardTitle>
              <CardDescription>
                {description || 'Ocorreu um erro inesperado. Tente novamente ou volte para a página inicial.'}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {showDetails && error && (
                <div className="space-y-3">
                  <div className="rounded-md bg-destructive/10 p-3">
                    <p className="text-sm font-medium text-destructive">
                      {error.name}: {error.message}
                    </p>
                  </div>
                  
                  {showStackTrace && errorInfo && (
                    <div className="rounded-md bg-muted p-3 overflow-auto max-h-48">
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={this.toggleStackTrace}
                    className="w-full"
                  >
                    <Bug className="mr-2 h-4 w-4" />
                    {showStackTrace ? 'Ocultar detalhes' : 'Ver detalhes técnicos'}
                  </Button>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex gap-2 justify-center">
              <Button variant="outline" onClick={this.handleGoHome}>
                <Home className="mr-2 h-4 w-4" />
                Página Inicial
              </Button>
              <Button onClick={this.handleRetry}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Tentar Novamente
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return children;
  }
}

// ============================================
// HOC para usar com componentes funcionais
// ============================================

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

// ============================================
// Hook para error handling em componentes
// ============================================

export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    console.error('Error handled:', error);
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const throwError = React.useCallback(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  // Dispara o erro para o ErrorBoundary mais próximo
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { error, handleError, clearError, throwError };
}

export default ErrorBoundary;
