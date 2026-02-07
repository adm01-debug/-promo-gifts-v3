# 🛠️ Ferramentas e Sistemas Externos — Gifts Store

> Inventário exaustivo de **todas** as ferramentas, plataformas, APIs e bibliotecas externas utilizadas no projeto.
> Última atualização: 07/02/2026

---

## 📋 Índice

1. [Infraestrutura & Backend](#1-infraestrutura--backend)
2. [CRM & Automação](#2-crm--automação)
3. [Inteligência Artificial](#3-inteligência-artificial)
4. [Armazenamento de Arquivos](#4-armazenamento-de-arquivos)
5. [E-mail & Comunicação](#5-e-mail--comunicação)
6. [Segurança & Autenticação](#6-segurança--autenticação)
7. [Versionamento & DevOps](#7-versionamento--devops)
8. [Bibliotecas de UI & Animação](#8-bibliotecas-de-ui--animação)
9. [Geração de Documentos & Exportação](#9-geração-de-documentos--exportação)
10. [Busca & Indexação](#10-busca--indexação)
11. [Gráficos & Visualização](#11-gráficos--visualização)
12. [Validação & Formulários](#12-validação--formulários)
13. [Utilitários & Helpers](#13-utilitários--helpers)
14. [Monitoramento & Analytics (Planejado)](#14-monitoramento--analytics-planejado)
15. [Pagamentos (Planejado)](#15-pagamentos-planejado)
16. [Mapa de Secrets](#16-mapa-de-secrets)
17. [Resumo Visual](#17-resumo-visual)

---

## 1. Infraestrutura & Backend

### 1.1 Lovable Cloud (Supabase)
| Item | Detalhe |
|------|---------|
| **O que é** | Plataforma de backend completa (PostgreSQL, Auth, Edge Functions, Storage, Realtime) |
| **Papel** | Banco de dados local (transacional), autenticação, serverless functions, armazenamento de arquivos |
| **Projeto ID** | `lgjogrvydtwxxsjarrxm` |
| **Tabelas locais** | 42+ tabelas (quotes, orders, profiles, notifications, achievements, etc.) |
| **Edge Functions** | 27 funções serverless (Deno runtime) |
| **Secret** | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (automáticos) |

### 1.2 Banco Externo Promobrind (Supabase)
| Item | Detalhe |
|------|---------|
| **O que é** | Segundo projeto Supabase usado como **fonte de verdade** para dados de catálogo |
| **Projeto ID** | `doufsxqlfjyuvxuezpln` |
| **Papel** | Produtos, variantes, estoque, categorias, materiais, técnicas de gravação, fornecedores, ramos de atividade, cores, datas comemorativas |
| **Acesso** | Somente leitura via Edge Function `external-db-bridge` |
| **Secrets** | `EXTERNAL_SUPABASE_URL`, `EXTERNAL_SUPABASE_SERVICE_KEY` |
| **Views consumidas** | `v_product_full`, `v_media_stats`, `v_n8n_sync_summary`, `v_n8n_sync_errors`, `v_color_hierarchy`, `v_commemorative_dates_with_colors`, `mv_product_compositions` |
| **RPCs consumidas** | `fn_get_customization_price`, `fn_get_product_print_areas`, `get_active_commemorative_dates`, `get_upcoming_commemorative_dates`, `get_variants_for_commemorative_date` |

### 1.3 Edge Functions (Inventário Completo)
| Função | Propósito | APIs Externas Chamadas |
|--------|-----------|----------------------|
| `external-db-bridge` | Ponte centralizada com banco Promobrind | Supabase Externo |
| `external-db-inspect` | Inspeção de schema do banco externo | Supabase Externo |
| `bitrix-sync` | Sincronização de clientes/deals CRM | Bitrix24 REST API |
| `expert-chat` | Chatbot especialista em brindes (streaming) | Lovable AI Gateway |
| `ai-recommendations` | Recomendações personalizadas de produtos | Lovable AI Gateway |
| `generate-mockup` | Geração de mockup via IA (Gemini) | Lovable AI Gateway |
| `generate-mockup-nanobanana` | Geração de mockup via Nano Banana API | Nano Banana API |
| `semantic-search` | Busca semântica com interpretação de intenção | Lovable AI Gateway |
| `visual-search` | Busca visual por imagem | Lovable AI Gateway |
| `quote-sync` | Sincronização de orçamentos com N8N | N8N Webhook |
| `product-webhook` | Receptor de webhook de produtos do N8N | — (receptor) |
| `quote-approval` | Aprovação de orçamentos via token | — (interno) |
| `send-digest` | Envio de digest por email | Resend API |
| `verify-email` | Verificação de email | — (interno) |
| `detect-new-device` | Detecção de novo dispositivo/IP | — (interno) |
| `rate-limit-check` | Verificação de rate limiting | — (interno) |
| `webhook-dispatcher` | Disparo de webhooks configuráveis | URLs de webhook dinâmicas |
| `process-queue` | Processamento de fila de notificações | Chama `send-notification` internamente |
| `cleanup-novelties` | Limpeza de novidades expiradas | — (interno) |
| `cleanup-notifications` | Limpeza de notificações antigas | — (interno) |
| `commemorative-dates` | Datas comemorativas do banco externo | Supabase Externo |
| `categories-api` | Categorias do banco externo | Supabase Externo |
| `materials-api` | Materiais do banco externo | Supabase Externo |
| `dropbox-list` | Listagem de arquivos no Dropbox | Dropbox API v2 |
| `github-fix-config` | Correção de configs no repositório | GitHub API v3 |

---

## 2. CRM & Automação

### 2.1 Bitrix24
| Item | Detalhe |
|------|---------|
| **O que é** | CRM para gestão de clientes e negócios |
| **URL base** | `https://promobrindes.bitrix24.com.br/rest/...` |
| **Acesso** | Via webhook REST (somente leitura) |
| **Secret** | `BITRIX24_WEBHOOK_URL` |
| **Endpoints usados** | `crm.company.list`, `crm.company.get`, `crm.deal.list`, `crm.deal.productrows.get` |
| **Dados sincronizados** | Empresas, negócios, histórico de compras, logos, cores de marca |
| **Sync automático** | Cron diário (8h) via `pg_cron` + Edge Function `bitrix-sync` |
| **Tabelas locais** | `bitrix_clients`, `bitrix_deals`, `bitrix_sync_logs` |

### 2.2 N8N (Automação de Workflows)
| Item | Detalhe |
|------|---------|
| **O que é** | Plataforma de automação de workflows |
| **Integração 1** | **Quote Sync** — Envia orçamentos aprovados para N8N via webhook |
| **Integração 2** | **Product Webhook** — Recebe atualizações de produtos do N8N |
| **Secrets** | `N8N_QUOTE_WEBHOOK_URL`, `N8N_PRODUCT_WEBHOOK_SECRET` |
| **Views no banco externo** | `v_n8n_sync_summary`, `v_n8n_sync_errors`, `v_n8n_sync_success_recent` |

### 2.3 Webhook Dispatcher (Genérico)
| Item | Detalhe |
|------|---------|
| **O que é** | Sistema interno para disparo de webhooks configuráveis |
| **Recursos** | HMAC signature, retry com backoff, logging completo |
| **Tabelas** | `webhook_configs`, `webhook_logs` |
| **Segurança** | Assinatura HMAC-SHA256 com secret por webhook |

---

## 3. Inteligência Artificial

### 3.1 Lovable AI Gateway
| Item | Detalhe |
|------|---------|
| **O que é** | Gateway de IA com acesso a Gemini e GPT |
| **URL** | `https://ai.gateway.lovable.dev/v1/chat/completions` |
| **Secret** | `LOVABLE_API_KEY` (auto-provisionado) |
| **Modelo padrão** | `google/gemini-3-flash-preview` |
| **Usos no projeto** | |
| — Expert Chat | Chatbot especialista com contexto de cliente/produtos (streaming SSE) |
| — AI Recommendations | Recomendações personalizadas de produtos |
| — Generate Mockup | Geração de imagens de mockup com logo aplicado |
| — Semantic Search | Interpretação de intenção de busca em linguagem natural |
| — Visual Search | Análise de imagem para busca de produtos similares |

### 3.2 Nano Banana API
| Item | Detalhe |
|------|---------|
| **O que é** | API de geração de imagens com IA (alternativa para mockups) |
| **Endpoints** | `https://api.nanobananaapi.ai/v1/generate`, `https://api.nanobananaapi.ai/v1/pro/generate` |
| **Secret** | `NANOBANANA_API_KEY` (referenciado mas não configurado atualmente) |
| **Edge Function** | `generate-mockup-nanobanana` |
| **Status** | ⚠️ Implementado mas inativo (secret não configurado) |

---

## 4. Armazenamento de Arquivos

### 4.1 Dropbox
| Item | Detalhe |
|------|---------|
| **O que é** | Armazenamento de arquivos em nuvem |
| **APIs usadas** | `files/list_folder`, `files/get_thumbnail_v2` |
| **Secret** | `DROPBOX_ACCESS_TOKEN` (referenciado mas não configurado) |
| **Edge Function** | `dropbox-list` |
| **Funcionalidades** | Listar arquivos/pastas, gerar thumbnails de imagens |
| **Status** | ⚠️ Implementado mas inativo (secret não configurado) |

### 4.2 Supabase Storage (Local)
| Item | Detalhe |
|------|---------|
| **O que é** | Storage integrado ao Lovable Cloud |
| **Uso** | Logos de clientes, imagens de mockups, anexos de orçamentos |

---

## 5. E-mail & Comunicação

### 5.1 Resend
| Item | Detalhe |
|------|---------|
| **O que é** | Serviço de envio de e-mails transacionais |
| **API** | `https://api.resend.com/emails` |
| **Secret** | `RESEND_API_KEY` |
| **Edge Function** | `send-digest` |
| **Usos** | Digest diário, notificações de segurança, alertas |

### 5.2 WhatsApp / A-Ticket
| Item | Detalhe |
|------|---------|
| **O que é** | Integração para compartilhamento de produtos via WhatsApp |
| **Implementação** | Frontend-only (link `wa.me` com mensagem formatada) |
| **Componente** | `ShareActions.tsx` |
| **Status** | ✅ Ativo (não requer API key) |

### 5.3 SendGrid (Planejado)
| Item | Detalhe |
|------|---------|
| **Referência** | Presente em `.env.example` como `VITE_SENDGRID_API_KEY` |
| **Status** | ❌ Não implementado (substituído pelo Resend) |

---

## 6. Segurança & Autenticação

### 6.1 WebAuthn / Passkeys
| Item | Detalhe |
|------|---------|
| **O que é** | Padrão W3C para autenticação biométrica/sem senha |
| **Implementação** | `useWebAuthn.ts`, `PasskeyManager.tsx` |
| **Tabela** | `user_passkeys` |
| **Bibliotecas** | API nativa do navegador (`navigator.credentials`) |

### 6.2 OTPAuth (TOTP 2FA)
| Item | Detalhe |
|------|---------|
| **O que é** | Autenticação de dois fatores via código temporal |
| **Biblioteca** | `otpauth` (npm) |
| **Hook** | `use2FA.ts` |
| **Tabela** | `user_2fa_settings` |
| **Compatível com** | Google Authenticator, Authy, 1Password |

### 6.3 hCaptcha
| Item | Detalhe |
|------|---------|
| **O que é** | Captcha para proteção contra bots |
| **Biblioteca** | `@hcaptcha/react-hcaptcha` |
| **Uso** | Formulários de login/registro |

### 6.4 Have I Been Pwned
| Item | Detalhe |
|------|---------|
| **O que é** | API para verificar se senhas foram comprometidas em vazamentos |
| **API** | `https://api.pwnedpasswords.com/range/{prefix}` |
| **Hook** | `usePasswordBreachCheck.tsx` |
| **Método** | k-Anonymity (envia apenas 5 primeiros chars do hash SHA-1) |
| **Status** | ✅ Ativo (API pública, sem key) |

### 6.5 QR Code (2FA)
| Item | Detalhe |
|------|---------|
| **Biblioteca** | `qrcode.react` |
| **Uso** | Gerar QR code para setup do 2FA TOTP |

---

## 7. Versionamento & DevOps

### 7.1 GitHub
| Item | Detalhe |
|------|---------|
| **Repositório** | `adm01-debug/gifts-store` |
| **API usada** | GitHub REST API v3 (`api.github.com`) |
| **Secret** | `GITHUB_PAT` (Personal Access Token) |
| **Edge Function** | `github-fix-config` |
| **Operações** | Leitura e atualização de arquivos de configuração (`tsconfig`, etc.) |

### 7.2 Lovable Platform
| Item | Detalhe |
|------|---------|
| **O que é** | Plataforma de desenvolvimento visual |
| **Deploy** | Automático via commits |
| **Preview URL** | `https://id-preview--80ddde60-05c5-4d7d-abe6-bf407d09113a.lovable.app` |
| **Published URL** | `https://gifts-store.lovable.app` |

---

## 8. Bibliotecas de UI & Animação

| Biblioteca | Versão | Propósito |
|------------|--------|-----------|
| **React** | ^18.3.1 | Framework UI |
| **Tailwind CSS** | (config) | Estilização utility-first |
| **Shadcn/UI** | 54 componentes | Sistema de design (Radix + Tailwind) |
| **Framer Motion** | ^11.0.0 | Animações e transições (usado em 30+ componentes) |
| **Lucide React** | ^0.309.0 | Ícones SVG |
| **Radix UI** | Múltiplos | Primitivos de acessibilidade (Dialog, Tabs, Select, etc.) |
| **cmdk** | ^0.2.0 | Command palette (⌘K) |
| **Embla Carousel** | ^8.0.0 | Carrosséis de produtos |
| **Vaul** | ^0.9.0 | Drawer responsivo (mobile) |
| **React Day Picker** | ^8.10.0 | Seletor de datas |
| **React Resizable Panels** | ^2.0.11 | Painéis redimensionáveis |
| **Input OTP** | ^1.2.4 | Input para códigos OTP |
| **Canvas Confetti** | ^1.9.4 | Efeitos de confetti (gamificação) |
| **React Hot Toast** | ^2.4.1 | Notificações toast |
| **Sonner** | ^1.3.1 | Notificações toast (alternativo) |

---

## 9. Geração de Documentos & Exportação

| Biblioteca | Versão | Propósito |
|------------|--------|-----------|
| **jsPDF** | ^2.5.1 | Geração de PDFs (orçamentos, propostas) |
| **jspdf-autotable** | 5.0.7 | Tabelas formatadas em PDFs |
| **html2canvas** | ^1.4.1 | Captura de screenshots de componentes |
| **XLSX (SheetJS)** | ^0.18.5 | Exportação/importação Excel |
| **PapaParse** | ^5.4.1 | Parse de arquivos CSV |

---

## 10. Busca & Indexação

| Biblioteca | Versão | Propósito |
|------------|--------|-----------|
| **Fuse.js** | ^7.1.0 | Busca fuzzy client-side (SKU peso 0.35, Nome peso 0.30) |
| **Semantic Search** | Edge Function | Busca semântica via IA (interpretação de intenção) |
| **Visual Search** | Edge Function | Busca por imagem via IA |

---

## 11. Gráficos & Visualização

| Biblioteca | Versão | Propósito |
|------------|--------|-----------|
| **Recharts** | ^2.10.3 | Gráficos (barras, linhas, pizza, radar) |
| **QRCode.react** | ^3.1.0 | Geração de QR codes |

---

## 12. Validação & Formulários

| Biblioteca | Versão | Propósito |
|------------|--------|-----------|
| **Zod** | ^3.22.4 | Validação de schemas (quotes, products, etc.) |
| **React Hook Form** | ^7.51.0 | Gerenciamento de formulários |
| **@hookform/resolvers** | ^3.3.4 | Integração Zod + React Hook Form |

---

## 13. Utilitários & Helpers

| Biblioteca | Versão | Propósito |
|------------|--------|-----------|
| **TanStack Query** | ^5.17.0 | Cache, fetching, sincronização de dados |
| **TanStack Virtual** | ^3.0.0 | Virtualização de listas longas |
| **Zustand** | ^4.5.0 | Estado global leve |
| **React Router DOM** | 6.30.2 | Roteamento SPA |
| **React Helmet Async** | ^2.0.5 | SEO / meta tags |
| **date-fns** | ^2.30.0 | Manipulação de datas |
| **clsx** | ^2.1.0 | Classes condicionais |
| **tailwind-merge** | ^2.2.0 | Merge de classes Tailwind |
| **class-variance-authority** | ^0.7.0 | Variantes de componentes |
| **@dnd-kit** | core ^6.1 / sortable ^8.0 | Drag & Drop |
| **Lovable Tagger** | ^1.1.13 | Tagging de componentes |

---

## 14. Monitoramento & Analytics (Planejado)

| Ferramenta | Referência | Status |
|------------|-----------|--------|
| **Google Analytics** | `VITE_GA_MEASUREMENT_ID` em `.env.example` | ❌ Não implementado |
| **Mixpanel** | `VITE_MIXPANEL_TOKEN` em `.env.example` | ❌ Não implementado |
| **Sentry** | `VITE_SENTRY_DSN` em `.env.example` | ❌ Não implementado |

---

## 15. Pagamentos (Planejado)

| Ferramenta | Referência | Status |
|------------|-----------|--------|
| **Stripe** | `VITE_STRIPE_PUBLIC_KEY` em `.env.example` | ❌ Não implementado |
| **MercadoPago** | `VITE_MERCADOPAGO_PUBLIC_KEY` em `.env.example` | ❌ Não implementado |

---

## 16. Mapa de Secrets

### Secrets Configurados (Ativos) ✅
| Secret | Serviço | Função |
|--------|---------|--------|
| `LOVABLE_API_KEY` | Lovable AI Gateway | IA (chat, recomendações, mockups, busca) |
| `BITRIX24_WEBHOOK_URL` | Bitrix24 CRM | Sincronização de clientes/deals |
| `EXTERNAL_SUPABASE_URL` | Promobrind DB | URL do banco externo |
| `EXTERNAL_SUPABASE_SERVICE_KEY` | Promobrind DB | Chave de serviço do banco externo |
| `N8N_QUOTE_WEBHOOK_URL` | N8N | Webhook de orçamentos |
| `N8N_PRODUCT_WEBHOOK_SECRET` | N8N | Autenticação do webhook de produtos |
| `RESEND_API_KEY` | Resend | Envio de emails |
| `GITHUB_PAT` | GitHub API | Acesso ao repositório |

### Secrets Referenciados mas NÃO Configurados ⚠️
| Secret | Serviço | Edge Function |
|--------|---------|---------------|
| `NANOBANANA_API_KEY` | Nano Banana API | `generate-mockup-nanobanana` |
| `DROPBOX_ACCESS_TOKEN` | Dropbox | `dropbox-list` |

### Secrets em `.env.example` (Planejados) 📋
| Secret | Serviço |
|--------|---------|
| `VITE_SENDGRID_API_KEY` | SendGrid (substituído por Resend) |
| `VITE_GA_MEASUREMENT_ID` | Google Analytics |
| `VITE_MIXPANEL_TOKEN` | Mixpanel |
| `VITE_SENTRY_DSN` | Sentry |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe |
| `VITE_MERCADOPAGO_PUBLIC_KEY` | MercadoPago |
| `VITE_WHATSAPP_BUSINESS_ID` | WhatsApp Business API |
| `VITE_WHATSAPP_ACCESS_TOKEN` | WhatsApp Business API |
| `VITE_ENCRYPTION_KEY` | Criptografia local |

---

## 17. Resumo Visual

```
┌─────────────────────────────────────────────────────────────────┐
│                      GIFTS STORE                                │
│                   (React + TypeScript)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Lovable     │    │  Promobrind   │    │   Bitrix24   │      │
│  │   Cloud DB    │    │  External DB  │    │   CRM        │      │
│  │  (42+ tabelas)│    │  (catálogo)   │    │  (clientes)  │      │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘      │
│         │                   │                   │               │
│         └───────────────────┼───────────────────┘               │
│                             │                                   │
│              ┌──────────────┴──────────────┐                    │
│              │     27 Edge Functions        │                    │
│              │     (Deno Runtime)           │                    │
│              └──────────────┬──────────────┘                    │
│                             │                                   │
│    ┌────────────────────────┼────────────────────────┐          │
│    │                        │                        │          │
│    ▼                        ▼                        ▼          │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │ Lovable  │    │     N8N      │    │   Resend     │          │
│  │ AI       │    │  Automação   │    │   Email      │          │
│  │ Gateway  │    │              │    │              │          │
│  └──────────┘    └──────────────┘    └──────────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │            SEGURANÇA                              │          │
│  │  WebAuthn │ TOTP 2FA │ hCaptcha │ HIBP │ RBAC    │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │            BIBLIOTECAS FRONTEND                   │          │
│  │  Shadcn/UI │ Framer Motion │ Recharts │ Fuse.js  │          │
│  │  jsPDF │ XLSX │ Zod │ TanStack │ DnD Kit         │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │         PLANEJADO / INATIVO                       │          │
│  │  Dropbox │ Nano Banana │ Stripe │ Sentry         │          │
│  │  GA │ Mixpanel │ MercadoPago │ WhatsApp Biz      │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐          │
│  │         DEVOPS                                    │          │
│  │  GitHub API │ Lovable Platform │ Webhooks         │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Contadores

| Categoria | Ativo | Planejado/Inativo | Total |
|-----------|-------|-------------------|-------|
| **Sistemas Externos (APIs)** | 7 | 6 | 13 |
| **Bibliotecas npm** | 38 | 0 | 38 |
| **Edge Functions** | 27 | 0 | 27 |
| **Secrets Configurados** | 8 | 2 (ref. mas não config.) | 10 |
| **Secrets Planejados** | — | 9 | 9 |

### Sistemas Externos Ativos (7)
1. Lovable Cloud (Supabase local)
2. Promobrind (Supabase externo)
3. Bitrix24 CRM
4. N8N Automação
5. Lovable AI Gateway
6. Resend (email)
7. GitHub API

### Sistemas Externos Planejados/Inativos (6)
1. Dropbox (implementado, sem secret)
2. Nano Banana API (implementado, sem secret)
3. Stripe
4. MercadoPago
5. Sentry
6. Google Analytics / Mixpanel

### APIs Públicas (sem key)
1. Have I Been Pwned (verificação de senhas)
2. WhatsApp (links `wa.me`)

---

*Documento gerado automaticamente em 07/02/2026*
