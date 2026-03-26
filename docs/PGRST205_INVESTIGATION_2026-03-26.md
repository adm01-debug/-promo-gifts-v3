# 🔍 Investigação PGRST205 — Tabelas Não-Expostas no Schema Cache

**Data:** 2026-03-26  
**Método:** Testes diretos via `external-db-bridge` com `service_role`

---

## Resultado dos Testes

### ✅ Tabelas que FUNCIONAM via Bridge (service_role)
| Tabela | Status | Registros |
|---|---|---|
| `products` | ✅ OK | Muitos |
| `supplier_branches` | ✅ OK | 7 |
| `price_history` | ✅ OK | 212 |
| `personalization_techniques` (alias → `tecnicas_gravacao`) | ✅ OK | Dados completos |

### ❌ Tabelas que FALHAM via Bridge — "schema cache not found"
| Tabela | Na Whitelist | Usada no Frontend | Impacto |
|---|---|---|---|
| `business_sectors` | ✅ | ✅ `useExternalBusinessSectors()` | ⚠️ **MÉDIO** — hook retorna erro silencioso |
| `price_lists` | ✅ | ❌ Apenas em `tables.ts` | 🟢 Nenhum — não consumida |
| `stock_movements` | ✅ | ❌ Apenas em `tables.ts` | 🟢 Nenhum — não consumida |
| `organization_markup_customization` | ✅ | ❌ Apenas em `tables.ts` | 🟢 Nenhum — não consumida |
| `category_area_techniques` | ✅ | ❌ Apenas em `tables.ts` | 🟢 Nenhum — não consumida |
| `tabela_preco_fornecedores_gravacao` | ✅ | ❌ Apenas em `tables.ts` | 🟢 Nenhum — não consumida |
| `mockup_drafts` (via bridge externo) | ✅ | ⚠️ Usa BD **local** | 🟢 Nenhum — frontend usa Lovable Cloud |

### 🔒 Tabelas que requerem JWT autenticado (401)
| Tabela | Observação |
|---|---|
| `product_properties` | Requer JWT — bridge não envia auth header para BD externo |
| `supplier_property_mappings` | Requer JWT — idem |

---

## Análise de Causa Raiz

**Por que PGRST205?** O PostgREST do banco externo Promobrind não expõe essas tabelas na API REST. Possíveis razões:
1. Tabelas existem em schema diferente de `public` (ex: `app`, `pricing`)
2. Grants de `anon`/`authenticated` não incluem essas tabelas
3. Tabelas foram criadas após o último reload do schema cache

**Por que 401?** As tabelas `product_properties` e `supplier_property_mappings` exigem autenticação JWT no banco externo. O bridge usa `service_role` (que bypassa RLS) mas o PostgREST pode exigir um papel específico.

---

## Impacto Real no Sistema

### ⚠️ Único Impacto Funcional: `business_sectors`
O hook `useExternalBusinessSectors()` em `src/hooks/useExternalDatabase.ts` tenta buscar dados dessa tabela via bridge. Como ela não está exposta no PostgREST, retornará erro.

**Solução recomendada:** Verificar se `business_sectors` está disponível via outro mecanismo (RPC, view) ou se os dados podem ser obtidos de outra fonte.

### 🟢 Sem Impacto: Tabelas não consumidas pelo frontend
`price_lists`, `stock_movements`, `organization_markup_customization`, `category_area_techniques`, `tabela_preco_fornecedores_gravacao` estão apenas na whitelist de definição de tipos, mas nenhum código do frontend as consulta diretamente.

### 🟢 Sem Impacto: `mockup_drafts` via bridge
O frontend usa `mockup_drafts` do banco **local** (Lovable Cloud), não do externo. A presença na whitelist do bridge é redundante mas inofensiva.

---

## Recomendações

| # | Ação | Prioridade |
|---|---|---|
| 1 | Verificar se `business_sectors` pode ser exposta via grant no BD externo | ⚠️ Média |
| 2 | Marcar tabelas não-expostas com comentário na whitelist | 🟢 Baixa |
| 3 | `product_properties` e `supplier_property_mappings` precisam de auth — usar aliases legados (`product_attributes`, `supplier_product_attributes`) que funcionam | 🟢 Baixa |
| 4 | Remover `mockup_drafts` e `generated_mockups` da whitelist do bridge (são tabelas locais) | 🟢 Baixa |

---

**Conclusão:** Das ~30 tabelas com PGRST205 na auditoria anon, apenas **1 tabela (`business_sectors`) causa impacto funcional** no sistema atual. As demais ou não são consumidas pelo frontend, ou são acessadas por caminhos alternativos (aliases, BD local).

**Status:** ✅ Sistema operacional — nenhum fluxo crítico afetado
