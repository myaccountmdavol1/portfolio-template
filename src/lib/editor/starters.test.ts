import { describe, expect, it } from 'vitest';
import { APP_TYPES, APP_TYPE_LABELS, newAppId, starterApp } from './starters';

describe('newAppId', () => {
  it('uses the type plus the lowest free number', () => {
    expect(newAppId('project', [])).toBe('project-1');
    expect(newAppId('project', ['project-1', 'project-3', 'note-2'])).toBe('project-2');
  });
});

describe('starterApp', () => {
  it.each(APP_TYPES)('builds a visible %s app with the given id and order', (type) => {
    const app = starterApp(type, `${type}-9`, 42);
    expect(app.type).toBe(type);
    expect(app.id).toBe(`${type}-9`);
    expect(app.order).toBe(42);
    expect(app.visible).toBe(true);
    expect(app.title.length).toBeGreaterThan(0);
    expect(app.icon.kind).toBe('catalog');
  });

  it.each(APP_TYPES)('%s starter survives a JSON round trip unchanged (Firestore-safe)', (type) => {
    const app = starterApp(type, 'x', 1);
    expect(JSON.parse(JSON.stringify(app))).toEqual(app);
  });

  it('has a label for every type', () => {
    for (const type of APP_TYPES) expect(APP_TYPE_LABELS[type].length).toBeGreaterThan(0);
  });
});
