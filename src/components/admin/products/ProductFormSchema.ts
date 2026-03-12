import { z } from 'zod';

export const productFormSchema = z.object({
  // Info básica
  sku: z.string().trim().min(1, 'SKU é obrigatório').max(50, 'SKU muito longo'),
  name: z.string().trim().min(1, 'Nome é obrigatório').max(300, 'Nome muito longo'),
  description: z.string().max(5000, 'Descrição muito longa').optional().default(''),
  short_description: z.string().max(500, 'Descrição curta muito longa').optional().default(''),
  brand: z.string().max(100).optional().default(''),

  // Categoria e fornecedor (IDs reais do BD externo)
  category_id: z.string().optional().default(''),
  supplier_id: z.string().optional().default(''),

  // Preço e estoque
  sale_price: z.coerce.number().min(0, 'Preço não pode ser negativo').default(0),
  cost_price: z.coerce.number().min(0).optional().default(0),
  stock_quantity: z.coerce.number().int().min(0).default(0),
  min_quantity: z.coerce.number().int().min(1).default(1),

  // Dimensões físicas
  height_cm: z.coerce.number().min(0).optional().nullable(),
  width_cm: z.coerce.number().min(0).optional().nullable(),
  length_cm: z.coerce.number().min(0).optional().nullable(),
  diameter_cm: z.coerce.number().min(0).optional().nullable(),
  weight_g: z.coerce.number().min(0).optional().nullable(),
  capacity_ml: z.coerce.number().min(0).optional().nullable(),

  // Embalagem
  box_width_mm: z.coerce.number().min(0).optional().nullable(),
  box_height_mm: z.coerce.number().min(0).optional().nullable(),
  box_length_mm: z.coerce.number().min(0).optional().nullable(),
  box_weight_kg: z.coerce.number().min(0).optional().nullable(),
  box_quantity: z.coerce.number().int().min(0).optional().nullable(),

  // Materiais
  materials: z.string().optional().default(''),

  // Flags
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  is_new: z.boolean().default(false),
  is_on_sale: z.boolean().default(false),
  is_kit: z.boolean().default(false),
  has_commercial_packaging: z.boolean().default(false),
});

export type ProductFormData = z.infer<typeof productFormSchema>;

export const defaultFormValues: ProductFormData = {
  sku: '',
  name: '',
  description: '',
  short_description: '',
  brand: '',
  category_id: '',
  supplier_id: '',
  sale_price: 0,
  cost_price: 0,
  stock_quantity: 0,
  min_quantity: 1,
  height_cm: null,
  width_cm: null,
  length_cm: null,
  diameter_cm: null,
  weight_g: null,
  capacity_ml: null,
  box_width_mm: null,
  box_height_mm: null,
  box_length_mm: null,
  box_weight_kg: null,
  box_quantity: null,
  materials: '',
  is_active: true,
  is_featured: false,
  is_new: false,
  is_on_sale: false,
  is_kit: false,
  has_commercial_packaging: false,
};
