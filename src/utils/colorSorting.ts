// Utilitário para ordenação padronizada de cores
// Ordem: Preto → Branco → Azuis → Verdes → Vermelhos → Amarelos → Laranjas → Rosas → Roxos → Marrons → Cinzas → Outros

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
 * Ordena um array de itens por cor seguindo a ordem padrão
 * @param items Array de itens com propriedade de cor
 * @param getColorName Função para extrair o nome da cor do item
 */
export function sortByColorGroup<T>(
  items: T[],
  getColorName: (item: T) => string
): T[] {
  return [...items].sort((a, b) => {
    const groupA = getColorGroup(getColorName(a));
    const groupB = getColorGroup(getColorName(b));
    
    if (groupA !== groupB) {
      return groupA - groupB;
    }
    
    // Dentro do mesmo grupo, ordena alfabeticamente
    return getColorName(a).localeCompare(getColorName(b), 'pt-BR');
  });
}

/**
 * Ordena variações de produto por cor
 */
export function sortVariationsByColor<T extends { color: { name: string } }>(
  variations: T[]
): T[] {
  return sortByColorGroup(variations, (v) => v.color.name);
}

/**
 * Ordena resumo de cores (para FutureStockModal)
 */
export function sortColorSummary<T extends { name: string }>(
  colors: T[]
): T[] {
  return sortByColorGroup(colors, (c) => c.name);
}
