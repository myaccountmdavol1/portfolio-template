import { expect, test, type Page } from '@playwright/test';

// Deep-link fixture server (port 3101): the seed site plus Badges, Photos and Messages, with the screen saver's
// hot corner set to bottom-right. idleSeconds (honoured outside production only) replaces the idle minutes.
// playwright.config.ts asks for reduced motion, so every screen saver shows its still frame.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('portfolio:incomingCallShown', '1'));
});

const saver = (page: Page) => page.getByTestId('screensaver');
const lock = (page: Page) => page.getByTestId('lock-screen');
const win = (page: Page, name: string) => page.getByRole('dialog', { name, exact: true });
const notes = (page: Page) => lock(page).getByRole('list', { name: 'Notifications' });
const progress = (page: Page) => page.evaluate(() => JSON.parse(window.localStorage.getItem('portfolio:achievements') ?? 'null') as { unlocked: string[] } | null);
const hydrated = (page: Page) => expect(page.getByRole('banner')).toContainText(/\d:\d\d/);

test('idle → screen saver → a key → lock screen → Guest: the window is still open', async ({ page }) => {
  await page.goto('/?open=about-me&idleSeconds=2');
  await expect(win(page, 'About Me')).toBeVisible();
  await expect(saver(page)).toBeVisible({ timeout: 6000 });
  await expect(saver(page).getByRole('status')).toHaveText('Screen saver — press any key');
  await page.waitForTimeout(400); // past the moment where input is ignored
  await page.keyboard.press('Escape'); // swallowed: it doesn't close About Me
  await expect(lock(page)).toBeVisible();
  await expect(saver(page)).toHaveCount(0);
  await expect(lock(page)).toBeFocused();
  await lock(page).getByRole('button', { name: 'Guest' }).click();
  await expect(lock(page)).toHaveCount(0);
  await expect(win(page, 'About Me')).toBeVisible();
  await expect(page).toHaveURL(/[?&]open=about-me/); // the deep-link sync keeps idleSeconds and moves open after it
});

test('every module with something to show plays from its link; one without falls back', async ({ page }) => {
  const expected: [string, string][] = [
    ['hello', 'I’m Your.'],
    ['facts', 'Your current role, in a sentence'],
    ['bounce', 'YN'],
    ['memories', 'Robotics club'],
  ];
  for (const [id, text] of expected) {
    await page.goto(`/?screensaver=${id}`);
    await expect(saver(page)).toHaveAttribute('data-module', id);
    await expect(saver(page)).toContainText(text);
    await expect(page).not.toHaveURL(/screensaver=/);
  }
  await page.goto('/?screensaver=flurry');
  await expect(saver(page).locator('canvas')).toBeVisible();
  await page.goto('/?screensaver=drift'); // the fixture's badges have no pictures
  await expect(saver(page)).toBeVisible();
  await expect(saver(page)).not.toHaveAttribute('data-module', 'drift');
});

test('/?lock=1 shows the lock screen without adding a history entry', async ({ page }) => {
  await page.goto('about:blank');
  await page.goto('/?lock=1');
  await expect(lock(page)).toBeVisible();
  await expect(page).toHaveURL(/:3101\/$/);
  await lock(page).getByRole('button', { name: 'Guest' }).click();
  await expect(lock(page)).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL('about:blank');
});

test('the password unlocks (any case, spaces trimmed) and earns Password guru; a wrong one clears', async ({ page }) => {
  await page.goto('/?lock=1');
  await lock(page).getByRole('button', { name: 'Your Name' }).click();
  const password = lock(page).getByLabel('Password');
  await expect(password).toBeFocused();
  await expect(lock(page)).toContainText('Hint: it’s how you say hi 👋');
  await password.fill('goodbye');
  await password.press('Enter');
  await expect(lock(page).getByText('Incorrect password')).toBeVisible();
  await expect(password).toHaveValue('');
  await password.fill('  HELLO ');
  await password.press('Enter');
  await expect(lock(page)).toHaveCount(0);
  expect((await progress(page))?.unlocked).toEqual(['password']);
});

test('the System menu starts the screen saver and locks; keys never reach the windows behind', async ({ page }) => {
  await page.goto('/?open=about-me');
  await expect(win(page, 'About Me')).toBeVisible();
  await page.getByRole('button', { name: 'System menu' }).click();
  await page.getByRole('menuitem', { name: 'Start Screen Saver' }).click();
  await expect(saver(page)).toBeVisible();
  await page.waitForTimeout(400);
  await page.mouse.move(300, 300);
  await page.mouse.move(500, 450);
  await expect(lock(page)).toBeVisible();
  await lock(page).getByRole('button', { name: 'Guest' }).click();
  await expect(lock(page)).toHaveCount(0);

  await page.getByRole('button', { name: 'System menu' }).click();
  await page.getByRole('menuitem', { name: /Lock Screen/ }).click();
  await expect(lock(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Spotlight Search' })).toHaveCount(0);
  await lock(page).getByRole('button', { name: 'Guest' }).click();
  await expect(lock(page)).toHaveCount(0);
  await expect(win(page, 'About Me')).toBeVisible();
});

test('⌥⌘L locks; Tab and Enter unlock with Guest, and focus goes back where it was', async ({ page }) => {
  await page.goto('/');
  await hydrated(page);
  const search = page.getByRole('button', { name: 'Spotlight Search' });
  await search.focus();
  await page.keyboard.press('Alt+Meta+KeyL');
  await expect(lock(page)).toBeFocused();
  await page.keyboard.press('Tab'); // the owner's tile
  await page.keyboard.press('Tab'); // Guest
  await expect(lock(page).getByRole('button', { name: 'Guest' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(lock(page)).toHaveCount(0);
  await expect(search).toBeFocused();
});

test('the old ⌃⌘Q does nothing; the menu says ⌥⌘L', async ({ page }) => {
  await page.goto('/');
  await hydrated(page);
  await page.keyboard.press('Control+Meta+q');
  await page.waitForTimeout(500);
  await expect(lock(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'System menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'Lock Screen ⌥⌘L' })).toBeVisible();
});

test('Control Center’s Screen Saver and Lock Screen buttons close it and start', async ({ page }) => {
  await page.goto('/');
  await hydrated(page);
  const cc = page.getByRole('dialog', { name: 'Control Center' });
  await page.getByRole('button', { name: 'Control Center' }).click();
  await cc.getByRole('button', { name: 'Screen Saver' }).click();
  await expect(cc).toHaveCount(0);
  await expect(saver(page)).toBeVisible();
  await page.waitForTimeout(400);
  await page.keyboard.press('Shift');
  await lock(page).getByRole('button', { name: 'Guest' }).click();
  await expect(lock(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Control Center' }).click();
  await cc.getByRole('button', { name: 'Lock Screen' }).click();
  await expect(cc).toHaveCount(0);
  await expect(lock(page)).toBeVisible();
});

test('resting the pointer in the hot corner for a second starts it; leaving early doesn’t', async ({ page }) => {
  await page.goto('/');
  await hydrated(page);
  await page.mouse.move(640, 400);
  await page.mouse.move(1279, 799);
  await page.waitForTimeout(500);
  await page.mouse.move(640, 400);
  await page.waitForTimeout(1000);
  await expect(saver(page)).toHaveCount(0);
  await page.mouse.move(1279, 799);
  await expect(saver(page)).toBeVisible({ timeout: 3000 });
});

test('idle waits while the tour plays', async ({ page }) => {
  await page.goto('/?tour=1&tourSpeed=1&idleSeconds=1');
  const bar = page.getByRole('toolbar', { name: 'Tour' });
  await expect(bar).toBeVisible();
  await page.waitForTimeout(3000);
  await expect(saver(page)).toHaveCount(0);
  await page.keyboard.press('a'); // stops the tour
  await expect(bar).toHaveCount(0);
  await expect(saver(page)).toBeVisible({ timeout: 4000 });
});

test('idle waits while Spotlight is open', async ({ page }) => {
  await page.goto('/?idleSeconds=2');
  await hydrated(page);
  await page.getByRole('button', { name: 'Spotlight Search' }).click();
  await expect(page.getByRole('dialog', { name: 'Spotlight Search' })).toBeVisible();
  await page.waitForTimeout(3500);
  await expect(saver(page)).toHaveCount(0);
});

test('the lock screen shows only real notifications: the newest badge and what’s playing now', async ({ page }) => {
  await page.route('**/api/now-playing', (route) => route.fulfill({ json: { configured: true, track: { isPlaying: true, title: 'Song', artist: 'Band' } } }));
  await page.goto('/?lock=1');
  await expect(notes(page)).toContainText('New: Google Certified Educator');
  await expect(notes(page)).toContainText('Song — Band');
  await expect(notes(page)).not.toContainText('Missed call');
});

test('a call nobody answers rings out and shows on the lock screen as missed', async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.removeItem('portfolio:incomingCallShown'));
  await page.goto('/');
  const call = page.getByRole('region', { name: 'Incoming call' });
  await expect(call).toBeVisible({ timeout: 10_000 }); // the sample call rings after 4 s
  await expect(call).toHaveCount(0, { timeout: 30_000 }); // and rings for 20 s
  await expect(page.getByRole('region', { name: 'Missed call' })).toBeVisible();
  await page.keyboard.press('Alt+Meta+KeyL');
  await expect(notes(page)).toContainText('Missed call');
  await expect(notes(page)).toContainText('Your Name');
});

test('unlocking after the System menu locked puts focus back on the System menu button', async ({ page }) => {
  await page.goto('/');
  await hydrated(page);
  const button = page.getByRole('button', { name: 'System menu' });
  await button.click();
  await page.getByRole('menuitem', { name: /Lock Screen/ }).click();
  await expect(lock(page)).toBeFocused();
  await lock(page).getByRole('button', { name: 'Guest' }).click();
  await expect(lock(page)).toHaveCount(0);
  await expect(button).toBeFocused();

  // The screen saver from the menu: the same once it's woken and unlocked.
  await button.click();
  await page.getByRole('menuitem', { name: 'Start Screen Saver' }).click();
  await expect(saver(page)).toBeVisible();
  await page.waitForTimeout(400);
  await page.keyboard.press('Shift');
  await lock(page).getByRole('button', { name: 'Guest' }).click();
  await expect(lock(page)).toHaveCount(0);
  await expect(button).toBeFocused();
});

test('unlocking after Control Center locked puts focus back on the Control Center button', async ({ page }) => {
  await page.goto('/');
  await hydrated(page);
  const button = page.getByRole('button', { name: 'Control Center' });
  await button.click();
  await page.getByRole('dialog', { name: 'Control Center' }).getByRole('button', { name: 'Lock Screen' }).click();
  await expect(lock(page)).toBeFocused();
  await lock(page).getByRole('button', { name: 'Guest' }).click();
  await expect(lock(page)).toHaveCount(0);
  await expect(button).toBeFocused();
});

test('the System menu button closes its own menu; a lock closes an open menu', async ({ page }) => {
  await page.goto('/');
  await hydrated(page);
  const button = page.getByRole('button', { name: 'System menu' });
  const menu = page.getByRole('menu', { name: 'System menu' });
  await button.click();
  await expect(menu).toBeVisible();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await button.click();
  await expect(menu).toHaveCount(0);
  await expect(button).toHaveAttribute('aria-expanded', 'false');

  await button.click();
  await expect(menu).toBeVisible();
  await page.keyboard.press('Alt+Meta+KeyL');
  await expect(lock(page)).toBeVisible();
  await expect(menu).toHaveCount(0);
  await lock(page).getByRole('button', { name: 'Guest' }).click();
  await expect(lock(page)).toHaveCount(0);
  await expect(menu).toHaveCount(0); // it doesn't come back after unlocking
});

test('the desktop’s right-click menu closes when the screen locks', async ({ page }) => {
  await page.goto('/');
  await hydrated(page);
  await page.getByTestId('desktop-area').click({ button: 'right', position: { x: 600, y: 300 } });
  const menu = page.getByRole('menu', { name: 'Desktop' });
  await expect(menu).toBeVisible();
  await page.keyboard.press('Alt+Meta+KeyL');
  await expect(lock(page)).toBeVisible();
  await expect(menu).toHaveCount(0);
});

test('Esc on the lock screen doesn’t close the tour’s end card behind it', async ({ page }) => {
  await page.goto('/?tour=1&tourSpeed=10');
  const endCard = page.getByRole('dialog', { name: 'Thanks for watching' });
  await expect(endCard).toBeVisible({ timeout: 20_000 });
  await page.keyboard.press('Alt+Meta+KeyL');
  await expect(lock(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await lock(page).getByRole('button', { name: 'Guest' }).click();
  await expect(lock(page)).toHaveCount(0);
  await expect(endCard).toBeVisible();
});

// Everything else runs with reduced motion (still frames); these play the real animations once.
for (const id of ['bounce', 'flurry'] as const) {
  test(`the ${id} screen saver animates without errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`/?screensaver=${id}&idleSeconds=60`);
    await expect(saver(page)).toHaveAttribute('data-module', id);
    await page.waitForTimeout(1500); // some frames
    await expect(saver(page)).toBeVisible();
    expect(errors).toEqual([]);
  });
}
