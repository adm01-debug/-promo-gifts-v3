/**
 * Diálogo de rotação de chave MCP.
 *
 * - Cria uma nova chave duplicando nome+escopos+expiração da fonte via
 *   edge function `mcp-keys-rotate`.
 * - Para chaves FULL (`*`), re-exige justificativa + frase
 *   `CONCEDER FULL`, espelhando a fricção da emissão original.
 * - Exibe a chave plana UMA vez após sucesso.
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, ShieldAlert, Copy, Key } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  FULL_SCOPE_CONFIRMATION,
  FULL_SCOPE_MIN_JUSTIFICATION,
} from "@/lib/mcp/scopes";
import type { McpKeyRow } from "./useMcpKeys";

interface Props {
  source: McpKeyRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRotated: () => void;
}

export function RotateMcpKeyDialog({ source, open, onOpenChange, onRotated }: Props) {
  const [justification, setJustification] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generated, setGenerated] = useState<string | null>(null);

  const reset = () => {
    setJustification("");
    setConfirmation("");
    setGenerated(null);
    setSubmitting(false);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const submit = async () => {
    if (!source) return;
    if (source.is_full) {
      if (justification.trim().length < FULL_SCOPE_MIN_JUSTIFICATION) {
        toast.error(`Justificativa precisa de ao menos ${FULL_SCOPE_MIN_JUSTIFICATION} caracteres.`);
        return;
      }
      if (confirmation !== FULL_SCOPE_CONFIRMATION) {
        toast.error(`Digite "${FULL_SCOPE_CONFIRMATION}" para confirmar.`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("mcp-keys-rotate", {
        body: {
          source_key_id: source.id,
          justification: source.is_full ? justification.trim() : null,
          confirmation_phrase: source.is_full ? confirmation : null,
        },
      });
      if (error) {
        toast.error("Falha ao rotacionar", { description: error.message });
        return;
      }
      if (!data?.ok || !data?.key) {
        toast.error("Servidor recusou a rotação", { description: data?.message ?? "" });
        return;
      }
      setGenerated(data.key as string);
      toast.success("Chave rotacionada — antiga ainda ativa, revogue manualmente quando seguro");
      onRotated();
    } finally {
      setSubmitting(false);
    }
  };

  const copy = (s: string) => {
    navigator.clipboard.writeText(s);
    toast.success("Copiado!");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" /> Rotacionar chave MCP
          </DialogTitle>
          <DialogDescription>
            {source && (
              <>
                Será criada uma <strong>nova chave</strong> com nome{" "}
                <code className="font-mono text-xs">{source.name} (rotacionada)</code>,
                mesmos escopos e expiração da original. A chave antiga{" "}
                <strong>continua ativa</strong> — revogue manualmente quando o
                cliente concluir a migração.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {generated ? (
          <div className="space-y-3">
            <Alert>
              <Key className="h-4 w-4" />
              <AlertTitle>Nova chave gerada</AlertTitle>
              <AlertDescription>
                Copie agora — esta é a única vez que será exibida em texto puro.
              </AlertDescription>
            </Alert>
            <div className="p-3 rounded-md bg-muted font-mono text-xs break-all">
              {generated}
            </div>
            <Button onClick={() => copy(generated)} className="w-full">
              <Copy className="h-4 w-4 mr-1" /> Copiar chave
            </Button>
            <Button variant="outline" onClick={() => handleOpenChange(false)} className="w-full">
              Fechar
            </Button>
          </div>
        ) : source ? (
          <div className="space-y-4">
            {source.is_full && (
              <>
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Chave FULL — fricção adicional obrigatória</AlertTitle>
                  <AlertDescription>
                    Rotacionar uma chave com escopo <code className="font-mono">*</code>{" "}
                    cria outra chave full. Justificativa e confirmação explícita
                    são obrigatórias.
                  </AlertDescription>
                </Alert>

                <div>
                  <Label htmlFor="rot-just">
                    Justificativa <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="rot-just"
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Ex: Substituindo chave antiga por suspeita de exposição em log."
                    rows={3}
                    maxLength={1000}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {justification.length}/{FULL_SCOPE_MIN_JUSTIFICATION} mínimo —
                    registrada no audit log.
                  </p>
                </div>

                <div>
                  <Label htmlFor="rot-confirm">
                    Confirmação <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="rot-confirm"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    placeholder={`Digite "${FULL_SCOPE_CONFIRMATION}"`}
                    className="font-mono"
                  />
                </div>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={submit} disabled={submitting}>
                <RefreshCw className="h-4 w-4 mr-1" />
                {submitting ? "Rotacionando…" : "Rotacionar"}
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
