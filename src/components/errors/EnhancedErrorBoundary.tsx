import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { logger } from '@/lib/logger';
import { reportError } from '@/lib/error-reporter';
import { attemptChunkRecovery, isChunkLoadError } from '@/lib/chunk-recovery';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  retryCount: number;
  isAutoRecovering: boolean;
}

const MAX_AUTO_RETRIES = 2;
const AUTO_RETRY_DELAY = 1500;

/**
 * EnhancedErrorBoundary — Global error boundary wrapping <App />.
 * Features:
 * - Auto-recovery for chunk/import errors (stale cache)
 * - Retry counter with exponential backoff
 * - Structured error logging
 * - Elegant full-screen fallback
 */
class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      retryCount: 0,
      isAutoRecovering: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Structured logging
    logger.error('[GlobalErrorBoundary]', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
    });

    this.props.onError?.(error, errorInfo);

    // Report to centralized error tracking
    reportError(error, {
      type: 'react_error_boundary',
      componentStack: errorInfo.componentStack?.slice(0, 1000),
      retryCount: this.state.retryCount,
    });
    if (this.isChunkError(error) && this.state.retryCount < MAX_AUTO_RETRIES) {
      this.setState({ isAutoRecovering: true });
      // Aciona recovery agressivo (hard reload + cache bust + purga SW).
      // Se o recovery atingir o limite de reloads na janela de 30s, ele
      // resolve com `false` — caímos no fallback estático abaixo em vez
      // de loop infinito (= tela branca).
      void attemptChunkRecovery(error).then((reloaded) => {
        if (!reloaded) {
          // Recovery desistiu: mostra a tela de erro com CTA manual.
          this.setState({ isAutoRecovering: false });
          return;
        }
        // Reload em andamento — mantém estado de "recuperando" até a
        // navegação substituir o documento.
        this.setState((prev) => ({ retryCount: prev.retryCount + 1 }));
      });
    }
  }

  private isChunkError(error: Error): boolean {
    return isChunkLoadError(error);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleClearCacheReload = () => {
    // Clear service worker caches if available
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    window.location.reload();
  };

  override render() {
    if (this.state.isAutoRecovering) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4 animate-in fade-in duration-300">
            <RotateCcw className="h-8 w-8 text-primary mx-auto animate-spin" />
            <p className="text-sm text-muted-foreground">Recuperando automaticamente…</p>
          </div>
        </div>
      );
    }

    if (this.state.hasError) {
      const { error, errorInfo, showDetails, retryCount } = this.state;
      const isChunk = error ? this.isChunkError(error) : false;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
          <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="h-20 w-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-10 w-10 text-destructive" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-destructive/20 flex items-center justify-center">
                  <Bug className="h-3.5 w-3.5 text-destructive" />
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="text-center space-y-2">
              <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
                {isChunk ? 'Atualização disponível' : 'Ops! Algo deu errado'}
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
                {isChunk
                  ? 'Uma nova versão do aplicativo está disponível. Recarregue para atualizar.'
                  : 'Ocorreu um erro inesperado na aplicação. Tente recarregar a página ou voltar ao início.'}
              </p>
              {retryCount > 0 && (
                <p className="text-xs text-muted-foreground/60">
                  Tentativas de recuperação: {retryCount}/{MAX_AUTO_RETRIES}
                </p>
              )}
            </div>

            {/* Error message */}
            {error && !isChunk && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-sm font-mono text-destructive break-words">
                  {error.message || 'Erro desconhecido'}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={this.handleGoHome}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Home className="h-4 w-4" />
                Início
              </button>
              <button aria-label="Atualizar"
                onClick={isChunk ? this.handleClearCacheReload : this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RefreshCw className="h-4 w-4" />
                {isChunk ? 'Atualizar' : 'Recarregar'}
              </button>
            </div>

            {/* Retry button (separate from reload) */}
            {!isChunk && (
              <button
                onClick={this.handleRetry}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-background/50 px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Tentar renderizar novamente
              </button>
            )}

            {/* Technical details toggle */}
            {errorInfo && (
              <div className="pt-2">
                <button
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  className="w-full inline-flex items-center justify-between rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <span>Detalhes técnicos</span>
                  {showDetails
                    ? <ChevronUp className="h-3.5 w-3.5" />
                    : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {showDetails && (
                  <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-muted p-4 text-[11px] leading-relaxed text-muted-foreground font-mono">
                    {error?.stack || 'Stack trace não disponível'}
                    {'\n\nComponent Stack:\n'}
                    {errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;
