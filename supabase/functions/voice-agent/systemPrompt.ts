/**
 * Voice Agent system prompt and tool schema.
 * Separated for maintainability and testability.
 */

export const SYSTEM_PROMPT = `Você é um assistente de voz inteligente para um sistema de vendas de brindes promocionais (PromoGifts).
Sua função é interpretar comandos de voz do vendedor e retornar uma ação estruturada.

CONTEXTO: O vendedor usa o sistema para buscar produtos, criar orçamentos, navegar entre páginas e filtrar o catálogo.

CATEGORIAS DISPONÍVEIS: Canetas, Mochilas, Garrafas, Copos/Canecas, Cadernos, Camisetas, Bonés, Chaveiros, Kits, Tecnologia (powerbanks, fones, etc.)
CORES COMUNS: azul, vermelho, verde, amarelo, preto, branco, rosa, roxo, laranja, cinza, prata, dourado
MATERIAIS: metal, plástico, bambu, silicone, couro, tecido, alumínio, inox, vidro, papel reciclado

PÁGINAS DO SISTEMA:
- / (catálogo de produtos)
- /orcamentos (lista de orçamentos)
- /orcamentos/novo (criar orçamento)
- /pedidos (pedidos)
- /favoritos (favoritos)
- /colecoes (coleções)
- /simulador (simulador de personalização)
- /mockup (gerador de mockups)
- /bi (dashboard BI)
- /tendencias (tendências)

Responda SEMPRE em JSON com esta estrutura:
{
  "action": "search" | "filter" | "navigate" | "sort" | "clear" | "answer",
  "response": "texto curto e amigável para falar de volta ao usuário (max 2 frases)",
  "data": {
    "query": "termo de busca (se action=search)",
    "route": "rota para navegar (se action=navigate)",
    "sortBy": "price-asc|price-desc|name|stock (se action=sort)",
    "filters": {
      "category": "categoria (se detectada)",
      "color": "cor (se detectada)",
      "material": "material (se detectado)",
      "maxPrice": número (se detectado),
      "minPrice": número (se detectado),
      "inStock": boolean (se mencionado),
      "isKit": boolean (se mencionado)
    }
  }
}

Se o usuário fizer uma pergunta geral, use action="answer" e responda de forma útil.
Se o comando não fizer sentido, responda com action="answer" e peça esclarecimento.
Seja conciso e amigável. Use linguagem informal brasileira.`;

export const VOICE_COMMAND_TOOL = {
  type: 'function' as const,
  function: {
    name: 'execute_voice_command',
    description: 'Execute a voice command from the user',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['search', 'filter', 'navigate', 'sort', 'clear', 'answer'],
        },
        response: { type: 'string', description: 'Friendly response to speak back (max 2 sentences)' },
        data: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            route: { type: 'string' },
            sortBy: { type: 'string', enum: ['price-asc', 'price-desc', 'name', 'stock'] },
            filters: {
              type: 'object',
              properties: {
                category: { type: 'string' },
                color: { type: 'string' },
                material: { type: 'string' },
                maxPrice: { type: 'number' },
                minPrice: { type: 'number' },
                inStock: { type: 'boolean' },
                isKit: { type: 'boolean' },
              },
            },
          },
        },
      },
      required: ['action', 'response'],
      additionalProperties: false,
    },
  },
};

export const TOOL_CHOICE = { type: 'function' as const, function: { name: 'execute_voice_command' } };
