import { describe, expect, it } from 'vitest';
import { insertionIndex } from './dockOrder';

describe('insertionIndex', () => {
  it('counts the items left of the pointer', () => {
    expect(insertionIndex(0, [10, 20, 30])).toBe(0);
    expect(insertionIndex(25, [10, 20, 30])).toBe(2);
    expect(insertionIndex(99, [10, 20, 30])).toBe(3);
  });
});
