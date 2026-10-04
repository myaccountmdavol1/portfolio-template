import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.sessionStorage.setItem('portfolio:incomingCallShown', '1'));
});

test('at a narrow desktop width nothing overlaps: icons, dock, menu bar', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 760 });
  await page.goto('/');
  await expect(page.getByRole('banner')).toContainText(/\d:\d\d/);

  // Icons never sit on top of each other.
  const boxes = await page.getByTestId('desktop-area').locator('button[data-app-id]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()));
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const overlap = a.x < b.x + b.width - 4 && b.x < a.x + a.width - 4 && a.y < b.y + b.height - 4 && b.y < a.y + a.height - 4;
      expect(overlap, `icons ${i} and ${j} overlap`).toBe(false);
    }
  }

  // Dock icons stay square (not squished), and the dock fits on screen.
  const dock = page.getByRole('navigation', { name: 'Dock' });
  const icons = await dock.locator('.dock-item').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).map((r) => ({ w: r.width, h: r.height })));
  for (const r of icons) expect(Math.abs(r.w - icons[0].w)).toBeLessThan(1.5);
  const d = (await dock.boundingBox())!;
  expect(d.x).toBeGreaterThanOrEqual(0);
  expect(d.x + d.width).toBeLessThanOrEqual(820);

  // The menu bar stays one line tall.
  const owner = page.getByRole('banner').getByRole('button', { name: /Portfolio/ });
  expect((await owner.boundingBox())!.height).toBeLessThan(24);
});

test('visitors can Clean Up By Name from the wallpaper menu (only their view changes)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner')).toContainText(/\d:\d\d/);
  await page.getByTestId('desktop-area').click({ button: 'right', position: { x: 600, y: 560 } });
  await page.getByRole('menu', { name: 'Desktop' }).getByRole('menuitem', { name: 'Clean Up By Name' }).click();
  const names = await page
    .getByTestId('desktop-area')
    .locator('button[data-app-id]')
    .evaluateAll((els) =>
      els
        .map((e) => ({ name: e.getAttribute('aria-label') ?? '', x: e.getBoundingClientRect().x, y: e.getBoundingClientRect().y }))
        .sort((a, b) => a.x - b.x || a.y - b.y)
        .map((e) => e.name),
    );
  expect(names).toEqual(['About Me', 'Credentials', 'My Path', 'Project One', 'Project Two', 'Resume.pdf']);
});

test('the dock background contains every dock icon at narrow widths', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 760 });
  await page.goto('/');
  const dock = page.getByRole('navigation', { name: 'Dock' });
  const d = (await dock.boundingBox())!;
  const last = (await dock.locator('.dock-item').last().boundingBox())!;
  expect(last.x + last.width).toBeLessThanOrEqual(d.x + d.width + 1);
});
