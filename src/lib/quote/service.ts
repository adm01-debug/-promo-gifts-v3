// src/lib/quote/service.ts
import { supabase } from '@/integrations/supabase/client';
import { QuoteStatus } from './stateMachine';
import { createClientLogger } from '@/lib/telemetry/structuredLogger';

const logger = createClientLogger('quote-service');

export class QuoteService {
  /**
   * Fetches a quote with its current status.
   */
  static async getQuote(id: string) {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      logger.error('Failed to fetch quote', { id, error });
      throw error;
    }

    return data;
  }

  /**
   * Updates the status of a quote with audit logging.
   */
  static async updateStatus(id: string, status: QuoteStatus, metadata: any = {}) {
    logger.info('Updating quote status', { id, status });

    const { data, error } = await supabase
      .from('quotes')
      .update({ 
        status, 
        updated_at: new Date().toISOString(),
        metadata: {
          ...(metadata || {}),
          status_updated_at: new Date().toISOString()
        }
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update quote status', { id, status, error });
      throw error;
    }

    // Record in audit log
    await supabase.from('admin_audit_log').insert({
      action: 'QUOTE_STATUS_UPDATE',
      entity_type: 'quote',
      entity_id: id,
      new_values: { status },
      metadata: { ...metadata }
    });

    return data;
  }

  /**
   * Creates a new version of an existing quote.
   */
  static async createVersion(id: string) {
    const original = await this.getQuote(id);
    
    const { data, error } = await supabase
      .from('quotes')
      .insert({
        ...original,
        id: undefined, // Let DB generate new ID
        parent_id: id,
        version: (original.version || 1) + 1,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create quote version', { id, error });
      throw error;
    }

    return data;
  }
}
