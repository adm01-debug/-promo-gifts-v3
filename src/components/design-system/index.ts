// Design System Components - Exports centralizados
// Use: import { StatusBadge, DataCard, ActionButton } from "@/components/design-system";

// Status & Feedback
export { StatusBadge, mapToStatus } from "@/components/ui/StatusBadge";
export { UnifiedEmptyState, EmptyStatePresets } from "@/components/ui/UnifiedEmptyState";
export { EmptyState, EmptyStateInline } from "@/components/ui/EmptyState";
export { 
  LoadingState, 
  LoadingSkeleton, 
  LoadingCard, 
  LoadingTable, 
  LoadingButton 
} from "@/components/ui/LoadingState";

// Data Display
export { DataCard, DataCardGrid } from "@/components/ui/DataCard";
export { StatCard, MiniStatCard } from "@/components/ui/stat-card";

// Buttons & Actions
export { ActionButton, SaveButton, DeleteButton, SubmitButton } from "@/components/ui/ActionButton";
export { Button, buttonVariants } from "@/components/ui/button";

// Form Components
export { FormSection, FormDivider, FormActions } from "@/components/ui/FormSection";

// Layout
export { PageHeader, PageHeaderCompact } from "@/components/layout/PageHeader";

// Dialogs
export { ConfirmDialog, useConfirm } from "@/components/common/ConfirmDialog";

// Accessibility
export { SkipToContent } from "@/components/common/SkipToContent";

// Navigation
export { Spotlight } from "@/components/common/Spotlight";
export { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
