import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, CheckCircle2, Eye, EyeOff, Loader2, RefreshCw, RotateCw, Save } from "lucide-react";
import { validateSecret, getMinLength } from "./secretValidators";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  useSecretsManager,
  type SecretStatus,
  type SecretMutationResult,
} from "@/hooks/useSecretsManager";
import { JustSavedFlash } from "./JustSavedFlash";
import { RotationHistoryRow } from "./RotationHistoryRow";
import { RotateSecretConfirmDialog } from "./RotateSecretConfirmDialog";
import { SaveSecretConfirmDialog } from "./SaveSecretConfirmDialog";
import { withRetryBackoff, CancelledError } from "./secretRetry";
import { normalizeSecretError, type NormalizedSecretError } from "./secretErrors";
import { SecretErrorAlert } from "./SecretErrorAlert";

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  if (Number.isNaN(then)) return "";
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "agora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr}h`;
  const d = Math.floor(hr / 24);
  return `há ${d}d`;
}

// NOTE: error translation moved to ./secretErrors.ts so that every
// connections component shows the same wording, chip and tone.

interface FlashState {
  masked_suffix: string | null;
  length: number;
  action: "set" | "rotate";
  was_update: boolean;
  was_env_fallback: boolean;
  /** changes whenever a new flash should appear, to remount the component */
  key: number;
}

interface Props {
  label: string;
  secretName: string;
  status?: SecretStatus;
  helperText?: string;
  onSaved?: () => void;
}

export function SecretField({ label, secretName, status, helperText, onSaved }: Props) {
  const { setSecret, rotateSecret } = useSecretsManager();
  const draftKey = `secret-draft:${secretName}`;
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<"set" | "rotate">("set");
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<FlashState | null>(null);
  const [rotationRefreshKey, setRotationRefreshKey] = useState(0);
  const [lastError, setLastError] = useState<NormalizedSecretError | null>(null);
  const flashCounter = useRef(0);

  // Hydrate draft (value + mode) from sessionStorage on mount — survives accidental reload after a failed save
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { value?: string; mode?: "set" | "rotate" };
      if (draft.value && typeof draft.value === "string") {
        setValue(draft.value);
        setMode(draft.mode === "rotate" ? "rotate" : "set");
        setEditing(true);
      }
    } catch { /* ignore parse errors */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist draft whenever editing with a non-empty value; clear on success/cancel
  useEffect(() => {
    if (editing && value.length > 0) {
      try { sessionStorage.setItem(draftKey, JSON.stringify({ value, mode })); } catch { /* ignore quota */ }
    } else {
      try { sessionStorage.removeItem(draftKey); } catch { /* ignore */ }
    }
  }, [editing, value, mode, draftKey]);

  // Confirmation modals
  const [rotateConfirmOpen, setRotateConfirmOpen] = useState(false);
  const [rotateConfirmError, setRotateConfirmError] = useState<string | null>(null);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);

  // Cancellation for in-flight retries
  const abortRef = useRef<AbortController | null>(null);

  const performSave = async (currentMode: "set" | "rotate", currentValue: string, notes?: string) => {
    const wasEnvFallback = !!status?.env_fallback_active;
    const toastId = `secret-${secretName}-${Date.now()}`;
    const controller = new AbortController();
    abortRef.current = controller;

    const baseLabel = currentMode === "rotate" ? `Rotacionando ${secretName}` : `Salvando ${secretName}`;
    const cancelAction = {
      label: "Cancelar",
      onClick: () => controller.abort(),
    };

    const slowTimer = setTimeout(() => {
      toast.loading(`${baseLabel}…`, { id: toastId, action: cancelAction });
    }, 800);

    let result: SecretMutationResult;
    try {
      result = await withRetryBackoff(
        () =>
          currentMode === "rotate"
            ? rotateSecret(secretName, currentValue, notes)
            : setSecret(secretName, currentValue),
        {
          signal: controller.signal,
          onAttempt: (attempt, nextDelayMs) => {
            if (attempt > 1 || nextDelayMs !== null) {
              const sec = nextDelayMs ? Math.max(1, Math.round(nextDelayMs / 1000)) : null;
              const desc = nextDelayMs
                ? `Rede instável — nova tentativa em ${sec}s (tentativa ${attempt}/3)`
                : `Tentativa ${attempt}/3…`;
              toast.loading(`${baseLabel}…`, {
                id: toastId,
                description: desc,
                action: cancelAction,
              });
            }
          },
        },
      );
    } catch (err) {
      if (err instanceof CancelledError) {
        clearTimeout(slowTimer);
        abortRef.current = null;
        toast(`${baseLabel} cancelado`, { id: toastId, duration: 3000 });
        return { ok: false as const, errorDescription: "Cancelado pelo usuário", cancelled: true };
      }
      result = {
        ok: false,
        error: { code: "unexpected", message: err instanceof Error ? err.message : "Erro inesperado" },
      };
    }
    clearTimeout(slowTimer);
    abortRef.current = null;

    if (!result.ok || !result.secret) {
      const err = result.error ?? { code: "unexpected", message: "Erro desconhecido" };
      const normalized = normalizeSecretError(err, secretName, { action: currentMode === "rotate" ? "rotate" : "save" });
      setLastError(normalized);
      const toastDescription = normalized.hint ? `${normalized.description} ${normalized.hint}` : normalized.description;
      toast.error(normalized.title, {
        id: toastId,
        description: toastDescription,
        duration: 7000,
        action: normalized.retryable
          ? {
              label: "Tentar novamente",
              onClick: () => {
                setMode(currentMode);
                setValue(currentValue);
                setEditing(true);
              },
            }
          : undefined,
      });
      return { ok: false as const, errorDescription: toastDescription, cancelled: false };
    }
    setLastError(null);

    const { secret, was_update, previous_suffix } = result;
    const suffix = secret.masked_suffix ?? "????";
    const length = secret.length ?? currentValue.length;

    if (currentMode === "rotate") {
      toast.success("Rotação concluída", {
        id: toastId,
        description: `${secretName}: ••••${previous_suffix ?? "????"} → ••••${suffix} (${length} chars · registrado no log)`,
        duration: 5000,
      });
    } else if (was_update) {
      toast.success("Credencial atualizada", {
        id: toastId,
        description: `${secretName} agora termina em ••••${suffix} (${length} chars)`,
        duration: 5000,
      });
    } else {
      toast.success("Credencial salva", {
        id: toastId,
        description: `${secretName} agora termina em ••••${suffix} (${length} chars)`,
        duration: 5000,
      });
    }

    flashCounter.current += 1;
    setFlash({
      masked_suffix: suffix,
      length,
      action: currentMode,
      was_update: !!was_update,
      was_env_fallback: wasEnvFallback,
      key: flashCounter.current,
    });

    if (currentMode === "rotate") {
      setRotationRefreshKey((k) => k + 1);
    }

    setValue("");
    setEditing(false);
    setMode("set");
    onSaved?.();
    return { ok: true as const, cancelled: false };
  };

  const validation = useMemo(() => validateSecret(secretName, value), [secretName, value]);
  const canSave = !saving && value.length > 0 && validation.ok;
  const saveDisabledReason = saving
    ? null
    : value.length === 0
      ? "Cole um valor antes de salvar"
      : !validation.ok
        ? validation.message ?? "Corrija o formato antes de salvar"
        : null;

  const minLen = getMinLength(secretName);
  const storedLooksSuspicious =
    !editing && !!status?.has_value && !!minLen && (status.length ?? 0) < minLen;

  const handleSave = async () => {
    if (!canSave) return;

    // Both modes now require modal confirmation before touching the backend
    if (mode === "rotate") {
      setRotateConfirmError(null);
      setRotateConfirmOpen(true);
      return;
    }
    setSaveConfirmOpen(true);
  };

  const handleConfirmedSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const res = await performSave("set", value);
    setSaving(false);
    if (res.ok) setSaveConfirmOpen(false);
  };

  const handleConfirmedRotate = async (notes?: string) => {
    if (!value || !validation.ok) return;
    setSaving(true);
    setRotateConfirmError(null);
    const res = await performSave("rotate", value, notes);
    setSaving(false);
    if (res.ok) {
      setRotateConfirmOpen(false);
    } else if (!res.cancelled) {
      setRotateConfirmError(res.errorDescription);
    }
  };

  const startEdit = (m: "set" | "rotate") => { setMode(m); setEditing(true); };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Label className="text-sm font-medium">{label}</Label>
          {status?.env_fallback_active && !editing && (
            <span
              className="inline-flex items-center gap-1 rounded-md border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning animate-in fade-in duration-300"
              title="Este valor está vindo da variável de ambiente do deploy, não do banco. Salve um valor aqui para sobrescrever e tornar editável."
            >
              <AlertCircle className="h-3 w-3" />
              Usando ENV
            </span>
          )}
        </div>
        {status?.has_value && !editing && (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Check className="h-3 w-3 text-success" />
            ••••{status.masked_suffix} ({status.length} chars)
            {status.updated_at && (
              <span className="opacity-70">
                · atualizado {formatRelative(status.updated_at)}
              </span>
            )}
            {storedLooksSuspicious && (
              <span
                className="text-warning inline-flex items-center gap-1"
                title={`Comprimento abaixo do esperado (${status.length} chars, mínimo ${minLen}). Pode estar truncado — re-salve para garantir.`}
              >
                <AlertCircle className="h-3 w-3" /> comprimento suspeito
              </span>
            )}
          </span>
        )}
      </div>
      {editing ? (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={show ? "text" : "password"}
                value={value}
                onChange={(e) => { setValue(e.target.value); if (lastError) setLastError(null); }}
                placeholder={mode === "rotate" ? `Novo valor para ${secretName}…` : `Cole o valor de ${secretName}…`}
                autoFocus
                disabled={saving}
                className={cn(
                  "pr-16",
                  value.length > 0 && validation.ok && "border-success focus-visible:border-success focus-visible:ring-success/20",
                  value.length > 0 && !validation.ok && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
                )}
                aria-invalid={value.length > 0 && !validation.ok}
              />
              {value.length > 0 && (
                <span className="absolute right-9 top-1/2 -translate-y-1/2 pointer-events-none">
                  {validation.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  )}
                </span>
              )}
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                aria-label={show ? "Ocultar" : "Mostrar"}
                disabled={saving}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!canSave}
              title={saveDisabledReason ?? undefined}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              {saving
                ? mode === "rotate" ? "Rotacionando…" : "Salvando…"
                : mode === "rotate" ? "Rotacionar" : "Salvar"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setEditing(false); setValue(""); setMode("set"); setLastError(null); }}
              disabled={saving}
            >
              Cancelar
            </Button>
          </div>
          {lastError && !saving && (
            <SecretErrorAlert
              error={lastError}
              onRetry={handleSave}
              retryDisabled={!canSave}
            />
          )}
          {value.length > 0 && !validation.ok && validation.message && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {validation.message}
            </p>
          )}
          {value.length === 0 && validation.hint && (
            <p className="text-xs text-muted-foreground">{validation.hint}</p>
          )}
          {value.length > 0 && validation.ok && validation.hint && (
            <p className="text-xs text-success">Formato válido</p>
          )}
          {value.length > 0 && validation.ok && (() => {
            const newSuffix = value.slice(-4).padStart(4, "•");
            const actionLabel =
              mode === "rotate" ? "Após rotacionar" : status?.has_value ? "Após atualizar" : "Após salvar";
            const showTransition = mode === "rotate" || !!status?.has_value;
            return (
              <div
                className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-2.5 py-1.5 text-xs animate-in fade-in duration-200"
                aria-live="polite"
              >
                <span className="text-muted-foreground shrink-0">{actionLabel}:</span>
                {showTransition && status?.masked_suffix && (
                  <>
                    <span className="font-mono text-muted-foreground line-through opacity-70">
                      ••••{status.masked_suffix}
                    </span>
                    <span className="text-muted-foreground">→</span>
                  </>
                )}
                <span className="font-mono font-medium text-success">••••{newSuffix}</span>
                <span className="text-muted-foreground">
                  ({value.length} {value.length === 1 ? "char" : "chars"})
                </span>
              </div>
            );
          })()}

        </>
      ) : (
        <div className="flex gap-2">
          <Input value={status?.has_value ? "•••••••••••••••••" : ""} placeholder="Não configurado" readOnly />
          <Button size="sm" variant="outline" onClick={() => startEdit("set")}>
            <RefreshCw className="h-4 w-4 mr-1" />
            {status?.has_value ? "Atualizar" : "Configurar"}
          </Button>
          {status?.has_value && (
            <Button size="sm" variant="outline" onClick={() => startEdit("rotate")} title="Rotacionar (registra no log)">
              <RotateCw className="h-4 w-4 mr-1" /> Rotacionar
            </Button>
          )}
        </div>
      )}
      {flash && (
        <JustSavedFlash
          key={flash.key}
          masked_suffix={flash.masked_suffix}
          length={flash.length}
          action={flash.action}
          was_update={flash.was_update}
          was_env_fallback={flash.was_env_fallback}
        />
      )}
      {status?.has_value && (
        <RotationHistoryRow secretName={secretName} refreshKey={rotationRefreshKey} />
      )}
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}

      <RotateSecretConfirmDialog
        open={rotateConfirmOpen}
        onOpenChange={(open) => {
          if (!saving) {
            setRotateConfirmOpen(open);
            if (!open) setRotateConfirmError(null);
          }
        }}
        secretName={secretName}
        currentSuffix={status?.masked_suffix ?? null}
        currentLength={status?.length ?? null}
        newSuffix={value.slice(-4)}
        newLength={value.length}
        loading={saving}
        errorMessage={rotateConfirmError}
        onConfirm={handleConfirmedRotate}
      />
    </div>
  );
}
