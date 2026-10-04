import type { Frame } from './geometry';

export interface OpenWindow {
  appId: string;
  x: number;
  y: number;
  width: number;
  /** Set once resized or tiled; undefined = as tall as its content. */
  height?: number;
  z: number; // higher = in front
  /** The frame before it was tiled/filled, so the green button or a drag can put it back. */
  restore?: { x: number; y: number; width: number; height?: number };
  /** The size before the app fitted the window to its content (a photo), to go back to afterwards. */
  fitFrom?: { width: number; height?: number };
}

export interface WindowsState {
  windows: OpenWindow[];
  nextZ: number;
  openedCount: number; // total windows ever opened; drives the cascade offset
}

export const initialWindowsState: WindowsState = { windows: [], nextZ: 1, openedCount: 0 };

export type WindowsAction =
  | { type: 'open'; appId: string; x: number; y: number; width: number }
  | { type: 'close'; appId: string }
  | { type: 'focus'; appId: string }
  | { type: 'move'; appId: string; x: number; y: number }
  | { type: 'resize'; appId: string; width: number; height: number }
  /** Tile / fill: jump to a frame, remembering the old one to restore later. */
  | { type: 'setFrame'; appId: string; frame: Frame }
  | { type: 'restore'; appId: string }
  /** The app asks for a frame that suits its content (e.g. a photo); `unfit` goes back to the old size. */
  | { type: 'fit'; appId: string; frame: Frame }
  | { type: 'unfit'; appId: string }
  | { type: 'arrange'; frames: Frame[] }
  | { type: 'closeTop' }
  | { type: 'closeAll' };

export function topWindowId(state: WindowsState): string | null {
  let top: OpenWindow | null = null;
  for (const w of state.windows) if (!top || w.z > top.z) top = w;
  return top ? top.appId : null;
}

export function windowsReducer(state: WindowsState, action: WindowsAction): WindowsState {
  switch (action.type) {
    case 'open': {
      if (state.windows.some((w) => w.appId === action.appId)) {
        return windowsReducer(state, { type: 'focus', appId: action.appId });
      }
      const win: OpenWindow = { appId: action.appId, x: action.x, y: action.y, width: action.width, z: state.nextZ };
      return { windows: [...state.windows, win], nextZ: state.nextZ + 1, openedCount: state.openedCount + 1 };
    }
    case 'focus': {
      const exists = state.windows.some((w) => w.appId === action.appId);
      if (!exists || topWindowId(state) === action.appId) return state;
      return {
        ...state,
        windows: state.windows.map((w) => (w.appId === action.appId ? { ...w, z: state.nextZ } : w)),
        nextZ: state.nextZ + 1,
      };
    }
    case 'close':
      return { ...state, windows: state.windows.filter((w) => w.appId !== action.appId) };
    case 'move':
      return {
        ...state,
        windows: state.windows.map((w) => (w.appId === action.appId ? { ...w, x: action.x, y: action.y } : w)),
      };
    case 'resize':
      return {
        ...state,
        windows: state.windows.map((w) => (w.appId === action.appId ? { ...w, width: action.width, height: action.height, restore: undefined, fitFrom: undefined } : w)),
      };
    case 'setFrame':
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.appId === action.appId ? { ...w, ...action.frame, restore: w.restore ?? { x: w.x, y: w.y, width: w.width, height: w.height } } : w,
        ),
      };
    case 'restore':
      return {
        ...state,
        windows: state.windows.map((w) => (w.appId === action.appId && w.restore ? { ...w, ...w.restore, height: w.restore.height, restore: undefined } : w)),
      };
    case 'fit':
      return {
        ...state,
        // A tiled window stays where the owner put it.
        windows: state.windows.map((w) =>
          w.appId === action.appId && !w.restore ? { ...w, ...action.frame, fitFrom: w.fitFrom ?? { width: w.width, height: w.height } } : w,
        ),
      };
    case 'unfit':
      return {
        ...state,
        windows: state.windows.map((w) => (w.appId === action.appId && w.fitFrom ? { ...w, width: w.fitFrom.width, height: w.fitFrom.height, fitFrom: undefined } : w)),
      };
    case 'arrange': {
      // Front-most windows get the first (top-left) slots.
      const order = [...state.windows].sort((a, b) => b.z - a.z).map((w) => w.appId);
      return {
        ...state,
        windows: state.windows.map((w) => {
          const frame = action.frames[order.indexOf(w.appId)];
          return frame ? { ...w, ...frame, restore: w.restore ?? { x: w.x, y: w.y, width: w.width, height: w.height } } : w;
        }),
      };
    }
    case 'closeTop': {
      const id = topWindowId(state);
      return id ? windowsReducer(state, { type: 'close', appId: id }) : state;
    }
    case 'closeAll':
      return state.windows.length === 0 ? state : { ...state, windows: [] };
  }
}
