import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  useExternalProducts, 
  useExternalProductImages,
  useExternalCategories,
  useExternalSuppliers,
  useExternalTechniques,
  useExternalTags,
  useExternalSupplierColors,
  useExternalSupplierMaterials,
  ExternalProduct,
  ExternalCategory,
  ExternalSupplier,
  ExternalTechnique,
  ExternalTag,
  ExternalSupplierColor,
  ExternalSupplierMaterial,
} from './useExternalDatabase';

// Tipos para o formulário de cadastro
export interface ProductFormData {
  // Dados básicos obrigatórios
  name: string;
  sku: string;
  price: number;
  supplier_id: string;
  category_id: string;
  
  // Imagens (obrigatório pelo menos 1)
  images: ProductImageInput[];
  
  // Cores (obrigatório pelo menos 1)
  colors: string[];
  
  // Materiais (obrigatório pelo menos 1)
  materials: string[];
  
  // Dados opcionais
  description?: string;
  short_description?: string;
  cost_price?: number;
  subcategory_id?: string;
  brand?: string;
  model?: string;
  weight_grams?: number;
  width_cm?: number;
  height_cm?: number;
  depth_cm?: number;
  min_quantity?: number;
  stock?: number;
  lead_time_days?: number;
  is_kit?: boolean;
  is_active?: boolean;
  
  // Técnicas de personalização
  technique_ids?: string[];
  
  // Tags
  tag_ids?: string[];
}

export interface ProductImageInput {
  url: string;
  alt_text?: string;
  is_primary?: boolean;
  image_type?: 'main' | 'gallery' | 'detail' | 'mockup';
}

// Tipo para importação em massa
export interface BulkImportRow {
  name: string;
  sku: string;
  price: number | string;
  supplier_name?: string;
  supplier_id?: string;
  category_name?: string;
  category_id?: string;
  description?: string;
  cost_price?: number | string;
  brand?: string;
  model?: string;
  weight_grams?: number | string;
  colors?: string; // Separados por vírgula
  materials?: string; // Separados por vírgula
  images?: string; // URLs separadas por vírgula
  stock?: number | string;
  min_quantity?: number | string;
  [key: string]: unknown;
}

export interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  row: number;
  data?: ProductFormData;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: keyof ProductFormData | '';
  required: boolean;
}

// Hook principal de cadastro
export function useProductRegistration() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
  } | null>(null);

  const productsDb = useExternalProducts();
  const imagesDb = useExternalProductImages();
  const categoriesDb = useExternalCategories();
  const suppliersDb = useExternalSuppliers();
  const techniquesDb = useExternalTechniques();
  const tagsDb = useExternalTags();
  const colorsDb = useExternalSupplierColors();
  const materialsDb = useExternalSupplierMaterials();

  // Carregar dados de referência
  const [referenceData, setReferenceData] = useState<{
    categories: ExternalCategory[];
    suppliers: ExternalSupplier[];
    techniques: ExternalTechnique[];
    tags: ExternalTag[];
    colors: ExternalSupplierColor[];
    materials: ExternalSupplierMaterial[];
    isLoading: boolean;
    error: string | null;
  }>({
    categories: [],
    suppliers: [],
    techniques: [],
    tags: [],
    colors: [],
    materials: [],
    isLoading: false,
    error: null,
  });

  const loadReferenceData = useCallback(async () => {
    setReferenceData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [
        categoriesResult,
        suppliersResult,
        techniquesResult,
        tagsResult,
        colorsResult,
        materialsResult,
      ] = await Promise.all([
        categoriesDb.fetchAll({ filters: { is_active: true }, limit: 500 }),
        suppliersDb.fetchAll({ limit: 200 }),
        techniquesDb.fetchAll({ filters: { is_active: true }, limit: 100 }),
        tagsDb.fetchAll({ limit: 500 }),
        colorsDb.fetchAll({ limit: 500 }),
        materialsDb.fetchAll({ limit: 500 }),
      ]);

      setReferenceData({
        categories: categoriesResult?.records || [],
        suppliers: suppliersResult?.records || [],
        techniques: techniquesResult?.records || [],
        tags: tagsResult?.records || [],
        colors: colorsResult?.records || [],
        materials: materialsResult?.records || [],
        isLoading: false,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar dados de referência';
      setReferenceData(prev => ({ ...prev, isLoading: false, error: message }));
      toast.error(message);
    }
  }, [categoriesDb, suppliersDb, techniquesDb, tagsDb, colorsDb, materialsDb]);

  // Criar produto individual
  const createProduct = useCallback(async (data: ProductFormData): Promise<ExternalProduct | null> => {
    setIsSubmitting(true);

    try {
      // Criar o produto principal
      const productData: Partial<ExternalProduct> = {
        name: data.name,
        sku: data.sku,
        price: data.price,
        supplier_id: data.supplier_id,
        category_id: data.category_id,
        description: data.description,
        short_description: data.short_description,
        cost_price: data.cost_price,
        subcategory_id: data.subcategory_id,
        brand: data.brand,
        model: data.model,
        weight_grams: data.weight_grams,
        width_cm: data.width_cm,
        height_cm: data.height_cm,
        depth_cm: data.depth_cm,
        min_quantity: data.min_quantity || 1,
        stock: data.stock || 0,
        lead_time_days: data.lead_time_days,
        is_kit: data.is_kit || false,
        is_active: data.is_active ?? true,
      };

      const createdProduct = await productsDb.create(productData);

      if (!createdProduct) {
        throw new Error('Falha ao criar produto');
      }

      // Criar imagens do produto
      if (data.images && data.images.length > 0) {
        await Promise.all(
          data.images.map((img, index) =>
            imagesDb.create({
              product_id: createdProduct.id,
              url: img.url,
              alt_text: img.alt_text || data.name,
              position: index,
              is_primary: img.is_primary || index === 0,
              image_type: img.image_type || 'main',
            })
          )
        );
      }

      toast.success(`Produto "${data.name}" cadastrado com sucesso!`);
      return createdProduct;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao cadastrar produto';
      toast.error(message);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [productsDb, imagesDb]);

  // Validar linha de importação
  const validateImportRow = useCallback((
    row: BulkImportRow, 
    rowNumber: number,
    suppliers: ExternalSupplier[],
    categories: ExternalCategory[]
  ): ImportValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validações obrigatórias
    if (!row.name?.trim()) {
      errors.push('Nome é obrigatório');
    }
    if (!row.sku?.trim()) {
      errors.push('SKU é obrigatório');
    }
    
    const price = typeof row.price === 'string' ? parseFloat(row.price) : row.price;
    if (isNaN(price) || price <= 0) {
      errors.push('Preço deve ser um número maior que zero');
    }

    // Resolver fornecedor
    let supplierId = row.supplier_id;
    if (!supplierId && row.supplier_name) {
      const supplier = suppliers.find(s => 
        s.name.toLowerCase() === row.supplier_name?.toLowerCase()
      );
      if (supplier) {
        supplierId = supplier.id;
      } else {
        errors.push(`Fornecedor "${row.supplier_name}" não encontrado`);
      }
    }
    if (!supplierId) {
      errors.push('Fornecedor é obrigatório');
    }

    // Resolver categoria
    let categoryId = row.category_id;
    if (!categoryId && row.category_name) {
      const category = categories.find(c => 
        c.name.toLowerCase() === row.category_name?.toLowerCase()
      );
      if (category) {
        categoryId = category.id;
      } else {
        warnings.push(`Categoria "${row.category_name}" não encontrada`);
      }
    }
    if (!categoryId) {
      errors.push('Categoria é obrigatória');
    }

    // Processar cores
    const colors = row.colors?.split(',').map(c => c.trim()).filter(Boolean) || [];
    if (colors.length === 0) {
      errors.push('Pelo menos uma cor é obrigatória');
    }

    // Processar materiais
    const materials = row.materials?.split(',').map(m => m.trim()).filter(Boolean) || [];
    if (materials.length === 0) {
      errors.push('Pelo menos um material é obrigatório');
    }

    // Processar imagens
    const imageUrls = row.images?.split(',').map(u => u.trim()).filter(Boolean) || [];
    if (imageUrls.length === 0) {
      errors.push('Pelo menos uma imagem é obrigatória');
    }

    const images: ProductImageInput[] = imageUrls.map((url, idx) => ({
      url,
      is_primary: idx === 0,
      image_type: 'main' as const,
    }));

    if (errors.length > 0) {
      return { valid: false, errors, warnings, row: rowNumber };
    }

    return {
      valid: true,
      errors: [],
      warnings,
      row: rowNumber,
      data: {
        name: row.name.trim(),
        sku: row.sku.trim(),
        price,
        supplier_id: supplierId!,
        category_id: categoryId!,
        description: row.description?.trim(),
        cost_price: row.cost_price ? parseFloat(String(row.cost_price)) : undefined,
        brand: row.brand?.trim(),
        model: row.model?.trim(),
        weight_grams: row.weight_grams ? parseInt(String(row.weight_grams)) : undefined,
        stock: row.stock ? parseInt(String(row.stock)) : 0,
        min_quantity: row.min_quantity ? parseInt(String(row.min_quantity)) : 1,
        colors,
        materials,
        images,
      },
    };
  }, []);

  // Importar produtos em massa
  const importProducts = useCallback(async (
    rows: BulkImportRow[],
    onProgress?: (progress: typeof importProgress) => void
  ): Promise<{
    succeeded: number;
    failed: number;
    errors: Array<{ row: number; errors: string[] }>;
  }> => {
    const suppliers = referenceData.suppliers;
    const categories = referenceData.categories;

    const progress = {
      total: rows.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
    };
    setImportProgress(progress);
    onProgress?.(progress);

    const errors: Array<{ row: number; errors: string[] }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const validation = validateImportRow(row, i + 1, suppliers, categories);

      if (!validation.valid) {
        progress.failed++;
        errors.push({ row: i + 1, errors: validation.errors });
      } else if (validation.data) {
        try {
          await createProduct(validation.data);
          progress.succeeded++;
        } catch {
          progress.failed++;
          errors.push({ row: i + 1, errors: ['Erro ao salvar no banco de dados'] });
        }
      }

      progress.processed++;
      setImportProgress({ ...progress });
      onProgress?.({ ...progress });
    }

    if (progress.succeeded > 0) {
      toast.success(`${progress.succeeded} produto(s) importado(s) com sucesso!`);
    }
    if (progress.failed > 0) {
      toast.error(`${progress.failed} produto(s) falharam na importação`);
    }

    setImportProgress(null);
    return { succeeded: progress.succeeded, failed: progress.failed, errors };
  }, [referenceData, validateImportRow, createProduct]);

  // Gerar template CSV
  const generateTemplate = useCallback(() => {
    const headers = [
      'name',
      'sku',
      'price',
      'supplier_name',
      'category_name',
      'description',
      'cost_price',
      'brand',
      'model',
      'weight_grams',
      'colors',
      'materials',
      'images',
      'stock',
      'min_quantity',
    ];

    const exampleRow = [
      'Caneta Personalizada',
      'CAN-001',
      '5.99',
      'Fornecedor ABC',
      'Canetas',
      'Caneta esferográfica para brindes',
      '2.50',
      'Marca XYZ',
      'Modelo Standard',
      '15',
      'Azul,Vermelho,Preto',
      'Plástico,Metal',
      'https://exemplo.com/imagem1.jpg,https://exemplo.com/imagem2.jpg',
      '1000',
      '50',
    ];

    const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_produtos.csv';
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Template baixado com sucesso!');
  }, []);

  return {
    // Estados
    isSubmitting,
    importProgress,
    referenceData,
    
    // Ações
    loadReferenceData,
    createProduct,
    importProducts,
    validateImportRow,
    generateTemplate,
  };
}

// Campos disponíveis para mapeamento
export const PRODUCT_FIELDS: Array<{
  key: keyof ProductFormData;
  label: string;
  required: boolean;
  type: 'text' | 'number' | 'list';
}> = [
  { key: 'name', label: 'Nome do Produto', required: true, type: 'text' },
  { key: 'sku', label: 'SKU', required: true, type: 'text' },
  { key: 'price', label: 'Preço', required: true, type: 'number' },
  { key: 'supplier_id', label: 'Fornecedor', required: true, type: 'text' },
  { key: 'category_id', label: 'Categoria', required: true, type: 'text' },
  { key: 'images', label: 'Imagens (URLs)', required: true, type: 'list' },
  { key: 'colors', label: 'Cores', required: true, type: 'list' },
  { key: 'materials', label: 'Materiais', required: true, type: 'list' },
  { key: 'description', label: 'Descrição', required: false, type: 'text' },
  { key: 'short_description', label: 'Descrição Curta', required: false, type: 'text' },
  { key: 'cost_price', label: 'Preço de Custo', required: false, type: 'number' },
  { key: 'brand', label: 'Marca', required: false, type: 'text' },
  { key: 'model', label: 'Modelo', required: false, type: 'text' },
  { key: 'weight_grams', label: 'Peso (g)', required: false, type: 'number' },
  { key: 'width_cm', label: 'Largura (cm)', required: false, type: 'number' },
  { key: 'height_cm', label: 'Altura (cm)', required: false, type: 'number' },
  { key: 'depth_cm', label: 'Profundidade (cm)', required: false, type: 'number' },
  { key: 'stock', label: 'Estoque', required: false, type: 'number' },
  { key: 'min_quantity', label: 'Quantidade Mínima', required: false, type: 'number' },
  { key: 'lead_time_days', label: 'Prazo de Entrega (dias)', required: false, type: 'number' },
];
