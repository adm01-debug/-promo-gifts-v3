import { AlertCircle, Check, CheckCircle2, Eye, EyeOff, Loader2, RefreshCw, RotateCw, Save, ShieldAlert, Sparkles, ArrowDownToLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { type SecretStatus } from "@/hooks/useSecretsManager";

import { useSecretField } from "./useSecretField";
import { buildUpdatedTooltip } from "./SecretField.utils";
import { formatMaskedSuffix } from "@/lib/masked-suffix";
import { MaskedSuffixBadge } from "./MaskedSuffixBadge";
import { JustSavedFlash } from "./JustSavedFlash";
import { RotationHistoryRow } from "./RotationHistoryRow";
import { CredentialSourceBadge } from "./CredentialSourceBadge";
import { SecretImpactTooltip } from "./SecretImpactTooltip";
import { useCredentialsSourceFilter } from "./CredentialsSourceFilterContext";
import { RotateSecretConfirmDialog } from "./RotateSecretConfirmDialog";
import { SaveSecretConfirmDialog } from "./SaveSecretConfirmDialog";
import { SecretErrorAlert } from "./SecretErrorAlert";
import { ErrorDetailsDialog } from "./ErrorDetailsDialog";
import { ConnectionTestDetailsDialog } from "./ConnectionTestDetailsDialog";

interface Props {
  label: string;
  secretName: string;
  status?: SecretStatus;
  helperText?: string;
  onSaved?: () => void;
  connectionId?: string;
}

export function SecretField({ label, secretName, status, helperText, onSaved, connectionId }: Props) {
  const { matchesFilter, filter } = useCredentialsSourceFilter();
  const logic = useSecretField({ secretName, status, connectionId, onSaved });
  
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
          <SecretImpactTooltip secretName={secretName} isMissing={!status?.has_value}>
            <Label className="text-sm font-medium cursor-help">{label}</Label>
          </SecretImpactTooltip>
          <CredentialSourceBadge status={status} />
          {logic.storedLooksSuspicious && (
            <div className="flex items-center gap-1 text-[10px] text-destructive font-semibold animate-pulse">
              <ShieldAlert className="h-3 w-3" />
              VALOR SUSPEITO
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {logic.lastError && (
            <div className="flex items-center gap-1.5 text-xs text-destructive font-medium animate-in fade-in slide-in-from-right-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {logic.lastError.title}
            </div>
          )}
          {!logic.editing && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs gap-1.5 hover:bg-primary/10"
                onClick={() => logic.startEdit("set")}
              >
                <Save className="h-3.5 w-3.5" />
                Alterar
              </Button>
              {status?.has_value && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5 text-xs gap-1.5 hover:bg-primary/10 text-primary"
                  onClick={() => logic.startEdit("rotate")}
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  Rotacionar
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="relative group/field">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 group">
            <Input
              type={logic.show ? "text" : "password"}
              placeholder={logic.editing ? `Cole o novo valor para ${secretName}...` : "••••••••••••••••"}
              value={logic.editing ? logic.value : ""}
              onChange={(e) => logic.setValue(e.target.value)}
              onPaste={logic.handlePaste}
              onBlur={logic.handleBlur}
              disabled={!logic.editing || logic.saving}
              className={cn(
                "h-9 pr-24 font-mono text-sm transition-all duration-200 border-border/40 bg-muted/20",
                logic.editing && "border-primary/40 bg-background ring-1 ring-primary/10",
                !logic.editing && status?.has_value && "text-muted-foreground/60 cursor-default",
                logic.lastError && "border-destructive/50 ring-destructive/10"
              )}
            />
            
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              {!logic.editing && status?.has_value && (
                <MaskedSuffixBadge
                  suffix={status.masked_suffix}
                  length={status.length}
                  tooltip={buildUpdatedTooltip(status.updated_at, status.updated_by_email, status.updated_by_id)}
                />
              )}
              
              {logic.editing && (
                <button
                  type="button"
                  onClick={() => logic.setShow(!logic.show)}
                  className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                >
                  {logic.show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>

            {logic.flash && (
              <div className="absolute inset-0 pointer-events-none">
                <JustSavedFlash
                  key={logic.flash.key}
                  masked_suffix={logic.flash.masked_suffix}
                  length={logic.flash.length}
                  action={logic.flash.action}
                  was_update={logic.flash.was_update}
                  was_env_fallback={logic.flash.was_env_fallback}
                />
              </div>
            )}
          </div>

          {logic.editing && (
            <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
              <Button
                size="sm"
                className="h-9 px-3 gap-1.5 shadow-sm"
                onClick={logic.handleSave}
                disabled={!logic.canSave}
                title={logic.saveDisabledReason ?? undefined}
              >
                {logic.saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : logic.mode === "rotate" ? (
                  <RotateCw className="h-3.5 w-3.5" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                {logic.mode === "rotate" ? "Rotacionar" : "Salvar"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 text-muted-foreground hover:text-foreground"
                onClick={() => logic.setEditing(false)}
                disabled={logic.saving}
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>

        {logic.lastNormalization && (
          <div className="absolute -bottom-5 left-0 flex items-center gap-1.5 text-[10px] text-primary font-medium animate-in fade-in slide-in-from-top-1">
            <Sparkles className="h-3 w-3" />
            Normalizado: {logic.lastNormalization.join(", ")}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {helperText && !logic.lastError && (
          <p className="text-xs text-muted-foreground/80 flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {helperText}
          </p>
        )}

        {logic.lastError && (
          <SecretErrorAlert
            error={logic.lastError}
            onViewDetails={logic.detailsAvailable ? () => logic.setDetailsOpen(true) : undefined}
          />
        )}

        <RotationHistoryRow secretName={secretName} refreshKey={logic.rotationRefreshKey} />
      </div>

      <RotateSecretConfirmDialog
        open={logic.rotateConfirmOpen}
        onOpenChange={logic.setRotateConfirmOpen}
        secretName={secretName}
        onConfirm={logic.handleConfirmedRotate}
        isLoading={logic.saving}
        error={logic.rotateConfirmError}
      />

      <SaveSecretConfirmDialog
        open={logic.saveConfirmOpen}
        onOpenChange={logic.setSaveConfirmOpen}
        secretName={secretName}
        onConfirm={logic.handleConfirmedSave}
        isLoading={logic.saving}
        error={logic.saveConfirmError}
      />

      {logic.detailsAvailable && (
        <ConnectionTestDetailsDialog
          open={logic.detailsOpen}
          onOpenChange={logic.setDetailsOpen}
          state={logic.testDetailsState}
        />
      )}
    </div>
  );
}
