/**
 * Tipos do CRM externo (pgxfvjmuubtbowutlide)
 * Fonte única de verdade para dados de clientes/empresas
 */

// ============================================
// EMPRESAS (companies)
// ============================================

export interface CrmCompany {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  ramo: string | null;
  nicho: string | null;
  porte: string | null;
  status: string;
  is_active: boolean;
  origem: string | null;
  // Endereço principal
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  pais: string | null;
  // Cores da marca
  cor_primaria_nome: string | null;
  cor_primaria_hex: string | null;
  cor_secundaria_nome: string | null;
  cor_secundaria_hex: string | null;
  logo_url: string | null;
  // Financeiro
  total_gasto: number | null;
  total_pedidos: number | null;
  ultima_compra_em: string | null;
  faturamento_estimado: number | null;
  limite_credito: number | null;
  condicao_pagamento: string | null;
  prazo_pagamento_dias: number | null;
  // Documentos
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  numero_funcionarios: number | null;
  // Bitrix
  bitrix_id: string | null;
  bitrix_synced_at: string | null;
  // Notas
  notas: string | null;
  // Responsável
  responsavel_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Nome de exibição: nome_fantasia ou razao_social */
export function getCompanyDisplayName(company: CrmCompany): string {
  return company.nome_fantasia || company.razao_social;
}

// ============================================
// CONTATOS (company_contacts)
// ============================================

export interface CrmContact {
  id: string;
  company_id: string;
  nome: string;
  sobrenome: string | null;
  cargo: string | null;
  departamento: string | null;
  apelido: string | null;
  is_principal: boolean | null;
  is_active: boolean;
  canal_preferido: string | null;
  melhor_horario: string | null;
  poder_decisao: string | null;
  data_aniversario: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  notas: string | null;
  preferencias: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Relations (quando carregados)
  emails?: CrmContactEmail[];
  phones?: CrmContactPhone[];
}

export interface CrmContactEmail {
  id: string;
  contact_id: string;
  email: string;
  tipo: string;
  is_principal: boolean | null;
}

export interface CrmContactPhone {
  id: string;
  contact_id: string;
  numero: string;
  tipo: string;
  is_principal: boolean | null;
  is_whatsapp: boolean | null;
}

// ============================================
// ENDEREÇOS (company_addresses)
// ============================================

export interface CrmAddress {
  id: string;
  company_id: string;
  nome: string;
  tipo: string | null;
  is_principal: boolean | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  pais: string | null;
  contato_local: string | null;
  telefone_local: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// REDES SOCIAIS (company_social_media)
// ============================================

export type SocialPlatform =
  | "instagram"
  | "linkedin"
  | "facebook"
  | "twitter"
  | "youtube"
  | "tiktok"
  | "whatsapp"
  | "telegram"
  | "outro";

export interface CrmSocialMedia {
  id: string;
  company_id: string;
  plataforma: SocialPlatform;
  handle: string | null;
  url: string | null;
  nome_perfil: string | null;
  is_verified: boolean | null;
  is_active: boolean;
  seguidores: number | null;
  data_ultima_verificacao: string | null;
  observacoes: string | null;
  origem: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// FILTROS DE BUSCA
// ============================================

export interface CrmCompanyFilters {
  search?: string;
  ramo?: string;
  nicho?: string;
  status?: string;
  cidade?: string;
  estado?: string;
  is_active?: boolean;
}

// ============================================
// ADAPTADOR DE COMPATIBILIDADE
// Mapeia CrmCompany → formato antigo BitrixClient
// para facilitar a migração gradual
// ============================================

export interface LegacyClientFormat {
  id: string;
  bitrix_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  ramo: string | null;
  nicho: string | null;
  primary_color_name: string | null;
  primary_color_hex: string | null;
  logo_url: string | null;
  total_spent: number | null;
  last_purchase_date: string | null;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

/** Converte CrmCompany para o formato legado BitrixClient */
export function toLegacyClient(company: CrmCompany): LegacyClientFormat {
  const address = [company.logradouro, company.numero, company.bairro, company.cidade, company.estado]
    .filter(Boolean)
    .join(", ");

  return {
    id: company.id,
    bitrix_id: company.bitrix_id || "",
    name: getCompanyDisplayName(company),
    email: null, // email vem dos contatos agora
    phone: null, // telefone vem dos contatos agora
    address: address || null,
    ramo: company.ramo,
    nicho: company.nicho,
    primary_color_name: company.cor_primaria_nome,
    primary_color_hex: company.cor_primaria_hex,
    logo_url: company.logo_url,
    total_spent: company.total_gasto,
    last_purchase_date: company.ultima_compra_em,
    synced_at: company.bitrix_synced_at || company.updated_at,
    created_at: company.created_at,
    updated_at: company.updated_at,
  };
}
