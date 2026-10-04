import { expect, test, type Page } from '@playwright/test';

async function skipIncomingCall(page: Page) {
  await page.addInitScript(() => window.sessionStorage.setItem('portfolio:incomingCallShown', '1'));
}

const iconsArea = (page: Page) => page.getByTestId('desktop-area');
const dock = (page: Page) => page.getByRole('navigation', { name: 'Dock' });
const icon = (page: Page, name: string) => iconsArea(page).getByRole('button', { name, exact: true });
const windowFor = (page: Page, name: string) => page.getByRole('dialog', { name, exact: true });

test('server renders the desktop layout for a desktop browser', async ({ page }) => {
  const html = await (await page.request.get('/')).text();
  expect(html).toContain('data-layout="desktop"');
});

test.describe('desktop layout', () => {
  test.beforeEach(async ({ page }) => {
    await skipIncomingCall(page);
    await page.goto('/');
    await expect(page.locator('[data-layout="desktop"]')).toBeVisible();
  });

  test('shows the menu bar, headline, icons, sticky note, and dock', async ({ page }) => {
    const menu = page.getByRole('banner');
    await expect(menu.getByRole('button', { name: 'Your Name’s Portfolio' })).toBeVisible();
    await expect(menu).toContainText(/\d:\d\d (AM|PM)/);
    await expect(page.getByRole('heading', { name: 'portfolio.' })).toBeVisible();
    for (const name of ['Project One', 'Project Two', 'Resume.pdf', 'About Me', 'Credentials', 'My Path']) {
      await expect(icon(page, name)).toBeVisible();
    }
    await expect(page.getByTestId('sticky-note')).toBeVisible();
    await expect(dock(page).getByRole('link', { name: 'LinkedIn' })).toBeVisible();
  });

  const WINDOWS = [
    { from: 'icon', name: 'Project One', text: 'Mobile app · UX research' },
    { from: 'icon', name: 'Resume.pdf', text: 'No document uploaded yet.' },
    { from: 'icon', name: 'About Me', text: 'Helen Keller' },
    { from: 'icon', name: 'Credentials', text: 'Continuous Learning' },
    { from: 'icon', name: 'My Path', text: 'People reached per year' },
    { from: 'dock', name: 'Playlist', text: 'Open in Spotify' },
    { from: 'dock', name: 'To do', text: 'Finish my portfolio' },
  ] as const;

  for (const w of WINDOWS) {
    test(`opens and closes ${w.name}`, async ({ page }) => {
      const scope = w.from === 'icon' ? iconsArea(page) : dock(page);
      await scope.getByRole('button', { name: w.name, exact: true }).click();
      const win = windowFor(page, w.name);
      await expect(win).toBeVisible();
      await expect(win).toContainText(w.text);
      await win.getByRole('button', { name: 'Close' }).click();
      await expect(win).toBeHidden();
    });
  }

  test('Escape closes the front window first', async ({ page }) => {
    await icon(page, 'Project One').click();
    await icon(page, 'Project Two').click();
    await expect(page.getByRole('dialog')).toHaveCount(2);
    await page.keyboard.press('Escape');
    await expect(windowFor(page, 'Project Two')).toBeHidden();
    await expect(windowFor(page, 'Project One')).toBeVisible();
  });

  test('drags a window by its title bar', async ({ page }) => {
    await icon(page, 'Project One').click();
    const win = windowFor(page, 'Project One');
    const before = (await win.boundingBox())!;
    const bar = (await win.getByTestId('window-titlebar').boundingBox())!;
    await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2);
    await page.mouse.down();
    await page.mouse.move(bar.x + bar.width / 2 + 120, bar.y + bar.height / 2 + 60, { steps: 8 });
    await page.mouse.up();
    const after = (await win.boundingBox())!;
    expect(Math.abs(after.x - before.x - 120)).toBeLessThan(2);
    expect(Math.abs(after.y - before.y - 60)).toBeLessThan(2);
  });

  test('clicking a window brings it to the front', async ({ page }) => {
    await icon(page, 'Project One').click();
    await icon(page, 'Project Two').click();
    const one = windowFor(page, 'Project One');
    const two = windowFor(page, 'Project Two');
    const z = (el: typeof one) => el.evaluate((node) => Number(getComputedStyle(node).zIndex));
    expect(await z(two)).toBeGreaterThan(await z(one));
    // Click the strip of Project One's title bar that Project Two (28px lower) doesn't cover.
    await one.getByTestId('window-titlebar').click({ position: { x: 80, y: 6 } });
    expect(await z(one)).toBeGreaterThan(await z(two));
  });

  test('dragging an icon moves it without opening it', async ({ page }) => {
    const target = icon(page, 'Project Two');
    const before = (await target.boundingBox())!;
    await page.mouse.move(before.x + 50, before.y + 30);
    await page.mouse.down();
    await page.mouse.move(before.x + 250, before.y + 130, { steps: 10 });
    await page.mouse.up();
    const after = (await target.boundingBox())!;
    expect(Math.abs(after.x - before.x - 200)).toBeLessThan(2);
    expect(Math.abs(after.y - before.y - 100)).toBeLessThan(2);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('sticky note checkboxes toggle locally and reset on reload', async ({ page }) => {
    const box = () => page.getByTestId('sticky-note').getByRole('checkbox', { name: 'Create something worth sharing' });
    await expect(box()).not.toBeChecked();
    await box().click();
    await expect(box()).toBeChecked();
    await page.reload();
    await expect(box()).not.toBeChecked();
  });

  test('menu bar opens the resume and the about app', async ({ page }) => {
    const menu = page.getByRole('banner');
    await menu.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(windowFor(page, 'Resume.pdf')).toBeVisible();
    await menu.getByRole('button', { name: 'Your Name’s Portfolio' }).click();
    await expect(windowFor(page, 'About Me')).toBeVisible();
  });

  test('dock shows a running dot for open apps', async ({ page }) => {
    const about = dock(page).getByRole('button', { name: 'About Me', exact: true });
    await expect(about).toHaveAttribute('data-running', 'false');
    await about.click();
    await expect(about).toHaveAttribute('data-running', 'true');
  });

  test('switches to the phone layout when the window gets narrow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('[data-layout="phone"]')).toBeVisible();
  });
});

test('the favicon and iPhone icon are generated PNGs', async ({ page, request }) => {
  await page.goto('/');
  for (const rel of ['icon', 'apple-touch-icon']) {
    const href = await page.locator(`link[rel="${rel}"]`).first().getAttribute('href');
    const res = await request.get(href!);
    expect(res.status(), rel).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  }
});

test('/edit takes the owner to the sign-in page', async ({ page }) => {
  await page.goto('/edit');
  await expect(page).toHaveURL(/\/admin$/);
});

test.describe('404 page', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

  test('icons form 404, the Konami code drops them, and the game starts', async ({ page }) => {
    const res = await page.goto('/no-such-page');
    expect(res?.status()).toBe(404);
    const art = page.getByTestId('not-found-art');
    await expect(art.getByRole('button')).toHaveCount(44);
    await expect(page.getByRole('link', { name: 'Go Back Home' })).toBeVisible();
    await page.waitForTimeout(2200); // let them fly in
    for (const key of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) await page.keyboard.press(key);
    await expect(art).toHaveAttribute('data-fallen', 'true');
    await page.getByRole('button', { name: 'Play Beach Ball Run' }).click();
    const game = page.getByTestId('beach-ball-run');
    await expect(game).toBeVisible();
    await game.click();
    await page.keyboard.press('Escape');
    await expect(game).toHaveCount(0);
    await page.getByRole('link', { name: 'Go Back Home' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
