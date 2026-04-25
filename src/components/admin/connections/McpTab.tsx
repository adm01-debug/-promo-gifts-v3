import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plug, Copy, Trash2, Plus, Key, Github } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { ConnectionTestHistoryPanel } from "./ConnectionTestHistoryPanel";
import { SecretField } from "./SecretField";
import { useSecretsManager } from "@/hooks/useSecretsManager";

interface McpKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

const ALL_SCOPES = ["quotes:read", "orders:read", "crm:read", "products:read", "*"];

const MCP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mcp-server`;

export function McpTab() {
  const [keys, setKeys] = useState<McpKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["quotes:read"]);
  const [generated, setGenerated] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("mcp_api_keys")
      .select("*").order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar chaves", { description: error.message });
    else setKeys((data ?? []) as McpKey[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    if (!name.trim() || scopes.length === 0) {
      toast.error("Informe um nome e ao menos um escopo");
      return;
    }
    // Cliente gera chave forte localmente
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const plain = "mcp_" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    // Hash SHA-256 para armazenar
    const enc = new TextEncoder().encode(plain);
    const hashBuf = await crypto.subtle.digest("SHA-256", enc);
    const hash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Não autenticado"); return; }

    const { error } = await supabase.from("mcp_api_keys").insert({
      name: name.trim(),
      key_hash: hash,
      key_prefix: plain.slice(0, 12),
      scopes,
      created_by: u.user.id,
    });
    if (error) { toast.error("Falha ao salvar chave", { description: error.message }); return; }
    setGenerated(plain);
    setName(""); setScopes(["quotes:read"]);
    load();
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from("mcp_api_keys")
      .update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error("Erro ao revogar", { description: error.message });
    else { toast.success("Chave revogada"); load(); }
  };

  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copiado!"); };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-primary" />
            <CardTitle>Servidor MCP</CardTitle>
          </div>
          <CardDescription>
            Endpoint público compatível com o Model Context Protocol (Claude Desktop, outros projetos Lovable).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Endpoint</Label>
            <div className="flex gap-2 mt-1">
              <Input value={MCP_URL} readOnly className="font-mono text-xs" />
              <Button size="sm" variant="outline" onClick={() => copy(MCP_URL)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Autentique enviando o header <code className="bg-muted px-1 rounded">X-MCP-Key</code> com sua chave.
            </p>
          </div>
          <ConnectionTestHistoryPanel type="mcp" label="Servidor MCP" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Chaves emitidas</CardTitle>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setGenerated(null); }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova chave</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Gerar nova chave MCP</DialogTitle>
                  <DialogDescription>
                    A chave será exibida apenas uma vez. Guarde-a em local seguro.
                  </DialogDescription>
                </DialogHeader>
                {generated ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-md bg-muted font-mono text-xs break-all">{generated}</div>
                    <Button onClick={() => copy(generated)} className="w-full">
                      <Copy className="h-4 w-4 mr-1" /> Copiar
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <Label>Nome</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Claude Desktop - Pedro" />
                    </div>
                    <div>
                      <Label className="block mb-2">Escopos</Label>
                      <div className="flex flex-wrap gap-2">
                        {ALL_SCOPES.map((s) => {
                          const active = scopes.includes(s);
                          return (
                            <button key={s} type="button"
                              onClick={() => setScopes((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s])}
                              className={`px-2 py-1 rounded text-xs border ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border"}`}>
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  {!generated && <Button onClick={generate}><Key className="h-4 w-4 mr-1" /> Gerar</Button>}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma chave emitida.</p>
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center justify-between p-3 border border-border rounded-md">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{k.name}</span>
                      <code className="text-xs text-muted-foreground">{k.key_prefix}…</code>
                      {k.revoked_at && <Badge variant="destructive" className="text-xs">Revogada</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {k.scopes.map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                    </div>
                  </div>
                  {!k.revoked_at && (
                    <Button size="sm" variant="ghost" onClick={() => revoke(k.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
