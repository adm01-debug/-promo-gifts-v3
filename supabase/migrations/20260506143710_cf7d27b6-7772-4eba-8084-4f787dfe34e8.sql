-- Enum para tipos de eventos em conversas
create type public.conversation_event_type as enum ('text', 'image', 'file', 'system', 'tool_call', 'tool_result');

-- Tabela principal de auditoria de conversas
create table public.conversation_audit_logs (
    id uuid primary key default gen_random_uuid(),
    session_id text not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    started_at timestamp with time zone default now() not null,
    ended_at timestamp with time zone,
    total_tokens_estimated integer default 0,
    metadata jsonb default '{}'::jsonb,
    status text default 'active' not null, -- 'active', 'completed', 'archived'
    client_info jsonb default '{}'::jsonb -- IP, UserAgent, Viewport
);

-- Tabela de histórico de eventos detalhado (Multipart support)
create table public.conversation_event_history (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid references public.conversation_audit_logs(id) on delete cascade not null,
    role text not null, -- 'user', 'assistant', 'system'
    event_type public.conversation_event_type default 'text' not null,
    content text, -- Texto principal ou descrição
    media_url text, -- URL para imagem ou arquivo se aplicável
    media_metadata jsonb default '{}'::jsonb, -- Dimensões, mimetype, tamanho
    tokens_estimated integer default 0,
    created_at timestamp with time zone default now() not null,
    request_id uuid -- Correlação com logs de bridge/edge
);

-- Tabela de status de entrega/leitura para suporte comercial
create table public.conversation_delivery_status (
    id uuid primary key default gen_random_uuid(),
    event_id uuid references public.conversation_event_history(id) on delete cascade not null,
    status text default 'sent' not null, -- 'sent', 'delivered', 'read', 'failed'
    error_details text,
    updated_at timestamp with time zone default now() not null
);

-- Habilitar RLS
alter table public.conversation_audit_logs enable row level security;
alter table public.conversation_event_history enable row level security;
alter table public.conversation_delivery_status enable row level security;

-- Políticas para conversation_audit_logs
create policy "Admins e Managers podem ver todos os logs de conversa"
on public.conversation_audit_logs
for select
to authenticated
using (
    public.has_role(auth.uid(), 'admin') or 
    public.has_role(auth.uid(), 'manager')
);

create policy "Usuários podem ver seus próprios logs de conversa"
on public.conversation_audit_logs
for select
to authenticated
using (auth.uid() = user_id);

create policy "Usuários podem criar seus próprios logs de conversa"
on public.conversation_audit_logs
for insert
to authenticated
with check (auth.uid() = user_id);

-- Políticas para conversation_event_history
create policy "Acesso ao histórico de eventos segue o log de auditoria"
on public.conversation_event_history
for select
to authenticated
using (
    exists (
        select 1 from public.conversation_audit_logs
        where id = conversation_id
    )
);

create policy "Inserção de eventos permitida para o dono da conversa"
on public.conversation_event_history
for insert
to authenticated
with check (
    exists (
        select 1 from public.conversation_audit_logs
        where id = conversation_id and user_id = auth.uid()
    )
);

-- Triggers para atualização de timestamps
create trigger update_delivery_status_updated_at
before update on public.conversation_delivery_status
for each row
execute function public.update_updated_at_column();

-- Índices para performance
create index idx_conv_audit_user_id on public.conversation_audit_logs(user_id);
create index idx_conv_audit_session_id on public.conversation_audit_logs(session_id);
create index idx_conv_event_conv_id on public.conversation_event_history(conversation_id);
create index idx_conv_delivery_event_id on public.conversation_delivery_status(event_id);
