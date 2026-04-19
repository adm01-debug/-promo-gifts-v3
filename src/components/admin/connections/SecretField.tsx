import { useState } from "react";
import { Eye, EyeOff, Save, RefreshCw, Check, RotateCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSecretsManager, type SecretStatus } from "@/hooks/useSecretsManager";

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

  const handleSave = async () => {
    if (!value || value.length < 4) return;
    setSaving(true);
    if (mode === "rotate") await rotateSecret(secretName, value);
    else await setSecret(secretName, value);
    setSaving(false);
    setValue("");
    setEditing(false);
    setMode("set");
    onSaved?.();
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
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={show ? "Ocultar" : "Mostrar"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving || value.length < 4}>
            <Save className="h-4 w-4 mr-1" /> {mode === "rotate" ? "Rotacionar" : "Salvar"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setValue(""); setMode("set"); }}>
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
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}
