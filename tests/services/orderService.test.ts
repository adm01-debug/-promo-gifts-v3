import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

const createChainMock = () => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: mockMaybeSingle,
    }),
  }),
  insert: mockInsert.mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: mockSingle,
    }),
  }),
  update: mockUpdate.mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  }),
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => createChainMock()),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { convertQuoteToOrder } from '@/services/orderService';
import { supabase } from '@/integrations/supabase/client';

describe('convertQuoteToOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-approved quotes', async () => {
    const mockFrom = vi.fn();
    (supabase.from as ReturnType<typeof vi.fn>) = mockFrom;
    
    // First call: fetch quote (draft status)
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'q1', status: 'draft', organization_id: 'org1' },
            error: null,
          }),
        }),
      }),
    });

    await expect(
      convertQuoteToOrder({ quoteId: 'q1', sellerId: 's1' })
    ).rejects.toThrow('Apenas orçamentos aprovados podem ser convertidos em pedidos');
  });

  it('rejects already-converted quotes', async () => {
    const mockFrom = vi.fn();
    (supabase.from as ReturnType<typeof vi.fn>) = mockFrom;

    // First call: fetch quote (approved)
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'q1', status: 'approved', organization_id: 'org1' },
            error: null,
          }),
        }),
      }),
    });

    // Second call: check existing order
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'o1', order_number: 'PED-2026-0001' },
            error: null,
          }),
        }),
      }),
    });

    await expect(
      convertQuoteToOrder({ quoteId: 'q1', sellerId: 's1' })
    ).rejects.toThrow('já foi convertido');
  });

  it('successfully converts approved quote', async () => {
    const mockFrom = vi.fn();
    (supabase.from as ReturnType<typeof vi.fn>) = mockFrom;

    // 1. Fetch quote
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              id: 'q1', status: 'approved', organization_id: 'org1',
              client_name: 'Cliente Teste', subtotal: 1000, total: 900,
              discount_amount: 100, shipping_cost: 0, shipping_type: null,
              payment_terms: '30/60', delivery_time: '15 dias',
              notes: null, internal_notes: null, client_id: null,
              client_email: null, client_phone: null, client_company: null,
            },
            error: null,
          }),
        }),
      }),
    });

    // 2. Check existing order (none)
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    // 3. Create order
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'o1', order_number: 'PED-2026-0001', status: 'confirmed', total: 900 },
            error: null,
          }),
        }),
      }),
    });

    // 4. Fetch quote items
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { product_id: 'p1', product_sku: 'SKU1', product_name: 'Caneta', quantity: 100, unit_price: 9, product_image_url: null },
          ],
          error: null,
        }),
      }),
    });

    // 5. Insert order items
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    // 6. Update quote status
    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const result = await convertQuoteToOrder({ quoteId: 'q1', sellerId: 's1', organizationId: 'org1' });
    expect(result.id).toBe('o1');
    expect(result.order_number).toBe('PED-2026-0001');
    expect(result.status).toBe('confirmed');
  });

  it('throws on quote not found', async () => {
    const mockFrom = vi.fn();
    (supabase.from as ReturnType<typeof vi.fn>) = mockFrom;

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    await expect(
      convertQuoteToOrder({ quoteId: 'non-existent', sellerId: 's1' })
    ).rejects.toThrow('Orçamento não encontrado');
  });

  it('uses organizationId from param over quote', async () => {
    const mockFrom = vi.fn();
    (supabase.from as ReturnType<typeof vi.fn>) = mockFrom;

    // Fetch quote
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'q1', status: 'approved', organization_id: 'org-old' },
            error: null,
          }),
        }),
      }),
    });

    // Check existing
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    // Create order - capture the insert payload
    const insertFn = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'o2', order_number: 'PED-2026-0002', status: 'confirmed', total: 100 },
          error: null,
        }),
      }),
    });
    mockFrom.mockReturnValueOnce({ insert: insertFn });

    // Quote items (empty)
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    // Update quote status
    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    await convertQuoteToOrder({ quoteId: 'q1', sellerId: 's1', organizationId: 'org-new' });
    
    // Verify the organization_id used in insert was 'org-new' (param takes priority)
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: 'org-new' })
    );
  });
});
