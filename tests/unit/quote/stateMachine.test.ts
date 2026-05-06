// tests/unit/quote/stateMachine.test.ts
import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { quoteMachine } from '../../../src/lib/quote/stateMachine';

describe('Quote State Machine', () => {
  const mockContext = {
    id: 'quote-123',
    version: 1,
    lastUpdated: new Date().toISOString(),
    errors: [],
  };

  it('starts in draft state', () => {
    const actor = createActor(quoteMachine, { input: mockContext });
    actor.start();
    expect(actor.getSnapshot().value).toBe('draft');
  });

  it('transitions from draft to pending_approval', () => {
    const actor = createActor(quoteMachine, { input: mockContext });
    actor.start();
    actor.send({ type: 'SUBMIT_FOR_APPROVAL' });
    expect(actor.getSnapshot().value).toBe('pending_approval');
  });

  it('transitions from pending_approval to approved', () => {
    const actor = createActor(quoteMachine, { input: mockContext });
    actor.start();
    actor.send({ type: 'SUBMIT_FOR_APPROVAL' });
    actor.send({ type: 'APPROVE' });
    expect(actor.getSnapshot().value).toBe('approved');
  });

  it('allows editing from approved state (reverting to draft)', () => {
    const actor = createActor(quoteMachine, { input: mockContext });
    actor.start();
    actor.send({ type: 'SUBMIT_FOR_APPROVAL' });
    actor.send({ type: 'APPROVE' });
    actor.send({ type: 'EDIT' });
    expect(actor.getSnapshot().value).toBe('draft');
  });

  it('transitions to converted from approved', () => {
    const actor = createActor(quoteMachine, { input: mockContext });
    actor.start();
    actor.send({ type: 'SUBMIT_FOR_APPROVAL' });
    actor.send({ type: 'APPROVE' });
    actor.send({ type: 'CONVERT_TO_ORDER' });
    expect(actor.getSnapshot().value).toBe('converted');
  });
});
