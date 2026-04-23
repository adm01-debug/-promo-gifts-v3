/**
 * Normaliza um sufixo mascarado para EXATAMENTE 4 caracteres.
 *
 * Regras:
 * - `null` / `undefined` / vazio → "????" (placeholder neutro)
 * - <4 chars → preenche à esquerda com "•" (ex: "ab" → "••ab")
 * - >4 chars → mantém apenas os últimos 4 (ex: "abcdef" → "cdef")
 * - exatamente 4 → retorna como está
 *
 * Use sempre que renderizar `••••${suffix}` para garantir alinhamento
 * visual e evitar colisões com sufixos curtos vindos de credenciais
 * pequenas ou registros legados.
 */
export function normalizeMaskedSuffix(raw: string | null | undefined): string {
  if (!raw) return "????";
  const trimmed = raw.trim();
  if (trimmed.length === 4) return trimmed;
  if (trimmed.length > 4) return trimmed.slice(-4);
  return trimmed.padStart(4, "•");
}

/** Retorna o sufixo já formatado com o prefixo "••••" pronto para exibição. */
export function formatMaskedSuffix(raw: string | null | undefined): string {
  return `••••${normalizeMaskedSuffix(raw)}`;
}
