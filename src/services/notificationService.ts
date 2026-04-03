import { supabase } from '@/integrations/supabase/client';

interface SendNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  category?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Send a notification directly via the workspace_notifications table.
 * This triggers realtime updates for the recipient.
 */
export async function sendNotification(params: SendNotificationParams): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('workspace_notifications')
      .insert({
        user_id: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || 'info',
        category: params.category || 'system',
        action_url: params.actionUrl || null,
        metadata: params.metadata || {},
      });

    if (error) {
      console.error('Error sending notification:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to send notification:', err);
    return false;
  }
}

/** Notify when a quote status changes */
export async function notifyQuoteStatusChange(
  userId: string,
  quoteNumber: string,
  newStatus: string,
  quoteId: string
) {
  const statusLabels: Record<string, string> = {
    draft: 'Rascunho',
    sent: 'Enviado',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    converted: 'Convertido em Pedido',
  };

  return sendNotification({
    userId,
    title: `Orçamento ${quoteNumber} atualizado`,
    message: `Status alterado para: ${statusLabels[newStatus] || newStatus}`,
    type: newStatus === 'approved' ? 'success' : newStatus === 'rejected' ? 'warning' : 'info',
    category: 'quotes',
    actionUrl: `/orcamentos/${quoteId}`,
    metadata: { quoteId, quoteNumber, newStatus },
  });
}

/** Notify when a new order is created */
export async function notifyNewOrder(
  userId: string,
  orderNumber: string,
  orderId: string,
  clientName: string
) {
  return sendNotification({
    userId,
    title: `Novo pedido ${orderNumber}`,
    message: `Pedido criado para ${clientName}`,
    type: 'success',
    category: 'orders',
    actionUrl: `/pedidos/${orderId}`,
    metadata: { orderId, orderNumber, clientName },
  });
}

/** Notify when a quote receives client response */
export async function notifyQuoteResponse(
  userId: string,
  quoteNumber: string,
  quoteId: string,
  response: 'approved' | 'rejected'
) {
  return sendNotification({
    userId,
    title: response === 'approved' 
      ? `🎉 Orçamento ${quoteNumber} aprovado!`
      : `Orçamento ${quoteNumber} recusado`,
    message: response === 'approved'
      ? 'O cliente aprovou o orçamento. Converta em pedido!'
      : 'O cliente recusou o orçamento. Considere negociar.',
    type: response === 'approved' ? 'success' : 'warning',
    category: 'quotes',
    actionUrl: `/orcamentos/${quoteId}`,
    metadata: { quoteId, quoteNumber, response },
  });
}
