export function toTitleCase(input: string | null | undefined): string {
  if (!input) return '';
  return String(input)
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|\s|[-/])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase('pt-BR'));
}
