import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Loader2,
  Save,
  History,
  Plus,
  Brain,
  TestTube,
  Clock,
  Sparkles,
  RotateCcw,
  Eye,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PromptConfig {
  id: string;
  config_key: string;
  label: string;
  prompt_text: string;
  ai_model: string;
  is_active: boolean;
  technique_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

interface PromptHistory {
  id: string;
  config_id: string;
  version: number;
  prompt_text: string;
  ai_model: string;
  changed_by: string | null;
  changed_at: string;
  change_notes: string | null;
}

interface Technique {
  id: string;
  name: string;
  code: string | null;
}

const AI_MODELS = [
  { value: "google/gemini-2.5-flash-image-preview", label: "Gemini 2.5 Flash Image", description: "Rápido e econômico" },
  { value: "google/gemini-3-pro-image-preview", label: "Gemini 3 Pro Image", description: "Maior qualidade, mais lento" },
];

export function MockupPromptManager() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<PromptConfig[]>([]);
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editedPrompts, setEditedPrompts] = useState<Record<string, { prompt_text: string; ai_model: string }>>({});
  const [historyDialog, setHistoryDialog] = useState<{ configId: string; label: string } | null>(null);
  const [history, setHistory] = useState<PromptHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [changeNotes, setChangeNotes] = useState<Record<string, string>>({});
  const [addTechniqueDialog, setAddTechniqueDialog] = useState(false);
  const [selectedTechnique, setSelectedTechnique] = useState<string>("");
  const [testDialog, setTestDialog] = useState<{ configId: string; label: string } | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [configsRes, techRes] = await Promise.all([
        supabase.from("mockup_prompt_configs").select("*").order("config_key"),
        supabase.from("personalization_techniques").select("id, name, code").eq("is_active", true),
      ]);

      if (configsRes.error) throw configsRes.error;
      if (techRes.error) throw techRes.error;

      setConfigs((configsRes.data || []) as PromptConfig[]);
      setTechniques(techRes.data || []);
    } catch (err: unknown) {
      toast.error("Erro ao carregar configurações", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setIsLoading(false);
    }
  };

  const getEditedValue = (config: PromptConfig) => {
    return editedPrompts[config.id] || { prompt_text: config.prompt_text, ai_model: config.ai_model };
  };

  const hasChanges = (config: PromptConfig) => {
    const edited = editedPrompts[config.id];
    if (!edited) return false;
    return edited.prompt_text !== config.prompt_text || edited.ai_model !== config.ai_model;
  };

  const handleSave = async (config: PromptConfig) => {
    const edited = getEditedValue(config);
    if (!hasChanges(config)) return;

    setSavingId(config.id);
    try {
      // Save history
      const { error: histError } = await supabase.from("mockup_prompt_history").insert({
        config_id: config.id,
        version: config.version,
        prompt_text: config.prompt_text,
        ai_model: config.ai_model,
        changed_by: user?.id,
        change_notes: changeNotes[config.id] || null,
      });
      if (histError) throw histError;

      // Update config
      const { error } = await supabase
        .from("mockup_prompt_configs")
        .update({
          prompt_text: edited.prompt_text,
          ai_model: edited.ai_model,
          version: config.version + 1,
          updated_by: user?.id,
        })
        .eq("id", config.id);

      if (error) throw error;

      toast.success(`Prompt "${config.label}" salvo (v${config.version + 1})`);
      setEditedPrompts((prev) => {
        const next = { ...prev };
        delete next[config.id];
        return next;
      });
      setChangeNotes((prev) => {
        const next = { ...prev };
        delete next[config.id];
        return next;
      });
      fetchAll();
    } catch (err: unknown) {
      toast.error("Erro ao salvar", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSavingId(null);
    }
  };

  const openHistory = async (configId: string, label: string) => {
    setHistoryDialog({ configId, label });
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("mockup_prompt_history")
        .select("*")
        .eq("config_id", configId)
        .order("version", { ascending: false });

      if (error) throw error;
      setHistory((data || []) as PromptHistory[]);
    } catch (err: unknown) {
      toast.error("Erro ao carregar histórico");
    } finally {
      setHistoryLoading(false);
    }
  };

  const restoreVersion = (entry: PromptHistory) => {
    if (!historyDialog) return;
    setEditedPrompts((prev) => ({
      ...prev,
      [historyDialog.configId]: { prompt_text: entry.prompt_text, ai_model: entry.ai_model },
    }));
    setChangeNotes((prev) => ({
      ...prev,
      [historyDialog.configId]: `Restaurado da versão ${entry.version}`,
    }));
    setHistoryDialog(null);
    toast.info(`Versão ${entry.version} carregada. Clique em Salvar para confirmar.`);
  };

  const handleAddTechniquePrompt = async () => {
    if (!selectedTechnique) return;
    const tech = techniques.find((t) => t.id === selectedTechnique);
    if (!tech) return;

    const configKey = `technique_${tech.id}`;
    const existing = configs.find((c) => c.config_key === configKey);
    if (existing) {
      toast.error("Já existe um prompt para essa técnica");
      return;
    }

    try {
      const { error } = await supabase.from("mockup_prompt_configs").insert({
        config_key: configKey,
        label: `Prompt: ${tech.name}`,
        prompt_text: `Apply the logo using ${tech.name} technique. The result should look realistic with proper ${tech.name.toLowerCase()} texture and finish on the product surface.`,
        ai_model: "google/gemini-2.5-flash-image-preview",
        technique_id: tech.id,
        created_by: user?.id,
      });

      if (error) throw error;
      toast.success(`Prompt para "${tech.name}" criado`);
      setAddTechniqueDialog(false);
      setSelectedTechnique("");
      fetchAll();
    } catch (err: any) {
      toast.error("Erro ao criar prompt", { description: err.message });
    }
  };

  const handleTest = async (config: PromptConfig) => {
    const edited = getEditedValue(config);
    setTestDialog({ configId: config.id, label: config.label });
    setTestResult(null);
    setIsTesting(true);

    try {
      // Build a sample prompt for preview (replace variables with examples)
      const samplePrompt = edited.prompt_text
        .replace(/\{\{productName\}\}/g, "Caneca Cerâmica Branca")
        .replace(/\{\{techniquePrompt\}\}/g, "applied as sublimation print")
        .replace(/\{\{positionX\}\}/g, "50")
        .replace(/\{\{positionY\}\}/g, "50")
        .replace(/\{\{horizontalPos\}\}/g, "horizontally centered")
        .replace(/\{\{verticalPos\}\}/g, "vertically centered")
        .replace(/\{\{positionDesc\}\}/g, "vertically centered, horizontally centered")
        .replace(/\{\{sizeDesc\}\}/g, "medium-sized")
        .replace(/\{\{logoWidthCm\}\}/g, "5")
        .replace(/\{\{logoHeightCm\}\}/g, "5")
        .replace(/\{\{scaleInstruction\}\}/g, "")
        .replace(/\{\{rotationInstruction\}\}/g, "");

      setTestResult(samplePrompt);
    } catch {
      toast.error("Erro ao gerar preview");
    } finally {
      setIsTesting(false);
    }
  };

  const mainPrompt = configs.find((c) => c.config_key === "main_prompt");
  const techniquePrompts = configs.filter((c) => c.config_key.startsWith("technique_"));
  const techniquesWithPrompt = new Set(techniquePrompts.map((c) => c.technique_id));
  const techniquesWithoutPrompt = techniques.filter((t) => !techniquesWithPrompt.has(t.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Gestão de Prompts - Gerador de Mockups</CardTitle>
                <CardDescription>
                  Edite os prompts enviados para a IA, selecione o modelo e acompanhe versões
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddTechniqueDialog(true)}
              disabled={techniquesWithoutPrompt.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Prompt por Técnica
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Main Prompt */}
      {mainPrompt && (
        <PromptEditor
          config={mainPrompt}
          edited={getEditedValue(mainPrompt)}
          hasChanges={hasChanges(mainPrompt)}
          saving={savingId === mainPrompt.id}
          changeNote={changeNotes[mainPrompt.id] || ""}
          onChangePrompt={(val) =>
            setEditedPrompts((prev) => ({
              ...prev,
              [mainPrompt.id]: { ...getEditedValue(mainPrompt), prompt_text: val },
            }))
          }
          onChangeModel={(val) =>
            setEditedPrompts((prev) => ({
              ...prev,
              [mainPrompt.id]: { ...getEditedValue(mainPrompt), ai_model: val },
            }))
          }
          onChangeNote={(val) => setChangeNotes((prev) => ({ ...prev, [mainPrompt.id]: val }))}
          onSave={() => handleSave(mainPrompt)}
          onHistory={() => openHistory(mainPrompt.id, mainPrompt.label)}
          onTest={() => handleTest(mainPrompt)}
          isMain
        />
      )}

      {/* Technique Prompts */}
      {techniquePrompts.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Prompts por Técnica
            </CardTitle>
            <CardDescription>
              Prompts específicos que complementam o prompt principal para cada técnica de personalização
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="space-y-2">
              {techniquePrompts.map((config) => (
                <AccordionItem key={config.id} value={config.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{config.label}</span>
                      <Badge variant="outline" className="text-xs">v{config.version}</Badge>
                      {hasChanges(config) && (
                        <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600">
                          Alterado
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <PromptEditor
                      config={config}
                      edited={getEditedValue(config)}
                      hasChanges={hasChanges(config)}
                      saving={savingId === config.id}
                      changeNote={changeNotes[config.id] || ""}
                      onChangePrompt={(val) =>
                        setEditedPrompts((prev) => ({
                          ...prev,
                          [config.id]: { ...getEditedValue(config), prompt_text: val },
                        }))
                      }
                      onChangeModel={(val) =>
                        setEditedPrompts((prev) => ({
                          ...prev,
                          [config.id]: { ...getEditedValue(config), ai_model: val },
                        }))
                      }
                      onChangeNote={(val) => setChangeNotes((prev) => ({ ...prev, [config.id]: val }))}
                      onSave={() => handleSave(config)}
                      onHistory={() => openHistory(config.id, config.label)}
                      onTest={() => handleTest(config)}
                      isMain={false}
                    />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Variables Reference */}
      <Card className="border-border/50 bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm">Variáveis Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {[
              ["{{productName}}", "Nome do produto"],
              ["{{techniquePrompt}}", "Descrição da técnica"],
              ["{{positionX}}", "Posição X (%)"],
              ["{{positionY}}", "Posição Y (%)"],
              ["{{horizontalPos}}", "Descrição horizontal"],
              ["{{verticalPos}}", "Descrição vertical"],
              ["{{positionDesc}}", "Descrição posição completa"],
              ["{{sizeDesc}}", "Tamanho (small/medium/large)"],
              ["{{logoWidthCm}}", "Largura do logo (cm)"],
              ["{{logoHeightCm}}", "Altura do logo (cm)"],
              ["{{scaleInstruction}}", "Instrução de escala"],
              ["{{rotationInstruction}}", "Instrução de rotação"],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center gap-2">
                <code className="bg-muted px-1.5 py-0.5 rounded text-primary font-mono">{key}</code>
                <span className="text-muted-foreground">{desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Technique Dialog */}
      <Dialog open={addTechniqueDialog} onOpenChange={setAddTechniqueDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Prompt por Técnica</DialogTitle>
            <DialogDescription>Crie um prompt customizado para uma técnica específica</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Técnica</Label>
            <Select value={selectedTechnique} onValueChange={setSelectedTechnique}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a técnica..." />
              </SelectTrigger>
              <SelectContent>
                {techniquesWithoutPrompt.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.code && `(${t.code})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTechniqueDialog(false)}>Cancelar</Button>
            <Button onClick={handleAddTechniquePrompt} disabled={!selectedTechnique}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Prompt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={!!historyDialog} onOpenChange={(open) => !open && setHistoryDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico: {historyDialog?.label}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nenhum histórico ainda</p>
            ) : (
              <div className="space-y-4">
                {history.map((entry) => (
                  <Card key={entry.id} className="border-border/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">v{entry.version}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.changed_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => restoreVersion(entry)}>
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Restaurar
                        </Button>
                      </div>
                      {entry.change_notes && (
                        <p className="text-xs text-muted-foreground italic">{entry.change_notes}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs mb-1 text-muted-foreground">Modelo: {entry.ai_model}</div>
                      <pre className="text-xs bg-muted/50 p-3 rounded-md whitespace-pre-wrap max-h-40 overflow-auto">
                        {entry.prompt_text}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Test Preview Dialog */}
      <Dialog open={!!testDialog} onOpenChange={(open) => !open && setTestDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Preview do Prompt: {testDialog?.label}
            </DialogTitle>
            <DialogDescription>
              Visualização do prompt com variáveis substituídas por valores de exemplo
            </DialogDescription>
          </DialogHeader>
          {isTesting ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : testResult ? (
            <ScrollArea className="max-h-[60vh]">
              <pre className="text-sm bg-muted/50 p-4 rounded-md whitespace-pre-wrap">{testResult}</pre>
            </ScrollArea>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-component for editing a prompt
function PromptEditor({
  config,
  edited,
  hasChanges,
  saving,
  changeNote,
  onChangePrompt,
  onChangeModel,
  onChangeNote,
  onSave,
  onHistory,
  onTest,
  isMain,
}: {
  config: PromptConfig;
  edited: { prompt_text: string; ai_model: string };
  hasChanges: boolean;
  saving: boolean;
  changeNote: string;
  onChangePrompt: (v: string) => void;
  onChangeModel: (v: string) => void;
  onChangeNote: (v: string) => void;
  onSave: () => void;
  onHistory: () => void;
  onTest: () => void;
  isMain: boolean;
}) {
  const Wrapper = isMain ? Card : "div";
  const wrapperProps = isMain ? { className: "border-border/50 border-primary/20" } : {};

  return (
    <Wrapper {...wrapperProps}>
      <div className={isMain ? "p-6 space-y-4" : "space-y-4"}>
        {isMain && (
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                {config.label}
              </h3>
              <p className="text-sm text-muted-foreground">
                Template base enviado para a IA em toda geração de mockup
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                <Clock className="h-3 w-3 mr-1" />
                v{config.version}
              </Badge>
            </div>
          </div>
        )}

        {/* Model Selector */}
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-xs">
            <Label className="text-xs text-muted-foreground mb-1 block">Modelo de IA</Label>
            <Select value={edited.ai_model} onValueChange={onChangeModel}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <div className="flex items-center gap-2">
                      <span>{m.label}</span>
                      <span className="text-xs text-muted-foreground">— {m.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Prompt Text */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Texto do Prompt</Label>
          <Textarea
            value={edited.prompt_text}
            onChange={(e) => onChangePrompt(e.target.value)}
            className="min-h-[200px] font-mono text-xs leading-relaxed"
            placeholder="Digite o prompt da IA..."
          />
        </div>

        {/* Change Notes + Actions */}
        <div className="flex items-end gap-3">
          {hasChanges && (
            <div className="flex-1 max-w-sm">
              <Label className="text-xs text-muted-foreground mb-1 block">Nota da alteração (opcional)</Label>
              <Input
                value={changeNote}
                onChange={(e) => onChangeNote(e.target.value)}
                placeholder="Ex: Ajustei regra de posicionamento..."
                className="h-9 text-sm"
              />
            </div>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={onTest}>
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
            <Button variant="outline" size="sm" onClick={onHistory}>
              <History className="h-4 w-4 mr-1" />
              Histórico
            </Button>
            <Button size="sm" onClick={onSave} disabled={!hasChanges || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
