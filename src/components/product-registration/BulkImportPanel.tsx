import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Loader2,
  ArrowRight,
  FileUp,
  Table as TableIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProductRegistration, PRODUCT_FIELDS, BulkImportRow, ColumnMapping } from '@/hooks/useProductRegistration';
import { cn } from '@/lib/utils';
const getXLSX = () => import('@e965/xlsx');
import Papa from 'papaparse';

type ImportMode = 'template' | 'custom';
type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'results';

interface ParsedData {
  headers: string[];
  rows: Record<string, unknown>[];
  fileName: string;
}

export function BulkImportPanel() {
  const { 
    generateTemplate, 
    importProducts, 
    importProgress,
    referenceData,
    loadReferenceData,
  } = useProductRegistration();

  const [importMode, setImportMode] = useState<ImportMode>('template');
  const [step, setStep] = useState<ImportStep>('upload');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [importResults, setImportResults] = useState<{
    succeeded: number;
    failed: number;
    errors: Array<{ row: number; errors: string[] }>;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  // Parse arquivo
  const parseFile = useCallback(async (file: File) => {
    const fileName = file.name;
    const extension = fileName.split('.').pop()?.toLowerCase();

    try {
      if (extension === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const headers = results.meta.fields || [];
            setParsedData({
              headers,
              rows: results.data as Record<string, unknown>[],
              fileName,
            });
            
            // Auto-mapear se for template
            if (importMode === 'template') {
              autoMapColumns(headers);
              setStep('preview');
            } else {
              setStep('mapping');
            }
          },
          error: (error) => {
            throw new Error(`Erro ao ler CSV: ${error.message}`);
          },
        });
      } else if (extension === 'xlsx' || extension === 'xls') {
        const XLSX = await getXLSX();
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][];

        if (jsonData.length < 2) {
          throw new Error('Arquivo vazio ou sem dados');
        }

        const headers = (jsonData[0] as string[]).map(h => String(h).trim());
        const rows = jsonData.slice(1).map(row => {
          const obj: Record<string, unknown> = {};
          headers.forEach((header, index) => {
            obj[header] = (row as unknown[])[index];
          });
          return obj;
        });

        setParsedData({ headers, rows, fileName });

        if (importMode === 'template') {
          autoMapColumns(headers);
          setStep('preview');
        } else {
          setStep('mapping');
        }
      } else {
        throw new Error('Formato não suportado. Use CSV ou XLSX.');
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
    }
  }, [importMode]);

  // Auto-mapear colunas baseado no template
  const autoMapColumns = (headers: string[]) => {
    const mappings: ColumnMapping[] = headers.map(header => {
      const matchingField = PRODUCT_FIELDS.find(
        field => field.key.toLowerCase() === header.toLowerCase() ||
                 field.label.toLowerCase() === header.toLowerCase()
      );
      return {
        sourceColumn: header,
        targetField: matchingField?.key || '',
        required: matchingField?.required || false,
      };
    });
    setColumnMappings(mappings);
  };

  // Atualizar mapeamento de coluna
  const updateMapping = (sourceColumn: string, targetField: string) => {
    setColumnMappings(prev =>
      prev.map(m =>
        m.sourceColumn === sourceColumn
          ? { ...m, targetField: targetField as keyof typeof PRODUCT_FIELDS[number]['key'] | '' }
          : m
      )
    );
  };

  // Verificar se mapeamento está completo
  const isMappingComplete = () => {
    const requiredFields = PRODUCT_FIELDS.filter(f => f.required).map(f => f.key);
    const mappedFields = columnMappings.filter(m => m.targetField).map(m => m.targetField);
    return requiredFields.every(f => mappedFields.includes(f));
  };

  // Transformar dados conforme mapeamento
  const transformData = (): BulkImportRow[] => {
    if (!parsedData) return [];

    return parsedData.rows.map(row => {
      const transformed: BulkImportRow = {
        name: '',
        sku: '',
        price: 0,
      };

      columnMappings.forEach(mapping => {
        if (mapping.targetField && row[mapping.sourceColumn] !== undefined) {
          const value = row[mapping.sourceColumn];
          (transformed as Record<string, unknown>)[mapping.targetField] = value;
        }
      });

      return transformed;
    });
  };

  // Iniciar importação
  const startImport = async () => {
    setStep('importing');
    const data = transformData();
    const results = await importProducts(data);
    setImportResults(results);
    setStep('results');
  };

  // Handlers de arquivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  };

  // Reset
  const resetImport = () => {
    setParsedData(null);
    setColumnMappings([]);
    setImportResults(null);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Seleção de modo */}
      {step === 'upload' && (
        <Tabs value={importMode} onValueChange={(v) => setImportMode(v as ImportMode)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="template">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Usar Template
            </TabsTrigger>
            <TabsTrigger value="custom">
              <TableIcon className="h-4 w-4 mr-2" />
              Mapeamento Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="mt-4">
            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertTitle>Template Recomendado</AlertTitle>
              <AlertDescription>
                Baixe nosso template CSV/XLSX com todos os campos pré-configurados.
                Preencha os dados e faça o upload para importação rápida.
              </AlertDescription>
            </Alert>
            <Button onClick={generateTemplate} variant="outline" className="mt-4">
              <Download className="h-4 w-4 mr-2" />
              Baixar Template CSV
            </Button>
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            <Alert>
              <TableIcon className="h-4 w-4" />
              <AlertTitle>Mapeamento Personalizado</AlertTitle>
              <AlertDescription>
                Faça upload de qualquer planilha e mapeie as colunas manualmente
                para os campos do produto.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      )}

      {/* Área de Upload */}
      {step === 'upload' && (
        <Card
          className={cn(
            "border-2 border-dashed transition-colors cursor-pointer",
            isDragging && "border-primary bg-primary/5"
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileUp className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Arraste seu arquivo aqui</p>
            <p className="text-sm text-muted-foreground mt-1">
              ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Formatos suportados: CSV, XLSX, XLS
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileSelect}
            />
          </CardContent>
        </Card>
      )}

      {/* Mapeamento de Colunas */}
      {step === 'mapping' && parsedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TableIcon className="h-5 w-5" />
              Mapeamento de Colunas
            </CardTitle>
            <CardDescription>
              Arquivo: {parsedData.fileName} ({parsedData.rows.length} linhas)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coluna do Arquivo</TableHead>
                    <TableHead>Exemplo</TableHead>
                    <TableHead>Campo no Sistema</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {columnMappings.map(mapping => {
                    const sampleValue = parsedData.rows[0]?.[mapping.sourceColumn];
                    const field = PRODUCT_FIELDS.find(f => f.key === mapping.targetField);

                    return (
                      <TableRow key={mapping.sourceColumn}>
                        <TableCell className="font-medium">
                          {mapping.sourceColumn}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {String(sampleValue || '-')}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={mapping.targetField || "_ignore"}
                            onValueChange={(value) => updateMapping(mapping.sourceColumn, value === "_ignore" ? "" : value)}
                          >
                            <SelectTrigger className={cn(
                              "w-[200px]",
                              field?.required && !mapping.targetField && "border-destructive"
                            )}>
                              <SelectValue placeholder="Selecionar campo..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_ignore">Ignorar</SelectItem>
                              {PRODUCT_FIELDS.map(f => (
                                <SelectItem key={f.key} value={f.key}>
                                  {f.label}
                                  {f.required && ' *'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <Button variant="outline" onClick={resetImport}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={() => setStep('preview')}
                disabled={!isMappingComplete()}
              >
                Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview dos Dados */}
      {step === 'preview' && parsedData && (
        <Card>
          <CardHeader>
            <CardTitle>Pré-visualização</CardTitle>
            <CardDescription>
              {parsedData.rows.length} produtos serão importados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Categoria</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.rows.slice(0, 10).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{String(row.name || '-')}</TableCell>
                      <TableCell>{String(row.sku || '-')}</TableCell>
                      <TableCell>{String(row.price || '-')}</TableCell>
                      <TableCell>{String(row.category_name || row.category_id || '-')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsedData.rows.length > 10 && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  e mais {parsedData.rows.length - 10} produtos...
                </p>
              )}
            </ScrollArea>

            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(importMode === 'custom' ? 'mapping' : 'upload')}>
                Voltar
              </Button>
              <Button onClick={startImport}>
                <Upload className="h-4 w-4 mr-2" />
                Iniciar Importação
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progresso da Importação */}
      {step === 'importing' && importProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Importando Produtos...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress
              value={(importProgress.processed / importProgress.total) * 100}
              className="mb-4"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{importProgress.processed} de {importProgress.total}</span>
              <span>
                <span className="text-success">{importProgress.succeeded} sucesso</span>
                {' / '}
                <span className="text-destructive">{importProgress.failed} falhas</span>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultados */}
      {step === 'results' && importResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResults.failed === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <AlertCircle className="h-5 w-5 text-warning" />
              )}
              Importação Concluída
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Badge variant="outline" className="text-success border-success">
                {importResults.succeeded} sucesso
              </Badge>
              {importResults.failed > 0 && (
                <Badge variant="outline" className="text-destructive border-destructive">
                  {importResults.failed} falhas
                </Badge>
              )}
            </div>

            {importResults.errors.length > 0 && (
              <ScrollArea className="h-[200px] rounded border p-2">
                {importResults.errors.map((error, index) => (
                  <div key={index} className="py-2 border-b last:border-0">
                    <p className="font-medium text-sm">Linha {error.row}</p>
                    <ul className="list-disc list-inside text-sm text-destructive">
                      {error.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </ScrollArea>
            )}

            <Button onClick={resetImport} className="mt-4">
              Nova Importação
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
