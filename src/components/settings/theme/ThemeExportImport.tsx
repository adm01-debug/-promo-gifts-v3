import { useState } from 'react';
import { Download, Upload, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { type ThemeConfig, exportThemeConfig, importThemeConfig } from '@/lib/theme-presets';

interface ThemeExportImportProps {
  config: ThemeConfig;
  onImport: (config: ThemeConfig) => void;
}

export function ThemeExportImport({ config, onImport }: ThemeExportImportProps) {
  const [open, setOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'export' | 'import'>('export');

  const json = exportThemeConfig(config);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    toast.success('Configuração copiada!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    const parsed = importThemeConfig(importJson);
    if (parsed) {
      onImport(parsed);
      setOpen(false);
      setImportJson('');
      toast.success('Tema importado com sucesso!');
    } else {
      toast.error('JSON inválido. Verifique o formato.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Exportar / Importar</span>
          <span className="sm:hidden">Config</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Configuração do Tema</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setTab('export')}
            className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${
              tab === 'export' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Download className="h-3.5 w-3.5 inline mr-1.5" />
            Exportar
          </button>
          <button
            onClick={() => setTab('import')}
            className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${
              tab === 'import' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Upload className="h-3.5 w-3.5 inline mr-1.5" />
            Importar
          </button>
        </div>

        {tab === 'export' ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Copie esta configuração para compartilhar ou fazer backup.
            </p>
            <Textarea
              value={json}
              readOnly
              className="font-mono text-xs h-28 resize-none"
            />
            <Button onClick={handleCopy} className="w-full gap-2" size="sm">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado!' : 'Copiar configuração'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cole uma configuração de tema exportada anteriormente.
            </p>
            <Textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='{"presetId": "cyber", "radius": 8, "mode": "dark"}'
              className="font-mono text-xs h-28 resize-none"
            />
            <Button
              onClick={handleImport}
              className="w-full gap-2"
              size="sm"
              disabled={!importJson.trim()}
            >
              <Upload className="h-4 w-4" />
              Importar tema
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
