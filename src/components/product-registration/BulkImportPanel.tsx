/**
 * BulkImportPanel — Refactored to use useBulkImportFile hook.
 * UI-only: delegates file parsing/mapping logic to the hook.
 */
import { useEffect } from 'react';
import { Upload, Download, FileSpreadsheet, FileUp, Table as TableIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProductRegistration } from '@/hooks/useProductRegistration';
import { useBulkImportFile } from '@/hooks/useBulkImportFile';
import { MappingStep, PreviewStep, ImportingStep, ResultsStep } from './BulkImportSteps';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function BulkImportPanel() {
  const { generateTemplate, importProducts, importProgress, loadReferenceData } =
    useProductRegistration();

  const {
    importMode,
    setImportMode,
    step,
    setStep,
    parsedData,
    columnMappings,
    isDragging,
    setIsDragging,
    fileInputRef,
    updateMapping,
    isMappingComplete,
    transformData,
    handleFileSelect,
    handleDrop,
    resetImport,
  } = useBulkImportFile();

  const [importResults, setImportResults] = useState<{
    succeeded: number;
    failed: number;
    errors: Array<{ row: number; errors: string[] }>;
  } | null>(null);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  const startImport = async () => {
    setStep('importing');
    const data = transformData();
    const results = await importProducts(data);
    setImportResults(results);
    setStep('results');
  };

  const handleReset = () => {
    resetImport();
    setImportResults(null);
  };

  return (
    <div className="space-y-6">
      {/* Mode selection */}
      {step === 'upload' && (
        <Tabs value={importMode} onValueChange={(v) => setImportMode(v as 'template' | 'custom')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="template">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Usar Template
            </TabsTrigger>
            <TabsTrigger value="custom">
              <TableIcon className="mr-2 h-4 w-4" />
              Mapeamento Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="mt-4">
            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertTitle>Template Recomendado</AlertTitle>
              <AlertDescription>
                Baixe nosso template CSV/XLSX com todos os campos pré-configurados. Preencha os
                dados e faça o upload para importação rápida.
              </AlertDescription>
            </Alert>
            <Button onClick={generateTemplate} variant="outline" className="mt-4">
              <Download className="mr-2 h-4 w-4" />
              Baixar Template CSV
            </Button>
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            <Alert>
              <TableIcon className="h-4 w-4" />
              <AlertTitle>Mapeamento Personalizado</AlertTitle>
              <AlertDescription>
                Faça upload de qualquer planilha e mapeie as colunas manualmente para os campos do
                produto.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      )}

      {/* Upload area */}
      {step === 'upload' && (
        <Card
          className={cn(
            'cursor-pointer border-2 border-dashed transition-colors',
            isDragging && 'border-primary bg-primary/5',
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileUp className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-xl font-medium">Arraste seu arquivo aqui</p>
            <p className="mt-1 text-sm text-muted-foreground">ou clique para selecionar</p>
            <p className="mt-4 text-xs text-muted-foreground">
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

      {/* Mapping */}
      {step === 'mapping' && parsedData && (
        <MappingStep
          parsedData={parsedData}
          columnMappings={columnMappings}
          updateMapping={updateMapping}
          isMappingComplete={isMappingComplete}
          onCancel={handleReset}
          onContinue={() => setStep('preview')}
        />
      )}

      {/* Preview */}
      {step === 'preview' && parsedData && (
        <PreviewStep
          parsedData={parsedData}
          onBack={() => setStep(importMode === 'custom' ? 'mapping' : 'upload')}
          onStart={startImport}
        />
      )}

      {/* Importing */}
      {step === 'importing' && importProgress && <ImportingStep progress={importProgress} />}

      {/* Results */}
      {step === 'results' && importResults && (
        <ResultsStep results={importResults} onReset={handleReset} />
      )}
    </div>
  );
}
