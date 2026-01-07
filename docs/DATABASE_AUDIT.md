# 📊 Auditoria Completa do Banco de Dados

**Projeto:** Gifts Store - Sistema de Brindes Personalizados  
**Data da Auditoria:** 07/01/2026  
**Total de Tabelas:** 54 tabelas  
**Schema:** public  

---

## 📋 Índice

1. [Resumo Executivo](#resumo-executivo)
2. [Categorização das Tabelas](#categorização-das-tabelas)
3. [Detalhamento por Módulo](#detalhamento-por-módulo)
4. [ENUMs do Sistema](#enums-do-sistema)
5. [Funções do Banco](#funções-do-banco)
6. [Estatísticas Atuais](#estatísticas-atuais)
7. [Relacionamentos](#relacionamentos)

---

## 📌 Resumo Executivo

O sistema Gifts Store possui uma arquitetura de banco de dados robusta com **54 tabelas** organizadas em módulos funcionais:

| Categoria | Quantidade | Descrição |
|-----------|------------|-----------|
| 🛒 **Produtos** | 12 tabelas | Catálogo, componentes, grupos e personalização |
| 📝 **Orçamentos** | 6 tabelas | Quotes, itens, histórico e templates |
| 📦 **Pedidos** | 3 tabelas | Orders, items e histórico |
| 👥 **Clientes (Bitrix)** | 3 tabelas | Integração CRM Bitrix24 |
| 🔐 **Segurança/Auth** | 12 tabelas | Autenticação, 2FA, dispositivos |
| 🎮 **Gamificação** | 5 tabelas | Achievements, XP, recompensas |
| 💬 **Comunicação** | 3 tabelas | Conversas AI, notificações |
| ⚙️ **Sistema** | 10 tabelas | Roles, permissões, analytics |

---

## 🗂️ Categorização das Tabelas

### 🛒 MÓDULO DE PRODUTOS (12 tabelas)

#### `products`
**Função:** Tabela principal do catálogo de produtos/brindes.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `sku` | TEXT | Código SKU único do produto |
| `name` | TEXT | Nome do produto |
| `description` | TEXT | Descrição detalhada |
| `price` | NUMERIC | Preço unitário |
| `category_id` | INTEGER | ID da categoria |
| `category_name` | TEXT | Nome da categoria (desnormalizado) |
| `subcategory` | TEXT | Subcategoria |
| `stock` | INTEGER | Quantidade em estoque |
| `stock_status` | TEXT | Status do estoque |
| `min_quantity` | INTEGER | Quantidade mínima de pedido |
| `images` | JSONB | Array de URLs das imagens |
| `colors` | JSONB | Cores disponíveis |
| `materials` | TEXT[] | Materiais do produto |
| `tags` | JSONB | Tags para busca |
| `variations` | JSONB | Variações do produto |
| `featured` | BOOLEAN | Produto em destaque |
| `new_arrival` | BOOLEAN | Novidade |
| `on_sale` | BOOLEAN | Em promoção |
| `is_active` | BOOLEAN | Ativo no catálogo |
| `is_kit` | BOOLEAN | É um kit |
| `kit_items` | JSONB | Itens do kit |
| `video_url` | TEXT | URL do vídeo |
| `external_id` | TEXT | ID externo (sincronização) |
| `supplier_id` | TEXT | ID do fornecedor |
| `supplier_name` | TEXT | Nome do fornecedor |
| `metadata` | JSONB | Metadados adicionais |
| `search_vector` | TSVECTOR | Vetor de busca fulltext |
| `synced_at` | TIMESTAMPTZ | Data da última sincronização |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

**Índices:**
- `products_pkey` (id)
- `products_sku_key` (sku - UNIQUE)
- `idx_products_category` (category_name)
- `idx_products_search` (search_vector - GIN)
- `idx_products_sku` (sku)
- `idx_products_supplier` (supplier_name)

---

#### `product_components`
**Função:** Define os componentes personalizáveis de cada produto (ex: tampa, corpo, clip).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `product_id` | UUID (FK) | Referência ao produto |
| `component_code` | TEXT | Código do componente |
| `component_name` | TEXT | Nome do componente |
| `image_url` | TEXT | Imagem do componente |
| `is_personalizable` | BOOLEAN | Pode ser personalizado |
| `is_active` | BOOLEAN | Está ativo |
| `sort_order` | INTEGER | Ordem de exibição |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

**Relacionamento:** `product_id → products.id`

---

#### `product_component_locations`
**Função:** Define as áreas de personalização dentro de cada componente.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `component_id` | UUID (FK) | Referência ao componente |
| `location_code` | TEXT | Código da localização |
| `location_name` | TEXT | Nome da área |
| `max_width_cm` | NUMERIC | Largura máxima em cm |
| `max_height_cm` | NUMERIC | Altura máxima em cm |
| `max_area_cm2` | NUMERIC | Área máxima em cm² |
| `area_image_url` | TEXT | Imagem da área |
| `printing_lines_image_url` | TEXT | Imagem com guias |
| `is_active` | BOOLEAN | Está ativo |

**Relacionamento:** `component_id → product_components.id`

---

#### `product_component_location_techniques`
**Função:** Associa técnicas de personalização às áreas dos componentes.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `component_location_id` | UUID (FK) | Referência à localização |
| `technique_id` | UUID (FK) | Referência à técnica |
| `composed_code` | TEXT | Código composto único |
| `composed_location_image_url` | TEXT | Imagem da composição |
| `max_colors` | INTEGER | Máximo de cores |
| `is_default` | BOOLEAN | É a técnica padrão |
| `is_active` | BOOLEAN | Está ativo |

---

#### `product_groups`
**Função:** Agrupa produtos similares para compartilhar regras de personalização.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `group_code` | TEXT | Código do grupo |
| `group_name` | TEXT | Nome do grupo |
| `description` | TEXT | Descrição |
| `is_active` | BOOLEAN | Está ativo |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

---

#### `product_group_members`
**Função:** Associa produtos aos grupos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `product_group_id` | UUID (FK) | Referência ao grupo |
| `product_id` | UUID (FK) | Referência ao produto |
| `use_group_rules` | BOOLEAN | Usa regras do grupo |

---

#### `product_group_components`
**Função:** Define componentes no nível do grupo (herdados pelos produtos).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `product_group_id` | UUID (FK) | Referência ao grupo |
| `component_code` | TEXT | Código do componente |
| `component_name` | TEXT | Nome do componente |
| `is_personalizable` | BOOLEAN | Pode ser personalizado |
| `is_active` | BOOLEAN | Está ativo |
| `sort_order` | INTEGER | Ordem de exibição |

---

#### `product_group_locations`
**Função:** Define localizações no nível do grupo.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `group_component_id` | UUID (FK) | Referência ao componente do grupo |
| `location_code` | TEXT | Código da localização |
| `location_name` | TEXT | Nome da área |
| `max_width_cm` | NUMERIC | Largura máxima |
| `max_height_cm` | NUMERIC | Altura máxima |
| `max_area_cm2` | NUMERIC | Área máxima |
| `area_image_url` | TEXT | Imagem da área |
| `is_active` | BOOLEAN | Está ativo |

---

#### `product_group_location_techniques`
**Função:** Associa técnicas às localizações do grupo.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `group_location_id` | UUID (FK) | Referência à localização |
| `technique_id` | UUID (FK) | Referência à técnica |
| `max_colors` | INTEGER | Máximo de cores |
| `is_default` | BOOLEAN | É a técnica padrão |
| `is_active` | BOOLEAN | Está ativo |

---

#### `product_views`
**Função:** Registra visualizações de produtos para analytics.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `product_id` | UUID (FK) | Referência ao produto |
| `product_sku` | TEXT | SKU do produto |
| `product_name` | TEXT | Nome do produto |
| `seller_id` | UUID | ID do vendedor |
| `view_type` | TEXT | Tipo de visualização |
| `created_at` | TIMESTAMPTZ | Data da visualização |

---

#### `product_sync_logs`
**Função:** Logs de sincronização de produtos (n8n/API).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `products_received` | INTEGER | Produtos recebidos |
| `products_created` | INTEGER | Produtos criados |
| `products_updated` | INTEGER | Produtos atualizados |
| `products_failed` | INTEGER | Produtos com falha |
| `source` | TEXT | Fonte da sincronização |
| `status` | TEXT | Status (pending/success/error) |
| `error_message` | TEXT | Mensagem de erro |
| `started_at` | TIMESTAMPTZ | Início |
| `completed_at` | TIMESTAMPTZ | Conclusão |

---

### 🎨 MÓDULO DE PERSONALIZAÇÃO (4 tabelas)

#### `personalization_techniques`
**Função:** Catálogo de técnicas de personalização disponíveis.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `code` | TEXT | Código da técnica |
| `name` | TEXT | Nome (Serigrafia, Laser, etc.) |
| `description` | TEXT | Descrição da técnica |
| `min_quantity` | INTEGER | Quantidade mínima |
| `setup_cost` | NUMERIC | Custo de setup |
| `unit_cost` | NUMERIC | Custo por unidade |
| `estimated_days` | INTEGER | Dias estimados |
| `is_active` | BOOLEAN | Está ativo |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

---

#### `personalization_sizes`
**Função:** Define tamanhos padrão para cada técnica.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `technique_id` | UUID (FK) | Referência à técnica |
| `technique_code` | TEXT | Código da técnica |
| `size_label` | TEXT | Rótulo do tamanho |
| `width_cm` | NUMERIC | Largura em cm |
| `height_cm` | NUMERIC | Altura em cm |
| `area_cm2` | NUMERIC | Área em cm² |
| `price_modifier` | NUMERIC | Modificador de preço |
| `is_active` | BOOLEAN | Está ativo |

---

#### `personalization_locations`
**Função:** Catálogo geral de localizações por tipo de produto.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `product_type` | TEXT | Tipo do produto |
| `location_name` | TEXT | Nome da localização |
| `code` | TEXT | Código da localização |
| `is_active` | BOOLEAN | Está ativo |

---

#### `personalization_simulations`
**Função:** Salva simulações de personalização feitas pelos vendedores.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `seller_id` | UUID | ID do vendedor |
| `client_id` | UUID (FK) | Referência ao cliente |
| `product_id` | UUID (FK) | Referência ao produto |
| `product_name` | TEXT | Nome do produto |
| `product_sku` | TEXT | SKU do produto |
| `product_unit_price` | NUMERIC | Preço unitário |
| `quantity` | INTEGER | Quantidade |
| `simulation_data` | JSONB | Dados da simulação |
| `notes` | TEXT | Observações |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

---

### 📝 MÓDULO DE ORÇAMENTOS (6 tabelas)

#### `quotes`
**Função:** Tabela principal de orçamentos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `quote_number` | TEXT | Número do orçamento (gerado) |
| `client_id` | UUID (FK) | Referência ao cliente |
| `seller_id` | UUID | ID do vendedor |
| `status` | ENUM | draft/pending/sent/approved/rejected/expired |
| `subtotal` | NUMERIC | Subtotal |
| `discount_percent` | NUMERIC | Desconto % |
| `discount_amount` | NUMERIC | Desconto R$ |
| `total` | NUMERIC | Total |
| `valid_until` | DATE | Validade |
| `notes` | TEXT | Observações para cliente |
| `internal_notes` | TEXT | Notas internas |
| `client_response` | TEXT | Resposta do cliente |
| `client_response_at` | TIMESTAMPTZ | Data da resposta |
| `client_response_notes` | TEXT | Notas da resposta |
| `bitrix_deal_id` | TEXT | ID do deal no Bitrix |
| `bitrix_quote_id` | TEXT | ID do quote no Bitrix |
| `synced_to_bitrix` | BOOLEAN | Sincronizado |
| `synced_at` | TIMESTAMPTZ | Data de sincronização |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

**Status possíveis:** `draft` → `pending` → `sent` → `approved`/`rejected`/`expired`

---

#### `quote_items`
**Função:** Itens de cada orçamento.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `quote_id` | UUID (FK) | Referência ao orçamento |
| `product_id` | UUID | Referência ao produto |
| `product_sku` | TEXT | SKU do produto |
| `product_name` | TEXT | Nome do produto |
| `product_image_url` | TEXT | Imagem do produto |
| `quantity` | INTEGER | Quantidade |
| `unit_price` | NUMERIC | Preço unitário |
| `subtotal` | NUMERIC | Subtotal do item |
| `color_name` | TEXT | Nome da cor |
| `color_hex` | TEXT | Código hex da cor |
| `notes` | TEXT | Observações do item |
| `sort_order` | INTEGER | Ordem de exibição |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

---

#### `quote_item_personalizations`
**Função:** Personalizações aplicadas a cada item do orçamento.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `quote_item_id` | UUID (FK) | Referência ao item |
| `technique_id` | UUID (FK) | Referência à técnica |
| `colors_count` | INTEGER | Quantidade de cores |
| `positions_count` | INTEGER | Quantidade de posições |
| `area_cm2` | NUMERIC | Área em cm² |
| `setup_cost` | NUMERIC | Custo de setup |
| `unit_cost` | NUMERIC | Custo unitário |
| `total_cost` | NUMERIC | Custo total |
| `notes` | TEXT | Observações |

---

#### `quote_history`
**Função:** Histórico de alterações nos orçamentos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `quote_id` | UUID (FK) | Referência ao orçamento |
| `user_id` | UUID | ID do usuário |
| `action` | TEXT | Ação realizada |
| `description` | TEXT | Descrição da ação |
| `field_changed` | TEXT | Campo alterado |
| `old_value` | TEXT | Valor anterior |
| `new_value` | TEXT | Novo valor |
| `metadata` | JSONB | Metadados extras |
| `created_at` | TIMESTAMPTZ | Data da ação |

---

#### `quote_templates`
**Função:** Templates salvos para criar orçamentos rapidamente.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `seller_id` | UUID | ID do vendedor |
| `name` | TEXT | Nome do template |
| `description` | TEXT | Descrição |
| `template_data` | JSONB | Dados do template |
| `items_data` | JSONB | Itens do template |
| `discount_percent` | NUMERIC | Desconto % |
| `discount_amount` | NUMERIC | Desconto R$ |
| `validity_days` | INTEGER | Dias de validade |
| `notes` | TEXT | Observações |
| `internal_notes` | TEXT | Notas internas |
| `payment_terms` | TEXT | Condições de pagamento |
| `delivery_time` | TEXT | Prazo de entrega |
| `is_default` | BOOLEAN | É o template padrão |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

---

#### `quote_approval_tokens`
**Função:** Tokens para aprovação de orçamentos por link.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `quote_id` | UUID (FK) | Referência ao orçamento |
| `token` | TEXT | Token único |
| `created_by` | UUID | ID do criador |
| `expires_at` | TIMESTAMPTZ | Data de expiração |
| `used_at` | TIMESTAMPTZ | Data de uso |
| `created_at` | TIMESTAMPTZ | Data de criação |

---

### 📦 MÓDULO DE PEDIDOS (3 tabelas)

#### `orders`
**Função:** Tabela principal de pedidos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `order_number` | TEXT | Número do pedido (gerado) |
| `quote_id` | UUID (FK) | Referência ao orçamento |
| `client_id` | UUID (FK) | Referência ao cliente |
| `seller_id` | UUID | ID do vendedor |
| `status` | ENUM | pending/confirmed/in_production/ready/shipped/delivered/cancelled |
| `fulfillment_status` | ENUM | not_started/picking/packing/shipped/delivered |
| `subtotal` | NUMERIC | Subtotal |
| `discount_percent` | NUMERIC | Desconto % |
| `discount_amount` | NUMERIC | Desconto R$ |
| `shipping_cost` | NUMERIC | Custo de frete |
| `total` | NUMERIC | Total |
| `shipping_method` | TEXT | Método de envio |
| `shipping_address` | TEXT | Endereço de entrega |
| `tracking_number` | TEXT | Código de rastreio |
| `tracking_url` | TEXT | URL de rastreamento |
| `payment_method` | TEXT | Forma de pagamento |
| `payment_status` | TEXT | Status do pagamento |
| `paid_amount` | NUMERIC | Valor pago |
| `notes` | TEXT | Observações |
| `internal_notes` | TEXT | Notas internas |
| `estimated_delivery_date` | DATE | Data estimada |
| `actual_delivery_date` | DATE | Data real |
| `confirmed_at` | TIMESTAMPTZ | Data de confirmação |
| `shipped_at` | TIMESTAMPTZ | Data de envio |
| `delivered_at` | TIMESTAMPTZ | Data de entrega |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

**Status possíveis:** `pending` → `confirmed` → `in_production` → `ready_for_pickup` → `shipped` → `delivered`

---

#### `order_items`
**Função:** Itens de cada pedido.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `order_id` | UUID (FK) | Referência ao pedido |
| `product_id` | TEXT | ID do produto |
| `product_sku` | TEXT | SKU do produto |
| `product_name` | TEXT | Nome do produto |
| `product_image_url` | TEXT | Imagem do produto |
| `quantity` | INTEGER | Quantidade |
| `unit_price` | NUMERIC | Preço unitário |
| `subtotal` | NUMERIC | Subtotal |
| `color_name` | TEXT | Nome da cor |
| `color_hex` | TEXT | Código hex |
| `notes` | TEXT | Observações |
| `personalization_details` | JSONB | Detalhes de personalização |
| `sort_order` | INTEGER | Ordem de exibição |

---

#### `order_history`
**Função:** Histórico de alterações nos pedidos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `order_id` | UUID (FK) | Referência ao pedido |
| `user_id` | UUID | ID do usuário |
| `action` | TEXT | Ação realizada |
| `description` | TEXT | Descrição |
| `old_value` | TEXT | Valor anterior |
| `new_value` | TEXT | Novo valor |
| `metadata` | JSONB | Metadados extras |
| `created_at` | TIMESTAMPTZ | Data da ação |

---

### 👥 MÓDULO DE CLIENTES - BITRIX24 (3 tabelas)

#### `bitrix_clients`
**Função:** Clientes sincronizados do Bitrix24 CRM.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `bitrix_id` | TEXT | ID no Bitrix24 (UNIQUE) |
| `name` | TEXT | Nome/Razão social |
| `email` | TEXT | E-mail |
| `phone` | TEXT | Telefone |
| `address` | TEXT | Endereço |
| `ramo` | TEXT | Ramo de atividade |
| `nicho` | TEXT | Nicho de mercado |
| `logo_url` | TEXT | URL do logo |
| `primary_color_name` | TEXT | Cor primária (nome) |
| `primary_color_hex` | TEXT | Cor primária (hex) |
| `total_spent` | NUMERIC | Total gasto |
| `last_purchase_date` | TIMESTAMPTZ | Última compra |
| `synced_at` | TIMESTAMPTZ | Data de sincronização |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

---

#### `bitrix_deals`
**Função:** Negócios/Deals do Bitrix24.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `bitrix_id` | TEXT | ID no Bitrix24 (UNIQUE) |
| `bitrix_client_id` | TEXT | ID do cliente no Bitrix |
| `title` | TEXT | Título do deal |
| `value` | NUMERIC | Valor |
| `currency` | TEXT | Moeda |
| `stage` | TEXT | Estágio do funil |
| `close_date` | TIMESTAMPTZ | Data de fechamento |
| `created_at_bitrix` | TIMESTAMPTZ | Data de criação no Bitrix |
| `synced_at` | TIMESTAMPTZ | Data de sincronização |
| `created_at` | TIMESTAMPTZ | Data de criação local |

---

#### `bitrix_sync_logs`
**Função:** Logs de sincronização com Bitrix24.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `synced_by` | UUID | ID do usuário |
| `clients_synced` | INTEGER | Clientes sincronizados |
| `deals_synced` | INTEGER | Deals sincronizados |
| `status` | TEXT | Status (pending/success/error) |
| `error_message` | TEXT | Mensagem de erro |
| `started_at` | TIMESTAMPTZ | Início |
| `completed_at` | TIMESTAMPTZ | Conclusão |

---

### 🔐 MÓDULO DE SEGURANÇA E AUTENTICAÇÃO (12 tabelas)

#### `profiles`
**Função:** Perfis de usuários do sistema.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID | ID do usuário (auth.users) |
| `full_name` | TEXT | Nome completo |
| `avatar_url` | TEXT | URL do avatar |
| `phone` | TEXT | Telefone |
| `role_id` | UUID (FK) | Referência ao cargo |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

---

#### `roles`
**Função:** Cargos/Funções do sistema.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `name` | VARCHAR | Nome do cargo |
| `description` | TEXT | Descrição |
| `created_at` | TIMESTAMPTZ | Data de criação |

---

#### `permissions`
**Função:** Permissões granulares do sistema.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `code` | TEXT | Código da permissão |
| `name` | TEXT | Nome da permissão |
| `description` | TEXT | Descrição |
| `category` | TEXT | Categoria |
| `created_at` | TIMESTAMPTZ | Data de criação |

---

#### `role_permissions`
**Função:** Associação entre roles e permissions.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `role` | ENUM | admin/vendedor |
| `permission_id` | UUID (FK) | Referência à permissão |
| `created_at` | TIMESTAMPTZ | Data de criação |

---

#### `user_roles`
**Função:** Associação entre usuários e roles.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID | ID do usuário |
| `role` | ENUM | admin/vendedor |
| `created_at` | TIMESTAMPTZ | Data de criação |

---

#### `user_2fa_settings`
**Função:** Configurações de autenticação de dois fatores.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID | ID do usuário |
| `is_enabled` | BOOLEAN | 2FA ativo |
| `totp_secret` | TEXT | Segredo TOTP (encriptado) |
| `backup_codes` | TEXT[] | Códigos de backup |
| `enabled_at` | TIMESTAMPTZ | Data de ativação |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

---

#### `user_passkeys`
**Função:** Chaves de acesso WebAuthn (passkeys).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID | ID do usuário |
| `credential_id` | TEXT | ID da credencial |
| `public_key` | TEXT | Chave pública |
| `device_name` | TEXT | Nome do dispositivo |
| `transports` | TEXT[] | Transportes suportados |
| `counter` | INTEGER | Contador de uso |
| `last_used_at` | TIMESTAMPTZ | Último uso |
| `created_at` | TIMESTAMPTZ | Data de criação |

---

#### `user_known_devices`
**Função:** Dispositivos conhecidos do usuário.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID | ID do usuário |
| `device_fingerprint` | TEXT | Fingerprint do dispositivo |
| `ip_address` | TEXT | Endereço IP |
| `user_agent` | TEXT | User agent |
| `browser_name` | TEXT | Nome do navegador |
| `os_name` | TEXT | Sistema operacional |
| `device_type` | TEXT | Tipo de dispositivo |
| `location` | TEXT | Localização |
| `is_trusted` | BOOLEAN | É confiável |
| `first_seen_at` | TIMESTAMPTZ | Primeiro acesso |
| `last_seen_at` | TIMESTAMPTZ | Último acesso |

---

#### `user_allowed_ips`
**Função:** IPs permitidos por usuário (whitelist).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID | ID do usuário |
| `ip_address` | TEXT | Endereço IP |
| `description` | TEXT | Descrição |
| `is_active` | BOOLEAN | Está ativo |
| `created_at` | TIMESTAMPTZ | Data de criação |

---

#### `login_attempts`
**Função:** Registro de tentativas de login.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID | ID do usuário |
| `email` | TEXT | E-mail tentado |
| `ip_address` | TEXT | Endereço IP |
| `user_agent` | TEXT | User agent |
| `success` | BOOLEAN | Foi bem-sucedido |
| `failure_reason` | TEXT | Motivo da falha |
| `created_at` | TIMESTAMPTZ | Data da tentativa |

---

#### `device_login_notifications`
**Função:** Notificações de login em novos dispositivos.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID | ID do usuário |
| `device_id` | UUID (FK) | Referência ao dispositivo |
| `ip_address` | TEXT | Endereço IP |
| `user_agent` | TEXT | User agent |
| `location` | TEXT | Localização |
| `email_sent` | BOOLEAN | E-mail enviado |
| `notification_sent_at` | TIMESTAMPTZ | Data do envio |
| `created_at` | TIMESTAMPTZ | Data de criação |

---

#### `password_reset_requests`
**Função:** Solicitações de reset de senha (com aprovação).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID | ID do usuário |
| `email` | TEXT | E-mail |
| `status` | TEXT | pending/approved/rejected |
| `requested_at` | TIMESTAMPTZ | Data da solicitação |
| `reviewed_at` | TIMESTAMPTZ | Data da revisão |
| `reviewed_by` | UUID | ID do revisor |
| `reviewer_notes` | TEXT | Notas do revisor |
| `created_at` | TIMESTAMPTZ | Data de criação |

---

#### `geo_allowed_countries`
**Função:** Países permitidos para acesso.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `country_code` | TEXT | Código do país (UNIQUE) |
| `country_name` | TEXT | Nome do país |
| `is_active` | BOOLEAN | Está ativo |
| `created_by` | UUID | ID do criador |
| `created_at` | TIMESTAMPTZ | Data de criação |

---

#### `security_settings`
**Função:** Configurações globais de segurança.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `setting_key` | TEXT | Chave da configuração |
| `setting_value` | JSONB | Valor da configuração |
| `description` | TEXT | Descrição |
| `updated_by` | UUID | ID do atualizador |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

---

### 🎮 MÓDULO DE GAMIFICAÇÃO (5 tabelas)

#### `achievements`
**Função:** Catálogo de conquistas disponíveis.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `code` | TEXT | Código único (UNIQUE) |
| `name` | TEXT | Nome da conquista |
| `description` | TEXT | Descrição |
| `icon` | TEXT | Ícone |
| `category` | TEXT | Categoria |
| `requirement_type` | TEXT | Tipo de requisito |
| `requirement_value` | INTEGER | Valor do requisito |
| `xp_reward` | INTEGER | XP de recompensa |
| `coins_reward` | INTEGER | Moedas de recompensa |
| `is_active` | BOOLEAN | Está ativo |
| `created_at` | TIMESTAMPTZ | Data de criação |

---

#### `seller_achievements`
**Função:** Conquistas desbloqueadas por vendedor.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID | ID do vendedor |
| `achievement_id` | UUID (FK) | Referência à conquista |
| `earned_at` | TIMESTAMPTZ | Data de conquista |

---

#### `seller_gamification`
**Função:** Dados de gamificação do vendedor.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID | ID do vendedor |
| `xp` | INTEGER | Pontos de experiência |
| `level` | INTEGER | Nível atual |
| `coins` | INTEGER | Moedas |
| `streak_days` | INTEGER | Dias consecutivos |
| `last_activity_at` | TIMESTAMPTZ | Última atividade |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

---

#### `store_rewards`
**Função:** Recompensas disponíveis na loja.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `code` | TEXT | Código da recompensa |
| `name` | TEXT | Nome |
| `description` | TEXT | Descrição |
| `category` | TEXT | Categoria |
| `cost_coins` | INTEGER | Custo em moedas |
| `stock` | INTEGER | Estoque |
| `is_active` | BOOLEAN | Está ativo |
| `created_at` | TIMESTAMPTZ | Data de criação |

---

#### `user_rewards`
**Função:** Recompensas resgatadas pelos usuários.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID | ID do usuário |
| `reward_id` | UUID (FK) | Referência à recompensa |
| `redeemed_at` | TIMESTAMPTZ | Data do resgate |
| `status` | TEXT | Status do resgate |

---

### 💬 MÓDULO DE COMUNICAÇÃO (3 tabelas)

#### `expert_conversations`
**Função:** Conversas com o assistente AI Expert.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `seller_id` | UUID | ID do vendedor |
| `client_id` | UUID (FK) | Referência ao cliente |
| `title` | TEXT | Título da conversa |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

---

#### `expert_messages`
**Função:** Mensagens das conversas com AI.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `conversation_id` | UUID (FK) | Referência à conversa |
| `role` | TEXT | user/assistant |
| `content` | TEXT | Conteúdo da mensagem |
| `created_at` | TIMESTAMPTZ | Data de criação |

---

#### `notifications`
**Função:** Notificações in-app para usuários.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID | ID do usuário |
| `type` | TEXT | Tipo de notificação |
| `title` | TEXT | Título |
| `message` | TEXT | Mensagem |
| `metadata` | JSONB | Metadados extras |
| `is_read` | BOOLEAN | Foi lida |
| `created_at` | TIMESTAMPTZ | Data de criação |

---

### ⚙️ MÓDULO DE SISTEMA (5 tabelas)

#### `sales_goals`
**Função:** Metas de vendas dos vendedores.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID | ID do vendedor |
| `goal_type` | TEXT | Tipo (monthly/weekly) |
| `target_value` | NUMERIC | Meta de valor |
| `current_value` | NUMERIC | Valor atual |
| `target_quotes` | INTEGER | Meta de orçamentos |
| `current_quotes` | INTEGER | Orçamentos atuais |
| `target_conversions` | INTEGER | Meta de conversões |
| `current_conversions` | INTEGER | Conversões atuais |
| `start_date` | DATE | Início do período |
| `end_date` | DATE | Fim do período |
| `is_achieved` | BOOLEAN | Meta atingida |
| `achieved_at` | TIMESTAMPTZ | Data de conquista |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

---

#### `follow_up_reminders`
**Função:** Lembretes de follow-up com clientes.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID | ID do vendedor |
| `client_id` | UUID (FK) | Referência ao cliente |
| `quote_id` | UUID (FK) | Referência ao orçamento |
| `title` | TEXT | Título do lembrete |
| `description` | TEXT | Descrição |
| `reminder_type` | TEXT | Tipo (follow_up/call/meeting) |
| `priority` | TEXT | Prioridade (low/medium/high) |
| `reminder_date` | TIMESTAMPTZ | Data do lembrete |
| `is_completed` | BOOLEAN | Foi concluído |
| `completed_at` | TIMESTAMPTZ | Data de conclusão |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

---

#### `search_analytics`
**Função:** Analytics de buscas realizadas.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `seller_id` | UUID | ID do vendedor |
| `search_term` | TEXT | Termo buscado |
| `results_count` | INTEGER | Quantidade de resultados |
| `filters_used` | JSONB | Filtros aplicados |
| `created_at` | TIMESTAMPTZ | Data da busca |

---

#### `generated_mockups`
**Função:** Mockups gerados pelo sistema.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `seller_id` | UUID | ID do vendedor |
| `client_id` | UUID (FK) | Referência ao cliente |
| `product_id` | UUID (FK) | Referência ao produto |
| `product_name` | TEXT | Nome do produto |
| `product_sku` | TEXT | SKU do produto |
| `technique_id` | UUID (FK) | Referência à técnica |
| `technique_name` | TEXT | Nome da técnica |
| `logo_url` | TEXT | URL do logo usado |
| `mockup_url` | TEXT | URL do mockup gerado |
| `position_x` | INTEGER | Posição X (%) |
| `position_y` | INTEGER | Posição Y (%) |
| `logo_width_cm` | NUMERIC | Largura do logo |
| `logo_height_cm` | NUMERIC | Altura do logo |
| `created_at` | TIMESTAMPTZ | Data de criação |

---

#### `user_onboarding`
**Função:** Progresso do onboarding de usuários.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador único |
| `user_id` | UUID | ID do usuário |
| `steps_completed` | JSONB | Passos concluídos |
| `is_completed` | BOOLEAN | Onboarding completo |
| `completed_at` | TIMESTAMPTZ | Data de conclusão |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |

---

## 🔢 ENUMs do Sistema

### `app_role`
Papéis de usuário do sistema.
```
{admin, vendedor}
```

### `quote_status`
Status de orçamentos.
```
{draft, pending, sent, approved, rejected, expired}
```

### `order_status`
Status de pedidos.
```
{pending, confirmed, in_production, ready_for_pickup, shipped, delivered, cancelled}
```

### `fulfillment_status`
Status de fulfillment.
```
{not_started, picking, packing, shipped, delivered}
```

---

## ⚡ Funções do Banco

| Função | Tipo | Descrição |
|--------|------|-----------|
| `generate_quote_number()` | TRIGGER | Gera número sequencial para orçamentos |
| `generate_order_number()` | TRIGGER | Gera número sequencial para pedidos |
| `update_updated_at_column()` | TRIGGER | Atualiza campo updated_at automaticamente |
| `handle_new_user()` | TRIGGER | Cria perfil automático para novos usuários |
| `products_generate_search_vector()` | TRIGGER | Atualiza vetor de busca de produtos |
| `has_role(uuid, app_role)` | FUNCTION | Verifica se usuário tem determinado papel |
| `get_user_role(uuid)` | FUNCTION | Retorna o papel do usuário |
| `search_products_semantic(text, int)` | FUNCTION | Busca semântica de produtos |

---

## 📊 Estatísticas Atuais

| Tabela | Registros |
|--------|-----------|
| products | 2 |
| quotes | 0 |
| orders | 0 |
| bitrix_clients | 0 |

---

## 🔗 Diagrama de Relacionamentos

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRODUTOS & PERSONALIZAÇÃO                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  product_groups ──┬─► product_group_members ◄── products            │
│        │          │                               │                  │
│        ▼          │                               ▼                  │
│  product_group_   │                    product_components            │
│  components       │                               │                  │
│        │          │                               ▼                  │
│        ▼          │                    product_component_            │
│  product_group_   │                    locations                     │
│  locations        │                               │                  │
│        │          │                               ▼                  │
│        ▼          │                    product_component_            │
│  product_group_   │                    location_techniques           │
│  location_        │                               │                  │
│  techniques       │                               │                  │
│        │          │                               │                  │
│        └──────────┴───────────────────────────────┘                  │
│                               │                                      │
│                               ▼                                      │
│                   personalization_techniques                         │
│                               │                                      │
│                               ▼                                      │
│                   personalization_sizes                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      ORÇAMENTOS & PEDIDOS                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  bitrix_clients ◄─────────────┬───────────────► bitrix_deals        │
│        │                      │                                      │
│        ▼                      │                                      │
│  quotes ◄─────────────────────┘                                      │
│        │                                                             │
│        ├─► quote_items ─► quote_item_personalizations                │
│        │                                                             │
│        ├─► quote_history                                             │
│        │                                                             │
│        ├─► quote_approval_tokens                                     │
│        │                                                             │
│        └─► orders                                                    │
│              │                                                       │
│              ├─► order_items                                         │
│              │                                                       │
│              └─► order_history                                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      USUÁRIOS & SEGURANÇA                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  auth.users (Supabase)                                               │
│        │                                                             │
│        ├─► profiles ◄── roles                                        │
│        │                   │                                         │
│        │                   └─► role_permissions ◄── permissions      │
│        │                                                             │
│        ├─► user_roles                                                │
│        │                                                             │
│        ├─► user_2fa_settings                                         │
│        │                                                             │
│        ├─► user_passkeys                                             │
│        │                                                             │
│        ├─► user_known_devices ◄── device_login_notifications        │
│        │                                                             │
│        ├─► user_allowed_ips                                          │
│        │                                                             │
│        └─► login_attempts                                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        GAMIFICAÇÃO                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  achievements ◄─────────────► seller_achievements                    │
│                                      │                               │
│                                      ▼                               │
│                              seller_gamification                     │
│                                      │                               │
│  store_rewards ◄─────────────► user_rewards                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Políticas RLS

Todas as tabelas possuem Row Level Security (RLS) habilitado com políticas específicas:

- **Vendedores** podem acessar apenas seus próprios dados
- **Admins** têm acesso total a todos os dados
- **Tabelas públicas** (products, techniques) são visíveis para todos os autenticados
- **Serviços** (edge functions) usam service_role para operações especiais

---

## 📝 Notas Importantes

1. **Sincronização Externa:** As tabelas `bitrix_*` e `product_sync_logs` são alimentadas por integrações externas (n8n, webhooks)

2. **Busca Semântica:** A tabela `products` possui um `search_vector` do tipo TSVECTOR para busca fulltext otimizada

3. **Triggers Automáticos:** 
   - `updated_at` é atualizado automaticamente
   - Números de quote/order são gerados sequencialmente
   - Perfis são criados automaticamente para novos usuários

4. **Gamificação:** O sistema de XP, moedas e conquistas incentiva a produtividade dos vendedores

5. **Segurança Multi-camada:** 2FA, passkeys, dispositivos conhecidos, geo-blocking e IP whitelist

---

*Documento gerado automaticamente em 07/01/2026*
