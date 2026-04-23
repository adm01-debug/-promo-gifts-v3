import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RetestButtonProps {
  onRetest: () => Promise<void> | void;
  disabled?: boolean;
  cooldownMs?: number;
  disabledReason?: string;
}

export function RetestButton({
  onRetest,
  disabled = false,
  cooldownMs = 3000,
  disabledReason,
}: RetestButtonProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [now, setNow] = useState<number>(() => Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const inCooldown = cooldownUntil > now;
  const secondsLeft = inCooldown ? Math.max(1, Math.ceil((cooldownUntil - now) / 1000)) : 0;

  useEffect(() => {
    if (!inCooldown) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => setNow(Date.now()), 250);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [inCooldown]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleClick = useCallback(async () => {
    if (isRunning || inCooldown || disabled) return;
    setIsRunning(true);
    try {
      await onRetest();
    } finally {
      setIsRunning(false);
      setCooldownUntil(Date.now() + cooldownMs);
      setNow(Date.now());
    }
  }, [isRunning, inCooldown, disabled, onRetest, cooldownMs]);

  const isDisabled = isRunning || inCooldown || disabled;
  const title = disabled
    ? disabledReason ?? "Configure credenciais válidas primeiro"
    : isRunning
      ? "Testando…"
      : inCooldown
        ? `Aguarde ${secondsLeft}s antes de testar novamente`
        : "Disparar novo teste";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs gap-1.5"
      disabled={isDisabled}
      onClick={handleClick}
      title={title}
      aria-label={title}
    >
      <RefreshCw className={cn("h-3.5 w-3.5", isRunning && "animate-spin")} />
      {isRunning ? "Testando…" : inCooldown ? `Aguarde ${secondsLeft}s` : "Testar novamente"}
    </Button>
  );
}
