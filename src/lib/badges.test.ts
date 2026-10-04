import { describe, expect, it } from 'vitest';
import { credlyUsername, isExpired, mergePasses, monthYear, parseCredlyBadges, passBackground, passGroups, passSummary, sortPasses } from './badges';
import type { BadgePass } from './types';

const credlyFeed = {
  data: [
    {
      id: 'abc-123',
      issued_at_date: '2026-08-01',
      expires_at_date: '2027-08-01',
      image_url: 'https://images.credly.com/images/x/image.png',
      badge_template: { name: 'Creative Educator Leader', description: 'Showed innovation.', level: 'Advanced', skills: [{ name: 'Critical Thinking' }, { name: 'Digital Literacy' }] },
      issuer: { entities: [{ entity: { name: 'Adobe Education' } }] },
    },
    { id: 'no-template' },
  ],
};

const pass = (p: Partial<BadgePass>): BadgePass => ({ id: p.id ?? 'x', title: 'T', issuer: 'Acme', ...p });

describe('Credly import', () => {
  it('reads profile links in any form', () => {
    expect(credlyUsername('https://www.credly.com/users/alex-rivera/badges')).toBe('alex-rivera');
    expect(credlyUsername('https://credly.com/users/sam.lee')).toBe('sam.lee');
    expect(credlyUsername('alex-rivera')).toBe('alex-rivera');
    expect(credlyUsername('https://evil.com/users/x')).toBeNull();
    expect(credlyUsername('https://www.credly.com/badges/abc')).toBeNull();
  });

  it('turns the feed into passes with a verify link', () => {
    const [p, ...rest] = parseCredlyBadges(credlyFeed);
    expect(rest).toHaveLength(0);
    expect(p).toMatchObject({
      id: 'credly-abc-123',
      title: 'Creative Educator Leader',
      issuer: 'Adobe Education',
      verifyUrl: 'https://www.credly.com/badges/abc-123',
      earned: '2026-08-01',
      expires: '2027-08-01',
      skills: ['Critical Thinking', 'Digital Literacy'],
      level: 'Advanced',
      source: 'credly',
    });
    expect(parseCredlyBadges(null)).toEqual([]);
  });

  it('skips badges already imported', () => {
    const imported = parseCredlyBadges(credlyFeed);
    const once = mergePasses([], imported);
    const twice = mergePasses(once.passes, imported);
    expect(once.added).toBe(1);
    expect(twice.added).toBe(0);
    expect(twice.passes).toHaveLength(1);
  });
});

describe('passes', () => {
  it('groups by category (or issuer), biggest group first', () => {
    const groups = passGroups([pass({ issuer: 'Google' }), pass({ issuer: 'Google' }), pass({ issuer: 'Apple', category: 'Apple Teacher' })]);
    expect(groups).toEqual([
      { name: 'Google', count: 2 },
      { name: 'Apple Teacher', count: 1 },
    ]);
  });

  it('summarises counts, dates, and expiry', () => {
    expect(passSummary([pass({ issuer: 'A', skills: ['x', 'y'] }), pass({ issuer: 'B', skills: ['X'] })])).toBe('2 badges · 2 issuers · 2 skills');
    expect(monthYear('2026-08-01')).toBe('Aug 2026');
    expect(monthYear('nope')).toBe('');
    expect(isExpired({ expires: '2026-01-31' }, new Date('2026-09-30'))).toBe(true);
    expect(isExpired({ expires: '2027-08-01' }, new Date('2026-09-30'))).toBe(false);
    expect(sortPasses([pass({ id: 'old', earned: '2024-01-01' }), pass({ id: 'none' }), pass({ id: 'new', earned: '2026-01-01' })]).map((p) => p.id)).toEqual(['new', 'old', 'none']);
  });

  it('gives one issuer the same colour every time', () => {
    expect(passBackground({ issuer: 'Google' })).toBe(passBackground({ issuer: 'google' }));
    expect(passBackground({ issuer: 'Google', color: '#123456' })).toContain('#123456');
  });
});

describe('badge art and files', async () => {
  const { isNew, passesByYear, passFromFile, pickPassColor, titleFromFile } = await import('./badges');
  const pixels = (rgb: [number, number, number], n = 50) => Array.from({ length: n }, () => [...rgb, 255]).flat();

  it('picks the badge’s main colour, dark enough for white text', () => {
    const color = pickPassColor([...pixels([230, 30, 40], 80), ...pixels([255, 255, 255], 200)]);
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(color!.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(g + 50); // still red
    expect(r).toBeGreaterThan(b + 50);
    expect(pickPassColor(pixels([128, 128, 128]))).toBeUndefined(); // grey art: use the issuer colour
    expect(pickPassColor([...pixels([230, 30, 40]).map((v, i) => (i % 4 === 3 ? 0 : v))])).toBeUndefined(); // transparent
  });

  it('names dropped files and makes passes for images and PDFs', () => {
    expect(titleFromFile('google-certified_educator L1.png')).toBe('Google Certified Educator L1');
    expect(titleFromFile('.pdf')).toBe('New badge');
    expect(passFromFile('cert.pdf', 'u', 'pdf')).toMatchObject({ title: 'Cert', certificateUrl: 'u' });
    expect(passFromFile('badge.png', 'u', 'image', '#123456')).toMatchObject({ imageUrl: 'u', color: '#123456' });
  });

  it('marks recent passes new and groups the timeline by year', () => {
    const now = new Date('2026-09-30');
    expect(isNew({ earned: '2026-09-01' }, now)).toBe(true);
    expect(isNew({ earned: '2026-01-01' }, now)).toBe(false);
    const years = passesByYear([
      { id: 'a', title: 'A', issuer: 'x', earned: '2025-03-01' },
      { id: 'b', title: 'B', issuer: 'x' },
      { id: 'c', title: 'C', issuer: 'x', earned: '2026-01-01' },
    ]);
    expect(years.map((y) => y.year)).toEqual(['2026', '2025', 'Undated']);
  });
});

describe('Accredible links', async () => {
  const { accredibleCredentialId, parseAccredibleCredential } = await import('./badges');
  const id = '00000000-0000-4000-8000-000000000000';

  it('finds the credential id in any Accredible link', () => {
    expect(accredibleCredentialId(`https://edu.google.accredible.com/${id}#acc.AbCdEfGh`)).toBe(id);
    expect(accredibleCredentialId(`https://www.credential.net/${id}`)).toBe(id);
    expect(accredibleCredentialId('https://edu.google.accredible.com/profile/alexrivera/wallet')).toBeNull();
    expect(accredibleCredentialId(`https://evil.com/${id}`)).toBeNull();
  });

  it('turns a public credential into a pass (and skips private or revoked ones)', () => {
    const record = {
      data: {
        uuid: id,
        name: 'Introduction to Gemini for Education',
        description: '<p>Define generative AI &amp; use Gemini.</p>',
        issued_on: '2026-05-13',
        expired_on: null,
        url: `https://edu.google.accredible.com/${id}`,
        private: false,
        revoked_at: null,
        issuer: { name: 'Google for Education', image_url: 'https://x/logo.jpeg' },
      },
    };
    expect(parseAccredibleCredential(record, 'https://artifacts.credential.net/a/badge/b/tiny.png')).toEqual({
      id: `accredible-${id}`,
      title: 'Introduction to Gemini for Education',
      issuer: 'Google for Education',
      imageUrl: 'https://artifacts.credential.net/a/badge/b/tiny.png',
      issuerLogoUrl: 'https://x/logo.jpeg',
      verifyUrl: `https://edu.google.accredible.com/${id}`,
      earned: '2026-05-13',
      description: 'Define generative AI & use Gemini.',
      credentialId: id,
    });
    expect(parseAccredibleCredential({ data: { ...record.data, private: true } })).toBeNull();
    expect(parseAccredibleCredential({ data: { ...record.data, revoked_at: '2026-06-01' } })).toBeNull();
  });
});

describe('more badge links', async () => {
  const { badgeLinkKind, isoDate, parseOpenBadge, parseSkilljarPage, parseSkillshopPage } = await import('./badges');

  it('recognises each kind of link', () => {
    expect(badgeLinkKind('https://badges.parchment.com/public/assertions/aBcDeFgHiJkLmNoPqRsTuV')).toBe('openbadge');
    expect(badgeLinkKind('https://api.badgr.io/public/assertions/abc')).toBe('openbadge');
    expect(badgeLinkKind('https://verify.skilljar.com/c/abcdefghij12')).toBe('skilljar');
    expect(badgeLinkKind('https://skillshop.exceedlms.com/student/award/aBcDeFgHiJkLmNoPqRsTuVwX')).toBe('skillshop');
    expect(badgeLinkKind('https://www.canva.com/design-school/certification-award/0a1b2c3d')).toBe('canva');
    expect(badgeLinkKind('https://edu.google.accredible.com/00000000-0000-4000-8000-000000000000')).toBe('accredible');
    expect(badgeLinkKind('https://www.credly.com/users/sam-lee')).toBe('credly-profile');
    expect(badgeLinkKind('https://example.com/badge')).toBeNull();
  });

  it('reads dates in the formats these sites use', () => {
    expect(isoDate('Nov. 2, 2025')).toBe('2025-11-02');
    expect(isoDate('June 12, 2024')).toBe('2024-06-12');
    expect(isoDate('2024-10-05T12:00:00Z')).toBe('2024-10-05');
    expect(isoDate('soon')).toBeUndefined();
  });

  it('turns an Open Badges assertion into a pass', () => {
    const link = 'https://badges.parchment.com/public/assertions/jVhd';
    const pass = parseOpenBadge(
      { id: 'https://api.badgr.io/public/assertions/jVhd', issuedOn: '2024-10-05T12:00:00Z', expires: '2027-10-05T21:00:00Z', revoked: false, image: { id: 'https://x/assertion.png' } },
      { name: 'ISTE Edtech Leader 2024-2027', description: 'Earners completed rigorous learning.', tags: ['Leadership'] },
      { name: 'International Society for Transforming Education', image: 'https://x/iste.png' },
      link,
      'https://media/final.png',
    );
    expect(pass).toMatchObject({
      title: 'ISTE Edtech Leader 2024-2027',
      issuer: 'International Society for Transforming Education',
      imageUrl: 'https://media/final.png',
      issuerLogoUrl: 'https://x/iste.png',
      verifyUrl: link,
      earned: '2024-10-05',
      expires: '2027-10-05',
      skills: ['Leadership'],
    });
    expect(parseOpenBadge({ id: 'a', revoked: true }, { name: 'x' }, null, link)).toBeNull();
  });

  it('reads Skilljar and Skillshop certificate pages', () => {
    const skilljar = `<meta property="og:title" content="Certificate for MagicSchool AI Course (Level 2)"/>
      <meta property="og:image" content="https://cc.sj-cdn.net/c.jpg?Expires=1&amp;Signature=x"/>
      <div>Completion Date</div><div>Nov. 2, 2025</div><div>Course Completed</div><div>MagicSchool AI Course (Level 2)</div>
      <div>Offered By</div><div>The MagicSchool Team</div><div>Hours earned</div><div>1 Hours</div><script>var x = "<div>no</div>";</script>`;
    expect(parseSkilljarPage(skilljar, 'https://verify.skilljar.com/c/abc')).toMatchObject({
      id: 'skilljar-abc',
      title: 'MagicSchool AI Course (Level 2)',
      issuer: 'The MagicSchool Team',
      imageUrl: 'https://cc.sj-cdn.net/c.jpg?Expires=1&Signature=x',
      earned: '2025-11-02',
      description: 'Completed MagicSchool AI Course (Level 2) (1 hours).',
    });
    const skillshop = `<h1>Congratulations!</h1><h2>Generative AI for Educators Certificate</h2><p>Completed by Alex Rivera on June 12, 2024</p>
      <p>This certificate verifies that the learner listed has successfully completed the course.</p><p>Score: 100</p><p>Completion ID: 123456789</p>`;
    expect(parseSkillshopPage(skillshop, 'https://skillshop.exceedlms.com/student/award/xyz')).toMatchObject({
      title: 'Generative AI for Educators Certificate',
      issuer: 'Google',
      earned: '2024-06-12',
      description: 'This certificate verifies that the learner listed has successfully completed the course.',
      credentialId: '123456789',
    });
    expect(parseSkillshopPage('<p>Log in</p>', 'https://skillshop.exceedlms.com/student/award/xyz')).toBeNull();
  });
});
