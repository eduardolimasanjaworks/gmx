import { describe, expect, it } from 'vitest';
import { emptyMeansAll, toggleInList } from './filter-normalize';

describe('filter-normalize', () => {
  it('emptyMeansAll returns all when selection empty', () => {
    expect(emptyMeansAll([], ['A', 'B'])).toEqual(['A', 'B']);
  });

  it('toggleInList adds and removes', () => {
    expect(toggleInList(['A'], 'B')).toEqual(['A', 'B']);
    expect(toggleInList(['A', 'B'], 'A')).toEqual(['B']);
  });
});
