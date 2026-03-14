# 🎯 Prompt Inicial — Sistema de Artes: Módulo Mockups Técnicos

> Cole este prompt inteiro ao criar um novo projeto Lovable para o time de Artes e Criação.

---

## Contexto do Projeto

Crie um **Sistema de Mockups Técnicos** para o time de artes e criação de uma distribuidora de brindes promocionais. Este é um módulo independente (sem integração com CRM ou catálogo de vendas) focado em:

1. **Posicionamento técnico de logo sobre produto** com precisão centimétrica
2. **Processamento de logo por técnica de personalização** (laser, serigrafia, UV, bordado, etc.)
3. **Geração de mockup com IA** via API externa (Nano Banana)
4. **Layout de aprovação** em PDF A4 pronto para envio ao cliente
5. **Histórico de mockups** gerados com filtros e downloads

---

## Stack Técnico Obrigatório

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Lovable Cloud (Supabase) — Edge Functions, Storage, Auth, Database
- **Libs externas:** `jspdf` (geração PDF), `@tanstack/react-query` (cache/fetching)
- **Canvas API:** Para todo processamento de imagem (NÃO usar filtros CSS para produção final)
- **IA:** Nano Banana API (edge function) + Lovable AI Gateway como fallback

---

## Arquitetura de Componentes

### 1. Motor de Escala Física (cm → px)

O sistema DEVE converter dimensões reais do produto (centímetros) para pixels no canvas:

```
Lógica de escala:
- Detectar bounding box do produto na imagem via Canvas (pixels não-brancos/não-transparentes)
- productBounds.fractionX/fractionY = fração da imagem ocupada pelo produto
- pxPerCm = (containerWidth * fractionX) / productWidthCm
- Logo em px = logoDimensionCm * pxPerCm
```

**Arquivo de referência: `product-bounds-detector.ts`**
- Usa OffscreenCanvas para escanear pixels
- Identifica pixels de produto: `alpha >= alphaThreshold` E `brightness < whiteThreshold`
- Retorna `{ fractionX, fractionY, centerX, centerY, detected, imageAspectRatio }`
- Cache interno por URL para evitar reprocessamento
- CORS handling: tenta `crossOrigin="anonymous"`, fallback para fetch+blob

**Hook: `useProductBounds(imageUrl)`**
- Retorna o ProductBounds reativo para o componente de posicionamento

### 2. Processamento de Logo por Técnica (Canvas API)

**Arquivo de referência: `laser-logo-processor.ts`**

Cada técnica de personalização requer processamento DIFERENTE do logo:

#### Laser (Monocromático)
```
Regras pixel a pixel:
- alpha < 30 → transparente (manter)
- luminância > 220 (near-white) → transparente (preservar lacunas internas do logo)
- Qualquer outro pixel → substituir por tom sólido (claro=#BEBEBE ou escuro=#3A3A3A)
- Alpha SEMPRE 255 nos pixels do logo (elimina degradês/anti-aliasing)
- Fórmula luminância: ITU-R BT.709 = 0.2126*R + 0.7152*G + 0.0722*B
```

#### Serigrafia (1-3 cores Pantone)
```
Regras pixel a pixel:
- alpha < 30 → transparente
- luminância > 220 → transparente (preservar gaps)
- Pixel visível → snap para cor mais próxima na paleta selecionada
- Distância por RGB² (Euclidiana): (R-pR)² + (G-pG)² + (B-pB)²
- Cada pixel recebe exatamente uma das cores Pantone selecionadas (máx 3)
- Alpha SEMPRE 255
```

#### Digital UV / DTF / Sublimação
```
- Policromia: Sem processamento — usar logo original
- Apenas ajustar brilho/contraste via CSS filters no preview
```

### 3. Mapeamento Pantone (Delta-E CIE76)

**Arquivo de referência: `color-matching.ts`**

```
Pipeline de cores:
1. Edge Function `analyze-logo-colors` recebe base64 → retorna [{name, hex}]
2. Frontend converte HEX → Lab (via RGB → XYZ → Lab)
3. Compara com catálogo Pantone Coated pré-computado em Lab
4. Distância Delta-E = sqrt((L1-L2)² + (a1-a2)² + (b1-b2)²)
5. Retorna top-N matches + best match por cor
```

Manter um arquivo `pantone-coated.ts` com o catálogo: `{ code, hex, r, g, b }[]`

### 4. Diálogo de Configuração de Cores por Técnica

**Arquivo de referência: `TechniqueColorConfigDialog.tsx`**

3 modos baseados na classificação da técnica:

| Técnica | Categoria | Comportamento |
|---------|-----------|---------------|
| Laser, Laser CO2, Laser Fibra | `laser` | Seleção Claro/Escuro (RadioGroup) |
| Serigrafia, Silk, Tampografia | `serigrafia` | Seleção de 1-3 cores Pantone (Checkbox) |
| UV, DTF, Sublimação, Digital | `digital` | Policromia automática (informativo) |

```typescript
// Classificação por código da técnica
function classifyTechnique(code: string): TechniqueCategory {
  if (code includes "laser") → "laser"
  if (code includes "silk|serig|tampo") → "serigrafia"  
  if (code includes "uv|dtf|subli|digit") → "digital"
  default → "other"
}
```

### 5. Editor de Posição da Logo

**Arquivo de referência: `LogoPositionEditor.tsx`** (~889 linhas)

Componente principal do módulo. Funcionalidades:

- **Preview visual:** Imagem do produto + retângulo laranja (área de gravação) + logo posicionável
- **Drag & drop:** Mouse e touch para arrastar logo dentro da área
- **Escala física:** Sliders de largura/altura em CM, convertidos para px via `pxPerCm`
- **Rotação:** -180° a 180° com botões de atalho (±15°, ±45°, ±90°)
- **Escala visual:** 10% a 500% — Logo renderizada com `transform: scale()`, recortada por `overflow: hidden` nos limites da área
- **Lock aspect ratio:** Toggle para manter proporção ao redimensionar
- **Flip horizontal/vertical:** Via CSS `scaleX(-1)` / `scaleY(-1)`
- **Filtros por técnica:** CSS filters no preview (bordado, laser, etc.) — ver `TECHNIQUE_FILTERS`
- **Régua visual:** Indicadores de dimensão em cm sobre a área de gravação

### 6. Geração de Mockup com IA

**Edge Function: `generate-mockup-nanobanana`**

```
Fluxo:
1. Frontend cria "job" na tabela mockup_generation_jobs
2. Invoca edge function com { jobId }
3. Edge function busca job, monta prompt com técnica + cor + área
4. Chama Nano Banana API: POST /v1/pro/generate
   - Body: { prompt, input_images: [logoUrl], model, resolution: "2K", guidance_scale: 7.5 }
   - Headers: Authorization Bearer NANOBANANA_API_KEY
5. Salva resultado em generated_mockups
6. Retorna URLs dos mockups gerados
```

**Prompts por técnica:**
```typescript
const TECHNIQUE_PROMPTS = {
  bordado: "as professional machine embroidery with visible thread stitching texture",
  silk: "as screen printed with flat solid colors, matte finish",
  dtf: "as DTF printed transfer with vibrant colors, slight glossy finish",
  laser: "as laser engraved, etched into the material surface, monochromatic",
  sublimacao: "as sublimation printed, colors absorbed seamlessly into the material",
  tampografia: "as pad printed with slightly glossy ink, precise small details",
  hot_stamping: "as hot stamped with metallic foil finish, shiny reflective surface",
  uv: "as UV printed with raised ink texture, vibrant colors",
  // ... etc
}
```

### 7. Layout de Aprovação (PDF A4)

**Libs: `jspdf`**

```
Geração de PDF:
1. Capturar mockup como imagem (canvas.toDataURL ou URL do storage)
2. Criar jsPDF com orientação automática (landscape/portrait baseado no aspect ratio)
3. Centralizar imagem no A4 mantendo proporção
4. Adicionar metadados: produto, técnica, dimensões, cores Pantone, data
5. Trigger download: pdf.save(fileName)
```

### 8. Upload e Storage

**Bucket:** `mockup-assets` no Supabase Storage

```
Pipeline de upload:
1. Converter base64 → Blob (atob + Uint8Array)
2. Path: {userId}/logos/{timestamp}-{safeName}.{ext}
3. Upload via supabase.storage.from("mockup-assets").upload(path, blob)
4. Retornar publicUrl para uso no editor e IA
```

**Conversão automática de formatos:**
- SVG, WebP, BMP → PNG via Canvas rasterization
- Max dimension: 2048px (scale down se maior)

### 9. Sistema de Drafts (Rascunhos)

```
Persistência em 2 camadas:
1. localStorage (imediato) — key: mockup_draft_v1_{userId}_{draftKey}
2. Supabase tabela mockup_drafts (debounced 2s)
   - Campos: user_id, draft_key, product_id, product_name, technique_id, technique_name,
     client_id, client_name, personalization_areas (JSONB), logo_data, updated_at
```

### 10. Áreas de Personalização (Multi-Área)

```
Cada produto pode ter múltiplos locais de gravação:
- Exemplo: "Frente", "Verso", "Tampa", "Lateral"
- Cada área tem: id, name, positionX, positionY, logoWidth, logoHeight, 
  logoRotation, logoScale, logoPreview
- Interface permite selecionar área ativa e aplicar logo individualmente
- Botão "Aplicar Logo em Todas as Áreas" para duplicar
```

---

## Tabelas do Banco de Dados

### mockup_drafts
```sql
CREATE TABLE mockup_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- referência ao auth.users
  draft_key TEXT DEFAULT 'default',
  product_id TEXT,
  product_name TEXT,
  technique_id TEXT,
  technique_name TEXT,
  client_id TEXT,
  client_name TEXT,
  personalization_areas JSONB, -- array de PersonalizationArea
  logo_data TEXT, -- URL do storage (NÃO base64)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: user_id = auth.uid()
```

### generated_mockups
```sql
CREATE TABLE generated_mockups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL, -- quem gerou
  client_id TEXT,
  client_name TEXT,
  product_id TEXT,
  product_name TEXT,
  product_sku TEXT,
  technique_id TEXT,
  technique_name TEXT,
  logo_url TEXT,
  mockup_url TEXT,
  layout_url TEXT,
  logo_width_cm NUMERIC,
  logo_height_cm NUMERIC,
  position_x NUMERIC,
  position_y NUMERIC,
  location_name TEXT,
  colors_count INTEGER,
  annotations JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: seller_id = auth.uid()
```

### mockup_generation_jobs (para geração IA assíncrona)
```sql
CREATE TABLE mockup_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id TEXT,
  product_name TEXT,
  product_sku TEXT,
  technique_id TEXT,
  technique_name TEXT,
  logo_url TEXT NOT NULL,
  product_colors TEXT[], -- array de hex colors
  areas_config JSONB, -- array de MockupArea
  custom_prompt TEXT,
  ai_model TEXT DEFAULT 'pro',
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  actual_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- RLS: user_id = auth.uid()
```

---

## Secrets Necessários

| Secret | Descrição |
|--------|-----------|
| `NANOBANANA_API_KEY` | API key para geração de mockups com IA |

---

## Fluxo do Usuário

```
1. Selecionar Produto (nome, imagem, dimensões físicas em cm)
2. Selecionar Técnica de Personalização (laser, serigrafia, UV, etc.)
3. Upload de Logo (arrastar ou clicar) → conversão automática SVG/WebP→PNG
4. Posicionar logo no editor visual (drag, resize, rotate, scale)
5. Configurar cores da técnica (laser: claro/escuro | serigrafia: 1-3 Pantone)
6. [Opcional] Selecionar Cliente
7. Gerar Layout Estático (canvas capture) OU Gerar Layout IA (Nano Banana)
8. Visualizar resultado → Download PNG ou PDF A4
9. Salvar no Histórico automaticamente
```

---

## Design

- **Tema:** Profissional e técnico, com tons neutros (cinza escuro, branco)
- **Accent:** Laranja vibrante (#F97316) para CTAs e área de gravação
- **Font:** Sans-serif moderna (Geist ou similar)
- **Layout:** Sidebar esquerda (configurações) + Canvas central (preview) + Painel direito (ações)
- **Dark mode:** Suportado via CSS variables
- **Responsivo:** Desktop-first (ferramenta de trabalho), adaptável para tablet

---

## Importante

- **NUNCA armazenar base64 no banco** — sempre fazer upload para Storage e salvar a URL
- **Canvas API para processamento** — NÃO usar filtros CSS para a imagem final (apenas preview)
- **CORS resiliente** — sempre implementar fallback fetch+blob para imagens externas
- **RLS obrigatório** — cada tabela deve ter policies baseadas em `auth.uid()`
- **Auto-save de drafts** — localStorage imediato + backend debounced (2s)
- **Escala > 100%** é INTENCIONAL — permite zoom/preenchimento recortado pelos limites da área
