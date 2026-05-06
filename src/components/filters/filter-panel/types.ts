import React from 'react';
import { LucideIcon, Palette, Package, Truck, DollarSign, Users, Calendar, Heart, Layers, Briefcase, Settings, Tag, Zap, ArrowDownWideNarrow } from 'lucide-react';

export interface FilterState {
  search: string;
  categories: string[];
  suppliers: string[];
  colors: string[];
  materials: string[];
  techniques: string[];
  tags: string[];
  colorGroups: string[];
  colorVariations: string[];
  colorNuances: string[];
  datasComemorativas: string[];
  publicoAlvo: string[];
  endomarketing: string[];
  ramosAtividade: string[];
  segmentosAtividade: string[];
  priceRange: [number, number];
  quantityRange: [number, number];
  stockStatus: string;
  minStock: number;
  isKit: boolean;
  isFeatured: boolean;
  isNew: boolean;
  hasPersonalization: boolean;
  maxLeadTimeDays: number | null;
  sortBy: string;
  gender: string[];
  sizes: string[];
  materialGroups: string[];
  materialTypes: string[];
}

export interface FilterPanelProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
  activeFiltersCount: number;
  products?: any[];
  viewMode?: string;
  onViewModeChange?: (mode: string) => void;
  gridColumns?: number;
  onGridColumnsChange?: (cols: number) => void;
  filteredResultsCount?: number;
}

export const defaultFilters: FilterState = {
  search: '',
  categories: [],
  suppliers: [],
  colors: [],
  materials: [],
  techniques: [],
  tags: [],
  colorGroups: [],
  colorVariations: [],
  colorNuances: [],
  datasComemorativas: [],
  publicoAlvo: [],
  endomarketing: [],
  ramosAtividade: [],
  segmentosAtividade: [],
  priceRange: [0, 9999],
  quantityRange: [1, 10000],
  stockStatus: 'all',
  minStock: 0,
  isKit: false,
  isFeatured: false,
  isNew: false,
  hasPersonalization: false,
  maxLeadTimeDays: null,
  sortBy: 'relevance',
  gender: [],
  sizes: [],
  materialGroups: [],
  materialTypes: [],
};

export const SECTION_CONFIG: Record<string, { title: string; icon: React.ReactNode }> = {
  cores: { title: 'Cores', icon: React.createElement(Palette, { className: "h-4 w-4" }) },
  categorias: { title: 'Categorias', icon: React.createElement(Package, { className: "h-4 w-4" }) },
  estoque: { title: 'Estoque Mínimo', icon: React.createElement(Layers, { className: "h-4 w-4" }) },
  preco: { title: 'Faixa de Preço', icon: React.createElement(DollarSign, { className: "h-4 w-4" }) },
  fornecedores: { title: 'Fornecedores', icon: React.createElement(Truck, { className: "h-4 w-4" }) },
  publico: { title: 'Público Alvo', icon: React.createElement(Users, { className: "h-4 w-4" }) },
  'datas-comemorativas': { title: 'Datas Comemorativas', icon: React.createElement(Calendar, { className: "h-4 w-4" }) },
  endomarketing: { title: 'Endomarketing', icon: React.createElement(Heart, { className: "h-4 w-4" }) },
  materiais: { title: 'Materiais', icon: React.createElement(Layers, { className: "h-4 w-4" }) },
  'ramos-atividade': { title: 'Ramos de Atividade', icon: React.createElement(Briefcase, { className: "h-4 w-4" }) },
  tecnicas: { title: 'Técnicas de Gravação', icon: React.createElement(Settings, { className: "h-4 w-4" }) },
  tags: { title: 'Etiquetas / Tags', icon: React.createElement(Tag, { className: "h-4 w-4" }) },
  'opcoes-rapidas': { title: 'Opções Rápidas', icon: React.createElement(Zap, { className: "h-4 w-4" }) },
  ordenacao: { title: 'Ordenação', icon: React.createElement(ArrowDownWideNarrow, { className: "h-4 w-4" }) },
  genero: { title: 'Gênero', icon: React.createElement(Users, { className: "h-4 w-4" }) },
  tamanhos: { title: 'Tamanhos', icon: React.createElement(Package, { className: "h-4 w-4" }) },
};

export const SECTION_GROUPS = [
  { label: 'Produto', icon: Package, sections: ['cores', 'categorias', 'tamanhos', 'genero', 'materiais', 'tags'] },
  { label: 'Comercial', icon: DollarSign, sections: ['estoque', 'preco', 'fornecedores', 'tecnicas', 'opcoes-rapidas'] },
  { label: 'Marketing', icon: Zap, sections: ['publico', 'datas-comemorativas', 'endomarketing', 'ramos-atividade'] },
  { label: 'Visualização', icon: ArrowDownWideNarrow, sections: ['ordenacao'] },
];
