# Análise de Segurança — Vetores de Ataque & Plano de Defesa Pré-Produção

Coloquei o "chapéu de atacante" e mapeei como invadiria este sistema hoje, baseado em scan automatizado + leitura do código. Abaixo, **vetores reais** + plano de hardening.

## 🎯 Como eu invadiria (vetores priorizados)

### **CRÍTICO — exploráveis em minutos**

1. **Buckets storage públicos com listagem** (`personalization-images`, `product-videos`, `supplier-logos`, `component-media`) — qualquer um faz `GET /storage/v1/object/list/<bucket>` e baixa **todos os arquivos**, incluindo logos de clientes, mockups confidenciais e mídias internas. Scan confirmou 4 buckets vulneráveis.
2. **Vazamento Realtime de dados sensíveis** — tabelas `discount_approval_requests` (descontos/notas admin), `kit_variants`, `kit_comments` publicadas sem isolamento por tópico. Um vendedor logado pode subscrever o canal e receber alterações de orçamentos/kits de outros vendedores em tempo real.
3. **Brute-force de senhas** — sem HIBP (leaked password protection) habilitado. Senhas como "Promogifts2024" são aceitas. Combinado com lista de e-mails de vendedores conhecidos = risco real.

### **ALTO — exploráveis com esforço moderado**

4. **Brute-force de tokens públicos** (`quote-public-view`, `kit-public-view`) — embora protegidos por bot-detection, o token é a única barreira. Sem **rotação automática + expiração padrão** + alerta em N tentativas inválidas seguidas no mesmo orçamento, um atacante paciente eventualmente acerta.
5. **CSP permissiva** — `script-src 'unsafe-inline' 'unsafe-eval'` permite XSS via qualquer injeção em campo de texto que seja renderizado sem sanitização (notas de orçamento, descrições de kit, observações de carrinho).
6. **Sem MFA para admin** — uma única senha admin comprometida = controle total de `/admin/*` (gestão de usuários, IP allowlist, descontos).
7. **Edge functions sem rate-limit em camada de auth** — `manage-users`, `bitrix-sync`, `quote-sync` aceitam requests autenticadas sem teto. Token de vendedor vazado → exfiltração massiva via paginação.

### **MÉDIO — pré-condições específicas**

8. `pg_trgm` **no schema** `public` — vetor para function-shadowing se atacante conseguir CREATE em public (improvável, mas má higiene).
9. **Logs sem retenção/alerta** — `login_attempts`, `bot_detection_log`, `admin_audit_log` crescem indefinidamente, sem dashboard de anomalias nem trigger para alertar admin de padrão suspeito.
10. **Headers de resposta sem CSRF token** em mutations sensíveis (aprovação de desconto, criação de orçamento) — embora Supabase use Bearer token (mitiga CSRF clássico), endpoints públicos como `quote-public-view` aceitam POST de qualquer origem.

---

## 🛡️ Plano de Hardening — 3 Ond