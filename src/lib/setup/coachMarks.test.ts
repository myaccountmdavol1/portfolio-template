import { describe, expect, it } from 'vitest';
import { COACH_MARKS, placeBubble, wantsEditorTour, withoutWelcome } from './coachMarks';

const viewport = { width: 1280, height: 800 };
const bubble = { width: 280, height: 150 };

describe('coach marks', () => {
  it('point at Edit, Add, Site, More (with the Media library) and Publish', () => {
    expect(COACH_MARKS.map((m) => m.target)).toEqual(['Edit', 'Add', 'Site', 'More', 'Publish']);
    expect(COACH_MARKS.find((m) => m.target === 'More')?.text).toContain('Media library…');
  });

  it('show once per browser, only after the setup wizard', () => {
    expect(wantsEditorTour('?edit=1&welcome=1', null)).toBe(true);
    expect(wantsEditorTour('?edit=1&welcome=1', '1')).toBe(false);
    expect(wantsEditorTour('?edit=1', null)).toBe(false);
  });

  it('take welcome out of the address afterwards', () => {
    expect(withoutWelcome('http://localhost:3102/?edit=1&welcome=1')).toBe('/?edit=1');
    expect(withoutWelcome('http://localhost:3102/?welcome=1#x')).toBe('/#x');
  });
});

describe('placeBubble', () => {
  it('sits centred below the button, the arrow at its middle', () => {
    expect(placeBubble({ left: 600, top: 40, width: 40, height: 32 }, bubble, viewport)).toEqual({ left: 480, top: 82, arrowLeft: 140, above: false });
  });

  it('stays on screen at the left and right edges', () => {
    expect(placeBubble({ left: 2, top: 40, width: 40, height: 32 }, bubble, viewport)).toEqual({ left: 8, top: 82, arrowLeft: 14, above: false });
    expect(placeBubble({ left: 360, top: 40, width: 30, height: 32 }, bubble, { width: 390, height: 844 })).toEqual({ left: 102, top: 82, arrowLeft: 266, above: false });
    expect(placeBubble({ left: 100, top: 40, width: 30, height: 32 }, bubble, { width: 250, height: 844 }).left).toBe(8);
  });

  it('goes above when there is no room below', () => {
    expect(placeBubble({ left: 600, top: 700, width: 40, height: 32 }, bubble, viewport)).toEqual({ left: 480, top: 540, arrowLeft: 140, above: true });
  });
});
