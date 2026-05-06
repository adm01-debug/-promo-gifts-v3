import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { quoteMachine } from '@/lib/quote/stateMachine';

describe('Quote State Machine', () => {
  const initialContext = {
    id: 'test-123',
    version: 1,
    lastUpdated: new Date().toISOString(),
    errors: [],
  };

  it('should start in draft state', () => {
    const actor = createActor(quoteMachine, { input: initialContext }).start();
    expect(actor.getSnapshot().value).toBe('draft');
  });

  it('should transition from draft to pending_approval', () => {
    const actor = createActor(quoteMachine, { input: initialContext }).start();
    actor.send({ type: 'SUBMIT_FOR_APPROVAL' });
    expect(actor.getSnapshot().value).toBe('pending_approval');
  });

  it('should transition from pending_approval to approved', () => {
    const actor = createActor(quoteMachine, { input: initialContext }).start();
    actor.send({ type: 'SUBMIT_FOR_APPROVAL' });
    actor.send({ type: 'APPROVE' });
    expect(actor.getSnapshot().value).toBe('approved');
  });

  it('should transition from approved to converted', () => {
    const actor = createActor(quoteMachine, { input: initialContext }).start();
    actor.send({ type: 'SUBMIT_FOR_APPROVAL' });
    actor.send({ type: 'APPROVE' });
    actor.send({ type: 'CONVERT_TO_ORDER' });
    expect(actor.getSnapshot().value).toBe('converted');
    expect(actor.getSnapshot().status).toBe('done');
  });

  it('should allow editing from pending_approval (returns to draft)', () => {
    const actor = createActor(quoteMachine, { input: initialContext }).start();
    actor.send({ type: 'SUBMIT_FOR_APPROVAL' });
    actor.send({ type: 'EDIT' });
    expect(actor.getSnapshot().value).toBe('draft');
  });

  it('should allow rejecting from pending_approval', () => {
    const actor = createActor(quoteMachine, { input: initialContext }).start();
    actor.send({ type: 'SUBMIT_FOR_APPROVAL' });
    actor.send({ type: 'REJECT', reason: 'Price too high' });
    expect(actor.getSnapshot().value).toBe('rejected');
  });

  it('should return to draft from rejected when edited', () => {
    const actor = createActor(quoteMachine, { input: initialContext }).start();
    actor.send({ type: 'SUBMIT_FOR_APPROVAL' });
    actor.send({ type: 'REJECT', reason: 'Invalid terms' });
    actor.send({ type: 'EDIT' });
    expect(actor.getSnapshot().value).toBe('draft');
  });

  it('should transition to expired from pending_approval', () => {
    const actor = createActor(quoteMachine, { input: initialContext }).start();
    actor.send({ type: 'SUBMIT_FOR_APPROVAL' });
    actor.send({ type: 'EXPIRE' });
    expect(actor.getSnapshot().value).toBe('expired');
  });

  it('should update lastUpdated on SAVE_DRAFT', () => {
    const actor = createActor(quoteMachine, { input: initialContext }).start();
    const oldTimestamp = actor.getSnapshot().context.lastUpdated;
    
    // Wait a bit to ensure timestamp changes
    actor.send({ type: 'SAVE_DRAFT' });
    const newTimestamp = actor.getSnapshot().context.lastUpdated;
    
    expect(newTimestamp).not.toBe(oldTimestamp);
    expect(actor.getSnapshot().value).toBe('draft');
  });
  
  it('should handle sequential transitions correctly', () => {
    const actor = createActor(quoteMachine, { input: initialContext }).start();
    actor.send({ type: 'SUBMIT_FOR_APPROVAL' });
    actor.send({ type: 'REJECT', reason: 'Bad logo' });
    actor.send({ type: 'EDIT' });
    actor.send({ type: 'SAVE_DRAFT' });
    actor.send({ type: 'SUBMIT_FOR_APPROVAL' });
    actor.send({ type: 'APPROVE' });
    expect(actor.getSnapshot().value).toBe('approved');
  });

  it('should not allow transition from draft to approved directly', () => {
    const actor = createActor(quoteMachine, { input: initialContext }).start();
    actor.send({ type: 'APPROVE' });
    expect(actor.getSnapshot().value).toBe('draft');
  });

  it('should not allow transition from rejected to approved directly', () => {
    const actor = createActor(quoteMachine, { input: initialContext }).start();
    actor.send({ type: 'SUBMIT_FOR_APPROVAL' });
    actor.send({ type: 'REJECT', reason: 'Denied' });
    actor.send({ type: 'APPROVE' });
    expect(actor.getSnapshot().value).toBe('rejected');
  });

  it('should allow expiry from approved state', () => {
    const actor = createActor(quoteMachine, { input: initialContext }).start();
    actor.send({ type: 'SUBMIT_FOR_APPROVAL' });
    actor.send({ type: 'APPROVE' });
    actor.send({ type: 'EXPIRE' });
    expect(actor.getSnapshot().value).toBe('expired');
  });

  it('should return to draft from expired state', () => {
    const actor = createActor(quoteMachine, { input: initialContext }).start();
    actor.send({ type: 'SUBMIT_FOR_APPROVAL' });
    actor.send({ type: 'EXPIRE' });
    actor.send({ type: 'EDIT' });
    expect(actor.getSnapshot().value).toBe('draft');
  });

  it('should prevent any transition from converted state', () => {
    const actor = createActor(quoteMachine, { input: initialContext }).start();
    actor.send({ type: 'SUBMIT_FOR_APPROVAL' });
    actor.send({ type: 'APPROVE' });
    actor.send({ type: 'CONVERT_TO_ORDER' });
    
    // Converted is final, no EDIT allowed per current machine definition (converted state has no on events)
    actor.send({ type: 'EDIT' });
    expect(actor.getSnapshot().value).toBe('converted');
  });
});
