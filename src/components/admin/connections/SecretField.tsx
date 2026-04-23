import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, CheckCircle2, Eye, EyeOff, Loader2, RefreshCw, RotateCw, Save, ShieldAlert, Sparkles } from "lucide-react";
import { validateSecret, getMinLength, MIN_SUFFIX_LENGTH } from "./secretValidators";
import { formatMaskedSuffix, normalizeMaskedSuffix, diagnoseMaskedSuffix } from "@/lib/masked-suffix";
import { MaskedSuffixBadge } from "./MaskedSuffixBadge";
import { normalizeSecret } from "./secretNormalizers";
import { validateSecretName } from "./secretWhitelist";
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
import { CredentialSourceBadge } from "./CredentialSourceBadge";
import { useCredentialsSourceFilter } from "./CredentialsSourceFilterContext";
import { ArrowDownToLine } from "lucide-react";
import { RotateSecretConfirmDialog } from "./RotateSecretConfirmDialog";
import { SaveSecretConfirmDialog } from "./SaveSecretConfirmDialog";
import { withRetryBackoff, CancelledError } from "./secretRetry";
import { normalizeSecretError, type NormalizedSecretError } from "./secretErrors";
import { SecretErrorAlert } from "./SecretErrorAlert";
import { ErrorDetailsDialog } from "./ErrorDetailsDialog";
import { useConnectionTestDetails } from "@/hooks/useConnectionTestDetails";
import type { ConnectionType } from "@/hooks/useConnectionTester";

/**
 * Mapeia o `connectionId` (curto, usado nas abas) para a `ConnectionType`
 * + `env_key` que o backend de testes entende. Retorna `null` quando não há
 * mapeamento conhecido — nesse caso o link "Ver detalhes" não é exibido.
 */
function mapConnectionToTester(
  connectionId: string | undefined,
): { type: ConnectionType; envKey?: "promobrind" | "crm" } | null {
  if (!connectionId) return null;
  if (connectionId === "n8n") return { type: "n8n" };
  if (connectionId === "bitrix24") return { type: "bitrix24" };
  if (connectionId === "mcp") return { type: "mcp" };
  if (connectionId === "promobrind" || connectionId === "crm") {
    return { type: "supabase", envKey: connectionId };
  }
  return null;
}

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

/**
 * Timestamp completo em PT-BR no padrão "dd/mm/aaaa, HH:MM:SS (GMT-3)".
 * Inclui o offset do fuso para deixar claro qual horário o usuário está vendo.
 */
function formatFullPtBr(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
  return fmt.format(date);
}

/**
 * Monta o tooltip multi-linha de "última atualização" com autor + timestamp.
 *
 * Regras de fallback do autor (em ordem):
 *  1. `updatedByEmail` resolvido → exibe o e-mail.
 *  2. Existe `updatedById` mas o e-mail não pôde ser resolvido (admin removido,
 *     sem permissão de leitura em `auth.users`, ou e-mail nulo) → "equipe"
 *     com o sufixo curto do UUID para rastreabilidade ("equipe (#a1b2c3d4)").
 *  3. Nenhum `updatedById` (credencial veio só de ENV / sem autor registrado)
 *     → "sistema (sem autor registrado)".
 */
function buildUpdatedTooltip(
  updatedAt: string | null | undefined,
  updatedByEmail: string | null | undefined,
  updatedById?: string | null | undefined,
): string | undefined {
  if (!updatedAt) return undefined;
  let author: string;
  if (updatedByEmail) {
    author = updatedByEmail;
  } else if (updatedById) {
    const shortId = updatedById.slice(0, 8);
    author = `equipe (#${shortId})`;
  } else {
    author = "sistema (sem autor registrado)";
  }
  const lines = [
    `Última atualização: ${formatFullPtBr(updatedAt)}`,
    `Autor: ${author}`,
  ];
  return lines.join("\n");
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
  /**
   * Escopo opcional do rascunho (sessionStorage). Quando informado, o
   * rascunho é isolado por conexão — assim o mesmo `secretName`
   * (ex: BITRIX24_TOKEN) usado em conexões diferentes mantém valores
   * digitados separados ao navegar entre abas/cards. Se omitido, cai no
   * escopo legado global do secret (`_:secretName`).
   */
  connectionId?: string;
}

export function SecretField({ label, secretName, status, helperText, onSaved, connectionId }: Props) {
  const { setSecret, rotateSecret } = useSecretsManager();
  const draftScope = connectionId ?? "_";
  const draftKey = `secret-draft:${draftScope}:${secretName}`;
  // Chaves legadas (versões anteriores escreviam sem escopo de conexão).
  // Lidas como fallback para não perder rascunhos já em andamento.
  const legacyDraftKey = `secret-draft:${secretName}`;
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<"set" | "rotate">("set");
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<FlashState | null>(null);
  const [rotationRefreshKey, setRotationRefreshKey] = useState(0);
  const [lastError, setLastError] = useState<NormalizedSecretError | null>(null);
  const flashCounter = useRef(0);
  const [lastNormalization, setLastNormalization] = useState<string[] | null>(null);
  const normTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Confirmation modals (declared early so the secretName-swap effect below
  // can close them when the prop changes mid-flow)
  const [rotateConfirmOpen, setRotateConfirmOpen] = useState(false);
  const [rotateConfirmError, setRotateConfirmError] = useState<string | null>(null);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [saveConfirmError, setSaveConfirmError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  // Cancellation for in-flight retries (declared early for the same reason)
  const abortRef = useRef<AbortController | null>(null);

  const testerMap = useMemo(() => mapConnectionToTester(connectionId), [connectionId]);
  const testDetailsState = useConnectionTestDetails({
    open: detailsOpen && !!testerMap,
    type: testerMap?.type ?? "n8n",
    envKey: testerMap?.envKey,
    connectionId,
  });
  const detailsAvailable = !!testerMap;
  const handleViewDetails = detailsAvailable ? () => setDetailsOpen(true) : undefined;


  const showNormalization = (changes: string[]) => {
    if (changes.length === 0) return;
    setLastNormalization(changes);
    if (normTimerRef.current) clearTimeout(normTimerRef.current);
    normTimerRef.current = setTimeout(() => setLastNormalization(null), 4000);
    toast.info("Valor normalizado", {
      id: `paste-norm-${secretName}`,
      description: changes.join(", "),
      duration: 3500,
    });
  };

  useEffect(() => {
    return () => {
      if (normTimerRef.current) clearTimeout(normTimerRef.current);
    };
  }, []);

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const raw = e.clipboardData.getData("text");
    if (!raw) return;
    e.preventDefault();
    const { value: normalized, changes } = normalizeSecret(secretName, raw);
    setValue(normalized);
    if (lastError) setLastError(null);
    showNormalization(changes);
  };

  const handleBlur = () => {
    if (!value) return;
    const { value: normalized, changes } = normalizeSecret(secretName, value);
    if (normalized !== value) {
      setValue(normalized);
      showNormalization(changes);
    }
  };

  // Reset transient state and re-hydrate the draft whenever the secretName
  // OR connectionId changes — guarantees validation, button-enabled state,
  // error/normalization banners and stored draft all match the NEW
  // (secret, connection) tuple instead of leaking from the previous one.
  const prevScopeKeyRef = useRef<string>(`${draftScope}:${secretName}`);
  useEffect(() => {
    const scopeKey = `${draftScope}:${secretName}`;
    const prev = prevScopeKeyRef.current;
    const isFirstMount = prev === scopeKey && !abortRef.current;

    // On a real swap (secret OR connection changed), abort any in-flight
    // save and clear transient UI.
    if (prev !== scopeKey) {
      abortRef.current?.abort();
      abortRef.current = null;
      setValue("");
      setEditing(false);
      setMode("set");
      setShow(false);
      setSaving(false);
      setLastError(null);
      setLastNormalization(null);
      if (normTimerRef.current) {
        clearTimeout(normTimerRef.current);
        normTimerRef.current = null;
      }
      setRotateConfirmOpen(false);
      setRotateConfirmError(null);
      setSaveConfirmOpen(false);
      setSaveConfirmError(null);
      // flash is suffix-bound to the previous secret — drop it
      setFlash(null);
      prevScopeKeyRef.current = scopeKey;
    }

    // Re-hydrate draft for the (new or initial) secret/connection. Tenta a
    // chave escopada primeiro; se vazia, faz fallback para a chave legada
    // (sem connectionId) para preservar rascunhos antigos. Após hidratar de
    // legado, migra para a nova chave e remove a antiga.
    try {
      const scopedRaw = sessionStorage.getItem(draftKey);
      const raw = scopedRaw ?? sessionStorage.getItem(legacyDraftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as { value?: string; mode?: "set" | "rotate" };
      if (draft.value && typeof draft.value === "string") {
        setValue(draft.value);
        setMode(draft.mode === "rotate" ? "rotate" : "set");
        setEditing(true);
        if (!scopedRaw) {
          // Migra rascunho legado para a chave escopada.
          try {
            sessionStorage.setItem(draftKey, raw);
            sessionStorage.removeItem(legacyDraftKey);
          } catch { /* ignore quota */ }
        }
      }
    } catch { /* ignore parse errors */ }
    void isFirstMount;
  }, [secretName, draftKey, legacyDraftKey]);

  // Persist draft whenever editing with a non-empty value; clear on success/cancel
  useEffect(() => {
    if (editing && value.length > 0) {
      try { sessionStorage.setItem(draftKey, JSON.stringify({ value, mode })); } catch { /* ignore quota */ }
    } else {
      try { sessionStorage.removeItem(draftKey); } catch { /* ignore */ }
    }
  }, [editing, value, mode, draftKey]);




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
    const suffix = normalizeMaskedSuffix(secret.masked_suffix);
    const length = secret.length ?? currentValue.length;

    if (currentMode === "rotate") {
      toast.success("Rotação concluída", {
        id: toastId,
        description: `${secretName}: ${formatMaskedSuffix(previous_suffix)} → ${formatMaskedSuffix(suffix)} (${length} chars · registrado no log)`,
        duration: 5000,
      });
    } else if (was_update) {
      toast.success("Credencial atualizada", {
        id: toastId,
        description: `${secretName} agora termina em ${formatMaskedSuffix(suffix)} (${length} chars)`,
        duration: 5000,
      });
    } else {
      toast.success("Credencial salva", {
        id: toastId,
        description: `${secretName} agora termina em ${formatMaskedSuffix(suffix)} (${length} chars)`,
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

  const nameValidation = useMemo(() => validateSecretName(secretName), [secretName]);
  const validation = useMemo(() => validateSecret(secretName, value), [secretName, value]);
  const suffixGuardOk = value.length === 0 || value.length >= MIN_SUFFIX_LENGTH;
  const canSave =
    !saving && nameValidation.ok && value.length > 0 && suffixGuardOk && validation.ok;
  const saveDisabledReason = saving
    ? null
    : !nameValidation.ok
      ? nameValidation.message ?? "Nome de credencial não permitido"
      : value.length === 0
        ? "Cole um valor antes de salvar"
        : !suffixGuardOk
          ? `Sufixo inválido — mínimo ${MIN_SUFFIX_LENGTH} caracteres (tem ${value.length})`
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
    setSaveConfirmError(null);
    setSaveConfirmOpen(true);
  };

  const handleConfirmedSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveConfirmError(null);
    const res = await performSave("set", value);
    setSaving(false);
    if (res.ok) {
      setSaveConfirmOpen(false);
    } else if (!res.cancelled) {
      setSaveConfirmError(res.errorDescription);
    }
  };

  const handleConfirmedRotate = async (notes?: string) => {
    if (!value || !validation.ok || !nameValidation.ok) return;
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

  const { matchesFilter, filter } = useCredentialsSourceFilter();
  const fadeOut = !matchesFilter(status);

  return (
    <div
      className={cn(
        "space-y-1.5 transition-opacity duration-200",
        fadeOut && "opacity-40 pointer-events-none",
      )}
      aria-hidden={fadeOut || undefined}
      data-source-filter={filter}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Label className="text-sm font-medium">{label}</Label>
          <CredentialSourceBadge status={status} />
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
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5 flex-wrap">
            <Check className="h-3 w-3 text-success" />
            <MaskedSuffixBadge suffix={status.masked_suffix} secretName={secretName} length={status.length} />
            <span>({status.length} chars)</span>
            {status.updated_at && (
              <span
                className="opacity-70"
                title={buildUpdatedTooltip(status.updated_at, status.updated_by_email, status.updated_by)}
              >
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
      {!nameValidation.ok && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-xs text-destructive"
        >
          <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <div className="min-w-0 space-y-0.5">
            <p className="font-medium">Nome de credencial não permitido</p>
            <p className="break-words">{nameValidation.message}</p>
            {nameValidation.hint && (
              <p className="text-muted-foreground break-words">{nameValidation.hint}</p>
            )}
          </div>
        </div>
      )}
      {editing ? (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={show ? "text" : "password"}
                value={value}
                onChange={(e) => { setValue(e.target.value); if (lastError) setLastError(null); }}
                onPaste={handlePaste}
                onBlur={handleBlur}
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
          {lastNormalization && lastNormalization.length > 0 && (
            <div
              className="inline-flex items-center gap-1.5 rounded-md border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] text-success animate-in fade-in duration-200"
              role="status"
            >
              <Sparkles className="h-3 w-3" />
              Valor ajustado: {lastNormalization.join(", ")}
            </div>
          )}
          {value.length > 0 && value.length < MIN_SUFFIX_LENGTH && (
            <div
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              data-testid="suffix-invalid-banner"
              tabIndex={-1}
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-xs text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
            >
              <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div className="min-w-0 space-y-0.5">
                <p className="font-medium">
                  Sufixo inválido — mínimo {MIN_SUFFIX_LENGTH} caracteres
                </p>
                <p className="break-words text-destructive/80">
                  O valor tem apenas {value.length} {value.length === 1 ? "caractere" : "caracteres"}. O sufixo mascarado exibido na UI (••••XXXX) precisa de pelo menos {MIN_SUFFIX_LENGTH} caracteres para identificar a credencial sem expor o segredo. Salvamento bloqueado.
                </p>
              </div>
            </div>
          )}
          {lastError && !saving && value.length >= MIN_SUFFIX_LENGTH && (
            <SecretErrorAlert
              error={lastError}
              onRetry={handleSave}
              retryDisabled={!canSave}
              onViewDetails={handleViewDetails}
              httpStatus={testDetailsState.details?.response.status ?? null}
              latencyMs={testDetailsState.details?.timing.latency_ms ?? null}
            />
          )}
          {value.length >= MIN_SUFFIX_LENGTH && !validation.ok && validation.message && (
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
        <>
          <div className="flex gap-2">
            <Input value={status?.has_value ? "•••••••••••••••••" : ""} placeholder="Não configurado" readOnly />
            <Button
              size="sm"
              variant="outline"
              onClick={() => startEdit("set")}
              disabled={!nameValidation.ok}
              title={!nameValidation.ok ? nameValidation.message : undefined}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {status?.has_value ? "Atualizar" : "Configurar"}
            </Button>
            {status?.has_value && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => startEdit("rotate")}
                disabled={!nameValidation.ok}
                title={!nameValidation.ok ? nameValidation.message : "Rotacionar (registra no log)"}
              >
                <RotateCw className="h-4 w-4 mr-1" /> Rotacionar
              </Button>
            )}
            {status?.source === "env" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => startEdit("set")}
                disabled={!nameValidation.ok}
                title="Migrar este valor da variável de ambiente para o banco. Você precisa colar o valor novamente — o frontend nunca lê plaintext de env por segurança."
                className="border-warning/40 bg-warning/5 text-warning hover:bg-warning/10 hover:text-warning"
              >
                <ArrowDownToLine className="h-4 w-4 mr-1" /> Migrar para o banco
              </Button>
            )}
          </div>
          {status?.source === "env" && !editing && (
            <p className="text-[11px] text-warning/90 flex items-start gap-1">
              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
              Valor herdado de variável de ambiente. Cole novamente em "Migrar para o banco" para habilitar rotação e auditoria.
            </p>
          )}
          {status?.has_value && (
            <div
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs animate-in fade-in duration-200"
              aria-live="polite"
            >
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                <MaskedSuffixBadge suffix={status.masked_suffix} secretName={secretName} length={status.length} showWhenValid />
                <span className="text-muted-foreground">
                  ({status.length ?? 0} {status.length === 1 ? "char" : "chars"})
                </span>
              </div>
              {status.updated_at && (
                <span
                  className="text-muted-foreground inline-flex items-center gap-1 shrink-0"
                  title={buildUpdatedTooltip(status.updated_at, status.updated_by_email)}
                >
                  Atualizado {formatRelative(status.updated_at)}
                </span>
              )}
            </div>
          )}
          {lastError && lastError.retryable && (
            <SecretErrorAlert
              error={lastError}
              retryLabel="Tentar novamente"
              onRetry={() => {
                // Reopen editing — useEffect on mount restores draft (value+mode)
                // from sessionStorage, so the user doesn't lose what was typed.
                setMode((m) => m);
                setEditing(true);
              }}
              onViewDetails={handleViewDetails}
              httpStatus={testDetailsState.details?.response.status ?? null}
              latencyMs={testDetailsState.details?.timing.latency_ms ?? null}
            />
          )}
        </>
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

      <SaveSecretConfirmDialog
        open={saveConfirmOpen}
        onOpenChange={(open) => {
          if (saving) return;
          setSaveConfirmOpen(open);
          if (!open) setSaveConfirmError(null);
        }}
        secretName={secretName}
        isUpdate={!!status?.has_value}
        currentSuffix={status?.masked_suffix ?? null}
        currentLength={status?.length ?? null}
        newSuffix={value.slice(-4)}
        newLength={value.length}
        loading={saving}
        errorMessage={saveConfirmError}
        onConfirm={handleConfirmedSave}
      />

      {detailsAvailable && lastError && (
        <ErrorDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          error={lastError}
          details={testDetailsState.details}
          loading={testDetailsState.loading}
        />
      )}
    </div>
  );
}
