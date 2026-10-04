import { getStore } from '../src/lib/store';
import { seedSiteData } from '../src/lib/seed';

async function main() {
  const store = getStore();
  if (!store) {
    throw new Error('Set up a backend first: FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY (or FIRESTORE_EMULATOR_HOST).');
  }
  await store.site.write('draft', seedSiteData);
  await store.site.write('published', seedSiteData);
  console.log(`Seeded draft and published with seedSiteData (${store.kind}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
