import { describe, expect, it } from 'vitest';
import { iconInitials, lighten } from './siteIcon';

describe('lighten', () => {
  it('mixes a colour towards white', () => {
    expect(lighten('#000000', 0.5)).toBe('#808080');
    expect(lighten('#6f9bd1', 0)).toBe('#6f9bd1');
  });
  it('falls back for anything that isn’t a 6-digit hex colour', () => {
    expect(lighten('red')).toBe('#8fc0ec');
  });
});

describe('iconInitials', () => {
  it('uses up to two initials', () => {
    expect(iconInitials({ ownerName: 'Alex Rivera' })).toBe('AR');
    expect(iconInitials({ ownerName: 'Cher' })).toBe('C');
    expect(iconInitials({ ownerName: '' })).toBe('•');
  });
});
