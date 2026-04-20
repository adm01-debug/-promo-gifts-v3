export type MagicUpBrief = {
  objective: string;
  channel: string;
  audience: string;
  tone: string;
  cta: string;
  occasion: string;
};

export type MagicUpCreativeControls = {
  creativeMode: string;
  composition: string;
  aspectRatio: string;
  qualityMode: string;
  negativePrompt: string[];
};

export type MagicUpQualityScore = {
  total: number;
  label: string;
  checks: Array<{ label: string; passed: boolean }>;
};

export type MagicUpCopyPack = {
  whatsapp: string;
  instagram: string;
  linkedin: string;
  email: string;
  cta: string;
};

export type MagicUpCampaignStatus = "draft" | "review" | "sent" | "approved" | "rejected";

export type MagicUpCampaign = MagicUpBrief & {
  id: string | null;
  title: string;
  status: MagicUpCampaignStatus;
  clientId: string | null;
  clientName: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type MagicUpBrandLogo = {
  id: string;
  label: string;
  url: string;
  variant: "principal" | "colorida" | "branca" | "preta" | "horizontal" | "vertical" | "icone";
  isPrimary: boolean;
};

export type MagicUpBrandKit = {
  id: string | null;
  clientId: string | null;
  clientName: string | null;
  primaryLogoUrl: string | null;
  logoUrls: MagicUpBrandLogo[];
  primaryColor: string | null;
  secondaryColor: string | null;
  toneOfVoice: string;
  visualStyle: string;
  requiredWords: string[];
  forbiddenWords: string[];
  notes: string;
  updatedAt?: string;
};

export const DEFAULT_BRIEF: MagicUpBrief = {
  objective: "orcamento-rapido",
  channel: "whatsapp",
  audience: "compras-rh",
  tone: "premium",
  cta: "Solicite seu orçamento",
  occasion: "campanha-corporativa",
};

export const DEFAULT_CAMPAIGN: MagicUpCampaign = {
  ...DEFAULT_BRIEF,
  id: null,
  title: "Campanha Magic Up",
  status: "draft",
  clientId: null,
  clientName: null,
};

export const DEFAULT_BRAND_KIT: MagicUpBrandKit = {
  id: null,
  clientId: null,
  clientName: null,
  primaryLogoUrl: null,
  logoUrls: [],
  primaryColor: null,
  secondaryColor: null,
  toneOfVoice: "premium-consultivo",
  visualStyle: "limpo-corporativo",
  requiredWords: [],
  forbiddenWords: [],
  notes: "",
};

export const DEFAULT_CREATIVE_CONTROLS: MagicUpCreativeControls = {
  creativeMode: "produto-heroi",
  composition: "centro-limpo",
  aspectRatio: "1:1",
  qualityMode: "pro-final",
  negativePrompt: ["Sem texto na imagem", "Sem logo distorcido", "Sem fundo poluído"],
};

export const BRIEF_PRESETS = [
  { label: "WhatsApp rápido", objective: "orcamento-rapido", channel: "whatsapp", audience: "compras-rh", tone: "consultivo", cta: "Solicite seu orçamento", occasion: "campanha-corporativa" },
  { label: "LinkedIn premium", objective: "reconhecimento", channel: "linkedin", audience: "diretoria", tone: "premium", cta: "Conheça as opções", occasion: "cliente-corporativo" },
  { label: "Fim de ano", objective: "sazonal", channel: "instagram-feed", audience: "colaboradores", tone: "emocional", cta: "Personalize para sua equipe", occasion: "fim-de-ano" },
  { label: "Feira/evento", objective: "evento", channel: "banner", audience: "marketing", tone: "impactante", cta: "Peça uma proposta", occasion: "feira-evento" },
];

export const BRIEF_OPTIONS = {
  objective: ["orcamento-rapido", "reconhecimento", "lancamento", "pos-venda", "evento", "sazonal"],
  channel: ["whatsapp", "instagram-feed", "instagram-story", "linkedin", "catalogo", "orcamento", "email", "banner"],
  audience: ["compras-rh", "marketing", "diretoria", "estudantes", "colaboradores", "clientes-vip"],
  tone: ["premium", "consultivo", "institucional", "divertido", "minimalista", "promocional", "emocional", "impactante"],
};

export const CREATIVE_MODES = ["produto-heroi", "lifestyle", "flatlay", "premium", "social-ads", "catalogo", "evento", "kit-combinacao", "mockup-realista"];
export const COMPOSITIONS = ["centro-limpo", "produto-esquerda", "produto-direita", "close-up", "ambiente-aberto", "com-pessoas", "com-props"];
export const ASPECT_RATIOS = ["1:1", "4:5", "9:16", "16:9", "A4", "WhatsApp"];
export const QUALITY_MODES = ["rascunho", "alta-qualidade", "pro-final", "variacao-rapida"];
export const NEGATIVE_PROMPTS = ["Sem texto na imagem", "Sem mãos deformadas", "Sem logo distorcido", "Sem produto duplicado", "Sem marca concorrente", "Sem fundo poluído", "Sem rosto em destaque", "Sem aparência artificial"];
export const BRAND_LOGO_VARIANTS: MagicUpBrandLogo["variant"][] = ["principal", "colorida", "branca", "preta", "horizontal", "vertical", "icone"];

export const CAMPAIGN_STATUSES: Array<{ value: MagicUpCampaignStatus; label: string }> = [
  { value: "draft", label: "Rascunho" },
  { value: "review", label: "Em revisão" },
  { value: "sent", label: "Enviada" },
  { value: "approved", label: "Aprovada" },
  { value: "rejected", label: "Rejeitada" },
];

export const toHuman = (value: string) => value.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function campaignFromBrief(input: { brief: MagicUpBrief; clientId?: string | null; clientName?: string | null; productName?: string | null }): MagicUpCampaign {
  const channel = toHuman(input.brief.channel);
  const product = input.productName ? ` · ${input.productName}` : "";
  return {
    ...input.brief,
    id: null,
    title: `${channel}${product}`,
    status: "draft",
    clientId: input.clientId ?? null,
    clientName: input.clientName ?? null,
  };
}

export function buildMagicScore(input: {
  hasProduct: boolean;
  hasLogo: boolean;
  hasClient: boolean;
  hasTechnique: boolean;
  hasBrief: boolean;
  channel: string;
}): MagicUpQualityScore {
  const checks = [
    { label: "Produto claro", passed: input.hasProduct },
    { label: "Logo disponível", passed: input.hasLogo },
    { label: "Canal definido", passed: input.hasBrief && !!input.channel },
    { label: "Cliente contextualizado", passed: input.hasClient },
    { label: "Técnica informada", passed: input.hasTechnique },
    { label: "Pronto para venda", passed: input.hasProduct && input.hasLogo && input.hasBrief },
  ];
  const total = Math.min(98, 58 + checks.filter((c) => c.passed).length * 7);
  return { total, label: total >= 88 ? "Excelente para envio" : total >= 75 ? "Boa peça comercial" : "Precisa revisão", checks };
}

export function buildCopyPack(input: { productName?: string; clientName?: string; cta: string; tone: string; channel: string }): MagicUpCopyPack {
  const product = input.productName || "produto personalizado";
  const client = input.clientName ? `${input.clientName}, ` : "";
  return {
    whatsapp: `${client}preparei uma ideia visual para ${product}. ${input.cta}?`,
    instagram: `${product} personalizado para campanhas corporativas com acabamento ${toHuman(input.tone).toLowerCase()}. ${input.cta}.`,
    linkedin: `Uma proposta visual ${toHuman(input.tone).toLowerCase()} para transformar ${product} em uma ação de marca memorável.`,
    email: `Olá! Segue uma sugestão criativa para ${product}, pensada para ${toHuman(input.channel).toLowerCase()}. ${input.cta}.`,
    cta: input.cta,
  };
}

export function buildBrandKitNotes(kit: MagicUpBrandKit): string {
  return [
    kit.toneOfVoice ? `Tom de voz: ${toHuman(kit.toneOfVoice)}` : null,
    kit.visualStyle ? `Estilo visual: ${toHuman(kit.visualStyle)}` : null,
    kit.primaryColor ? `Cor primária: ${kit.primaryColor}` : null,
    kit.secondaryColor ? `Cor secundária: ${kit.secondaryColor}` : null,
    kit.requiredWords.length ? `Termos obrigatórios: ${kit.requiredWords.join(", ")}` : null,
    kit.forbiddenWords.length ? `Evitar termos: ${kit.forbiddenWords.join(", ")}` : null,
    kit.notes.trim() || null,
  ].filter(Boolean).join("\n");
}