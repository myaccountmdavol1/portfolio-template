import { expect, test, type Page } from '@playwright/test';

// Runs against the third dev server (playwright.config.ts): Vercel backend on PGlite, a local media folder,
// SETUP_CODE=e2e-setup-code and a fresh database every run. One journey, because each step needs the last.

const SETUP_CODE = 'e2e-setup-code';
const PASSWORD = 'correct horse battery';
const NEW_PASSWORD = 'staple battery horse';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Editor' });
// Not getByRole('alert') alone: Next's route announcer is also a role=alert.
const alert = (page: Page) => page.locator('main [role="alert"]');
const status = (page: Page) => page.getByTestId('save-status');
const desktopIcon = (page: Page, name: string) => page.getByTestId('desktop-area').getByRole('button', { name, exact: true });

const claimPill = (page: Page) => page.getByTestId('claim-pill');
const SETUP_CODE_HINT = 'That\u2019s your setup code, not your password. Click \u201cForgot password?\u201d to use it.';

async function signIn(page: Page, password: string) {
  await page.goto('/admin');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

test('visitors cannot use the owner routes', async ({ request }) => {
  expect((await request.get('/api/owner/draft')).status()).toBe(401);
  expect((await request.put('/api/owner/draft', { data: {} })).status()).toBe(401);
});

test('owner journey: claim, edit, publish, upload, sign out and in, reset the password', async ({ page, browser }) => {
  test.setTimeout(180_000);

  await test.step('the home page of a new site invites the owner to claim it', async () => {
    await page.goto('/');
    const pill = page.getByRole('link', { name: 'Finish setting up \u00b7 Claim your site' });
    await expect(pill).toBeVisible();
    await expect(pill).toHaveAttribute('data-testid', 'claim-pill');
    await pill.click();
    await page.waitForURL('**/admin');
    await expect(page.getByText('Claim your site')).toBeVisible();
  });

  await test.step('claim the new site with the setup code', async () => {
    await page.goto('/admin');
    await expect(page.getByText('Claim your site')).toBeVisible();
    await page.getByLabel('Setup code').fill('wrong-code');
    await page.getByLabel('New password').fill(PASSWORD);
    await page.getByLabel('Confirm password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Claim this site' }).click();
    await expect(alert(page)).toHaveText('That setup code isn’t right.');
    await page.getByLabel('Setup code').fill(SETUP_CODE);
    await page.getByRole('button', { name: 'Claim this site' }).click();
    await expect(page.getByText('You’re signed in as the owner.')).toBeVisible();
  });

  await test.step('once claimed, visitors no longer see the claim pill', async () => {
    const visitor = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const v = await visitor.newPage();
    await v.goto('/');
    await expect(desktopIcon(v, 'Project Two')).toBeVisible();
    await expect(claimPill(v)).toHaveCount(0);
    await visitor.close();
  });

  let moved = { x: 0, y: 0 };
  await test.step('edit, autosave, and the edit survives a reload', async () => {
    await page.getByRole('link', { name: 'Open the editor' }).click();
    await expect(toolbar(page)).toBeVisible();
    await expect(status(page)).toHaveText('Saved', { timeout: 20_000 });
    const box = (await desktopIcon(page, 'Project Two').boundingBox())!;
    const area = (await page.getByTestId('desktop-area').boundingBox())!;
    await page.mouse.move(box.x + 50, box.y + 30);
    await page.mouse.down();
    await page.mouse.move(box.x + 250, box.y + 130, { steps: 10 });
    await page.mouse.up();
    // "Unsaved changes" is too brief to catch reliably, so check the draft in the database instead.
    await expect
      .poll(async () => {
        const { draft } = (await (await page.request.get('/api/owner/draft')).json()) as { draft: { layout: { desktop: { icons: { appId: string; xPct: number }[] } } } | null };
        return draft?.layout.desktop.icons.find((i) => i.appId === 'p2')?.xPct;
      }, { timeout: 20_000 })
      .toBeCloseTo(2 + (200 / area.width) * 100, 0);
    await expect(status(page)).toHaveText('Saved', { timeout: 20_000 });
    await page.reload();
    // The status reads "Saved" before the draft has loaded, so wait for the moved icon itself.
    await expect.poll(async () => Math.abs(((await desktopIcon(page, 'Project Two').boundingBox())?.x ?? 0) - box.x - 200), { timeout: 20_000 }).toBeLessThan(3);
    await expect(status(page)).toHaveText('Saved');
    const after = (await desktopIcon(page, 'Project Two').boundingBox())!;
    moved = { x: after.x, y: after.y };
  });

  await test.step('publish, and a visitor sees it', async () => {
    page.once('dialog', (d) => d.accept());
    await toolbar(page).getByRole('button', { name: 'Publish' }).click();
    await expect(toolbar(page).getByRole('button', { name: 'Published ✓' })).toBeVisible({ timeout: 20_000 });
    const visitor = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const v = await visitor.newPage();
    await v.goto('/');
    await expect(toolbar(v)).toHaveCount(0);
    const seen = (await desktopIcon(v, 'Project Two').boundingBox())!;
    expect(Math.abs(seen.x - moved.x)).toBeLessThan(3);
    expect(Math.abs(seen.y - moved.y)).toBeLessThan(3);
    await visitor.close();
  });

  await test.step('restyle (fonts, wallpaper, icon pack), publish, and a visitor sees all three', async () => {
    await toolbar(page).getByRole('button', { name: 'Site' }).click();
    const inspector = page.getByRole('complementary', { name: 'Inspector' });
    await inspector.getByRole('radiogroup', { name: 'Headline font' }).getByRole('radio', { name: 'Playfair Display' }).click();
    await inspector.getByRole('radiogroup', { name: 'Body font' }).getByRole('radio', { name: 'Nunito' }).click();
    await inspector.getByRole('radiogroup', { name: 'Icon pack' }).getByRole('radio', { name: 'Outline' }).click();
    await toolbar(page).getByRole('button', { name: 'Wallpaper' }).click();
    await page.getByRole('dialog', { name: 'Wallpaper' }).getByRole('button', { name: 'Midnight' }).click();
    await expect
      .poll(async () => {
        const { draft } = (await (await page.request.get('/api/owner/draft')).json()) as {
          draft: { site: { style?: { headingFont?: string; bodyFont?: string; iconPack?: string }; wallpaper: { preset?: string } } } | null;
        };
        const s = draft?.site;
        return `${s?.style?.headingFont}/${s?.style?.bodyFont}/${s?.style?.iconPack}/${s?.wallpaper.preset}`;
      }, { timeout: 20_000 })
      .toBe('playfair-display/nunito/outline/midnight');
    page.once('dialog', (d) => d.accept());
    await toolbar(page).getByRole('button', { name: 'Publish' }).click();
    await expect(toolbar(page).getByRole('button', { name: 'Published ✓' })).toBeVisible({ timeout: 20_000 });

    const visitor = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const v = await visitor.newPage();
    await v.goto('/');
    await expect(toolbar(v)).toHaveCount(0);
    await expect(v.getByTestId('headline')).toHaveCSS('font-family', /Playfair Display/);
    await expect(v.locator('[data-layout="desktop"]')).toHaveCSS('font-family', /Nunito/);
    await expect(v.locator('[data-layout="desktop"]')).toHaveAttribute('data-wallpaper', 'midnight');
    await expect(desktopIcon(v, 'Project Two').locator('img')).toHaveAttribute('src', '/icons/outline/finder.webp');
    await visitor.close();
  });

  await test.step('upload a photo to the media library', async () => {
    await toolbar(page).getByRole('button', { name: 'More' }).click();
    await page.getByRole('menuitem', { name: 'Media library…' }).click();
    const library = page.getByRole('dialog', { name: 'Media library' });
    await library.getByLabel('Upload…').setInputFiles({ name: 'e2e-photo.png', mimeType: 'image/png', buffer: PNG });
    const files = library.getByRole('list', { name: 'Files' });
    await expect(files).toContainText('e2e-photo.png');
    const src = await files.locator('img').first().getAttribute('src');
    expect(src).toMatch(/\/api\/dev-media\/images\/\d+-e2e-photo\.png/);
    const file = await page.request.get(src!.replace(/^.*(\/api\/dev-media\/)/, '$1'));
    expect(file.status()).toBe(200);
    expect(file.headers()['content-type']).toBe('image/png');
    await page.keyboard.press('Escape');
  });

  await test.step('sign out, then back in with the password', async () => {
    await toolbar(page).getByRole('button', { name: 'More' }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await page.waitForURL('**/');
    await signIn(page, 'not the password');
    await expect(alert(page)).toHaveText('That password isn\u2019t right.');
    await page.getByLabel('Password', { exact: true }).fill(SETUP_CODE);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(alert(page)).toHaveText(SETUP_CODE_HINT);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('You’re signed in as the owner.')).toBeVisible();
  });

  await test.step('reset the password with the setup code', async () => {
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await page.getByLabel('Setup code').fill(SETUP_CODE);
    await page.getByLabel('New password').fill(NEW_PASSWORD);
    await page.getByLabel('Confirm password').fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Set new password' }).click();
    await expect(page.getByText('You’re signed in as the owner.')).toBeVisible();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await signIn(page, PASSWORD);
    await expect(alert(page)).toHaveText('That password isn’t right.');
    await page.getByLabel('Password', { exact: true }).fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('You’re signed in as the owner.')).toBeVisible();
  });
});
