import { createMachine } from 'xstate';

export const quoteMachine = createMachine({
  id: 'quote',
  initial: 'draft',
  states: {
    draft: {
      on: {
        SEND: 'sent',
        CANCEL: 'cancelled',
      },
    },
    sent: {
      on: {
        APPROVE: 'approved',
        REJECT: 'rejected',
        EXPIRE: 'expired',
        CANCEL: 'cancelled',
      },
    },
    approved: {
      on: {
        START_PROCESSING: 'processing',
        CANCEL: 'cancelled',
      },
    },
    processing: {
      on: {
        COMPLETE: 'completed',
        CANCEL: 'cancelled',
      },
    },
    rejected: {
      on: {
        REVISE: 'draft',
      },
    },
    expired: {
      on: {
        REVISE: 'draft',
      },
    },
    completed: {
      type: 'final',
    },
    cancelled: {
      type: 'final',
    },
  },
});
