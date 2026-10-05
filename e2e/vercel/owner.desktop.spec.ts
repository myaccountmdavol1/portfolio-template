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
  // A page on another site can't make an owner's browser write. The check runs first, so it uses no sign-in attempt.
  const otherSite = { origin: 'https://evil.example' };
  expect((await request.post('/api/owner/session', { headers: otherSite, data: { password: 'x' } })).status()).toBe(403);
  expect((await request.put('/api/owner/draft', { headers: otherSite, data: {} })).status()).toBe(403);
});

test('visitors who open /setup are sent to sign in', async ({ page }) => {
  await page.goto('/setup');
  await page.waitForURL('**/admin');
});

test('owner journey: claim, edit, publish, upload, sign out and in, reset the password', async ({ page, browser }) => {
  test.setTimeout(300_000);

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
    await expect(page.getByText('Enter the setup code you chose when you deployed (at least 12 characters), then pick a password.')).toBeVisible();
    await page.getByLabel('Setup code').fill(SETUP_CODE);
    await page.getByRole('button', { name: 'Claim this site' }).click();
    // A new owner goes straight to the setup wizard; Skip for now opens the editor without finishing it.
    await page.waitForURL('**/setup');
    await expect(page.getByRole('heading', { name: 'Let\u2019s set up your site' })).toBeVisible();
    await page.getByRole('link', { name: 'Skip for now' }).click();
    await page.waitForURL(/\/\?edit=1$/);
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
    // Setup was skipped, not finished, so signing in brings the wizard back.
    await page.waitForURL('**/setup');
    await expect(page.getByRole('heading', { name: 'Let\u2019s set up your site' })).toBeVisible();
  });

  await test.step('reset the password with the setup code', async () => {
    await page.goto('/admin');
    await expect(page.getByText('You’re signed in as the owner.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Finish setting up' })).toHaveAttribute('href', '/setup');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await page.getByLabel('Setup code').fill(SETUP_CODE);
    await page.getByLabel('New password').fill(NEW_PASSWORD);
    await page.getByLabel('Confirm password').fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Set new password' }).click();
    await page.waitForURL('**/setup');
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await signIn(page, PASSWORD);
    await expect(alert(page)).toHaveText('That password isn’t right.');
    await page.getByLabel('Password', { exact: true }).fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/setup');
  });

  await test.step('the setup wizard: every step, publish, and a visitor sees the answers', async () => {
    await page.goto('/setup');
    await expect(page.getByRole('heading', { name: 'Let\u2019s set up your site' })).toBeVisible();
    await page.getByRole('button', { name: 'Let\u2019s go' }).click();

    await expect(page.getByRole('heading', { name: 'About you' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Setup progress' }).getByRole('listitem')).toHaveCount(6);
    await page.getByLabel('Your name').fill('Sam Taylor');
    await expect(page.getByLabel('Site title')).toHaveValue('Sam Taylor \u2014 Portfolio');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByRole('heading', { name: 'Your photo' })).toBeVisible();
    await page.getByLabel('Upload your photo').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
    await expect(page.getByRole('img', { name: 'Your photo' })).toHaveAttribute('src', /\/api\/dev-media\/images\/\d+-me\.png$/);
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByRole('heading', { name: 'Headline & bio' })).toBeVisible();
    await expect(page.getByLabel('Headline, first line')).toHaveValue('welcome to my');
    await page.getByLabel('Headline, second line').fill('studio.');
    await page.getByLabel('One-line bio').fill('I design calm, useful software.');
    // Leaving and coming back resumes at the same step, with the answers.
    await expect.poll(() => page.evaluate(() => localStorage.getItem('portfolio:setupWizard') ?? '')).toContain('I design calm, useful software.');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Headline & bio' })).toBeVisible();
    await expect(page.getByLabel('Headline, second line')).toHaveValue('studio.');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByRole('heading', { name: 'Wallpaper', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Dusk', exact: true }).click();
    await expect(page.getByTestId('setup-preview')).toHaveAttribute('data-wallpaper', 'dusk');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByRole('heading', { name: 'Pick your style' })).toBeVisible();
    await page.getByRole('radiogroup', { name: 'Headline font' }).getByRole('radio', { name: 'Lora', exact: true }).click();
    await page.getByRole('radiogroup', { name: 'Body font' }).getByRole('radio', { name: 'Inter', exact: true }).click();
    await page.getByRole('radiogroup', { name: 'Icon pack' }).getByRole('radio', { name: 'Glass', exact: true }).click();
    await expect(page.getByTestId('setup-preview-headline')).toHaveCSS('font-family', /Lora/);
    await expect(page.getByTestId('setup-preview').locator('img').first()).toHaveAttribute('src', '/icons/glass/finder.webp');
    await page.getByRole('button', { name: 'Next' }).click();

    await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible();
    const summary = page.locator('main dl');
    for (const text of ['Sam Taylor', 'Sam Taylor \u2014 Portfolio', 'New photo', 'welcome to my studio.', 'Dusk', 'Lora headline, Inter text, Glass icons']) {
      await expect(summary).toContainText(text);
    }
    // Edit goes back to that step, and comes straight back to Review.
    await page.getByRole('button', { name: 'Edit Bio' }).click();
    await expect(page.getByRole('heading', { name: 'Headline & bio' })).toBeVisible();
    await page.getByLabel('One-line bio').fill('I design calm, useful software for small teams.');
    await page.getByRole('button', { name: 'Back to review' }).click();
    await expect(summary).toContainText('I design calm, useful software for small teams.');

    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your site is live' })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('link', { name: 'localhost:3102' })).toHaveAttribute('href', 'http://localhost:3102');
    expect(((await (await page.request.get('/api/owner/session')).json()) as { setupDone: boolean }).setupDone).toBe(true);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('portfolio:setupWizard'))).toBeNull();

    const { draft } = (await (await page.request.get('/api/owner/draft')).json()) as {
      draft: { apps: { type: string; content: { media?: { url: string }; bio?: unknown } }[] };
    };
    const about = draft.apps.find((a) => a.type === 'about')!;
    expect(about.content.media?.url).toMatch(/\/api\/dev-media\/images\/\d+-me\.png$/);
    expect(about.content.bio).toEqual({ blocks: [{ type: 'paragraph', text: 'I design calm, useful software for small teams.' }] });

    const visitor = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const v = await visitor.newPage();
    await v.goto('/');
    await expect(v).toHaveTitle('Sam Taylor \u2014 Portfolio');
    await expect(v.getByText('Sam Taylor\u2019s Portfolio')).toBeVisible();
    await expect(v.getByTestId('headline')).toContainText('studio.');
    await expect(v.getByTestId('headline')).toHaveCSS('font-family', /Lora/);
    await expect(v.locator('[data-layout="desktop"]')).toHaveCSS('font-family', /Inter/);
    await expect(v.locator('[data-layout="desktop"]')).toHaveAttribute('data-wallpaper', 'dusk');
    await expect(desktopIcon(v, 'Project Two').locator('img')).toHaveAttribute('src', '/icons/glass/finder.webp');
    await visitor.close();

    await page.getByRole('link', { name: 'Start editing' }).click();
    await page.waitForURL(/\/\?edit=1&welcome=1$/);
    await expect(toolbar(page)).toBeVisible();
  });

  await test.step('the editor tour points at the main buttons once, then never again', async () => {
    const tour = page.getByRole('dialog', { name: 'Editor tour' });
    await expect(tour.getByRole('heading')).toHaveText('Edit');
    await expect(tour.getByRole('button', { name: 'Next' })).toBeFocused();
    for (const title of ['Add', 'Site settings', 'More', 'Publish']) {
      await tour.getByRole('button', { name: 'Next' }).click();
      await expect(tour.getByRole('heading')).toHaveText(title);
      if (title === 'More') await expect(tour).toContainText('Media library\u2026');
    }
    await expect(tour.getByRole('button', { name: 'Done' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(tour).toHaveCount(0);
    await expect(page).toHaveURL(/\/\?edit=1$/);

    // On a narrow screen every bubble's button is scrolled into view.
    const wide = page.viewportSize();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?edit=1&welcome=1');
    await page.evaluate(() => window.localStorage.removeItem('portfolio:editorTourSeen'));
    await page.reload();
    for (const [i, name] of [/^Edit/, /^Add$/, /^Site$/, /^More$/, /^Publish/].entries()) {
      if (i > 0) await tour.getByRole('button', { name: 'Next' }).click();
      const button = toolbar(page).getByRole('button', { name }).first();
      await expect
        .poll(async () => {
          const box = await button.boundingBox();
          return box !== null && box.x >= 0 && box.x + box.width <= 390;
        })
        .toBe(true);
    }
    await tour.getByRole('button', { name: 'Skip tour' }).click();
    if (wide) await page.setViewportSize(wide);

    await page.goto('/?edit=1&welcome=1');
    await expect(toolbar(page).getByRole('button', { name: 'Add' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Editor tour' })).toHaveCount(0);
  });

  await test.step('once setup is finished, signing in opens the owner panel, not the wizard', async () => {
    await page.goto('/admin');
    await expect(page.getByText('You’re signed in as the owner.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Finish setting up' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await signIn(page, NEW_PASSWORD);
    await expect(page.getByText('You’re signed in as the owner.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open the editor' })).toBeVisible();
    await expect(page).toHaveURL(/\/admin$/);
  });
});
