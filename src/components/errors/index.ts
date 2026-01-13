// Error Boundary Components
export { ErrorBoundary } from "./ErrorBoundary";
export { default as EnhancedErrorBoundary } from "./EnhancedErrorBoundary";
export { RouteErrorBoundary } from "./RouteErrorBoundary";
export { PageErrorBoundary } from "./PageErrorBoundary";

// Hooks
export { default as useErrorHandler } from "@/hooks/useErrorHandler";

// Result Pattern - Re-exports
export type { Result, DomainError, AsyncResult } from "@/lib/result";
export { ok, fail, isOk, isFail, DomainErrors, fold, getOrElse } from "@/lib/result";
