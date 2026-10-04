// Firebase rules can't read env vars, so the owner's email is written into them here.
// Usage: npm run rules:build (reads OWNER_EMAIL from the environment or .env.local).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PLACEHOLDER = '__OWNER_EMAIL__';
const EMAIL = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

export function renderRules(template: string, email: string): string {
  const owner = email.trim().toLowerCase();
  if (!EMAIL.test(owner)) throw new Error(`OWNER_EMAIL must be a plain email address (got "${email}")`);
  if (!template.includes(PLACEHOLDER)) throw new Error(`rules template has no ${PLACEHOLDER} placeholder`);
  return template.replaceAll(PLACEHOLDER, owner);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const email = process.env.OWNER_EMAIL ?? '';
  for (const name of ['firestore.rules', 'storage.rules']) {
    const header = `// Generated from ${name}.template by \`npm run rules:build\`. Edit the template, not this file.\n`;
    writeFileSync(name, header + renderRules(readFileSync(`${name}.template`, 'utf8'), email));
  }
  console.log(`Wrote firestore.rules and storage.rules for ${email.trim().toLowerCase()}`);
}
