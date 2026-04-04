/**
 * BulkImportDialog — Sistema robusto de importação em massa de produtos
 * 
 * Features:
 * - CSV e Excel (.xlsx/.xls) parsing
 * - Auto-mapping inteligente de colunas (PT-BR + EN)
 * - Verificação de SKUs duplicados no BD externo
 * - Modo Insert / Upsert (inserir ou atualizar por SKU)
 * - Importação em lotes (chunks de 25)
 * - Validação completa com preview
 * - Relatório de erros exportável
 * - Template CSV e Excel
 * - Limite de 10.000 linhas enforçado
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Upload, FileSpreadsheet, ArrowRight, CheckCircle2, XCircle,
  AlertTriangle, Download, Loader2, RotateCcw, RefreshCw, FileDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  type ImportMode, type ImportRow, type BatchImportProgress, type BatchImportResult,
  checkExistingSkus, executeBatchImport, generateErrorReportCSV,
} from '@/lib/external-db/batch-import';

// ── Constants ──
const MAX_ROWS = 10_000;

const TARGET_FIELDS = [
  // ── Identificação (obrigatórios) ──
  { key: 'sku', label: 'SKU', required: true },
  { key: 'name', label: 'Nome', required: true },
  { key: 'sale_price', label: 'Preço Venda', required: true },
  // ── Textos ──
  { key: 'description', label: 'Descrição', required: false },
  { key: 'short_description', label: 'Descrição Curta', required: false },
  { key: 'meta_description', label: 'Meta Descrição', required: false },
  // ── Comercial ──
  { key: 'brand', label: 'Marca', required: false },
  { key: 'supplier_reference', label: 'Ref. Fornecedor', required: false },
  { key: 'supplier_id', label: 'ID Fornecedor', required: false },
  { key: 'cost_price', label: 'Preço Custo', required: false },
  { key: 'stock_quantity', label: 'Estoque', required: false },
  { key: 'min_quantity', label: 'Qtd. Mín. Venda', required: false },
  { key: 'category_id', label: 'ID Categoria', required: false },
  { key: 'main_category_id', label: 'ID Categoria Principal', required: false },
  // ── Dimensões do produto ──
  { key: 'height_cm', label: 'Altura (cm)', required: false },
  { key: 'width_cm', label: 'Largura (cm)', required: false },
  { key: 'length_cm', label: 'Profundidade (cm)', required: false },
  { key: 'diameter_cm', label: 'Diâmetro (cm)', required: false },
  { key: 'weight_g', label: 'Peso (g)', required: false },
  { key: 'capacity_ml', label: 'Capacidade (ml)', required: false },
  // ── Embalagem ──
  { key: 'packing_type', label: 'Tipo Embalagem', required: false },
  { key: 'packing_classification', label: 'Classificação Embalagem', required: false },
  { key: 'has_commercial_packaging', label: 'Embalagem Comercial', required: false },
  { key: 'repacking_type', label: 'Tipo Reembalagem', required: false },
  { key: 'packaging_context', label: 'Contexto Embalagem', required: false },
  // ── Caixa (box) ──
  { key: 'box_width_mm', label: 'Caixa Larg (mm)', required: false },
  { key: 'box_height_mm', label: 'Caixa Alt (mm)', required: false },
  { key: 'box_length_mm', label: 'Caixa Prof (mm)', required: false },
  { key: 'box_weight_kg', label: 'Caixa Peso (kg)', required: false },
  { key: 'box_quantity', label: 'Qtd por Caixa', required: false },
  { key: 'box_volume_cm3', label: 'Volume Caixa (cm³)', required: false },
  { key: 'box_image', label: 'Imagem Caixa', required: false },
  // ── Mídia ──
  { key: 'image_url', label: 'URL Imagem', required: false },
  { key: 'primary_image_url', label: 'URL Imagem Principal', required: false },
  { key: 'og_image_url', label: 'URL OG Image', required: false },
  // ── Flags ──
  { key: 'is_active', label: 'Ativo', required: false },
  { key: 'is_featured', label: 'Destaque', required: false },
  { key: 'is_bestseller', label: 'Mais Vendido', required: false },
  { key: 'is_new', label: 'Novidade', required: false },
  { key: 'is_on_sale', label: 'Em Promoção', required: false },
  { key: 'is_kit', label: 'É Kit', required: false },
  // ── Outros ──
  { key: 'gender', label: 'Gênero', required: false },
  { key: 'dimensions', label: 'Dimensões (texto)', required: false },
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
  data?: ImportRow;
  existsInDb: boolean;
}

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

// ── Alias map for auto-mapping ──
const ALIAS_MAP: Record<string, TargetFieldKey> = {
  // SKU
  sku: 'sku', codigo: 'sku', code: 'sku', cod: 'sku', ref: 'sku', referencia: 'sku',
  // Nome
  nome: 'name', name: 'name', produto: 'name', product: 'name', titulo: 'name', title: 'name',
  // Preços
  preco: 'sale_price', price: 'sale_price', precovenda: 'sale_price', saleprice: 'sale_price',
  valor: 'sale_price', valorvenda: 'sale_price', sellprice: 'sale_price',
  custo: 'cost_price', costprice: 'cost_price', precocusto: 'cost_price',
  // Textos
  descricao: 'description', description: 'description', desc: 'description',
  descricaocurta: 'short_description', shortdescription: 'short_description',
  metadescricao: 'meta_description', metadescription: 'meta_description',
  // Marca
  marca: 'brand', brand: 'brand',
  // Estoque
  estoque: 'stock_quantity', stock: 'stock_quantity', qty: 'stock_quantity', quantidade: 'stock_quantity',
  // Dimensões
  peso: 'weight_g', weight: 'weight_g', pesogramas: 'weight_g',
  altura: 'height_cm', height: 'height_cm', alturacm: 'height_cm',
  largura: 'width_cm', width: 'width_cm', larguracm: 'width_cm',
  comprimento: 'length_cm', profundidade: 'length_cm', length: 'length_cm', depth: 'length_cm',
  diametro: 'diameter_cm', diameter: 'diameter_cm', diametrocm: 'diameter_cm',
  capacidade: 'capacity_ml', capacity: 'capacity_ml', capacidademl: 'capacity_ml', volume: 'capacity_ml',
  // Embalagem
  embalagem: 'packing_type', packingtype: 'packing_type', packaging: 'packing_type',
  classificacaoembalagem: 'packing_classification', packingclassification: 'packing_classification',
  embalagemcomercial: 'has_commercial_packaging', commercialpackaging: 'has_commercial_packaging',
  reembalagem: 'repacking_type', repackingtype: 'repacking_type',
  contextoembalagem: 'packaging_context', packagingcontext: 'packaging_context',
  // Caixa
  caixalargura: 'box_width_mm', boxwidth: 'box_width_mm',
  caixaaltura: 'box_height_mm', boxheight: 'box_height_mm',
  caixacomprimento: 'box_length_mm', boxlength: 'box_length_mm',
  caixapeso: 'box_weight_kg', boxweight: 'box_weight_kg',
  qtdporcaixa: 'box_quantity', boxquantity: 'box_quantity', boxqty: 'box_quantity',
  volumecaixa: 'box_volume_cm3', boxvolume: 'box_volume_cm3',
  imagemcaixa: 'box_image', boximage: 'box_image',
  // Mídia
  imagem: 'image_url', image: 'image_url', imageurl: 'image_url', foto: 'image_url', photo: 'image_url',
  imagemprincipal: 'primary_image_url', primaryimage: 'primary_image_url',
  ogimage: 'og_image_url', ogimageurl: 'og_image_url',
  // Fornecedor
  reffornecedor: 'supplier_reference', supplierref: 'supplier_reference', supplierreference: 'supplier_reference',
  referenciaforncedor: 'supplier_reference', fornecedorref: 'supplier_reference',
  idfornecedor: 'supplier_id', supplierid: 'supplier_id',
  // Categorias
  idcategoria: 'category_id', categoryid: 'category_id', categoria: 'category_id',
  categoriaprincipal: 'main_category_id', maincategoryid: 'main_category_id',
  // Quantidades
  qtdminima: 'min_quantity', minquantity: 'min_quantity', minqty: 'min_quantity',
  quantidademinima: 'min_quantity', pedidominimo: 'min_quantity',
  // Flags
  ativo: 'is_active', active: 'is_active', isactive: 'is_active',
  destaque: 'is_featured', featured: 'is_featured', isfeatured: 'is_featured',
  maisvendido: 'is_bestseller', bestseller: 'is_bestseller', isbestseller: 'is_bestseller',
  novidade: 'is_new', new: 'is_new', isnew: 'is_new', lancamento: 'is_new',
  promocao: 'is_on_sale', onsale: 'is_on_sale', isonsale: 'is_on_sale',
  kit: 'is_kit', iskit: 'is_kit', ekit: 'is_kit',
  // Outros
  genero: 'gender', gender: 'gender', sexo: 'gender',
  dimensoes: 'dimensions', dimensions: 'dimensions',
};

export function BulkImportDialog({ open, onOpenChange, onComplete }: BulkImportDialogProps) {
  const [step, setStep] = useState<Step>('upload');
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>('upsert');
  const [progress, setProgress] = useState<BatchImportProgress | null>(null);
  const [importResult, setImportResult] = useState<BatchImportResult | null>(null);
  const [isCheckingSkus, setIsCheckingSkus] = useState(false);
  const [existingSkus, setExistingSkus] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 1: File Upload ──
  const handleFileUpload = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      let parsedHeaders: string[] = [];
      let parsedRows: Record<string, any>[] = [];

      if (ext === 'csv') {
        const text = await file.text();
        const result = parseCSV(text);
        parsedHeaders = result.headers;
        parsedRows = result.rows;
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
        parsedHeaders = Object.keys(json[0]);
        parsedRows = json;
      } else {
        toast.error('Formato não suportado. Use CSV, XLSX ou XLS.');
        return;
      }

      if (parsedRows.length > MAX_ROWS) {
        toast.error(`Arquivo excede o limite de ${MAX_ROWS.toLocaleString()} linhas (${parsedRows.length.toLocaleString()} encontradas)`);
        return;
      }

      if (parsedRows.length === 0) {
        toast.error('Nenhuma linha de dados encontrada');
        return;
      }

      setHeaders(parsedHeaders);
      setRawData(parsedRows);
      setFileName(file.name);

      // Auto-map with the ACTUAL parsed headers (fixes stale state bug)
      const newMapping: ColumnMapping = {};
      const normalizeStr = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

      for (const col of parsedHeaders) {
        const normalized = normalizeStr(col);
        if (ALIAS_MAP[normalized]) {
          const alreadyMapped = Object.values(newMapping).includes(ALIAS_MAP[normalized]);
          if (!alreadyMapped) {
            newMapping[col] = ALIAS_MAP[normalized];
          }
        }
      }
      setMapping(newMapping);

      setStep('mapping');
      toast.success(`${file.name} carregado — ${parsedRows.length.toLocaleString()} linhas`);
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Erro ao ler o arquivo. Verifique o formato.');
    }
  }, []);

  // ── Step 2: Validate + check existing SKUs ──
  const validateData = useCallback(async () => {
    setIsCheckingSkus(true);
    const results: ValidationResult[] = [];
    const requiredFields = TARGET_FIELDS.filter(f => f.required).map(f => f.key);
    const allSkus: string[] = [];

    // First pass: validate rows
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const errors: string[] = [];
      const warnings: string[] = [];
      const mapped: Record<string, any> = {};

      for (const [sourceCol, targetField] of Object.entries(mapping)) {
        if (targetField) mapped[targetField] = row[sourceCol];
      }

      // Required fields
      for (const field of requiredFields) {
        const value = mapped[field];
        if (value === undefined || value === null || String(value).trim() === '') {
          errors.push(`"${TARGET_FIELDS.find(f => f.key === field)?.label}" obrigatório`);
        }
      }

      // Parse price
      if (mapped.sale_price !== undefined && mapped.sale_price !== '') {
        const price = parseFloat(String(mapped.sale_price).replace(',', '.'));
        if (isNaN(price) || price < 0) {
          errors.push('Preço inválido');
        } else {
          mapped.sale_price = price;
        }
      }

      // Parse ALL numeric fields
      const NUMERIC_FIELDS = [
        'cost_price', 'stock_quantity', 'min_quantity',
        'height_cm', 'width_cm', 'length_cm', 'diameter_cm', 'weight_g', 'capacity_ml',
        'box_width_mm', 'box_height_mm', 'box_length_mm', 'box_weight_kg',
        'box_quantity', 'box_volume_cm3',
      ] as const;
      for (const numField of NUMERIC_FIELDS) {
        if (mapped[numField] !== undefined && mapped[numField] !== '') {
          const val = parseFloat(String(mapped[numField]).replace(',', '.'));
          if (isNaN(val)) {
            warnings.push(`"${TARGET_FIELDS.find(f => f.key === numField)?.label}" ignorado (inválido)`);
            mapped[numField] = null;
          } else {
            mapped[numField] = val;
          }
        }
      }

      // Parse boolean fields
      const BOOLEAN_FIELDS = [
        'is_active', 'is_featured', 'is_bestseller', 'is_new',
        'is_on_sale', 'is_kit', 'has_commercial_packaging',
      ] as const;
      for (const boolField of BOOLEAN_FIELDS) {
        if (mapped[boolField] !== undefined && mapped[boolField] !== '') {
          const raw = String(mapped[boolField]).toLowerCase().trim();
          mapped[boolField] = ['true', '1', 'sim', 'yes', 's', 'y', 'x'].includes(raw);
        }
      }

      // Validate URL fields
      const URL_FIELDS = ['image_url', 'primary_image_url', 'og_image_url', 'box_image'] as const;
      for (const urlField of URL_FIELDS) {
        if (mapped[urlField] && typeof mapped[urlField] === 'string') {
          const url = String(mapped[urlField]).trim();
          if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
            warnings.push(`"${TARGET_FIELDS.find(f => f.key === urlField)?.label}" não parece ser uma URL válida`);
          }
        }
      }

      // Detect duplicate SKUs within the file
      const skuCount = allSkus.filter(s => s === sku).length;
      if (skuCount > 1) warnings.push('SKU duplicado dentro do arquivo');

      // Build import row mapping ALL 47 fields
      const importRow: ImportRow | undefined = errors.length === 0 ? {
        sku: sku,
        name: String(mapped.name).trim(),
        sale_price: mapped.sale_price ?? 0,
        // Textos
        description: mapped.description || null,
        short_description: mapped.short_description || null,
        meta_description: mapped.meta_description || null,
        // Comercial
        brand: mapped.brand || null,
        supplier_reference: mapped.supplier_reference || null,
        supplier_id: mapped.supplier_id || null,
        cost_price: mapped.cost_price ?? null,
        stock_quantity: mapped.stock_quantity ?? 0,
        min_quantity: mapped.min_quantity ?? 1,
        category_id: mapped.category_id || null,
        main_category_id: mapped.main_category_id || null,
        // Dimensões
        height_cm: mapped.height_cm ?? null,
        width_cm: mapped.width_cm ?? null,
        length_cm: mapped.length_cm ?? null,
        diameter_cm: mapped.diameter_cm ?? null,
        weight_g: mapped.weight_g ?? null,
        capacity_ml: mapped.capacity_ml ?? null,
        // Embalagem
        packing_type: mapped.packing_type || null,
        packing_classification: mapped.packing_classification || null,
        has_commercial_packaging: mapped.has_commercial_packaging ?? null,
        repacking_type: mapped.repacking_type || null,
        packaging_context: mapped.packaging_context || null,
        // Caixa
        box_width_mm: mapped.box_width_mm ?? null,
        box_height_mm: mapped.box_height_mm ?? null,
        box_length_mm: mapped.box_length_mm ?? null,
        box_weight_kg: mapped.box_weight_kg ?? null,
        box_quantity: mapped.box_quantity ?? null,
        box_volume_cm3: mapped.box_volume_cm3 ?? null,
        box_image: mapped.box_image || null,
        // Mídia
        image_url: mapped.image_url || null,
        primary_image_url: mapped.primary_image_url || mapped.image_url || null,
        og_image_url: mapped.og_image_url || null,
        // Flags
        is_active: mapped.is_active ?? true,
        active: mapped.is_active ?? true,
        is_featured: mapped.is_featured ?? null,
        is_bestseller: mapped.is_bestseller ?? null,
        is_new: mapped.is_new ?? null,
        is_on_sale: mapped.is_on_sale ?? null,
        is_kit: mapped.is_kit ?? null,
        // Outros
        gender: mapped.gender || null,
        dimensions: mapped.dimensions || null,
      } : undefined;

      results.push({
        row: i + 1,
        valid: errors.length === 0,
        errors,
        warnings,
        data: importRow,
        existsInDb: false,
      });
    }

    // Second pass: check existing SKUs in DB
    try {
      const uniqueSkus = [...new Set(allSkus.filter(Boolean))];
      if (uniqueSkus.length > 0) {
        const existing = await checkExistingSkus(uniqueSkus);
        setExistingSkus(existing);
        for (const r of results) {
          if (r.data?.sku && existing.has(r.data.sku)) {
            r.existsInDb = true;
          }
        }
      }
    } catch (err) {
      console.warn('SKU dedup check failed, continuing:', err);
      toast.warning('Não foi possível verificar SKUs existentes');
    }

    setIsCheckingSkus(false);
    setValidationResults(results);
    setStep('preview');
  }, [rawData, mapping]);

  // ── Step 3: Execute Import ──
  const executeImport = useCallback(async () => {
    let rowsToImport: ImportRow[];

    if (importMode === 'insert') {
      // Skip rows that already exist
      rowsToImport = validationResults
        .filter(r => r.valid && r.data && !r.existsInDb)
        .map(r => r.data!);
    } else {
      // Upsert: include all valid rows
      rowsToImport = validationResults
        .filter(r => r.valid && r.data)
        .map(r => r.data!);
    }

    if (rowsToImport.length === 0) {
      toast.error('Nenhuma linha para importar');
      return;
    }

    setStep('importing');

    const result = await executeBatchImport(
      rowsToImport,
      importMode,
      (p) => setProgress({ ...p }),
    );

    setImportResult(result);
    setStep('complete');

    if (result.succeeded > 0) {
      toast.success(`${result.succeeded} produto(s) importado(s)!`);
      onComplete();
    }
    if (result.failed > 0) {
      toast.error(`${result.failed} produto(s) falharam`);
    }
  }, [validationResults, importMode, onComplete]);

  // ── Template download (CSV) ──
  const downloadTemplateCSV = useCallback(() => {
    const labels = TARGET_FIELDS.map(f => `${f.label}${f.required ? ' *' : ''}`);
    const example = [
      'PROD-001', 'Caneta Personalizada', '5.99', 'Caneta esferográfica para brindes',
      'Caneta brinde', 'Caneta personalizada para brindes', 'Marca XYZ',
      'REF-001', '2.50', '1000', '50', '14', '1.2', '15', '10', 'Caixa Individual',
      'https://exemplo.com/imagem.jpg',
    ];

    const csv = '\uFEFF' + [labels.join(';'), example.join(';')].join('\n');
    downloadBlob(csv, 'template_importacao_produtos.csv', 'text/csv;charset=utf-8;');
    toast.success('Template CSV baixado!');
  }, []);

  // ── Template download (Excel) ──
  const downloadTemplateXLSX = useCallback(async () => {
    try {
      const XLSX = await import('@e965/xlsx');
      const ws = XLSX.utils.aoa_to_sheet([
        TARGET_FIELDS.map(f => `${f.label}${f.required ? ' *' : ''}`),
        [
          'PROD-001', 'Caneta Personalizada', 5.99, 'Caneta esferográfica para brindes',
          'Caneta brinde', 'Caneta personalizada para brindes', 'Marca XYZ',
          'REF-001', 2.50, 1000, 50, 14, 1.2, 15, 10, 'Caixa Individual',
          'https://exemplo.com/imagem.jpg',
        ],
      ]);

      // Set column widths
      ws['!cols'] = TARGET_FIELDS.map((_, i) => ({ wch: i < 3 ? 20 : 15 }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
      XLSX.writeFile(wb, 'template_importacao_produtos.xlsx');
      toast.success('Template Excel baixado!');
    } catch {
      toast.error('Erro ao gerar template Excel');
    }
  }, []);

  // ── Error report download ──
  const downloadErrorReport = useCallback(() => {
    if (!importResult) return;

    const failedRows = validationResults
      .filter(r => !r.valid)
      .map(r => ({
        row: r.row,
        sku: r.data?.sku || rawData[r.row - 1]?.sku || '',
        name: r.data?.name || rawData[r.row - 1]?.name || '',
        errors: r.errors,
      }));

    const csv = generateErrorReportCSV(importResult.errors, failedRows);
    downloadBlob(csv, `erros_importacao_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
    toast.success('Relatório de erros baixado');
  }, [importResult, validationResults, rawData]);

  // ── Reset ──
  const reset = () => {
    setStep('upload');
    setRawData([]);
    setHeaders([]);
    setFileName('');
    setMapping({});
    setValidationResults([]);
    setProgress(null);
    setImportResult(null);
    setIsCheckingSkus(false);
    setExistingSkus(new Set());
  };

  // ── Derived state ──
  const requiredMapped = TARGET_FIELDS.filter(f => f.required).every(f =>
    Object.values(mapping).includes(f.key)
  );

  const validCount = validationResults.filter(r => r.valid).length;
  const invalidCount = validationResults.filter(r => !r.valid).length;
  const warningCount = validationResults.filter(r => r.warnings.length > 0).length;
  const existsCount = validationResults.filter(r => r.existsInDb).length;
  const newCount = validationResults.filter(r => r.valid && !r.existsInDb).length;

  const importableCount = importMode === 'insert'
    ? newCount
    : validCount;

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
            {step === 'preview' && 'Revise os dados e escolha o modo de importação'}
            {step === 'importing' && 'Importando produtos em lotes...'}
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
              <p className="text-xs text-muted-foreground mt-1">
                CSV, XLSX ou XLS • Máximo {MAX_ROWS.toLocaleString()} linhas
              </p>
            </div>

            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplateCSV}>
                <Download className="h-4 w-4 mr-2" />
                Template CSV
              </Button>
              <Button variant="outline" size="sm" onClick={downloadTemplateXLSX}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Template Excel
              </Button>
            </div>
          </div>
        )}

        {/* ═══ STEP: MAPPING ═══ */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{headers.length} colunas • {rawData.length.toLocaleString()} linhas</span>
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
              <Button variant="outline" onClick={() => setStep('upload')}>Voltar</Button>
              <Button onClick={validateData} disabled={!requiredMapped || isCheckingSkus}>
                {isCheckingSkus ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando SKUs...
                  </>
                ) : (
                  <>
                    Validar Dados
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ═══ STEP: PREVIEW ═══ */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Stats badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> {validCount} válidos
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" /> {invalidCount} com erro
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="secondary" className="gap-1 text-yellow-600">
                  <AlertTriangle className="h-3 w-3" /> {warningCount} avisos
                </Badge>
              )}
              {existsCount > 0 && (
                <Badge variant="outline" className="gap-1 text-blue-600 border-blue-600/30">
                  <RefreshCw className="h-3 w-3" /> {existsCount} já existem no BD
                </Badge>
              )}
              <Badge variant="outline" className="gap-1 text-green-600 border-green-600/30">
                + {newCount} novos
              </Badge>
            </div>

            {/* Import mode selector */}
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-medium">Modo de Importação</p>
              <RadioGroup
                value={importMode}
                onValueChange={(v) => setImportMode(v as ImportMode)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="upsert" id="mode-upsert" />
                  <Label htmlFor="mode-upsert" className="text-sm cursor-pointer">
                    <span className="font-medium">Upsert</span>
                    <span className="text-muted-foreground ml-1">— insere novos, atualiza existentes (por SKU)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="insert" id="mode-insert" />
                  <Label htmlFor="mode-insert" className="text-sm cursor-pointer">
                    <span className="font-medium">Inserir</span>
                    <span className="text-muted-foreground ml-1">— apenas novos ({newCount}), pula existentes</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Data table */}
            <ScrollArea className="h-[280px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-16">Status</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>BD</TableHead>
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
                      <TableCell className="font-mono text-xs">
                        {r.data?.sku || rawData[r.row - 1]?.[Object.entries(mapping).find(([, v]) => v === 'sku')?.[0] || ''] || '—'}
                      </TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate">
                        {r.data?.name || rawData[r.row - 1]?.[Object.entries(mapping).find(([, v]) => v === 'name')?.[0] || ''] || '—'}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {r.data?.sale_price ? `R$ ${Number(r.data.sale_price).toFixed(2)}` : '—'}
                      </TableCell>
                      <TableCell>
                        {r.existsInDb ? (
                          <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-600/30">Existe</Badge>
                        ) : r.valid ? (
                          <Badge variant="outline" className="text-[10px] text-green-600 border-green-600/30">Novo</Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {r.errors.length > 0 && (
                          <p className="text-[10px] text-destructive">{r.errors.join('; ')}</p>
                        )}
                        {r.warnings.length > 0 && (
                          <p className="text-[10px] text-yellow-600">{r.warnings.join('; ')}</p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('mapping')}>Voltar ao Mapeamento</Button>
              <Button onClick={executeImport} disabled={importableCount === 0}>
                Importar {importableCount} produto(s)
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
              <p className="text-sm font-medium">Importando produtos em lotes...</p>
              <p className="text-xs text-muted-foreground mt-1">
                Lote {progress.currentChunk} de {progress.totalChunks} •{' '}
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
        {step === 'complete' && importResult && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              {importResult.failed === 0 ? (
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              ) : (
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
              )}
              <p className="text-lg font-semibold">Importação Concluída</p>
              <div className="flex justify-center gap-4 mt-2 text-sm">
                <span className="text-green-500 font-medium">{importResult.succeeded} importados</span>
                {importResult.failed > 0 && (
                  <span className="text-destructive font-medium">{importResult.failed} falharam</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Modo: {importMode === 'upsert' ? 'Upsert (inserir/atualizar)' : 'Apenas inserção'}
              </p>
            </div>

            {importResult.errors.length > 0 && (
              <ScrollArea className="h-[150px] border rounded-lg p-3">
                <p className="text-xs font-medium mb-2">Erros detalhados:</p>
                {importResult.errors.map((e, i) => (
                  <p key={i} className="text-xs text-destructive mb-1">
                    Linhas {e.startRow}–{e.endRow}: {e.message}
                  </p>
                ))}
              </ScrollArea>
            )}

            <div className="flex justify-center gap-2">
              {(importResult.failed > 0 || invalidCount > 0) && (
                <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Baixar Erros
                </Button>
              )}
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

// ── Helpers ──

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const firstLine = text.split('\n')[0];
  const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
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
