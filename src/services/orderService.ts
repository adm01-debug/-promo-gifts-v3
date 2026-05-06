import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface ConvertQuoteToOrderParams {
  quoteId: string;
  sellerId: string;
  organizationId?: string | null;
}

export interface ConvertedOrder {
  id: string;
  order_number: string;
  status: string;
  total: number;
}

export async function convertQuoteToOrder({
  quoteId,
  sellerId,
  organizationId,
}: ConvertQuoteToOrderParams): Promise<ConvertedOrder> {
  try {
    const { data, error } = await supabase.rpc('convert_quote_to_order', {
      p_quote_id: quoteId,
      p_seller_id: sellerId,
      p_organization_id: organizationId || null,
    });

    if (error) {
      logger.error('Error in convertQuoteToOrder RPC:', error);
      throw error;
    }

    return data as ConvertedOrder;
  } catch (error) {
    logger.error('Error in convertQuoteToOrder:', error);
    throw error;
  }
}
