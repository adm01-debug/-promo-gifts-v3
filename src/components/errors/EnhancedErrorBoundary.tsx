import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

/**
 * EnhancedErrorBoundary — Global error boundary wrapping <App />.
 * Renders an elegant full-screen fallback when an uncaught render error occurs.
 */
class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('[GlobalErrorBoundary]', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  override render() {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails } = this.state;

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
                Ops! Algo deu errado
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
                Ocorreu um erro inesperado na aplicação. Tente recarregar a página ou voltar ao início.
              </p>
            </div>

            {/* Error message */}
            {error && (
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
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               aria-label="Atualizar">
                <RefreshCw className="h-4 w-4" />
                Recarregar
              </button>
            </div>

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
