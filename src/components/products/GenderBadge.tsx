/**
 * GenderBadge — Badge compacto de gênero do produto
 */
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const GENDER_CONFIG: Record<string, { label: string; className: string }> = {
  masculino: { label: "Masc.", className: "bg-info/10 text-info border-info/20" },
  feminino: { label: "Fem.", className: "bg-pink-500/10 text-pink-700 border-pink-200" },
  infantil: { label: "Infantil", className: "bg-amber-500/10 text-amber-700 border-amber-200" },
  unissex: { label: "Unissex", className: "bg-violet-500/10 text-violet-700 border-violet-200" },
};

interface GenderBadgeProps {
  gender?: string | null;
  size?: "sm" | "md";
  className?: string;
}

export function GenderBadge({ gender, size = "sm", className }: GenderBadgeProps) {
  if (!gender) return null;
  const key = gender.toLowerCase().trim();
  const config = GENDER_CONFIG[key];
  if (!config) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border gap-1",
        config.className,
        size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5",
        className
      )}
    >
      <Users className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {config.label}
    </Badge>
  );
}
