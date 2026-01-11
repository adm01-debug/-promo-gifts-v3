import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: unknown;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log error
    console.error("PageErrorBoundary caught an error:", error, errorInfo);
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props): void {
    // Reset error state if resetOnPropsChange prop changes
    if (
      this.state.hasError &&
      this.props.resetOnPropsChange !== prevProps.resetOnPropsChange
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full p-4"
        >
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Erro ao carregar componente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {this.state.error?.message || "Ocorreu um erro inesperado ao renderizar este componente."}
              </p>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={this.resetError}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Tentar novamente
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.location.href = "/"}
                  className="gap-2"
                >
                  <Home className="h-4 w-4" />
                  Página inicial
                </Button>
              </div>

              {import.meta.env.DEV && (
                <div className="pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={this.toggleDetails}
                    className="gap-2 text-muted-foreground"
                  >
                    <Bug className="h-4 w-4" />
                    Detalhes do erro
                    {this.state.showDetails ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>

                  <AnimatePresence>
                    {this.state.showDetails && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 rounded-lg bg-muted/50 p-3 text-xs font-mono">
                          <p className="font-semibold text-destructive mb-2">
                            {this.state.error?.name}: {this.state.error?.message}
                          </p>
                          <pre className="whitespace-pre-wrap text-muted-foreground overflow-x-auto">
                            {this.state.error?.stack}
                          </pre>
                          {this.state.errorInfo?.componentStack && (
                            <>
                              <p className="font-semibold text-muted-foreground mt-3 mb-1">
                                Component Stack:
                              </p>
                              <pre className="whitespace-pre-wrap text-muted-foreground/70 overflow-x-auto">
                                {this.state.errorInfo.componentStack}
                              </pre>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      );
    }

    return this.props.children;
  }
}

export default PageErrorBoundary;
