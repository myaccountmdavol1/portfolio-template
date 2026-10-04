import { describe, expect, it } from 'vitest';
import { fitWithin, MAX_IMAGE_EDGE, RESIZE_ABOVE_BYTES, shouldResize } from './imageResize';

describe('fitWithin', () => {
  it('shrinks a landscape image so the long edge fits', () => {
    expect(fitWithin(4800, 3200, 2400)).toEqual({ width: 2400, height: 1600 });
  });
  it('shrinks a portrait image so the long edge fits', () => {
    expect(fitWithin(3000, 6000, 2400)).toEqual({ width: 1200, height: 2400 });
  });
  it('never upscales an image that is already small', () => {
    expect(fitWithin(800, 600, 2400)).toEqual({ width: 800, height: 600 });
  });
  it('handles squares', () => {
    expect(fitWithin(5000, 5000, 2400)).toEqual({ width: 2400, height: 2400 });
  });
  it('returns whole numbers', () => {
    const { width, height } = fitWithin(4001, 3001, 2400);
    expect(Number.isInteger(width) && Number.isInteger(height)).toBe(true);
    expect(width).toBe(2400);
  });
  it('never rounds a thin edge down to zero', () => {
    expect(fitWithin(10000, 1, 2400).height).toBe(1);
  });
  it('leaves zero or invalid sizes unchanged', () => {
    expect(fitWithin(0, 100, 2400)).toEqual({ width: 0, height: 100 });
    expect(fitWithin(-5, 100, 2400)).toEqual({ width: -5, height: 100 });
    expect(fitWithin(NaN, 100, 2400)).toEqual({ width: NaN, height: 100 });
    expect(fitWithin(5000, 100, 0)).toEqual({ width: 5000, height: 100 });
  });
});

describe('shouldResize', () => {
  const small = 500_000;
  it('resizes a big-dimension jpeg, png or webp', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) expect(shouldResize(type, small, MAX_IMAGE_EDGE + 1, 100)).toBe(true);
  });
  it('resizes a heavy file even when its dimensions are fine', () => {
    expect(shouldResize('image/jpeg', RESIZE_ABOVE_BYTES + 1, 1000, 800)).toBe(true);
  });
  it('leaves a small, light image alone', () => {
    expect(shouldResize('image/jpeg', small, 1000, 800)).toBe(false);
    expect(shouldResize('image/jpeg', RESIZE_ABOVE_BYTES, MAX_IMAGE_EDGE, MAX_IMAGE_EDGE)).toBe(false);
  });
  it('never touches GIF (may be animated) or SVG', () => {
    expect(shouldResize('image/gif', 9_000_000, 9000, 9000)).toBe(false);
    expect(shouldResize('image/svg+xml', 9_000_000, 9000, 9000)).toBe(false);
  });
  it('ignores non-images', () => {
    expect(shouldResize('application/pdf', 9_000_000, 0, 0)).toBe(false);
  });
  it('handles heic and heif', () => {
    expect(shouldResize('image/heic', small, 4000, 3000)).toBe(true);
    expect(shouldResize('image/heif', small, 4000, 3000)).toBe(true);
  });
});
