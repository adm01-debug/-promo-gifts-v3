/**
 * Adapters de personalização — Camada de tradução entre payloads externos
 * e tipos canônicos do front.
 *
 * Use estes adapters em vez de chamar `mapPriceResponseToFlat` direto do
 * hook. Quando o backend mudar nomes de colunas, basta atualizar os mapas
 * aqui — nenhum consumidor precisa ser tocado.
 */

export {
  adaptPriceResponse,
  adaptPriceResponseWithMeta,
  type AdaptResult,
} from './price-response.adapter';

export { adaptCustomizationOptions } from './customization-options.adapter';

export {
  adaptPrintAreaRow,
  adaptPrintAreaRows,
  type NormalizedPrintAreaRow,
} from './print-area.adapter';

export {
  detectPriceSchema,
  warnUnknownSchemaOnce,
  getSchemaStats,
  __resetSchemaStatsForTests,
  type PriceSchemaVersion,
  type SchemaStats,
} from './schema-detection';
