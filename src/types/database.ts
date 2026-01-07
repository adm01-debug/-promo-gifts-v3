// Database entity types
export interface Product {
  id: string;
  name: string;
  description?: string;
  category_id: string;
  price: number;
  image_url?: string;
  stock?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Color {
  id: string;
  name: string;
  hex_code: string;
  created_at?: string;
  updated_at?: string;
}

// Input types (for creation/updates - without id and timestamps)
export type ProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at'>;
export type ClientInput = Omit<Client, 'id' | 'created_at' | 'updated_at'>;
export type SupplierInput = Omit<Supplier, 'id' | 'created_at' | 'updated_at'>;
export type CategoryInput = Omit<Category, 'id' | 'created_at' | 'updated_at'>;
export type ColorInput = Omit<Color, 'id' | 'created_at' | 'updated_at'>;

// Filters
export interface ProductFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export interface ClientFilters {
  search?: string;
  company?: string;
}

export interface SupplierFilters {
  search?: string;
}

// Pagination
export interface PaginatedResult<T> {
  data: T[];
  totalPages: number;
  currentPage: number;
  totalCount: number;
}

// API Response
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

// Mutation status
export interface MutationStatus {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
}
