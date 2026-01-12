/**
 * Loading Components
 * 
 * PREFERRED: Use SkeletonShimmer components (modern, accessible)
 * LEGACY: SkeletonLoading components are kept for backwards compatibility
 */

// ============================================
// SHIMMER SKELETONS (Preferred - Modern API)
// ============================================
export {
  SkeletonShimmer,
  TextSkeleton,
  CardSkeleton,
  TableRowSkeleton,
  TableSkeleton,
  AvatarSkeleton,
  StatsCardSkeleton,
  ChartSkeleton,
  ProductCardSkeleton,
  ListItemSkeleton,
  FormSkeleton,
  PageHeaderSkeleton,
  PageSkeleton
} from "./SkeletonShimmer";

// ============================================
// LEGACY SKELETONS (Backwards Compatibility)
// Use "Legacy" prefix to avoid naming conflicts
// ============================================
export {
  Skeleton as LegacySkeleton,
  ListSkeleton,
  DashboardWidgetSkeleton,
  DashboardSkeleton,
  ProfileSkeleton,
  KanbanColumnSkeleton,
  KanbanSkeleton,
  ImageSkeleton,
  NavigationSkeleton,
  ShimmerSkeleton,
  PulseSkeleton,
  ContentPlaceholder,
  // Re-export with legacy prefix for conflicting names
  CardSkeleton as LegacyCardSkeleton,
  TableRowSkeleton as LegacyTableRowSkeleton,
  TableSkeleton as LegacyTableSkeleton,
  TextSkeleton as LegacyTextSkeleton,
  FormSkeleton as LegacyFormSkeleton,
  ChartSkeleton as LegacyChartSkeleton,
} from "./SkeletonLoading";

// ============================================
// LOADING OVERLAYS AND INDICATORS
// ============================================
export {
  LoadingOverlay,
  Spinner,
  LoadingDots,
  ProgressLoader
} from "./LoadingOverlay";
