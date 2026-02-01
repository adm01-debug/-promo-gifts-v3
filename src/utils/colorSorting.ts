// Utilitário para ordenação padronizada de cores
// Ordem: Preto → Branco → Azuis → Verdes → Vermelhos → Amarelos → Laranjas → Rosas → Roxos → Marrons → Cinzas → Outros
// Dentro de cada grupo: Escuro → Claro

const COLOR_GROUP_ORDER: Record<string, number> = {
  // Neutros primeiro
  preto: 1,
  negro: 1,
  black: 1,
  
  branco: 2,
  white: 2,
  
  // Azuis
  azul: 3,
  blue: 3,
  marinho: 3,
  navy: 3,
  royal: 3,
  celeste: 3,
  turquesa: 3,
  
  // Verdes
  verde: 4,
  green: 4,
  musgo: 4,
  oliva: 4,
  lima: 4,
  menta: 4,
  
  // Vermelhos
  vermelho: 5,
  red: 5,
  bordô: 5,
  vinho: 5,
  burgundy: 5,
  escarlate: 5,
  
  // Amarelos
  amarelo: 6,
  yellow: 6,
  dourado: 6,
  gold: 6,
  ouro: 6,
  
  // Laranjas
  laranja: 7,
  orange: 7,
  coral: 7,
  salmão: 7,
  
  // Rosas
  rosa: 8,
  pink: 8,
  magenta: 8,
  fúcsia: 8,
  
  // Roxos
  roxo: 9,
  purple: 9,
  violeta: 9,
  lilás: 9,
  lavanda: 9,
  
  // Marrons
  marrom: 10,
  brown: 10,
  caramelo: 10,
  chocolate: 10,
  café: 10,
  bege: 10,
  nude: 10,
  creme: 10,
  
  // Cinzas
  cinza: 11,
  gray: 11,
  grey: 11,
  prata: 11,
  silver: 11,
  chumbo: 11,
};

// Palavras que indicam tons escuros (prioridade menor = aparece primeiro)
const DARK_MODIFIERS: string[] = [
  'escuro', 'dark', 'noite', 'night', 'deep', 'profundo',
  'marinho', 'navy', 'midnight', 'meia-noite',
  'petróleo', 'petroleum', 'militar', 'musgo', 'floresta', 'forest',
  'vinho', 'bordô', 'burgundy', 'oxblood',
  'chocolate', 'café', 'coffee', 'mogno'
];

// Palavras que indicam tons claros (prioridade maior = aparece depois)
const LIGHT_MODIFIERS: string[] = [
  'claro', 'light', 'baby', 'bebê', 'pastel', 'soft', 'suave',
  'celeste', 'sky', 'céu', 'agua', 'água', 'aqua',
  'lima', 'lime', 'menta', 'mint', 'pistache',
  'salmão', 'salmon', 'coral', 'pêssego', 'peach',
  'rosa', 'pink', 'blush', 'nude', 'bege', 'creme', 'cream',
  'lilás', 'lavanda', 'lavender',
  'gelo', 'ice', 'neve', 'snow', 'off-white', 'offwhite'
];

// Palavras que indicam tons médios/vibrantes
const MEDIUM_MODIFIERS: string[] = [
  'royal', 'real', 'neon', 'fluorescente', 'vivo', 'brilhante', 'bright',
  'elétrico', 'electric', 'turquesa', 'turquoise', 'tiffany'
];

/**
 * Detecta o grupo de cor baseado no nome
 */
function getColorGroup(colorName: string): number {
  const normalized = colorName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Procura por palavras-chave no nome da cor
  for (const [keyword, order] of Object.entries(COLOR_GROUP_ORDER)) {
    const normalizedKeyword = keyword.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes(normalizedKeyword)) {
      return order;
    }
  }
  
  // Cor não identificada vai para o final
  return 99;
}

/**
 * Calcula luminosidade a partir de um hex color (0 = escuro, 1 = claro)
 */
function getLuminanceFromHex(hex: string | undefined): number {
  if (!hex) return 0.5; // Valor médio se não há hex
  
  // Remove # se existir
  const cleanHex = hex.replace('#', '');
  
  // Converte para RGB
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  
  // Fórmula de luminância relativa (percepção humana)
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Detecta prioridade de luminosidade baseado no nome da cor
 * Retorna: 1 = escuro, 2 = médio, 3 = claro
 */
function getLuminosityPriority(colorName: string): number {
  const normalized = colorName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Verifica se tem modificadores escuros
  for (const modifier of DARK_MODIFIERS) {
    const normalizedMod = modifier.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes(normalizedMod)) {
      return 1; // Escuro primeiro
    }
  }
  
  // Verifica se tem modificadores claros
  for (const modifier of LIGHT_MODIFIERS) {
    const normalizedMod = modifier.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes(normalizedMod)) {
      return 3; // Claro por último
    }
  }
  
  // Verifica se tem modificadores médios/vibrantes
  for (const modifier of MEDIUM_MODIFIERS) {
    const normalizedMod = modifier.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes(normalizedMod)) {
      return 2; // Médio no meio
    }
  }
  
  // Padrão: médio
  return 2;
}

/**
 * Ordena um array de itens por cor seguindo a ordem padrão
 * Primeiro por grupo de cor, depois do escuro para o claro
 * @param items Array de itens com propriedade de cor
 * @param getColorName Função para extrair o nome da cor do item
 * @param getHex Função opcional para extrair o hex da cor (para ordenação mais precisa)
 */
export function sortByColorGroup<T>(
  items: T[],
  getColorName: (item: T) => string,
  getHex?: (item: T) => string | undefined
): T[] {
  return [...items].sort((a, b) => {
    const groupA = getColorGroup(getColorName(a));
    const groupB = getColorGroup(getColorName(b));
    
    // Primeiro ordena por grupo de cor
    if (groupA !== groupB) {
      return groupA - groupB;
    }
    
    // Dentro do mesmo grupo, ordena do escuro para o claro
    const lumPriorityA = getLuminosityPriority(getColorName(a));
    const lumPriorityB = getLuminosityPriority(getColorName(b));
    
    if (lumPriorityA !== lumPriorityB) {
      return lumPriorityA - lumPriorityB;
    }
    
    // Se temos hex disponível, usa luminância real como desempate
    if (getHex) {
      const hexA = getHex(a);
      const hexB = getHex(b);
      if (hexA && hexB) {
        const lumA = getLuminanceFromHex(hexA);
        const lumB = getLuminanceFromHex(hexB);
        // Escuro primeiro (menor luminância primeiro)
        if (Math.abs(lumA - lumB) > 0.05) {
          return lumA - lumB;
        }
      }
    }
    
    // Fallback: ordena alfabeticamente
    return getColorName(a).localeCompare(getColorName(b), 'pt-BR');
  });
}

/**
 * Ordena variações de produto por cor (escuro → claro)
 */
export function sortVariationsByColor<T extends { color: { name: string; hex?: string } }>(
  variations: T[]
): T[] {
  return sortByColorGroup(
    variations, 
    (v) => v.color.name,
    (v) => v.color.hex
  );
}

/**
 * Ordena resumo de cores para FutureStockModal (escuro → claro)
 */
export function sortColorSummary<T extends { name: string; hex?: string }>(
  colors: T[]
): T[] {
  return sortByColorGroup(
    colors, 
    (c) => c.name,
    (c) => c.hex
  );
}
