/**
 * Shared types and small components for CompanyContactSelector
 */
import { cn } from "@/lib/utils";
import { AvatarLogo } from "@/components/shared/AvatarLogo";

export interface CompanyOption {
// ... keep existing code
export interface ContactOption {
// ... keep existing code
}

export function CompanyAvatar({ name, logoUrl, size = "md" }: { name: string; logoUrl?: string | null; size?: "sm" | "md" }) {
  return <AvatarLogo name={name} logoUrl={logoUrl} size={size} />;
}
