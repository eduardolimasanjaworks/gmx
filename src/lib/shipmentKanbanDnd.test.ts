import { describe, expect, it } from 'vitest';
import { resolveDropStatus } from './shipmentKanbanDnd';

describe('resolveDropStatus', () => {
  it('prefers overData.status', () => {
    expect(resolveDropStatus('x', { status: 'confirmed' })).toBe('confirmed');
  });

  it('falls back to overData.columnStatus', () => {
    expect(resolveDropStatus('x', { columnStatus: 'waiting_receipt' })).toBe('waiting_receipt');
  });

  it('falls back to column: prefix in overId', () => {
    expect(resolveDropStatus('column:sent', null)).toBe('sent');
  });

  it('returns null when no status is present', () => {
    expect(resolveDropStatus('x', { status: null, columnStatus: null })).toBeNull();
  });
});

