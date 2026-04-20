import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CURATION_STATUSES, type MagicUpCurationStatus } from "@/pages/magic-up/magicUpStrategy";
import { cn } from "@/lib/utils";

interface MagicUpCurationStatusProps {
  value: MagicUpCurationStatus;
  disabled?: boolean;
  onChange: (status: MagicUpCurationStatus) => void;
}

export function MagicUpCurationStatus({ value, disabled, onChange }: MagicUpCurationStatusProps) {
  const current = CURATION_STATUSES.find((status) => status.value === value);

  return (
    <section className="rounded-lg border bg-card p-3" aria-label="Status de curadoria">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Curadoria</p>
        <Badge variant="outline">{current?.label || "Rascunho"}</Badge>
      </div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {CURATION_STATUSES.map((status) => (
          <Button
            key={status.value}
            type="button"
            size="sm"
            variant={status.value === value ? "default" : "outline"}
            disabled={disabled}
            className={cn("h-7 shrink-0 px-2 text-[11px]", status.value === value && "shadow-sm")}
            onClick={() => onChange(status.value)}
          >
            {status.label}
          </Button>
        ))}
      </div>
    </section>
  );
}
