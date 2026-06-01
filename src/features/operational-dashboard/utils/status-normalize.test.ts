import { describe, expect, it } from 'vitest';
import { normalizeFollowStatus, isClosedLoadStatus } from './status-normalize';

describe('status-normalize', () => {
  it('normalizes common aliases', () => {
    expect(normalizeFollowStatus('finalizada')).toBe('FINALIZADA');
    expect(normalizeFollowStatus('NO SHOW')).toBe('NOSHOW');
    expect(normalizeFollowStatus('FURO AMBEV')).toBe('FURO AMBEV');
  });

  it('detects closed load', () => {
    expect(isClosedLoadStatus('Finalizada')).toBe(true);
    expect(isClosedLoadStatus('cancelada')).toBe(false);
  });
});
