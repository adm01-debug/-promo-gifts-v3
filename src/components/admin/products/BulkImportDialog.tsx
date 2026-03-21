/**
 * BulkImportDialog — Sistema completo de importação em massa de produtos
 * Suporta CSV e Excel (.xlsx/.xls) com mapeamento de colunas e validação
 */

import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Loader2,
  RotateCcw,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { invokeExternalDbSingle } from '@/lib/external-db';

// ── Target fields for mapping ──
const TARGET_FIELDS = [
  { key: 'sku', label: 'SKU', required: true },
  { key: 'name', label: 'Nome', required: true },
  { key: 'sale_price', label: 'Preço Venda', required: true },
  { key: 'description', label: 'Descrição', required: false },
  { key: 'short_description', label: 'Descrição Curta', required: false },
  { key: 'meta_description', label: 'Meta Descrição', required: false },
  { key: 'brand', label: 'Marca', required: false },
  { key: 'supplier_reference', label: 'Ref. Fornecedor', required: false },
  { key: 'cost_price', label: 'Preço Custo', required: false },
  { key: 'stock_quantity', label: 'Estoque', required: false },
  { key: 'min_quantity', label: 'Qtd. Mínima', required: false },
  { key: 'height_cm', label: 'Altura (cm)', required: false },
  { key: 'width_cm', label: 'Largura (cm)', required: false },
  { key: 'length_cm', label: 'Comprimento (cm)', required: false },
  { key: 'weight_g', label: 'Peso (g)', required: false },
  { key: 'packing_type', label: 'Tipo Embalagem', required: false },
  { key: 'image_url', label: 'URL Imagem', required: false },
] as const;

type TargetFieldKey = typeof TARGET_FIELDS[number]['key'];

interface ColumnMapping {
  [sourceColumn: string]: TargetFieldKey | '';
}

interface ValidationResult {
  row: number;
  valid: boolean;
  errors: string[];
  warnings: string[];
  data?: Record<string, any>;
}

interface ImportProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
}

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function BulkImportDialog({ open, onOpenChange, onComplete }: BulkImportDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [importErrors, setImportErrors] = useState<Array<{ row: number; errors: string[] }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 1: File Upload ──
  const handleFileUpload = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'csv') {
        const text = await file.text();
        const { headers: h, rows } = parseCSV(text);
        setHeaders(h);
        setRawData(rows);
      } else if (['xlsx', 'xls'].includes(ext || '')) {
        const XLSX = await import('@e965/xlsx');
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
        if (json.length === 0) {
          toast.error('Planilha vazia');
          return;
        }
        setHeaders(Object.keys(json[0]));
        setRawData(json);
      } else {
        toast.error('Formato não suportado. Use CSV, XLSX ou XLS.');
        return;
      }

      setFileName(file.name);
      // Auto-map columns by name similarity
      autoMapColumns(ext === 'csv' ? headers : Object.keys(rawData[0] || {}));
      setStep('mapping');
      toast.success(`${file.name} carregado com sucesso`);
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Erro ao ler o arquivo. Verifique o formato.');
    }
  }, []);

  // After rawData and headers are set, auto-map
  const autoMapColumns = useCallback((cols: string[]) => {
    const newMapping: ColumnMapping = {};
    const normalizeStr = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

    const aliasMap: Record<string, TargetFieldKey> = {
      sku: 'sku',
      codigo: 'sku',
      code: 'sku',
      nome: 'name',
      name: 'name',
      produto: 'name',
      preco: 'sale_price',
      price: 'sale_price',
      precovenda: 'sale_price',
      saleprice: 'sale_price',
      valor: 'sale_price',
      descricao: 'description',
      description: 'description',
      marca: 'brand',
      brand: 'brand',
      estoque: 'stock_quantity',
      stock: 'stock_quantity',
      custo: 'cost_price',
      costprice: 'cost_price',
      precocusto: 'cost_price',
      peso: 'weight_g',
      weight: 'weight_g',
      altura: 'height_cm',
      height: 'height_cm',
      largura: 'width_cm',
      width: 'width_cm',
      comprimento: 'length_cm',
      length: 'length_cm',
      imagem: 'image_url',
      image: 'image_url',
      imageurl: 'image_url',
      embalagem: 'packing_type',
      reffornecedor: 'supplier_reference',
      supplierref: 'supplier_reference',
      qtdminima: 'min_quantity',
      minquantity: 'min_quantity',
      descricaocurta: 'short_description',
      shortdescription: 'short_description',
      metadescricao: 'meta_description',
      metadescription: 'meta_description',
    };

    for (const col of cols) {
      const normalized = normalizeStr(col);
      if (aliasMap[normalized]) {
        // Avoid duplicate mappings
        const alreadyMapped = Object.values(newMapping).includes(aliasMap[normalized]);
        if (!alreadyMapped) {
          newMapping[col] = aliasMap[normalized];
        }
      }
    }

    setMapping(newMapping);
  }, []);

  // ── Step 2: Validate mapped data ──
  const validateData = useCallback(() => {
    const results: ValidationResult[] = [];
    const requiredFields = TARGET_FIELDS.filter(f => f.required).map(f => f.key);

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const errors: string[] = [];
      const warnings: string[] = [];
      const mapped: Record<string, any> = {};

      // Map source columns to target fields
      for (const [sourceCol, targetField] of Object.entries(mapping)) {
        if (targetField) {
          mapped[targetField] = row[sourceCol];
        }
      }

      // Check required fields
      for (const field of requiredFields) {
        const value = mapped[field];
        if (value === undefined || value === null || String(value).trim() === '') {
          errors.push(`"${TARGET_FIELDS.find(f => f.key === field)?.label}" é obrigatório`);
        }
      }

      // Validate price
      if (mapped.sale_price !== undefined) {
        const price = parseFloat(String(mapped.sale_price).replace(',', '.'));
        if (isNaN(price) || price < 0) {
          errors.push('Preço inválido');
        } else {
          mapped.sale_price = price;
        }
      }

      // Validate numeric fields
      for (const numField of ['cost_price', 'stock_quantity', 'min_quantity', 'height_cm', 'width_cm', 'length_cm', 'weight_g']) {
        if (mapped[numField] !== undefined && mapped[numField] !== '') {
          const val = parseFloat(String(mapped[numField]).replace(',', '.'));
          if (isNaN(val)) {
            warnings.push(`"${TARGET_FIELDS.find(f => f.key === numField)?.label}" valor inválido, será ignorado`);
            mapped[numField] = null;
          } else {
            mapped[numField] = val;
          }
        }
      }

      // SKU length
      if (mapped.sku && String(mapped.sku).length > 50) {
        errors.push('SKU excede 50 caracteres');
      }

      // Name length
      if (mapped.name && String(mapped.name).length > 300) {
        warnings.push('Nome será truncado em 300 caracteres');
        mapped.name = String(mapped.name).substring(0, 300);
      }

      results.push({
        row: i + 1,
        valid: errors.length === 0,
        errors,
        warnings,
        data: errors.length === 0 ? mapped : undefined,
      });
    }

    setValidationResults(results);
    setStep('preview');
  }, [rawData, mapping]);

  // ── Step 3: Execute import ──
  const executeImport = useCallback(async () => {
    const validRows = validationResults.filter(r => r.valid && r.data);
    if (validRows.length === 0) {
      toast.error('Nenhuma linha válida para importar');
      return;
    }

    setStep('importing');
    const prog: ImportProgress = {
      total: validRows.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
    };
    setProgress(prog);
    const errors: Array<{ row: number; errors: string[] }> = [];

    for (const result of validRows) {
      try {
        const data = result.data!;
        const productData: Record<string, any> = {
          sku: String(data.sku).trim(),
          name: String(data.name).trim(),
          sale_price: data.sale_price ?? 0,
          description: data.description || null,
          short_description: data.short_description || null,
          meta_description: data.meta_description || null,
          brand: data.brand || null,
          supplier_reference: data.supplier_reference || null,
          cost_price: data.cost_price ?? null,
          stock_quantity: data.stock_quantity ?? 0,
          min_quantity: data.min_quantity ?? 1,
          height_cm: data.height_cm ?? null,
          width_cm: data.width_cm ?? null,
          length_cm: data.length_cm ?? null,
          weight_g: data.weight_g ?? null,
          packing_type: data.packing_type || null,
          is_active: true,
          active: true,
          updated_at: new Date().toISOString(),
        };

        if (data.image_url) {
          productData.image_url = data.image_url;
          productData.primary_image_url = data.image_url;
        }

        await invokeExternalDbSingle({
          table: 'products',
          operation: 'insert',
          data: productData,
        });

        prog.succeeded++;
      } catch (err) {
        prog.failed++;
        errors.push({ row: result.row, errors: [err instanceof Error ? err.message : 'Erro ao salvar'] });
      }

      prog.processed++;
      setProgress({ ...prog });
    }

    setImportErrors(errors);
    setStep('complete');

    if (prog.succeeded > 0) {
      toast.success(`${prog.succeeded} produto(s) importado(s)!`);
      onComplete();
    }
    if (prog.failed > 0) {
      toast.error(`${prog.failed} produto(s) falharam`);
    }
  }, [validationResults, onComplete]);

  // ── Template download ──
  const downloadTemplate = useCallback(() => {
    const headers = TARGET_FIELDS.map(f => f.key);
    const labels = TARGET_FIELDS.map(f => `${f.label}${f.required ? ' *' : ''}`);
    const example = [
      'PROD-001', 'Caneta Personalizada', '5.99', 'Caneta esferográfica para brindes',
      'Caneta brinde', 'Caneta personalizada para brindes corporativos', 'Marca XYZ',
      'REF-001', '2.50', '1000', '50', '14', '1.2', '15', '10', 'Caixa Individual',
      'https://exemplo.com/imagem.jpg',
    ];

    const csv = [labels.join(';'), example.join(';')].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_importacao_produtos.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Template baixado!');
  }, []);

  // ── Reset ──
  const reset = () => {
    setStep('upload');
    setRawData([]);
    setHeaders([]);
    setFileName('');
    setMapping({});
    setValidationResults([]);
    setProgress(null);
    setImportErrors([]);
  };

  // ── Helpers ──
  const requiredMapped = TARGET_FIELDS.filter(f => f.required).every(f =>
    Object.values(mapping).includes(f.key)
  );

  const validCount = validationResults.filter(r => r.valid).length;
  const invalidCount = validationResults.filter(r => !r.valid).length;
  const warningCount = validationResults.filter(r => r.warnings.length > 0).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importação em Massa
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Envie um arquivo CSV ou Excel com os dados dos produtos'}
            {step === 'mapping' && `Mapeie as colunas de "${fileName}" para os campos do sistema`}
            {step === 'preview' && 'Revise os dados antes de importar'}
            {step === 'importing' && 'Importando produtos...'}
            {step === 'complete' && 'Importação concluída'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-1 text-xs">
          {(['upload', 'mapping', 'preview', 'importing'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
              <Badge
                variant={step === s || (step === 'complete' && s === 'importing') ? 'default' : 'outline'}
                className={cn(
                  'text-[10px]',
                  ['mapping', 'preview', 'importing', 'complete'].indexOf(step) > ['upload', 'mapping', 'preview', 'importing'].indexOf(s) && 'bg-green-500/20 text-green-500 border-green-500/30'
                )}
              >
                {s === 'upload' && '1. Upload'}
                {s === 'mapping' && '2. Mapear'}
                {s === 'preview' && '3. Validar'}
                {s === 'importing' && '4. Importar'}
              </Badge>
            </div>
          ))}
        </div>

        {/* ═══ STEP: UPLOAD ═══ */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleFileUpload(file);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Arraste um arquivo aqui ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">CSV, XLSX ou XLS • Máximo 10.000 linhas</p>
            </div>

            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Baixar Template CSV
              </Button>
            </div>
          </div>
        )}

        {/* ═══ STEP: MAPPING ═══ */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{headers.length} colunas encontradas • {rawData.length} linhas</span>
              <span className={cn(!requiredMapped && 'text-destructive')}>
                {requiredMapped ? '✓ Campos obrigatórios mapeados' : '⚠ Mapeie os campos obrigatórios (*)'}
              </span>
            </div>

            <ScrollArea className="h-[400px] pr-2">
              <div className="space-y-2">
                {headers.map((col) => {
                  const sample = rawData.slice(0, 3).map(r => String(r[col] ?? '')).filter(Boolean).join(' | ');
                  return (
                    <div key={col} className="flex items-center gap-3 p-2 rounded-lg border bg-card">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{col}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{sample || '(vazio)'}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Select
                        value={mapping[col] || '_none'}
                        onValueChange={(v) => setMapping(prev => ({ ...prev, [col]: v === '_none' ? '' : v as TargetFieldKey }))}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Ignorar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">— Ignorar —</SelectItem>
                          {TARGET_FIELDS.map(f => {
                            const alreadyUsed = Object.entries(mapping).some(([k, v]) => v === f.key && k !== col);
                            return (
                              <SelectItem key={f.key} value={f.key} disabled={alreadyUsed}>
                                {f.label} {f.required && '*'} {alreadyUsed && '(em uso)'}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Voltar
              </Button>
              <Button onClick={validateData} disabled={!requiredMapped}>
                Validar Dados
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══ STEP: PREVIEW ═══ */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> {validCount} válidos
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" /> {invalidCount} com erro
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="secondary" className="gap-1 text-yellow-500">
                  <AlertTriangle className="h-3 w-3" /> {warningCount} avisos
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-16">Status</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationResults.map((r) => (
                    <TableRow key={r.row} className={cn(!r.valid && 'bg-destructive/5')}>
                      <TableCell className="text-xs text-muted-foreground">{r.row}</TableCell>
                      <TableCell>
                        {r.valid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.data?.sku || rawData[r.row - 1]?.sku || '—'}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{r.data?.name || rawData[r.row - 1]?.name || '—'}</TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {r.data?.sale_price ? `R$ ${Number(r.data.sale_price).toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell>
                        {r.errors.length > 0 && (
                          <p className="text-[10px] text-destructive">{r.errors.join('; ')}</p>
                        )}
                        {r.warnings.length > 0 && (
                          <p className="text-[10px] text-yellow-500">{r.warnings.join('; ')}</p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Voltar ao Mapeamento
              </Button>
              <Button onClick={executeImport} disabled={validCount === 0}>
                Importar {validCount} produto(s)
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* ═══ STEP: IMPORTING ═══ */}
        {step === 'importing' && progress && (
          <div className="space-y-6 py-8">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm font-medium">Importando produtos...</p>
              <p className="text-xs text-muted-foreground mt-1">
                {progress.processed} de {progress.total} processados
              </p>
            </div>
            <Progress value={(progress.processed / progress.total) * 100} className="h-2" />
            <div className="flex justify-center gap-4 text-xs">
              <span className="text-green-500">✓ {progress.succeeded} sucesso</span>
              {progress.failed > 0 && <span className="text-destructive">✕ {progress.failed} falha(s)</span>}
            </div>
          </div>
        )}

        {/* ═══ STEP: COMPLETE ═══ */}
        {step === 'complete' && progress && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              {progress.failed === 0 ? (
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              ) : (
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
              )}
              <p className="text-lg font-semibold">Importação Concluída</p>
              <div className="flex justify-center gap-4 mt-2 text-sm">
                <span className="text-green-500 font-medium">{progress.succeeded} importados</span>
                {progress.failed > 0 && (
                  <span className="text-destructive font-medium">{progress.failed} falharam</span>
                )}
              </div>
            </div>

            {importErrors.length > 0 && (
              <ScrollArea className="h-[200px] border rounded-lg p-3">
                <p className="text-xs font-medium mb-2">Erros detalhados:</p>
                {importErrors.map((e, i) => (
                  <p key={i} className="text-xs text-destructive mb-1">
                    Linha {e.row}: {e.errors.join('; ')}
                  </p>
                ))}
              </ScrollArea>
            )}

            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Nova Importação
              </Button>
              <Button onClick={() => { reset(); onOpenChange(false); }}>
                Concluir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── CSV Parser ──
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  // Detect delimiter
  const firstLine = text.split('\n')[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0], delimiter);
  const rows = lines.slice(1).map(line => {
    const values = parseCSVLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });

  return { headers, rows };
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
