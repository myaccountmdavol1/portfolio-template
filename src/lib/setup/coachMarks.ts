// The editor tour shown once after the setup wizard (/?edit=1&welcome=1): a bubble per main toolbar button.

export interface CoachMark {
  /** The toolbar button's accessible name. */
  target: string;
  title: string;
  text: string;
}

export const COACH_MARKS: CoachMark[] = [
  { target: 'Edit', title: 'Edit', text: 'Switch editing on and off. Off shows your site the way visitors see it.' },
  { target: 'Add', title: 'Add', text: 'Add a project, a document, a link or another app to your desktop.' },
  { target: 'Site', title: 'Site settings', text: 'Your name, headline, style, menu bar, tour and more.' },
  { target: 'More', title: 'More', text: 'The Media library… is in here, with version history and Sign out.' },
  { target: 'Publish', title: 'Publish', text: 'Your edits save as a draft. Publish when you want visitors to see them.' },
];

export const EDITOR_TOUR_SEEN_KEY = 'portfolio:editorTourSeen';

/** After "Start editing" in the setup wizard, unless this browser has seen the tour. */
export function wantsEditorTour(search: string, seen: string | null): boolean {
  return new URLSearchParams(search).get('welcome') === '1' && seen !== '1';
}

/** The address without ?welcome=1, so a reload doesn't ask for the tour again. */
export function withoutWelcome(href: string): string {
  const url = new URL(href);
  url.searchParams.delete('welcome');
  return `${url.pathname}${url.search}${url.hash}`;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface BubblePlace {
  left: number;
  top: number;
  /** The arrow's x inside the bubble, pointing at the button's middle. */
  arrowLeft: number;
  above: boolean;
}

/** Below the button and centred on it, kept `margin` px inside the screen; above it when there is no room below. */
export function placeBubble(target: Rect, bubble: { width: number; height: number }, viewport: { width: number; height: number }, gap = 10, margin = 8): BubblePlace {
  const center = target.left + target.width / 2;
  const maxLeft = Math.max(margin, viewport.width - bubble.width - margin);
  const left = Math.min(Math.max(center - bubble.width / 2, margin), maxLeft);
  const below = target.top + target.height + gap;
  const above = below + bubble.height > viewport.height - margin && target.top - gap - bubble.height >= margin;
  return {
    left,
    top: above ? target.top - gap - bubble.height : below,
    arrowLeft: Math.min(Math.max(center - left, 14), bubble.width - 14),
    above,
  };
}
