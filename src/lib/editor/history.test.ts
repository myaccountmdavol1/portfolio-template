import { describe, expect, it } from 'vitest';
import { HISTORY_LIMIT, historyReducer, initHistory, type History, type HistoryAction } from './history';

const run = (actions: HistoryAction<number>[], start = 0): History<number> =>
  actions.reduce((s, a) => historyReducer(s, a), initHistory(start));
const add = (n: number, key?: string): HistoryAction<number> => ({ type: 'update', fn: (x) => x + n, key });

describe('historyReducer', () => {
  it('applies updates and undoes/redoes them', () => {
    expect(run([add(1), add(2), { type: 'undo' }]).present).toBe(1);
    expect(run([add(1), add(2), { type: 'undo' }, { type: 'redo' }]).present).toBe(3);
  });

  it('a new update clears the redo stack', () => {
    const s = run([add(1), { type: 'undo' }, add(5)]);
    expect(s.present).toBe(5);
    expect(s.future).toEqual([]);
  });

  it('skips updates that return the same value', () => {
    expect(run([{ type: 'update', fn: (x) => x }]).past).toEqual([]);
  });

  it('coalesces consecutive updates with the same key', () => {
    const s = run([add(1, 'title'), add(1, 'title'), add(1, 'title')]);
    expect(s.present).toBe(3);
    expect(historyReducer(s, { type: 'undo' }).present).toBe(0);
  });

  it('does not coalesce across keys or after an undo', () => {
    expect(run([add(1, 'a'), add(1, 'b')]).past).toEqual([0, 1]);
    expect(run([add(1, 'a'), add(1, 'a'), { type: 'undo' }, add(1, 'a'), add(1, 'a')]).past).toEqual([0]);
  });

  it('undo and redo at the ends are no-ops', () => {
    const s = initHistory(7);
    expect(historyReducer(s, { type: 'undo' })).toBe(s);
    expect(historyReducer(s, { type: 'redo' })).toBe(s);
  });

  it('caps the undo stack', () => {
    expect(run(Array.from({ length: HISTORY_LIMIT + 20 }, () => add(1))).past).toHaveLength(HISTORY_LIMIT);
  });

  it('reset clears history', () => {
    expect(run([add(1), { type: 'reset', present: 9 }])).toEqual(initHistory(9));
  });
});
