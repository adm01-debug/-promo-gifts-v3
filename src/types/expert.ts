// src/types/expert.ts
// Chat com especialista IA

export interface ExpertConversation {
  id: string;
  seller_id: string;           // FK profiles.id
  client_id: string | null;    // FK bitrix_clients.id (opcional)
  title: string;
  created_at: string;
  updated_at: string;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ExpertMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

// Conversa com mensagens
export interface ConversationWithMessages extends ExpertConversation {
  messages: ExpertMessage[];
}

// Input para criar mensagem
export interface MessageInput {
  conversation_id: string;
  role: MessageRole;
  content: string;
}

// Contexto para o especialista
export interface ExpertContext {
  client?: {
    name: string;
    ramo?: string;
    nicho?: string;
    primary_color?: string;
  };
  products?: Array<{
    name: string;
    category?: string;
    price?: number;
  }>;
  occasion?: string;
  budget?: number;
  quantity?: number;
}
