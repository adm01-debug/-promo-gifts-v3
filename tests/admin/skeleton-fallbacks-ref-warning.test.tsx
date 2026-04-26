/**
 * Regressão: nenhum skeleton fallback (SkeletonLoaders) deve disparar o
 * warning "Function components cannot be given refs" — nem renderizado
 * diretamente, nem como `fallback` de <Suspense>, nem via getFallback().
 *
 * Cobertura:
 *  - render direto de cada skeleton exportado;
 *  - render como fallback de <Suspense> com filho que suspende (Promise pendente);
 *  - render via helper getFallback() para várias rotas representativas.
 */
import { describe, it, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { installReactWarningGuard } from "../helpers/react-warning-guard";
import {
  CatalogSkeleton,
  ProductDetailSkeleton,
  QuotesSkeleton,
  AdminSkeleton,
  DashboardSkeleton,
  OrdersSkeleton,
  ToolsSkeleton,
  ProfileSkeleton,
  GenericSkeleton,
  getFallback,
} from "@/components/layout/SkeletonLoaders";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

afterEach(() => cleanup());

const SKELETONS = [
  ["CatalogSkeleton", CatalogSkeleton],
  ["ProductDetailSkeleton", ProductDetailSkeleton],
  ["QuotesSkeleton", QuotesSkeleton],
  ["AdminSkeleton", AdminSkeleton],
  ["DashboardSkeleton", DashboardSkeleton],
  ["OrdersSkeleton", OrdersSkeleton],
  ["ToolsSkeleton", ToolsSkeleton],
  ["ProfileSkeleton", ProfileSkeleton],
  ["GenericSkeleton", GenericSkeleton],
] as const;

const ROUTES = [
  "/",
  "/produtos",
  "/produto/abc-123",
  "/orcamentos",
  "/admin/usuarios",
  "/dashboard",
  "/pedidos",
  "/montar-kit",
  "/perfil",
  "/qualquer-coisa",
];

/** Componente que suspende indefinidamente — força o fallback do <Suspense>. */
function SuspendForever(): never {
  throw new Promise(() => {
    /* never resolves */
  });
}

describe("SkeletonLoaders — nenhum ref warning", () => {
  it.each(SKELETONS)("render direto: %s", (_name, Cmp) => {
    const guard = installReactWarningGuard();
    try {
      render(<Cmp />);
      guard.expectNoRefWarning(`render direto de ${_name}`);
    } finally {
      guard.dispose();
    }
  });

  it.each(SKELETONS)("como fallback de <Suspense>: %s", (_name, Cmp) => {
    const guard = installReactWarningGuard();
    try {
      render(
        <Suspense fallback={<Cmp />}>
          <SuspendForever />
        </Suspense>,
      );
      guard.expectNoRefWarning(`<Suspense fallback={<${_name} />}>`);
    } finally {
      guard.dispose();
    }
  });

  it.each(ROUTES)("getFallback('%s') não dispara warning", (path) => {
    const guard = installReactWarningGuard();
    try {
      render(
        <Suspense fallback={getFallback(path)}>
          <SuspendForever />
        </Suspense>,
      );
      guard.expectNoRefWarning(`getFallback('${path}')`);
    } finally {
      guard.dispose();
    }
  });
});
