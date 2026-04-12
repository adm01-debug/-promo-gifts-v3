/**
 * Import-related logic extracted from useProductRegistration
 */
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { 
  ProductFormData, 
  ProductImageInput, 
  BulkImportRow, 
  ImportValidationResult 
} from './useProductRegistration';
import type { ExternalSupplier, ExternalCategory } from './useExternalDatabase';

export function useProductImport(
  referenceData: { suppliers: ExternalSupplier[]; categories: ExternalCategory[] },
  createProduct: (data: ProductFormData) => Promise<any>
) {
  const [importProgress, setImportProgress] = useState<{
    total: number; processed: number; succeeded: number; failed: number;
  } | null>(null);

  const validateImportRow = useCallback((
    row: BulkImportRow, rowNumber: number,
    suppliers: ExternalSupplier[], categories: ExternalCategory[]
  ): ImportValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!row.name?.trim()) errors.push('Nome é obrigatório');
    if (!row.sku?.trim()) errors.push('SKU é obrigatório');

    const price = typeof row.price === 'string' ? parseFloat(row.price) : row.price;
    if (isNaN(price) || price <= 0) errors.push('Preço deve ser um número maior que zero');

    let supplierId = row.supplier_id;
    if (!supplierId && row.supplier_name) {
      const supplier = suppliers.find(s => s.name.toLowerCase() === row.supplier_name?.toLowerCase());
      if (supplier) supplierId = supplier.id;
      else errors.push(`Fornecedor "${row.supplier_name}" não encontrado`);
    }
    if (!supplierId) errors.push('Fornecedor é obrigatório');

    let categoryId = row.category_id;
    if (!categoryId && row.category_name) {
      const category = categories.find(c => c.name.toLowerCase() === row.category_name?.toLowerCase());
      if (category) categoryId = category.id;
      else warnings.push(`Categoria "${row.category_name}" não encontrada`);
    }
    if (!categoryId) errors.push('Categoria é obrigatória');

    const colors = row.colors?.split(',').map(c => c.trim()).filter(Boolean) || [];
    if (colors.length === 0) errors.push('Pelo menos uma cor é obrigatória');

    const materials = row.materials?.split(',').map(m => m.trim()).filter(Boolean) || [];
    if (materials.length === 0) errors.push('Pelo menos um material é obrigatório');

    const imageUrls = row.images?.split(',').map(u => u.trim()).filter(Boolean) || [];
    if (imageUrls.length === 0) errors.push('Pelo menos uma imagem é obrigatória');

    const images: ProductImageInput[] = imageUrls.map((url, idx) => ({
      url, is_primary: idx === 0, image_type: 'main' as const,
    }));

    if (errors.length > 0) return { valid: false, errors, warnings, row: rowNumber };

    return {
      valid: true, errors: [], warnings, row: rowNumber,
      data: {
        name: row.name.trim(), sku: row.sku.trim(), price,
        supplier_id: supplierId!, category_id: categoryId!,
        description: row.description?.trim(),
        cost_price: row.cost_price ? parseFloat(String(row.cost_price)) : undefined,
        brand: row.brand?.trim(), model: row.model?.trim(),
        weight_grams: row.weight_grams ? parseInt(String(row.weight_grams)) : undefined,
        stock: row.stock ? parseInt(String(row.stock)) : 0,
        min_quantity: row.min_quantity ? parseInt(String(row.min_quantity)) : 1,
        colors, materials, images,
      },
    };
  }, []);

  const importProducts = useCallback(async (
    rows: BulkImportRow[],
    onProgress?: (progress: typeof importProgress) => void
  ) => {
    const { suppliers, categories } = referenceData;
    const progress = { total: rows.length, processed: 0, succeeded: 0, failed: 0 };
    setImportProgress(progress);
    onProgress?.(progress);

    const errors: Array<{ row: number; errors: string[] }> = [];

    for (let i = 0; i < rows.length; i++) {
      const validation = validateImportRow(rows[i], i + 1, suppliers, categories);
      if (!validation.valid) {
        progress.failed++;
        errors.push({ row: i + 1, errors: validation.errors });
      } else if (validation.data) {
        try { await createProduct(validation.data); progress.succeeded++; }
        catch { progress.failed++; errors.push({ row: i + 1, errors: ['Erro ao salvar no banco de dados'] }); }
      }
      progress.processed++;
      setImportProgress({ ...progress });
      onProgress?.({ ...progress });
    }

    if (progress.succeeded > 0) toast.success(`${progress.succeeded} produto(s) importado(s) com sucesso!`);
    if (progress.failed > 0) toast.error(`${progress.failed} produto(s) falharam na importação`);
    setImportProgress(null);
    return { succeeded: progress.succeeded, failed: progress.failed, errors };
  }, [referenceData, validateImportRow, createProduct]);

  const generateTemplate = useCallback(() => {
    const headers = ['name','sku','price','supplier_name','category_name','description','cost_price','brand','model','weight_grams','colors','materials','images','stock','min_quantity'];
    const exampleRow = ['Caneta Personalizada','CAN-001','5.99','Fornecedor ABC','Canetas','Caneta esferográfica para brindes','2.50','Marca XYZ','Modelo Standard','15','Azul,Vermelho,Preto','Plástico,Metal','https://exemplo.com/imagem1.jpg,https://exemplo.com/imagem2.jpg','1000','50'];
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

  return { importProgress, importProducts, validateImportRow, generateTemplate };
}
