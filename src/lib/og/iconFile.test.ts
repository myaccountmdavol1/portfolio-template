import { describe, expect, it } from 'vitest';
import { iconPngPaths } from './iconFile';

describe('iconPngPaths', () => {
  it('tries the site’s pack first, then the build’s default pack', () => {
    expect(iconPngPaths('mail', 'glass', '/app')).toEqual(['/app/public/icons/glass/mail.png', '/app/public/icons/catalog/mail.png']);
  });
  it('uses only the default pack without a site pack (as before)', () => {
    expect(iconPngPaths('mail', undefined, '/app')).toEqual(['/app/public/icons/catalog/mail.png']);
  });
  it('ignores a pack id that isn’t a plain folder name', () => {
    expect(iconPngPaths('mail', '../../etc', '/app')).toEqual(['/app/public/icons/catalog/mail.png']);
  });
});
