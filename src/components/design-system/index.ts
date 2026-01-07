// Design System Components - Exports centralizados
// Use: import { StatusBadge, DataCard, ActionButton } from "@/components/design-system";

// Status & Feedback
export { StatusBadge, mapToStatus } from "@/components/ui/StatusBadge";
export { UnifiedEmptyState, EmptyStatePresets } from "@/components/ui/UnifiedEmptyState";
export { SmartEmptyState } from "@/components/ui/SmartEmptyState";
export { EmptyState, EmptyStateInline } from "@/components/ui/EmptyState";
export { 
  LoadingState, 
  LoadingSkeleton, 
  LoadingCard, 
  LoadingTable, 
  LoadingButton 
} from "@/components/ui/LoadingState";
export {
  Skeleton,
  ProductCardSkeleton,
  QuoteRowSkeleton,
  ClientCardSkeleton,
  StatCardSkeleton,
  TableSkeleton,
  DashboardSkeleton,
  MockupGeneratorSkeleton,
} from "@/components/ui/SkeletonLoader";

// Data Display
export { DataCard, DataCardGrid } from "@/components/ui/DataCard";
export { StatCard, MiniStatCard } from "@/components/ui/stat-card";

// Buttons & Actions
export { ActionButton, SaveButton, DeleteButton, SubmitButton } from "@/components/ui/ActionButton";
export { Button, buttonVariants } from "@/components/ui/button";

// Form Components
export { FormSection, FormDivider, FormActions } from "@/components/ui/FormSection";
export { CollapsibleSection, ExpandableFilters } from "@/components/ui/CollapsibleSection";

// Progress & Steps
export { StepIndicator } from "@/components/ui/StepIndicator";

// Layout
export { PageHeader, PageHeaderCompact } from "@/components/layout/PageHeader";

// Dialogs
export { ConfirmDialog, useConfirm } from "@/components/common/ConfirmDialog";

// Accessibility
export { SkipToContent } from "@/components/common/SkipToContent";

// Navigation
export { Spotlight } from "@/components/common/Spotlight";
export { MobileBottomNav } from "@/components/mobile/MobileBottomNav";

// Tables & Lists
export { VirtualizedList, VirtualizedGrid } from "@/components/ui/VirtualizedList";

// Notifications
export { AnnouncementBanner, SimpleAnnouncement } from "@/components/ui/AnnouncementBanner";

// Onboarding
export { QuickStartWizard } from "@/components/onboarding/QuickStartWizard";
