import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, KeyRound, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { SecretMaskedDiff } from "./SecretMaskedDiff";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  secretName: string;
  /** When true → "atualizar" wording + diff preview; when false → "configurar" wording */
  isUpdate: boolean;
  currentSuffix: string | null;
  currentLength: number | null;
  newSuffix: string;
  newLength: number;
  loading: boolean;
  onConfirm: () => Promise<void> | void;
}

/**
 * Confirmation modal for saving (set/update) a sensitive credential.
 * Mirrors the look & tone of RotateSecretConfirmDialog but uses a
 * neutral "info" treatment since saving is less destructive than rotating.
 */
export function SaveSecretConfirmDialog({
  open,
  onOpenChange,
  secretName,
  isUpdate,
  currentSuffix,
  currentLength,
  newSuffix,
  newLength,
  loading,
  onConfirm,
}: Props) {
  const handleOpenChange = (next: boolean) => {
    if (loading) return;
    onOpenChange(next);
  };

  const verb = isUpdate ? "Atualizar" : "Salvar";
  const Icon = isUpdate ? KeyRound : ShieldCheck;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent
        className="max-w-lg"
        onEscapeKeyDown={(e) => loading && e.preventDefault()}
      >
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0 bg-primary/10"
            >
              <Icon className="w-6 h-6 text-primary" />
            </motion.div>
            <div className="space-y-1">
              <AlertDialogTitle className="text-lg">
                {verb} {secretName}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isUpdate
                  ? "Você está prestes a sobrescrever o valor atual desta credencial sensível."
                  : "Você está prestes a configurar esta credencial sensível pela primeira vez."}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {/* Diff preview (only when updating) */}
        {isUpdate && (
          <div className="my-2 rounded-lg border border-border bg-muted/50 p-4">
            <div className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
              <span className="text-muted-foreground">Valor atual:</span>
              <span className="font-mono">
                ••••{currentSuffix ?? "????"}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({currentLength ?? 0} chars)
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono">
                ••••{newSuffix || "????"}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({newLength} chars)
                </span>
              </span>
            </div>
          </div>
        )}

        {/* New-value preview (when configuring for the first time) */}
        {!isUpdate && (
          <div className="my-2 rounded-lg border border-border bg-muted/50 p-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">Novo valor:</span>
              <span className="font-mono">
                ••••{newSuffix || "????"}
                <span className="ml-2 text-xs text-muted-foreground">
                  ({newLength} chars)
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Impact */}
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h4 className="text-sm font-medium mb-2">Isto irá:</h4>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
              {isUpdate
                ? "Substituir imediatamente o valor em uso por todas as integrações"
                : "Ativar esta credencial para todas as integrações dependentes"}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
              Registrar a operação no histórico de auditoria
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
              {isUpdate
                ? "Invalidar o valor anterior — quem ainda usar a chave antiga falhará"
                : "Disparar verificação automática da nova chave"}
            </li>
          </ul>
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={() => onConfirm()} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Sim, {verb.toLowerCase()}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
