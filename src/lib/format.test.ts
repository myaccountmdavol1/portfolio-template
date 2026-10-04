import { describe, expect, it } from 'vitest';
import { formatMenuDate, formatPhoneTime, formatTime, initials } from './format';

describe('formatMenuDate', () => {
  it('formats weekday, month, and day', () => {
    expect(formatMenuDate(new Date(2026, 8, 28, 19, 5))).toBe('Mon Sep 28');
    expect(formatMenuDate(new Date(2026, 0, 1))).toBe('Thu Jan 1');
  });
});

describe('formatTime', () => {
  it('formats 12-hour time', () => {
    expect(formatTime(new Date(2026, 8, 28, 19, 5), false)).toBe('7:05 PM');
    expect(formatTime(new Date(2026, 8, 28, 0, 0), false)).toBe('12:00 AM');
    expect(formatTime(new Date(2026, 8, 28, 12, 30), false)).toBe('12:30 PM');
  });
  it('formats 24-hour time', () => {
    expect(formatTime(new Date(2026, 8, 28, 19, 5), true)).toBe('19:05');
    expect(formatTime(new Date(2026, 8, 28, 7, 5), true)).toBe('07:05');
  });
});

describe('formatPhoneTime', () => {
  it('omits AM/PM in 12-hour mode', () => {
    expect(formatPhoneTime(new Date(2026, 8, 28, 19, 5), false)).toBe('7:05');
    expect(formatPhoneTime(new Date(2026, 8, 28, 19, 5), true)).toBe('19:05');
  });
});

describe('initials', () => {
  it('takes the first letter of the first two words', () => {
    expect(initials('Your Name')).toBe('YN');
    expect(initials('  ada  lovelace king ')).toBe('AL');
    expect(initials('cher')).toBe('C');
    expect(initials('')).toBe('');
  });
});
