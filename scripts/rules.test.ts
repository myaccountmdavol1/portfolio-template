import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderRules } from './rules';

describe('renderRules', () => {
  it('puts the owner email into every placeholder', () => {
    const out = renderRules("a == '__OWNER_EMAIL__' || b == '__OWNER_EMAIL__'", 'owner@example.test');
    expect(out).toBe("a == 'owner@example.test' || b == 'owner@example.test'");
  });

  it('lower-cases and trims the email (Firebase tokens carry lower-case emails)', () => {
    expect(renderRules("'__OWNER_EMAIL__'", '  Owner@Example.TEST ')).toBe("'owner@example.test'");
  });

  it('refuses a missing or malformed email, including quote injection', () => {
    for (const bad of ['', 'not-an-email', "x@y.z' || true || '"]) {
      expect(() => renderRules("'__OWNER_EMAIL__'", bad)).toThrow(/OWNER_EMAIL/);
    }
  });

  it('refuses a template with no placeholder', () => {
    expect(() => renderRules('allow read: if true;', 'owner@example.test')).toThrow(/placeholder/);
  });

  it('renders both committed templates', () => {
    for (const file of ['firestore.rules.template', 'storage.rules.template']) {
      const out = renderRules(readFileSync(file, 'utf8'), 'owner@example.test');
      expect(out).toContain("request.auth.token.email == 'owner@example.test'");
      expect(out).not.toContain('__OWNER_EMAIL__');
    }
  });
});
