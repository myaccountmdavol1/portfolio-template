export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  /** Key of the last update, for coalescing keystrokes into a single undo step. */
  lastKey: string | null;
}

export type HistoryAction<T> =
  | { type: 'update'; fn: (present: T) => T; key?: string }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; present: T };

export const HISTORY_LIMIT = 100;

export function initHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], lastKey: null };
}

/** Consecutive updates with the same non-empty key replace `present` instead of adding an undo step. */
export function historyReducer<T>(state: History<T>, action: HistoryAction<T>): History<T> {
  switch (action.type) {
    case 'update': {
      const next = action.fn(state.present);
      if (next === state.present) return state;
      const key = action.key ?? null;
      if (key !== null && key === state.lastKey) return { ...state, present: next, future: [] };
      return { past: [...state.past, state.present].slice(-HISTORY_LIMIT), present: next, future: [], lastKey: key };
    }
    case 'undo':
      if (state.past.length === 0) return state;
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
        lastKey: null,
      };
    case 'redo':
      if (state.future.length === 0) return state;
      return { past: [...state.past, state.present], present: state.future[0], future: state.future.slice(1), lastKey: null };
    case 'reset':
      return initHistory(action.present);
  }
}
