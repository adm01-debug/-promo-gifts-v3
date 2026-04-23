import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface RetestButtonProps {
  onRetest: () => Promise<void> | void;
  disabled?: boolean;
  cooldownMs?: number;
  disabledReason?: string;
}

type DisabledKind = "running" | "cooldown" | "credentials" | null;

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

  // Pinpoint *why* the button is disabled, in priority order.
  const disabledKind: DisabledKind = isRunning
    ? "running"
    : disabled
      ? "credentials"
      : inCooldown
        ? "cooldown"
        : null;

  const tooltip = (() => {
    switch (disabledKind) {
      case "running":
        return {
          title: "Teste em andamento",
          body: "Aguarde a resposta do serviço antes de disparar novamente.",
        };
      case "credentials":
        return {
          title: "Credenciais inválidas ou ausentes",
          body: disabledReason ?? "Preencha e salve as credenciais obrigatórias antes de testar.",
        };
      case "cooldown":
        return {
          title: `Aguarde ${secondsLeft}s (debounce)`,
          body: "Pequena pausa entre testes para evitar disparos acidentais e respeitar limites do serviço externo.",
        };
      default:
        return {
          title: "Disparar novo teste",
          body: "Executa imediatamente um teste manual e grava no histórico.",
        };
    }
  })();

  const label = isRunning
    ? "Testando…"
    : inCooldown
      ? `Aguarde ${secondsLeft}s`
      : "Testar novamente";

  const button = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs gap-1.5"
      disabled={isDisabled}
      onClick={handleClick}
      aria-label={tooltip.title}
      aria-describedby={isDisabled ? "retest-disabled-reason" : undefined}
    >
      <RefreshCw className={cn("h-3.5 w-3.5", isRunning && "animate-spin")} />
      {label}
    </Button>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* Wrapper span enables tooltip even when the button is disabled
              (pointer events are blocked on disabled <button>). */}
          <span className="inline-flex">{button}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-snug">
          <p className="font-medium">{tooltip.title}</p>
          <p className="text-muted-foreground mt-0.5">{tooltip.body}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
