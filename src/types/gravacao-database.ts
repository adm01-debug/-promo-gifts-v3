// Tipos para o banco de dados externo de Gravação (Promobrind)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// === TABELA PRINCIPAL: tecnica_gravacao ===
export interface TecnicaGravacao {
  id: string;
  codigo: string;
  codigo_interno: string;
  nome: string;
  slug: string;
  descricao: string | null;
  permite_cores: boolean;
  max_cores: number;
  cobra_por_cor: boolean;
  cobra_por_area: boolean;
  cobra_por_pontos: boolean;
  requer_setup: boolean;
  tipo_setup: TipoSetup;
  tempo_producao_dias: number;
  ordem_exibicao: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type TipoSetup = 'nenhum' | 'fotolito' | 'cliche' | 'matriz' | 'arte_digital';

// === VARIANTES ===
export interface TecnicaGravacaoVariante {
  id: string;
  tecnica_gravacao_id: string;
  codigo: string;
  codigo_interno: string;
  nome: string;
  slug: string;
  descricao: string | null;
  formato: FormatoVariante;
  permite_cores: boolean;
  max_cores: number;
  cobra_por_cor: boolean;
  produtos_tipicos: string[];
  ordem_exibicao: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type FormatoVariante = 'plana' | 'cilindrica' | 'textil' | 'patch';

// === FORNECEDORES ===
export interface FornecedorGravacao {
  id: string;
  codigo: string;
  nome: string;
  nome_curto: string;
  tipo_integracao: TipoIntegracao;
  api_endpoint: string | null;
  api_access_key: string | null;
  api_ativo: boolean;
  contato_nome: string | null;
  contato_telefone: string | null;
  contato_email: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type TipoIntegracao = 'api_spot' | 'api_rest' | 'manual';


// === FAIXAS DE ÁREA ===
export interface TecnicaFaixaArea {
  id: string;
  tecnica_gravacao_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  area_minima_cm2: number | null;
  area_maxima_cm2: number | null;
  multiplicador_preco: number;
  valor_adicional_peca: number;
  ordem_exibicao: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// === FAIXAS DE PONTOS (Bordado) ===
export interface TecnicaFaixaPontos {
  id: string;
  tecnica_gravacao_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  pontos_minimo: number | null;
  pontos_maximo: number | null;
  area_tipica_cm2: number | null;
  multiplicador_preco: number;
  ordem_exibicao: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// === OPÇÕES AUXILIARES ===
export interface HotStampingFitaOpcao {
  id: string;
  codigo: string;
  nome: string;
  cor_hex: string | null;
  tipo: 'metalico' | 'holografico' | 'fosco';
  multiplicador_preco: number;
  ordem_exibicao: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LaserAcabamentoOpcao {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  multiplicador_preco: number;
  ordem_exibicao: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TecnicaTipoFilme {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  multiplicador_preco: number;
  ordem_exibicao: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

// === DATABASE TYPE ===
export interface Database {
  public: {
    Tables: {
      tecnica_gravacao: {
        Row: TecnicaGravacao;
        Insert: Omit<TecnicaGravacao, 'id' | 'created_at' | 'updated_at' | 'slug'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          slug?: string;
        };
        Update: Partial<Omit<TecnicaGravacao, 'id' | 'created_at'>>;
      };
      tecnica_gravacao_variante: {
        Row: TecnicaGravacaoVariante;
        Insert: Omit<TecnicaGravacaoVariante, 'id' | 'created_at' | 'updated_at' | 'slug'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          slug?: string;
        };
        Update: Partial<Omit<TecnicaGravacaoVariante, 'id' | 'created_at'>>;
      };
      fornecedor_gravacao: {
        Row: FornecedorGravacao;
        Insert: Omit<FornecedorGravacao, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<FornecedorGravacao, 'id' | 'created_at'>>;
      };
      tecnica_faixa_area: {
        Row: TecnicaFaixaArea;
        Insert: Omit<TecnicaFaixaArea, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<TecnicaFaixaArea, 'id' | 'created_at'>>;
      };
      tecnica_faixa_pontos: {
        Row: TecnicaFaixaPontos;
        Insert: Omit<TecnicaFaixaPontos, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<TecnicaFaixaPontos, 'id' | 'created_at'>>;
      };
      hot_stamping_fita_opcao: {
        Row: HotStampingFitaOpcao;
        Insert: Omit<HotStampingFitaOpcao, 'id'> & { id?: string };
        Update: Partial<Omit<HotStampingFitaOpcao, 'id'>>;
      };
      laser_acabamento_opcao: {
        Row: LaserAcabamentoOpcao;
        Insert: Omit<LaserAcabamentoOpcao, 'id'> & { id?: string };
        Update: Partial<Omit<LaserAcabamentoOpcao, 'id'>>;
      };
      tecnica_tipo_filme: {
        Row: TecnicaTipoFilme;
        Insert: Omit<TecnicaTipoFilme, 'id'> & { id?: string };
        Update: Partial<Omit<TecnicaTipoFilme, 'id'>>;
      };
    };
  };
}

// === TIPOS PARA FORMULÁRIOS ===
export interface TecnicaGravacaoFormData {
  codigo: string;
  codigo_interno: string;
  nome: string;
  descricao: string;
  permite_cores: boolean;
  max_cores: number;
  cobra_por_cor: boolean;
  cobra_por_area: boolean;
  cobra_por_pontos: boolean;
  requer_setup: boolean;
  tipo_setup: TipoSetup;
  tempo_producao_dias: number;
  ordem_exibicao: number;
  ativo: boolean;
}

export interface VarianteFormData {
  tecnica_gravacao_id: string;
  codigo: string;
  codigo_interno: string;
  nome: string;
  descricao: string;
  formato: FormatoVariante;
  permite_cores: boolean;
  max_cores: number;
  cobra_por_cor: boolean;
  produtos_tipicos: string[];
  ordem_exibicao: number;
  ativo: boolean;
}

// === TIPOS COM RELACIONAMENTOS ===
export interface TecnicaGravacaoWithVariantes extends TecnicaGravacao {
  variantes: TecnicaGravacaoVariante[];
  variantes_count?: number;
}

