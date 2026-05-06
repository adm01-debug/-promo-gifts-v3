// src/lib/quote/stateMachine.ts
import { createMachine, assign } from 'xstate';

export type QuoteStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'expired' | 'converted';

export interface QuoteContext {
  id: string;
  version: number;
  lastUpdated: string;
  errors: string[];
}

export type QuoteEvent =
  | { type: 'SAVE_DRAFT' }
  | { type: 'SUBMIT_FOR_APPROVAL' }
  | { type: 'APPROVE' }
  | { type: 'REJECT'; reason: string }
  | { type: 'EXPIRE' }
  | { type: 'CONVERT_TO_ORDER' }
  | { type: 'EDIT' };

export const quoteMachine = createMachine({
  id: 'quote',
  initial: 'draft',
  types: {} as {
    context: QuoteContext;
    events: QuoteEvent;
  },
  context: ({ input }: { input: QuoteContext }) => input,
  states: {
    draft: {
      on: {
        SUBMIT_FOR_APPROVAL: 'pending_approval',
        SAVE_DRAFT: {
          actions: assign({
            lastUpdated: () => new Date().toISOString(),
          }),
        },
      },
    },
    pending_approval: {
      on: {
        APPROVE: 'approved',
        REJECT: 'rejected',
        EXPIRE: 'expired',
        EDIT: 'draft',
      },
    },
    approved: {
      on: {
        CONVERT_TO_ORDER: 'converted',
        EXPIRE: 'expired',
        EDIT: 'draft',
      },
    },
    rejected: {
      on: {
        EDIT: 'draft',
      },
    },
    expired: {
      on: {
        EDIT: 'draft',
      },
    },
    converted: {
      type: 'final',
    },
  },
});
