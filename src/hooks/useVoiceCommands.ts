import { useCallback } from "react";
import { COLORS, CATEGORIES, SUPPLIERS, MATERIAIS } from "@/data/mockData";
import { FilterState } from "@/components/filters/FilterPanel";
export interface VoiceCommandFilter {
  filterKey: keyof FilterState;
  value: string | string[] | number[];
}

export interface VoiceCommand {
  type: "filter" | "sort" | "clear" | "search" | "navigate" | "compound" | "unknown";
  action?: string;
  value?: string | string[];
  filterKey?: keyof FilterState;
  sortValue?: string;
  filters?: VoiceCommandFilter[]; // For compound commands
}

// Normalize text for comparison (remove accents, lowercase)
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

// Find color by name (fuzzy match)
const findColor = (colorName: string): string | null => {
  const normalized = normalizeText(colorName);
  const color = COLORS.find(
    (c) =>
      normalizeText(c.name) === normalized ||
      normalizeText(c.name).includes(normalized) ||
      normalized.includes(normalizeText(c.name))
  );
  return color?.name || null;
};

// Find category by name (fuzzy match)
const findCategory = (categoryName: string): number | null => {
  const normalized = normalizeText(categoryName);
  const category = CATEGORIES.find(
    (c) =>
      normalizeText(c.name) === normalized ||
      normalizeText(c.name).includes(normalized) ||
      normalized.includes(normalizeText(c.name))
  );
  return category?.id ?? null;
};

// Find supplier by name (fuzzy match)
const findSupplier = (supplierName: string): string | null => {
  const normalized = normalizeText(supplierName);
  const supplier = SUPPLIERS.find(
    (s) =>
      normalizeText(s.name) === normalized ||
      normalizeText(s.name).includes(normalized) ||
      normalized.includes(normalizeText(s.name))
  );
  return supplier?.id || null;
};

// Find material by name (fuzzy match)
const findMaterial = (materialName: string): string | null => {
  const normalized = normalizeText(materialName);
  const material = MATERIAIS.find(
    (m) =>
      normalizeText(m) === normalized ||
      normalizeText(m).includes(normalized) ||
      normalized.includes(normalizeText(m))
  );
  return material || null;
};

// Category keyword mappings
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "caneta": ["caneta", "canetas", "esferografica"],
  "mochila": ["mochila", "mochilas", "bolsa", "bolsas", "sacola"],
  "garrafa": ["garrafa", "garrafas", "squeeze", "squeezes", "termica"],
  "copo": ["copo", "copos", "caneca", "canecas"],
  "caderno": ["caderno", "cadernos", "agenda", "agendas", "bloco"],
  "camiseta": ["camiseta", "camisetas", "camisa", "camisas"],
  "bone": ["bone", "bones", "chapeu"],
  "chaveiro": ["chaveiro", "chaveiros"],
  "kit": ["kit", "kits", "conjunto"],
  "tecnologia": ["powerbank", "carregador", "fone", "pendrive", "cabo"],
};

// Eco-friendly material keywords
const ECO_KEYWORDS = ["ecologico", "ecologicos", "sustentavel", "sustentaveis", "reciclado", "reciclavel", "bambu", "organico"];

// Common color keywords
const COLOR_KEYWORDS = ["azul", "vermelho", "verde", "amarelo", "preto", "branco", "rosa", "roxo", "laranja", "cinza", "marrom", "prata", "dourado", "bege"];

export function useVoiceCommands() {
  const parseCommand = useCallback((transcript: string): VoiceCommand => {
    const normalized = normalizeText(transcript);
    const filters: VoiceCommandFilter[] = [];
    const actionParts: string[] = [];

    // Clear/Reset commands
    if (
      normalized.includes("limpar") ||
      normalized.includes("resetar") ||
      normalized.includes("remover filtros") ||
      normalized.includes("limpar filtros")
    ) {
      return { type: "clear", action: "Filtros limpos" };
    }

    // Sort commands (these are standalone, not combined)
    if (normalized.includes("ordenar") || normalized.includes("ordem")) {
      if (normalized.includes("preco") || normalized.includes("valor")) {
        if (normalized.includes("maior") || normalized.includes("caro") || normalized.includes("alto")) {
          return { type: "sort", sortValue: "price-desc", action: "Ordenar por maior preço" };
        }
        if (normalized.includes("menor") || normalized.includes("barato") || normalized.includes("baixo")) {
          return { type: "sort", sortValue: "price-asc", action: "Ordenar por menor preço" };
        }
        return { type: "sort", sortValue: "price-asc", action: "Ordenar por preço" };
      }
      if (normalized.includes("nome") || normalized.includes("alfabetica")) {
        return { type: "sort", sortValue: "name", action: "Ordenar por nome" };
      }
      if (normalized.includes("estoque")) {
        return { type: "sort", sortValue: "stock", action: "Ordenar por estoque" };
      }
    }

    // --- COMPOUND FILTER EXTRACTION ---

    // 1. Extract category from keywords
    for (const [categoryKey, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (normalized.includes(keyword)) {
          const category = CATEGORIES.find(c => 
            normalizeText(c.name).includes(categoryKey) || 
            categoryKey.includes(normalizeText(c.name).split(" ")[0])
          );
          if (category) {
            filters.push({ filterKey: "categories", value: [category.id] });
            actionParts.push(category.name);
            break;
          }
          // Special case for kit
          if (categoryKey === "kit") {
            filters.push({ filterKey: "isKit", value: ["true"] });
            actionParts.push("Kits");
          }
          break;
        }
      }
    }

    // 2. Extract colors
    for (const colorKeyword of COLOR_KEYWORDS) {
      if (normalized.includes(colorKeyword)) {
        const foundColor = findColor(colorKeyword);
        if (foundColor) {
          // Check if we already have a color filter
          const existingColorFilter = filters.find(f => f.filterKey === "colors");
          if (existingColorFilter && Array.isArray(existingColorFilter.value)) {
            (existingColorFilter.value as string[]).push(foundColor);
          } else {
            filters.push({ filterKey: "colors", value: [foundColor] });
          }
          actionParts.push(foundColor);
        }
      }
    }

    // 3. Extract price range
    const pricePatterns = [
      /(?:ate|menos\s+de|abaixo\s+de|maximo|no\s+maximo)\s+(\d+)/,
      /(\d+)\s+(?:reais|r\$)/,
    ];
    for (const pattern of pricePatterns) {
      const match = normalized.match(pattern);
      if (match) {
        const maxPrice = parseInt(match[1]);
        filters.push({ filterKey: "priceRange", value: ["0", maxPrice.toString()] });
        actionParts.push(`até R$${maxPrice}`);
        break;
      }
    }

    // Price range "entre X e Y"
    const rangeMatch = normalized.match(/entre\s+(\d+)\s+e\s+(\d+)/);
    if (rangeMatch) {
      filters.push({ filterKey: "priceRange", value: [rangeMatch[1], rangeMatch[2]] });
      actionParts.push(`R$${rangeMatch[1]}-${rangeMatch[2]}`);
    }

    // 4. Extract eco-friendly/materials
    for (const ecoKeyword of ECO_KEYWORDS) {
      if (normalized.includes(ecoKeyword)) {
        // Map eco keywords to actual materials
        const ecoMaterials = ["Bambu", "Fibra de Trigo", "Papel Reciclado", "Cortiça"];
        const matchedMaterials = MATERIAIS.filter(m => 
          ecoMaterials.some(eco => normalizeText(m).includes(normalizeText(eco)))
        );
        if (matchedMaterials.length > 0) {
          filters.push({ filterKey: "materiais", value: matchedMaterials });
          actionParts.push("ecológicos");
        } else if (ecoKeyword === "bambu") {
          const bambuMaterial = findMaterial("bambu");
          if (bambuMaterial) {
            filters.push({ filterKey: "materiais", value: [bambuMaterial] });
            actionParts.push("bambu");
          }
        }
        break;
      }
    }

    // 5. Extract specific materials
    const materialPatterns = [
      /material\s+(\w+)/,
      /(?:de|em)\s+(metal|plastico|vidro|silicone|couro|tecido|aluminio|inox)/,
    ];
    for (const pattern of materialPatterns) {
      const match = normalized.match(pattern);
      if (match) {
        const foundMaterial = findMaterial(match[1]);
        if (foundMaterial) {
          const existingMaterialFilter = filters.find(f => f.filterKey === "materiais");
          if (!existingMaterialFilter) {
            filters.push({ filterKey: "materiais", value: [foundMaterial] });
            actionParts.push(foundMaterial);
          }
        }
      }
    }

    // 6. Check for stock/available
    if (normalized.includes("em estoque") || normalized.includes("disponivel") || normalized.includes("disponivel")) {
      filters.push({ filterKey: "inStock", value: ["true"] });
      actionParts.push("em estoque");
    }

    // 7. Check for featured
    if (normalized.includes("destaque") || normalized.includes("destacado")) {
      filters.push({ filterKey: "featured", value: ["true"] });
      actionParts.push("destaques");
    }

    // --- RETURN COMPOUND COMMAND IF MULTIPLE FILTERS ---
    if (filters.length > 1) {
      return {
        type: "compound",
        filters,
        action: actionParts.join(" • "),
      };
    }

    // --- RETURN SINGLE FILTER IF ONLY ONE ---
    if (filters.length === 1) {
      const filter = filters[0];
      return {
        type: "filter",
        filterKey: filter.filterKey,
        value: filter.value as string[],
        action: actionParts[0] ? `Filtrar por ${actionParts[0]}` : "Filtro aplicado",
      };
    }

    // --- FALLBACK TO LEGACY PATTERNS ---

    // Filter by color (legacy patterns)
    if (normalized.includes("cor") || normalized.includes("filtrar")) {
      const colorPatterns = [
        /filtrar\s+(?:por\s+)?cor\s+(\w+)/,
        /cor\s+(\w+)/,
      ];

      for (const pattern of colorPatterns) {
        const match = normalized.match(pattern);
        if (match) {
          const colorName = match[1];
          const foundColor = findColor(colorName);
          if (foundColor) {
            return {
              type: "filter",
              filterKey: "colors",
              value: [foundColor],
              action: `Filtrar por cor ${foundColor}`,
            };
          }
        }
      }
    }

    // Filter by category (legacy)
    if (normalized.includes("categoria") || normalized.includes("tipo")) {
      const categoryPatterns = [
        /categoria\s+(\w+)/,
        /tipo\s+(\w+)/,
      ];

      for (const pattern of categoryPatterns) {
        const match = normalized.match(pattern);
        if (match) {
          const categoryName = match[1];
          const foundCategory = findCategory(categoryName);
          if (foundCategory !== null) {
            return {
              type: "filter",
              filterKey: "categories",
              value: [foundCategory.toString()],
              action: `Filtrar por categoria`,
            };
          }
        }
      }
    }

    // Search command
    if (normalized.includes("buscar") || normalized.includes("procurar") || normalized.includes("pesquisar")) {
      const searchPatterns = [/(?:buscar|procurar|pesquisar)\s+(.+)/];

      for (const pattern of searchPatterns) {
        const match = normalized.match(pattern);
        if (match) {
          return {
            type: "search",
            value: match[1],
            action: `Buscar "${match[1]}"`,
          };
        }
      }
    }

    // If no command matched, treat as search
    return {
      type: "search",
      value: transcript,
      action: `Buscar "${transcript}"`,
    };
  }, []);

  return { parseCommand };
}
