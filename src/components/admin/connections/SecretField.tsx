import { useMemo, useRef, useState } from "react";
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
  type SecretError,
  type SecretMutationResult,
} from "@/hooks/useSecretsManager";
import { JustSavedFlash } from "./JustSavedFlash";
import { RotationHistoryRow } from "./RotationHistoryRow";
import { RotateSecretConfirmDialog } from "./RotateSecretConfirmDialog";

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

function describeError(err: SecretError, secretName: string): string {
  const msg = (err.message || "").toLowerCase();
  switch (err.code) {
    case "forbidden":
      return "Apenas administradores podem alterar esta credencial.";
    case "not_whitelisted":
      return `O nome "${secretName}" não está na lista permitida de credenciais.`;
    case "invalid_value":
      return "O valor precisa ter pelo menos 4 caracteres.";
    case "db_error":
      return `Falha ao gravar no banco: ${err.message}`;
    default:
      if (msg.includes("not allowed") || msg.includes("forbidden")) {
        return "Apenas administradores podem alterar esta credencial.";
      }
      if (msg.includes("whitelist") || msg.includes("não permitido")) {
        return `O nome "${secretName}" não está na lista permitida.`;
      }
      if (msg.includes("network") || msg.includes("failed to fetch")) {
        return "Falha de rede. Verifique sua conexão e tente novamente.";
      }
      return err.message || "Erro desconhecido ao salvar credencial.";
  }
}

interface FlashState {
  masked_suffix: string | null;
  length: number;
  action: "set" | "rotate";
  was_update: boolean;
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
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<"set" | "rotate">("set");
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<FlashState | null>(null);
  const [rotationRefreshKey, setRotationRefreshKey] = useState(0);
  const flashCounter = useRef(0);

  // Rotation confirm modal
  const [rotateConfirmOpen, setRotateConfirmOpen] = useState(false);
  const [rotateConfirmError, setRotateConfirmError] = useState<string | null>(null);

  const performSave = async (currentMode: "set" | "rotate", currentValue: string, notes?: string) => {
    const toastId = `secret-${secretName}-${Date.now()}`;
    const slowTimer = setTimeout(() => {
      toast.loading(
        currentMode === "rotate" ? `Rotacionando ${secretName}…` : `Salvando ${secretName}…`,
        { id: toastId },
      );
    }, 800);

    let result: SecretMutationResult;
    try {
      result =
        currentMode === "rotate"
          ? await rotateSecret(secretName, currentValue, notes)
          : await setSecret(secretName, currentValue);
    } catch (err) {
      result = {
        ok: false,
        error: { code: "unexpected", message: err instanceof Error ? err.message : "Erro inesperado" },
      };
    }
    clearTimeout(slowTimer);

    if (!result.ok || !result.secret) {
      const err = result.error ?? { code: "unexpected", message: "Erro desconhecido" };
      const description = describeError(err, secretName);
      toast.error(`Falha ao salvar ${secretName}`, {
        id: toastId,
        description,
        duration: 7000,
        action: {
          label: "Tentar novamente",
          onClick: () => {
            setMode(currentMode);
            setValue(currentValue);
            setEditing(true);
          },
        },
      });
      return { ok: false as const, errorDescription: description };
    }

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
      key: flashCounter.current,
    });

    if (currentMode === "rotate") {
      setRotationRefreshKey((k) => k + 1);
    }

    setValue("");
    setEditing(false);
    setMode("set");
    onSaved?.();
    return { ok: true as const };
  };

  const handleSave = async () => {
    if (!value || value.length < 4 || saving) return;

    // Rotação passa pelo modal de confirmação
    if (mode === "rotate") {
      setRotateConfirmError(null);
      setRotateConfirmOpen(true);
      return;
    }

    setSaving(true);
    await performSave("set", value);
    setSaving(false);
  };

  const handleConfirmedRotate = async (notes?: string) => {
    if (!value || value.length < 4) return;
    setSaving(true);
    setRotateConfirmError(null);
    const res = await performSave("rotate", value, notes);
    setSaving(false);
    if (res.ok) {
      setRotateConfirmOpen(false);
    } else {
      setRotateConfirmError(res.errorDescription);
    }
  };

  const startEdit = (m: "set" | "rotate") => { setMode(m); setEditing(true); };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {status?.has_value && !editing && (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Check className="h-3 w-3 text-success" />
            ••••{status.masked_suffix} ({status.length} chars)
            {status.updated_at && (
              <span className="opacity-70">
                · atualizado {formatRelative(status.updated_at)}
              </span>
            )}
            {status.source === "env" && (
              <span className="opacity-70" title="Valor herdado de variável de ambiente; salve novamente para migrar para o banco.">· env</span>
            )}
          </span>
        )}
      </div>
      {editing ? (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={show ? "text" : "password"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={mode === "rotate" ? `Novo valor para ${secretName}…` : `Cole o valor de ${secretName}…`}
              autoFocus
              disabled={saving}
            />
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
          <Button size="sm" onClick={handleSave} disabled={saving || value.length < 4}>
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
            onClick={() => { setEditing(false); setValue(""); setMode("set"); }}
            disabled={saving}
          >
            Cancelar
          </Button>
        </div>
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
