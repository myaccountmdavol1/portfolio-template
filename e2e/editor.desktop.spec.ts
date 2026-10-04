import { expect, test, type Page } from '@playwright/test';

// Every editor test uses the dev-only local editor: the draft lives in this test's own localStorage.

const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Editor' });
const status = (page: Page) => page.getByTestId('save-status');
const desktopIcon = (page: Page, name: string) => page.getByTestId('desktop-area').getByRole('button', { name, exact: true });

async function openEditor(page: Page) {
  await page.goto('/?editor=local');
  await expect(toolbar(page)).toBeVisible();
  await expect(status(page)).toHaveText('Saved', { timeout: 15_000 });
}

async function waitForSave(page: Page) {
  await expect(status(page)).toHaveText('Unsaved changes');
  await expect(status(page)).toHaveText('Saved', { timeout: 15_000 });
}

async function drag(page: Page, name: string, dx: number, dy: number) {
  const box = (await desktopIcon(page, name).boundingBox())!;
  await page.mouse.move(box.x + 50, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 50 + dx, box.y + 30 + dy, { steps: 10 });
  await page.mouse.up();
  return box;
}

test('visitors never see the editor', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-layout="desktop"]')).toBeVisible();
  await expect(toolbar(page)).toHaveCount(0);
});

test.describe('editor shell', () => {
  test.beforeEach(async ({ page }) => openEditor(page));

  test('opens with Edit on and no incoming call', async ({ page }) => {
    await expect(toolbar(page).getByRole('button', { name: 'Edit' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Undo' })).toBeDisabled();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
  });

  test('a dragged icon is saved to the draft and survives a reload', async ({ page }) => {
    const before = await drag(page, 'Project Two', 200, 100);
    await waitForSave(page);
    await page.reload();
    await expect(status(page)).toHaveText('Saved', { timeout: 15_000 });
    const after = (await desktopIcon(page, 'Project Two').boundingBox())!;
    expect(Math.abs(after.x - before.x - 200)).toBeLessThan(3);
    expect(Math.abs(after.y - before.y - 100)).toBeLessThan(3);
  });

  test('undo puts a dragged icon back', async ({ page }) => {
    const before = await drag(page, 'Project Two', 200, 100);
    await page.getByRole('button', { name: 'Undo' }).click();
    const after = (await desktopIcon(page, 'Project Two').boundingBox())!;
    expect(Math.abs(after.x - before.x)).toBeLessThan(3);
    await page.getByRole('button', { name: 'Redo' }).click();
    const redone = (await desktopIcon(page, 'Project Two').boundingBox())!;
    expect(Math.abs(redone.x - before.x - 200)).toBeLessThan(3);
  });

  test('turning Edit off shows the live site', async ({ page }) => {
    const before = await drag(page, 'Project Two', 200, 100);
    await toolbar(page).getByRole('button', { name: 'Edit' }).click();
    const live = (await desktopIcon(page, 'Project Two').boundingBox())!;
    expect(Math.abs(live.x - before.x)).toBeLessThan(3);
  });

  test('Phone shows the phone layout in a frame', async ({ page }) => {
    await toolbar(page).getByRole('button', { name: 'Phone' }).click();
    await expect(page.getByTestId('phone-frame').locator('[data-layout="phone"]')).toBeVisible();
    await toolbar(page).getByRole('button', { name: 'Desktop' }).click();
    await expect(page.locator('[data-layout="desktop"]')).toBeVisible();
  });
});

test.describe('desktop editing', () => {
  test.beforeEach(async ({ page }) => openEditor(page));

  test('click selects, double-click opens', async ({ page }) => {
    await desktopIcon(page, 'Project One').click();
    await expect(desktopIcon(page, 'Project One')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await desktopIcon(page, 'Project One').dblclick();
    await expect(page.getByRole('dialog', { name: 'Project One' })).toBeVisible();
  });

  test('rename from the right-click menu, and it persists', async ({ page }) => {
    await desktopIcon(page, 'Project One').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Rename' }).click();
    const field = page.getByRole('textbox', { name: 'New name' });
    await field.fill('Case Study');
    await field.press('Enter');
    await expect(desktopIcon(page, 'Case Study')).toBeVisible();
    await waitForSave(page);
    await page.reload();
    await expect(desktopIcon(page, 'Case Study')).toBeVisible();
  });

  test('delete asks first, and undo brings it back', async ({ page }) => {
    page.once('dialog', (d) => d.accept());
    await desktopIcon(page, 'Project Two').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Delete…' }).click();
    await expect(desktopIcon(page, 'Project Two')).toHaveCount(0);
    await page.keyboard.press('ControlOrMeta+z');
    await expect(desktopIcon(page, 'Project Two')).toBeVisible();
  });

  test('duplicate and hide', async ({ page }) => {
    await desktopIcon(page, 'Project One').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();
    await expect(desktopIcon(page, 'Project One copy')).toBeVisible();
    await desktopIcon(page, 'Project One copy').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Hide' }).click();
    await expect(desktopIcon(page, 'Project One copy')).toHaveCount(0);
  });

  test('Add to Dock puts the app in the dock', async ({ page }) => {
    await desktopIcon(page, 'Project One').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Add to Dock' }).click();
    await expect(page.getByRole('navigation', { name: 'Dock' }).getByRole('button', { name: 'Project One' })).toBeVisible();
  });

  test('the headline is editable in place', async ({ page }) => {
    const headline = page.getByRole('textbox', { name: 'Headline', exact: true });
    await headline.fill('work.');
    await headline.press('Enter');
    await expect(page.getByRole('heading', { name: 'work.' })).toBeVisible();
  });

  test('sticky note items are editable and addable', async ({ page }) => {
    const note = page.getByTestId('sticky-note');
    await note.getByRole('button', { name: '+ Add item' }).click();
    const item = note.getByRole('textbox', { name: 'Note item 5' });
    await expect(item).toHaveText('New item');
    await item.fill('Call mom');
    await item.press('Enter');
    await expect(item).toHaveText('Call mom');
  });

  test('Esc closes the menu', async ({ page }) => {
    await desktopIcon(page, 'Project One').click({ button: 'right' });
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
  });
});

test.describe('dock editing', () => {
  test.beforeEach(async ({ page }) => openEditor(page));

  const dockNames = (page: Page) =>
    page.getByRole('navigation', { name: 'Dock' }).locator('[data-dock-index] > [aria-label]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));

  test('drag reorders dock items', async ({ page }) => {
    const dock = page.getByRole('navigation', { name: 'Dock' });
    expect((await dockNames(page)).slice(0, 3)).toEqual(['About Me', 'Credentials', 'Playlist']);
    const from = (await dock.getByRole('button', { name: 'About Me' }).boundingBox())!;
    const to = (await dock.getByRole('button', { name: 'Playlist' }).boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width - 4, from.y + from.height / 2, { steps: 10 });
    await page.mouse.up();
    await expect.poll(async () => (await dockNames(page)).slice(0, 3)).toEqual(['Credentials', 'Playlist', 'About Me']);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('a dock link can be selected and removed, and does not navigate', async ({ page }) => {
    const dock = page.getByRole('navigation', { name: 'Dock' });
    await dock.getByRole('link', { name: 'LinkedIn' }).click();
    expect(page.context().pages()).toHaveLength(1);
    await dock.getByRole('link', { name: 'LinkedIn' }).click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Remove from Dock' }).click();
    await expect(dock.getByRole('link', { name: 'LinkedIn' })).toHaveCount(0);
  });
});

test.describe('pickers', () => {
  test.beforeEach(async ({ page }) => openEditor(page));

  test('Change Icon… swaps an app icon for a catalog icon', async ({ page }) => {
    await desktopIcon(page, 'Project One').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Change Icon…' }).click();
    const picker = page.getByRole('dialog', { name: 'Choose an icon' });
    await picker.getByRole('searchbox', { name: 'Search icons' }).fill('terminal');
    await expect(picker.getByRole('button', { name: 'Safari' })).toHaveCount(0);
    await picker.getByRole('button', { name: 'Terminal' }).click();
    await expect(picker).toHaveCount(0);
    await expect(desktopIcon(page, 'Project One').locator('img')).toHaveAttribute('src', '/icons/catalog/terminal.webp');
  });

  test('uploading an icon image uses it', async ({ page }) => {
    await desktopIcon(page, 'Project One').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Change Icon…' }).click();
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    await page.getByLabel('Upload icon image').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: png });
    await expect(page.getByRole('dialog', { name: 'Choose an icon' })).toHaveCount(0);
    await expect(desktopIcon(page, 'Project One').locator('img')).toHaveAttribute('src', /^data:image\/png/);
  });

  test('the wallpaper picker changes the wallpaper', async ({ page }) => {
    await toolbar(page).getByRole('button', { name: 'Wallpaper' }).click();
    await page.getByRole('dialog', { name: 'Wallpaper' }).getByRole('button', { name: 'Dusk' }).click();
    await expect(page.locator('[data-layout="desktop"]')).toHaveAttribute('data-wallpaper', 'dusk');
  });

  test('clicking bare wallpaper opens the wallpaper picker', async ({ page }) => {
    await page.getByTestId('desktop-area').click({ position: { x: 400, y: 500 } });
    await expect(page.getByRole('dialog', { name: 'Wallpaper' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Wallpaper' })).toHaveCount(0);
  });
});

test.describe('adding', () => {
  test.beforeEach(async ({ page }) => openEditor(page));

  const add = async (page: Page, label: string) => {
    await toolbar(page).getByRole('button', { name: 'Add' }).click();
    await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: label }).click();
  };

  test('adds a project to the desktop, selected, and it persists', async ({ page }) => {
    await add(page, 'Project');
    await expect(desktopIcon(page, 'New Project')).toHaveAttribute('aria-pressed', 'true');
    await waitForSave(page);
    await page.reload();
    await expect(desktopIcon(page, 'New Project')).toBeVisible();
  });

  test('adds a sticky note as a desktop widget', async ({ page }) => {
    await add(page, 'Sticky note');
    await expect(page.getByTestId('sticky-note')).toHaveCount(2);
  });

  test('adds a dock link', async ({ page }) => {
    await add(page, 'Dock link');
    await expect(page.getByRole('navigation', { name: 'Dock' }).getByRole('link', { name: 'New link' })).toBeVisible();
  });
});

test.describe('inspector', () => {
  test.beforeEach(async ({ page }) => openEditor(page));
  const inspector = (page: Page) => page.getByRole('complementary', { name: 'Inspector' });

  test('selecting an app opens it; renaming there updates the desktop, as one undo step', async ({ page }) => {
    await desktopIcon(page, 'Project One').click();
    const name = inspector(page).getByLabel('Name', { exact: true });
    await name.fill('Brand Refresh');
    await expect(desktopIcon(page, 'Brand Refresh')).toBeVisible();
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(desktopIcon(page, 'Project One')).toBeVisible();
  });

  test('the visible toggle hides and shows an app', async ({ page }) => {
    await desktopIcon(page, 'Project Two').click();
    await inspector(page).getByLabel('Visible').uncheck();
    await expect(desktopIcon(page, 'Project Two')).toHaveCount(0);
    await inspector(page).getByLabel('Visible').check();
    await expect(desktopIcon(page, 'Project Two')).toBeVisible();
  });

  test('site settings change the menu bar', async ({ page }) => {
    await toolbar(page).getByRole('button', { name: 'Site' }).click();
    await inspector(page).getByLabel('Your name').fill('Jordan Lee');
    await expect(page.getByRole('banner').getByRole('button', { name: 'Jordan Lee’s Portfolio' })).toBeVisible();
  });

  test('a hidden app can be found and shown again from site settings', async ({ page }) => {
    await desktopIcon(page, 'Project Two').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Hide' }).click();
    await toolbar(page).getByRole('button', { name: 'Site' }).click();
    await inspector(page).getByLabel('Project Two visible').check();
    await expect(desktopIcon(page, 'Project Two')).toBeVisible();
  });

  test('a dock link can be edited', async ({ page }) => {
    const dock = page.getByRole('navigation', { name: 'Dock' });
    await dock.getByRole('link', { name: 'LinkedIn' }).click();
    await inspector(page).getByLabel('Label').fill('My LinkedIn');
    await expect(dock.getByRole('link', { name: 'My LinkedIn' })).toBeVisible();
  });
});

test.describe('content forms', () => {
  test.beforeEach(async ({ page }) => openEditor(page));
  const inspector = (page: Page) => page.getByRole('complementary', { name: 'Inspector' });

  test('editing a project shows up in its window', async ({ page }) => {
    await desktopIcon(page, 'Project One').click();
    await inspector(page).getByLabel('Tag').fill('Brand identity');
    await inspector(page).getByLabel('Description').fill('First paragraph.\n\n## Results\n\nIt worked.');
    await desktopIcon(page, 'Project One').dblclick();
    const win = page.getByRole('dialog', { name: 'Project One' });
    await expect(win).toContainText('Brand identity');
    await expect(win.getByRole('heading', { name: 'Results' })).toBeVisible();
    await expect(win).toContainText('It worked.');
  });

  test('uploading a PDF to the résumé', async ({ page }) => {
    await desktopIcon(page, 'Resume.pdf').click();
    await inspector(page)
      .getByLabel('Upload PDF file')
      .setInputFiles({ name: 'cv-2026.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') });
    await expect(inspector(page)).toContainText('Uploaded: cv-2026.pdf');
  });

  test('about: turning the quote off removes it from the window', async ({ page }) => {
    await desktopIcon(page, 'About Me').click();
    await inspector(page).getByLabel('Show a quote').uncheck();
    await desktopIcon(page, 'About Me').dblclick();
    await expect(page.getByRole('dialog', { name: 'About Me' })).not.toContainText('Helen Keller');
  });

  test('list items can be added and removed', async ({ page }) => {
    await desktopIcon(page, 'My Path').click();
    const metrics = inspector(page).getByRole('group', { name: 'Metrics' });
    await metrics.getByRole('button', { name: '+ Add metric' }).click();
    await expect(metrics.getByLabel('Value')).toHaveCount(3);
    await metrics.getByRole('button', { name: 'Remove item 3' }).click();
    await expect(metrics.getByLabel('Value')).toHaveCount(2);
  });
});

test.describe('phone preview editing', () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page);
    await toolbar(page).getByRole('button', { name: 'Phone' }).click();
  });
  const phone = (page: Page) => page.getByTestId('phone-frame');
  const phoneDock = (page: Page) => phone(page).getByRole('navigation', { name: 'Dock' });
  const grid = (page: Page) => phone(page).getByRole('region', { name: 'Home screen' });

  test('tapping selects instead of opening', async ({ page }) => {
    await grid(page).getByRole('button', { name: 'Project One', exact: true }).click();
    await expect(grid(page).getByRole('button', { name: 'Project One', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('Move to New Page adds a page, and Reset phone layout undoes it', async ({ page }) => {
    await grid(page).getByRole('button', { name: 'Project One', exact: true }).click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Move to New Page' }).click();
    await expect(phone(page).getByTestId('page-dots')).toBeVisible();
    await toolbar(page).getByRole('button', { name: 'Reset phone layout' }).click();
    await expect(phone(page).getByTestId('page-dots')).toHaveCount(0);
  });

  test('dragging an app onto the dock puts it there', async ({ page }) => {
    const from = (await grid(page).getByRole('button', { name: 'Project Two', exact: true }).boundingBox())!;
    const dockBox = (await phoneDock(page).getByRole('button', { name: 'About Me' }).boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(dockBox.x + dockBox.width / 2, dockBox.y + dockBox.height / 2, { steps: 12 });
    await page.mouse.up();
    await expect(phoneDock(page).getByRole('button', { name: 'Project Two' })).toBeVisible();
    await expect(phoneDock(page).getByRole('button')).toHaveCount(4);
  });

  test('dragging within the grid reorders', async ({ page }) => {
    const names = () => grid(page).locator('[data-phone-slot]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    const before = await names();
    const slots = grid(page).locator('[data-phone-slot]');
    const a = (await slots.nth(2).boundingBox())!;
    const b = (await slots.nth(3).boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + 20);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2, b.y + 20, { steps: 12 });
    await page.mouse.up();
    await expect.poll(names).not.toEqual(before);
    expect((await names()).indexOf(before[2]!)).toBe(3);
  });
});

test.describe('publishing', () => {
  test.beforeEach(async ({ page }) => openEditor(page));

  test('publish saves first, then shows Published until the next edit', async ({ page }) => {
    await drag(page, 'Project Two', 150, 60);
    page.once('dialog', (d) => d.accept());
    await toolbar(page).getByRole('button', { name: 'Publish' }).click();
    await expect(toolbar(page).getByRole('button', { name: 'Published ✓' })).toBeDisabled();
    await expect(status(page)).toHaveText('Saved');
    const published = await page.evaluate(() => localStorage.getItem('portfolio:localPublished'));
    expect(published).toContain('"p2"');
    await drag(page, 'Project Two', 40, 0);
    await expect(toolbar(page).getByRole('button', { name: 'Publish' })).toBeEnabled();
  });

  test('version history restores an older publish into the draft', async ({ page }) => {
    const publish = async () => {
      page.once('dialog', (d) => d.accept());
      await toolbar(page).getByRole('button', { name: 'Publish' }).click();
      await expect(toolbar(page).getByRole('button', { name: 'Published ✓' })).toBeVisible();
    };
    await publish();
    await toolbar(page).getByRole('button', { name: 'Site' }).click();
    await page.getByRole('complementary', { name: 'Inspector' }).getByLabel('Your name').fill('Changed Name');
    await publish();
    await toolbar(page).getByRole('button', { name: 'More' }).click();
    await page.getByRole('menuitem', { name: 'Version history…' }).click();
    const history = page.getByRole('dialog', { name: 'Version history' });
    const rows = history.getByRole('list', { name: 'Versions' }).getByRole('listitem');
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText('Live now');
    await expect(rows.first()).toContainText('Changed Name');
    page.once('dialog', (d) => d.accept());
    await rows.nth(1).getByRole('button', { name: /^Restore/ }).click();
    await expect(history).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Menu bar' })).not.toContainText('Changed Name');
    await expect(toolbar(page).getByRole('button', { name: 'Publish' })).toBeEnabled();
  });

  test('discarding the draft goes back to the live site, and can be undone', async ({ page }) => {
    await desktopIcon(page, 'Project One').click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Rename' }).click();
    await page.getByRole('textbox', { name: 'New name' }).fill('Temporary');
    await page.keyboard.press('Enter');
    page.once('dialog', (d) => d.accept());
    await toolbar(page).getByRole('button', { name: 'More' }).click();
    await page.getByRole('menuitem', { name: 'Discard draft changes…' }).click();
    await expect(desktopIcon(page, 'Project One')).toBeVisible();
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(desktopIcon(page, 'Temporary')).toBeVisible();
  });
});

test.describe('widgets', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('https://api.open-meteo.com/**', (route) =>
      route.fulfill({ json: { current: { temperature_2m: 71.6, weather_code: 0, is_day: 1 } } }),
    );
    await page.route('https://geocoding-api.open-meteo.com/**', (route) =>
      route.fulfill({
        json: { results: [{ name: 'Boston', admin1: 'Massachusetts', country: 'United States', latitude: 42.36, longitude: -71.06, timezone: 'America/New_York' }] },
      }),
    );
    await openEditor(page);
  });
  const add = async (page: Page, label: string) => {
    await toolbar(page).getByRole('button', { name: 'Add' }).click();
    await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: label }).click();
  };
  const inspector = (page: Page) => page.getByRole('complementary', { name: 'Inspector' });

  test('a clock widget shows the time and weather, and the city can be changed', async ({ page }) => {
    await add(page, 'Clock & weather');
    const widget = page.getByTestId('desktop-widget');
    await expect(widget).toContainText('New York');
    await expect(widget).toContainText('72°F');
    await expect(widget).toContainText(/\d{1,2}:\d\d/);
    await inspector(page).getByLabel('Change city').fill('Bost');
    await inspector(page).getByRole('option', { name: /Boston/ }).click();
    await expect(widget).toContainText('Boston');
  });

  test('a status widget can use a preset and be edited', async ({ page }) => {
    await add(page, 'Status (e.g. Open to work)');
    const widget = page.getByTestId('desktop-widget');
    await expect(widget).toContainText('Open to work');
    await inspector(page).getByRole('button', { name: '🚀 Currently building' }).click();
    await expect(widget).toContainText('Currently building');
    await inspector(page).getByLabel('Detail').fill('A portfolio that looks like a Mac');
    await expect(widget).toContainText('A portfolio that looks like a Mac');
  });

  test('widgets can be dragged, and show as 2×2 widgets on the phone', async ({ page }) => {
    await add(page, 'Status (e.g. Open to work)');
    const widget = page.getByTestId('desktop-widget');
    const before = (await widget.boundingBox())!;
    await page.mouse.move(before.x + 60, before.y + 60);
    await page.mouse.down();
    await page.mouse.move(before.x + 260, before.y + 160, { steps: 10 });
    await page.mouse.up();
    const after = (await widget.boundingBox())!;
    expect(Math.abs(after.x - before.x - 200)).toBeLessThan(3);
    await toolbar(page).getByRole('button', { name: 'Phone' }).click();
    await expect(page.getByTestId('phone-frame').locator('.phone-widget', { hasText: 'Open to work' })).toBeVisible();
  });
});

test.describe('messages (ask me anything)', () => {
  test.beforeEach(async ({ page }) => openEditor(page));
  const add = async (page: Page) => {
    await toolbar(page).getByRole('button', { name: 'Add' }).click();
    await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: 'Messages (Ask me anything)' }).click();
  };

  test('a suggestion sends a message and the streamed reply appears', async ({ page }) => {
    let sent: unknown = null;
    await page.route('**/api/chat', async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/x-ndjson; charset=utf-8', body: `${JSON.stringify({ type: 'text', text: 'I design mobile apps and study part-time.' })}\n` });
    });
    await add(page);
    await desktopIcon(page, 'Messages').dblclick();
    const chat = page.getByRole('dialog', { name: 'Messages' });
    await expect(chat).toContainText('Ask me anything about my work');
    await chat.getByRole('button', { name: 'What do you do?' }).click();
    await expect(chat.locator('[data-role="user"]')).toHaveText('What do you do?');
    await expect(chat.locator('[data-role="assistant"]')).toHaveText('I design mobile apps and study part-time.');
    expect(sent).toMatchObject({ appId: 'messages-1', messages: [{ role: 'user', content: 'What do you do?' }] });
  });

  test('a rate-limit reply is shown as a friendly message', async ({ page }) => {
    await page.route('**/api/chat', (route) =>
      route.fulfill({ status: 429, json: { error: 'I’ve hit my chat limit for today. Email me at you@example.com!', code: 'rate_limited' } }),
    );
    await add(page);
    await desktopIcon(page, 'Messages').dblclick();
    const chat = page.getByRole('dialog', { name: 'Messages' });
    await chat.getByLabel('Message').fill('Hello?');
    await chat.getByRole('button', { name: 'Send' }).click();
    await expect(chat.locator('[data-role="assistant"]')).toContainText('chat limit for today');
  });
});

test('the chat API refuses politely when no API key is configured', async ({ request }) => {
  const res = await request.post('/api/chat', { data: { appId: 'x', messages: [{ role: 'user', content: 'hi' }] } });
  expect(res.status()).toBe(503);
  expect((await res.json()).code).toBe('unconfigured');
});

test.describe('widget sizes', () => {
  test.beforeEach(async ({ page }) => openEditor(page));

  test('phone preview uses the 4-column phone grid, and widgets can be made medium', async ({ page }) => {
    await toolbar(page).getByRole('button', { name: 'Phone' }).click();
    const frame = page.getByTestId('phone-frame');
    const notes = frame.locator('.phone-widget[aria-label="To do"]');
    const grid = (await frame.locator('.phone-grid').first().boundingBox())!;
    const small = (await notes.boundingBox())!;
    expect(small.width).toBeGreaterThan(grid.width * 0.4); // a 2×2 widget is half the grid, not a narrow strip
    await notes.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Medium Widget' }).click();
    const medium = (await notes.boundingBox())!;
    expect(medium.width).toBeGreaterThan(grid.width * 0.95);
  });

  test('a desktop widget can be made large from the inspector', async ({ page }) => {
    const note = page.getByTestId('sticky-note');
    const before = (await note.boundingBox())!;
    await note.click({ position: { x: 20, y: 10 } });
    await page.getByRole('complementary', { name: 'Inspector' }).getByLabel('Widget size on the desktop').selectOption('large');
    const after = (await note.boundingBox())!;
    expect(after.width).toBeGreaterThan(before.width + 40);
  });
});

test('the headline can be shown on the phone wallpaper', async ({ page }, testInfo) => {
  await openEditor(page);
  await toolbar(page).getByRole('button', { name: 'Phone' }).click();
  await expect(page.getByTestId('phone-headline')).toHaveCount(0);
  await toolbar(page).getByRole('button', { name: 'Site' }).click();
  await page.getByRole('complementary', { name: 'Inspector' }).getByLabel('Also show it on the phone wallpaper').check();
  await expect(page.getByTestId('phone-frame').getByTestId('phone-headline')).toContainText('portfolio.');
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await page.getByTestId('phone-frame').screenshot({ path: testInfo.outputPath('phone-headline.png') });
});

test('the Messages inspector explains where conversations are saved in local mode', async ({ page }) => {
  await openEditor(page);
  await toolbar(page).getByRole('button', { name: 'Add' }).click();
  await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: 'Messages (Ask me anything)' }).click();
  await expect(page.getByRole('complementary', { name: 'Inspector' })).toContainText('Conversations are saved on your live site');
});

test('a dock separator can be clicked and removed from the inspector', async ({ page }) => {
  await openEditor(page);
  const dock = page.getByRole('navigation', { name: 'Dock' });
  const separators = dock.getByRole('button', { name: 'Separator' });
  await expect(separators).toHaveCount(2);
  await separators.first().click();
  await page.getByRole('complementary', { name: 'Inspector' }).getByRole('button', { name: 'Remove separator' }).click();
  await expect(separators).toHaveCount(1);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(separators).toHaveCount(2);
});

test.describe('fun apps', () => {
  test.beforeEach(async ({ page }) => openEditor(page));
  const add = async (page: Page, label: string) => {
    await toolbar(page).getByRole('button', { name: 'Add' }).click();
    await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: label }).click();
  };

  test('guestbook: shows approved notes and sends a new one', async ({ page }) => {
    let posted: Record<string, unknown> | null = null;
    await page.route('**/api/guestbook**', async (route) => {
      if (route.request().method() === 'POST') {
        posted = route.request().postDataJSON();
        await route.fulfill({ status: 201, json: { id: 'n2', status: 'pending' } });
      } else {
        await route.fulfill({ json: { notes: [{ id: 'n1', name: 'Sam', message: 'Love the Mac vibes!', color: 'pink', createdAt: '2026-09-29T10:00:00.000Z' }] } });
      }
    });
    await add(page, 'Stickies guestbook');
    await desktopIcon(page, 'Guestbook').dblclick();
    const win = page.getByRole('dialog', { name: 'Guestbook' });
    await expect(win.getByTestId('guestbook-wall')).toContainText('Love the Mac vibes!');
    await win.getByLabel('Your note').fill('Hello from a test');
    await win.getByLabel('Your name').fill('Tess');
    await win.getByRole('radio', { name: 'green' }).click();
    await win.getByRole('button', { name: 'Stick it' }).click();
    await expect(win.getByRole('status')).toContainText('once it’s been read');
    expect(posted).toMatchObject({ appId: 'guestbook-1', name: 'Tess', message: 'Hello from a test', color: 'green' });
  });

  test('freeform: draw, undo, and send a drawing', async ({ page }) => {
    let posted: Record<string, unknown> | null = null;
    await page.route('**/api/guestbook', async (route) => {
      posted = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: { id: 'n3', status: 'pending' } });
    });
    await add(page, 'Freeform (drawing)');
    await desktopIcon(page, 'Freeform').dblclick();
    const win = page.getByRole('dialog', { name: 'Freeform' });
    const canvas = win.getByRole('img', { name: /Drawing canvas/ });
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + 50, box.y + 50);
    await page.mouse.down();
    await page.mouse.move(box.x + 250, box.y + 150, { steps: 10 });
    await page.mouse.up();
    await expect(win.getByRole('button', { name: 'Undo' })).toBeEnabled();
    await win.getByRole('button', { name: 'Send' }).click();
    await win.getByLabel('Your name').fill('Artist');
    await win.getByRole('button', { name: 'Send drawing' }).click();
    await expect(win.getByRole('status')).toContainText('Sent!');
    expect(String((posted as { doodle?: string } | null)?.doodle)).toMatch(/^data:image\/jpeg;base64,/);
  });

  test('terminal: ls lists apps and open launches one', async ({ page }) => {
    await add(page, 'Terminal');
    await desktopIcon(page, 'Terminal').dblclick();
    const win = page.getByRole('dialog', { name: 'Terminal' });
    const cmd = win.getByLabel('Command');
    await cmd.fill('ls');
    await cmd.press('Enter');
    await expect(win.getByRole('log', { name: 'Terminal output' })).toContainText('Project One/');
    await cmd.fill('open resume');
    await cmd.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Resume.pdf' })).toBeVisible();
  });
});

test.describe('more mac apps', () => {
  test.beforeEach(async ({ page }) => openEditor(page));
  const add = async (page: Page, label: string) => {
    await toolbar(page).getByRole('button', { name: 'Add' }).click();
    await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: label }).click();
  };
  const inspector = (page: Page) => page.getByRole('complementary', { name: 'Inspector' });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

  test('photos: upload a photo, open the lightbox, and play Memories', async ({ page }) => {
    await add(page, 'Photos');
    const photos = inspector(page).getByRole('group', { name: 'Photos' });
    for (const caption of ['Sunrise', 'Sunset']) {
      await photos.getByRole('button', { name: '+ Add photo' }).click();
      const n = await photos.getByLabel('Upload Photo').count();
      await photos.getByLabel('Upload Photo').nth(n - 1).setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: png });
      await photos.getByLabel('Caption').nth(n - 1).fill(caption);
    }
    await desktopIcon(page, 'Photos').dblclick();
    const win = page.getByRole('dialog', { name: 'Photos' });
    await win.getByRole('button', { name: 'Sunset' }).click();
    await expect(win.getByRole('dialog', { name: 'Sunset' })).toBeVisible();
    await win.getByRole('button', { name: 'Close photo' }).click();
    await win.getByRole('button', { name: 'Memories' }).click();
    await expect(win).toContainText('· Memories');
  });

  const colors = [
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNg+M8AAAICAQB7CYF4AAAAAElFTkSuQmCC',
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgYPgPAAEDAQAIicLsAAAAAElFTkSuQmCC',
  ];
  const pngFiles = colors.map((c, i) => ({ name: `p${i + 1}.png`, mimeType: 'image/png', buffer: Buffer.from(c, 'base64') }));
  const thumbSrcs = (win: ReturnType<Page['getByRole']>) => win.locator('ul img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src));

  test('photos: "Add photos…" uploads several at once, in order, as one undo step', async ({ page }) => {
    await add(page, 'Photos');
    const albums = inspector(page).getByRole('group', { name: 'Albums' });
    await albums.getByLabel('Add photos…').setInputFiles(pngFiles);
    await expect(albums.getByRole('group', { name: 'Photos' }).getByLabel('Upload Photo')).toHaveCount(3);
    await desktopIcon(page, 'Photos').dblclick();
    const win = page.getByRole('dialog', { name: 'Photos' });
    await expect.poll(() => thumbSrcs(win)).toEqual(colors.map((c) => `data:image/png;base64,${c}`));
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(albums.getByRole('group', { name: 'Photos' }).getByLabel('Upload Photo')).toHaveCount(0);
  });

  test('photos: albums reordered during an upload — the photos still land in the album that was chosen', async ({ page }) => {
    await add(page, 'Photos');
    const albums = inspector(page).getByRole('group', { name: 'Albums' });
    await albums.getByRole('button', { name: 'Add album' }).click(); // a new Photos app starts with one album
    await albums.getByLabel('Album name').nth(0).fill('First');
    await albums.getByLabel('Album name').nth(1).fill('Second');
    // Hold every file read (the local backend's "upload") until the test lets go, so the reorder happens mid-upload.
    await page.evaluate(() => {
      const w = window as unknown as { __release: () => void };
      const gate = new Promise<void>((resolve) => (w.__release = resolve));
      const read = FileReader.prototype.readAsDataURL;
      FileReader.prototype.readAsDataURL = function (this: FileReader, blob: Blob) {
        void gate.then(() => read.call(this, blob));
      };
    });
    await albums.getByLabel('Add photos…').nth(1).setInputFiles(pngFiles);
    await expect(albums.getByText(/Uploading \d of 3/)).toBeVisible();
    await albums.getByRole('button', { name: 'Move item 2 up' }).click();
    await expect(albums.locator('span.truncate').first()).toHaveText('Second (0)');
    await page.evaluate(() => (window as unknown as { __release: () => void }).__release());
    await expect(albums.getByText('Second (3)')).toBeVisible();
    await expect(albums.getByText('First (0)')).toBeVisible();
    await expect(albums.locator('span.truncate').first()).toHaveText('Second (3)');
  });

  // A big photo with an EXIF "rotate 90° clockwise" tag, made in the browser, must be turned upright and shrunk.
  // Big data: URLs don't fit the draft's localStorage quota, so read the stored photo from the open Photos window instead.
  const savedPhotoInfo = async (page: Page) => {
    await desktopIcon(page, 'Photos').dblclick();
    const img = page.getByRole('dialog', { name: 'Photos' }).locator('ul img').last();
    await expect(img).toHaveAttribute('src', /^data:/, { timeout: 30_000 });
    return img.evaluate(async (el) => {
      const url = (el as HTMLImageElement).src;
      const blob = await (await fetch(url)).blob();
      const probe = new Image();
      probe.src = url;
      await probe.decode();
      return { type: blob.type, size: blob.size, width: probe.naturalWidth, height: probe.naturalHeight };
    });
  };
  const bigImage = (page: Page, kind: 'jpeg-exif' | 'png-alpha') =>
    page.evaluate(async (k) => {
      const [w, h] = k === 'jpeg-exif' ? [4000, 3000] : [2600, 1800];
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      const img = ctx.createImageData(w, h);
      for (let o = 0; o < img.data.length; o += 65536) crypto.getRandomValues(img.data.subarray(o, Math.min(o + 65536, img.data.length)));
      if (k === 'jpeg-exif') for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;
      ctx.putImageData(img, 0, 0);
      const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), k === 'jpeg-exif' ? 'image/jpeg' : 'image/png', 0.92));
      let bytes = new Uint8Array(await blob.arrayBuffer());
      if (k === 'jpeg-exif') {
        // APP1: "Exif\0\0", TIFF header (little-endian, IFD0 at 8), one entry: Orientation (0x0112), SHORT, 1, value 6, no next IFD.
        const tiff = [0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0, 1, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0];
        const body = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
        const len = body.length + 2; // the length counts itself, big-endian
        const app1 = [0xff, 0xe1, len >> 8, len & 255, ...body];
        const out = new Uint8Array(bytes.length + app1.length);
        out.set(bytes.subarray(0, 2), 0); // SOI
        out.set(app1, 2);
        out.set(bytes.subarray(2), 2 + app1.length);
        bytes = out;
      }
      let bin = '';
      for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode(...bytes.subarray(i, i + 32768));
      return btoa(bin);
    }, kind);

  test('photos: a big sideways JPEG is turned upright and shrunk to 2400 px before it is stored', async ({ page }) => {
    test.setTimeout(120_000);
    await add(page, 'Photos');
    const albums = inspector(page).getByRole('group', { name: 'Albums' });
    const original = Buffer.from(await bigImage(page, 'jpeg-exif'), 'base64');
    expect(original.length).toBeGreaterThan(1_500_000);
    await albums.getByLabel('Add photos…').setInputFiles({ name: 'big.jpg', mimeType: 'image/jpeg', buffer: original });
    await expect(albums.getByRole('group', { name: 'Photos' }).getByLabel('Upload Photo')).toHaveCount(1, { timeout: 60_000 });
    const stored = await savedPhotoInfo(page);
    console.log(`resize e2e jpeg: original ${original.length} bytes 4000x3000 (EXIF 6) -> stored ${stored?.size} bytes ${stored?.width}x${stored?.height} ${stored?.type}`);
    expect(stored).toMatchObject({ type: 'image/jpeg', width: 1800, height: 2400 });
    expect(stored!.size).toBeLessThan(original.length);
  });

  test('photos: a big transparent PNG is shrunk and stays a PNG', async ({ page }) => {
    test.setTimeout(120_000);
    await add(page, 'Photos');
    const albums = inspector(page).getByRole('group', { name: 'Albums' });
    const original = Buffer.from(await bigImage(page, 'png-alpha'), 'base64');
    await albums.getByLabel('Add photos…').setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: original });
    await expect(albums.getByRole('group', { name: 'Photos' }).getByLabel('Upload Photo')).toHaveCount(1, { timeout: 60_000 });
    const stored = await savedPhotoInfo(page);
    console.log(`resize e2e png: original ${original.length} bytes 2600x1800 -> stored ${stored?.size} bytes ${stored?.width}x${stored?.height} ${stored?.type}`);
    expect(stored?.type).toBe('image/png');
    expect(Math.max(stored!.width, stored!.height)).toBeLessThanOrEqual(2400);
    expect(stored!.width).toBe(2400);
    expect(stored!.size).toBeLessThan(original.length);
  });

  test('photos: dropping images on the window in Edit mode adds them to the album shown', async ({ page }) => {
    await add(page, 'Photos');
    await page.getByRole('button', { name: 'Close inspector' }).click();
    await desktopIcon(page, 'Photos').dblclick();
    const win = page.getByRole('dialog', { name: 'Photos' });
    await expect(win).toContainText('No photos yet');
    const dt = await page.evaluateHandle((files) => {
      const d = new DataTransfer();
      for (const f of files) d.items.add(new File([Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0))], f.name, { type: 'image/png' }));
      return d;
    }, pngFiles.map((f) => ({ name: f.name, b64: f.buffer.toString('base64') })));
    await win.getByText('No photos yet.').dispatchEvent('drop', { dataTransfer: dt });
    await expect.poll(() => thumbSrcs(win)).toHaveLength(3);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(win).toContainText('No photos yet');
  });

  test('photos: the viewer shows the whole photo and the window takes its shape', async ({ page }) => {
    await add(page, 'Photos');
    const photos = inspector(page).getByRole('group', { name: 'Photos' });
    await photos.getByRole('button', { name: '+ Add photo' }).click();
    const wide = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="600"><rect width="1600" height="600" fill="#2d6a3e"/></svg>');
    const n = await photos.getByLabel('Upload Photo').count();
    await photos.getByLabel('Upload Photo').nth(n - 1).setInputFiles({ name: 'wide.svg', mimeType: 'image/svg+xml', buffer: wide });
    await photos.getByLabel('Caption').nth(n - 1).fill('Wide');
    await page.getByRole('button', { name: 'Close inspector' }).click();
    await desktopIcon(page, 'Photos').dblclick();
    const win = page.getByRole('dialog', { name: 'Photos' });
    await win.getByRole('button', { name: 'Wide' }).click();
    const viewer = win.getByRole('dialog', { name: 'Wide' });
    await expect(viewer).toBeVisible();
    // The window turns wide and short, like the photo.
    await expect.poll(async () => {
      const b = (await win.boundingBox())!;
      return b.width / b.height;
    }).toBeGreaterThan(1.6);
    // The photo sits entirely inside the window.
    const w = (await win.boundingBox())!;
    const img = (await viewer.locator('img').boundingBox())!;
    expect(img.y + img.height).toBeLessThanOrEqual(w.y + w.height + 1);
    await viewer.getByRole('button', { name: 'Close photo' }).click();
    await expect.poll(async () => (await win.boundingBox())!.width).toBeLessThan(w.width);
  });

  test('maps: shows places and a map centred on the selected one', async ({ page }) => {
    await add(page, 'Maps (my journey)');
    await desktopIcon(page, 'Maps').dblclick();
    const win = page.getByRole('dialog', { name: 'Maps' });
    await expect(win.getByRole('button', { name: /New York/ })).toBeVisible();
    await expect(win.locator('iframe[title="Map of New York"]')).toHaveAttribute('src', /marker=40\.71%2C-74\.01/);
  });

  test('calendar: shows today and a booking button', async ({ page }) => {
    await add(page, 'Calendar (book a call)');
    await inspector(page).getByLabel('Show the booking page inside the window').uncheck();
    await desktopIcon(page, 'Calendar').dblclick();
    const win = page.getByRole('dialog', { name: 'Calendar' });
    await expect(win.getByRole('link', { name: 'Book a time ↗' })).toHaveAttribute('href', 'https://cal.com/');
    await expect(win).toContainText(String(new Date().getDate()));
  });

  test('voice memos: an uploaded memo shows with a play button', async ({ page }) => {
    await add(page, 'Voice Memos');
    const recordings = inspector(page).getByRole('group', { name: 'Recordings' });
    await recordings.getByRole('button', { name: '+ Add from a file' }).click();
    await recordings.getByLabel('Upload Audio').setInputFiles({ name: 'hi.webm', mimeType: 'audio/webm', buffer: Buffer.from('fake') });
    await recordings.getByLabel('Title').fill('Hello from me');
    await desktopIcon(page, 'Voice Memos').dblclick();
    await expect(page.getByRole('dialog', { name: 'Voice Memos' }).getByRole('button', { name: 'Play Hello from me' })).toBeVisible();
  });

  test('game center: opening apps unlocks achievements', async ({ page }) => {
    await add(page, 'Game Center (achievements)');
    await desktopIcon(page, 'Project One').dblclick();
    await desktopIcon(page, 'Game Center').dblclick();
    const win = page.getByRole('dialog', { name: 'Game Center' });
    await expect(win.locator('li[data-unlocked="true"]')).toContainText(['Hello there']);
    await expect(win).toContainText(/of \d+ unlocked/);
    // Achievements the site can't offer (no Terminal here) are left out.
    await expect(win).not.toContainText('sudo make me a sandwich');
  });

  test('game center: the secret Lost & found shows as ??? until found', async ({ page }) => {
    await add(page, 'Game Center (achievements)');
    await desktopIcon(page, 'Game Center').dblclick();
    const secret = page.getByRole('dialog', { name: 'Game Center' }).getByRole('region', { name: 'Secret achievements' });
    await expect(secret).toContainText('???');
    await page.evaluate(() => localStorage.setItem('portfolio:achievements', JSON.stringify({ opened: [], unlocked: ['lost'] })));
    await page.reload();
    await expect(toolbar(page)).toBeVisible();
    await desktopIcon(page, 'Game Center').dblclick();
    await expect(page.getByRole('dialog', { name: 'Game Center' }).getByRole('region', { name: 'Secret achievements' })).toContainText('Lost & found');
  });

  test('game center: Platinum visitors sign the Hall of Fame, and approved names show', async ({ page }) => {
    let signed: Record<string, unknown> | null = null;
    await page.route('**/api/hall-of-fame', async (route) => {
      if (route.request().method() === 'POST') {
        signed = route.request().postDataJSON();
        await route.fulfill({ status: 201, json: { id: 'h9', status: 'pending' } });
      } else {
        await route.fulfill({ json: { entries: [{ id: 'h1', name: 'Ada', note: 'So fun', finishedInMs: 252000, createdAt: '2026-09-30T10:00:00.000Z' }] } });
      }
    });
    const all = ['first-app', 'explorer', 'seen-it-all', 'caller', 'searcher', 'night-owl', 'early-bird', 'hacker', 'artist', 'chatty', 'signed'];
    await page.evaluate((ids) => localStorage.setItem('portfolio:achievements', JSON.stringify({ opened: [], unlocked: ids, startedAt: 1000, finishedAt: 253000 })), all);
    await page.reload(); // progress is read once per page load
    await expect(toolbar(page)).toBeVisible();
    await add(page, 'Game Center (achievements)');
    await desktopIcon(page, 'Game Center').dblclick();
    const win = page.getByRole('dialog', { name: 'Game Center' });
    await expect(win.getByRole('region', { name: 'Hall of Fame' })).toContainText('Ada');
    await expect(win.getByRole('region', { name: 'Hall of Fame' })).toContainText('in 4m 12s');
    const form = win.getByRole('form', { name: 'Sign the Hall of Fame' });
    await form.getByLabel('Your name').fill('Grace');
    await form.getByRole('button', { name: 'Sign' }).click();
    await expect(win).toContainText('You’re in!');
    expect(signed).toMatchObject({ name: 'Grace', finishedInMs: 252000 });
  });

  test('game center: the owner can switch achievements off', async ({ page }) => {
    await add(page, 'Game Center (achievements)');
    const inspector = page.getByRole('complementary', { name: 'Inspector' });
    const list = inspector.getByRole('list', { name: 'Achievements' });
    await expect(list.getByRole('checkbox', { name: 'sudo make me a sandwich' })).toBeDisabled();
    await expect(list).toContainText('Unavailable: needs a Terminal app');
    await list.getByRole('checkbox', { name: 'Seeker' }).uncheck();
    await desktopIcon(page, 'Game Center').dblclick();
    const win = page.getByRole('dialog', { name: 'Game Center' });
    await expect(win).toContainText('Hello there');
    await expect(win).not.toContainText('Seeker');
  });
});

test('guestbook stickers: pick from emoji and your own library, and they show on notes', async ({ page }, testInfo) => {
  await openEditor(page);
  let posted: Record<string, unknown> | null = null;
  await page.route('**/api/guestbook**', async (route) => {
    if (route.request().method() === 'POST') {
      posted = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: { id: 'n9', status: 'pending' } });
    } else {
      await route.fulfill({
        json: { notes: [{ id: 'n1', name: 'Sam', message: 'Stickers!', color: 'blue', stickers: ['emoji:🎉', 'emoji:🌈'], createdAt: '2026-09-29T10:00:00.000Z' }] },
      });
    }
  });
  await toolbar(page).getByRole('button', { name: 'Add' }).click();
  await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: 'Stickies guestbook' }).click();
  const library = page.getByRole('complementary', { name: 'Inspector' }).getByRole('group', { name: 'Your sticker library' });
  await library.getByRole('button', { name: '+ Add sticker' }).click();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await library.getByLabel('Upload Sticker image').setInputFiles({ name: 'cat.png', mimeType: 'image/png', buffer: png });
  await library.getByLabel('Name (for screen readers)').fill('Cat');

  await desktopIcon(page, 'Guestbook').dblclick();
  const win = page.getByRole('dialog', { name: 'Guestbook' });
  await expect(win.getByTestId('note-sticker')).toHaveCount(2);
  await win.getByRole('button', { name: 'Sticker ⭐' }).click();
  await win.getByRole('button', { name: 'Sticker Cat' }).click();
  await win.getByLabel('Your note').fill('Hi!');
  await win.getByLabel('Your name').fill('Tess');
  await win.getByRole('button', { name: 'Stick it' }).click();
  await expect(win.getByRole('status')).toBeVisible();
  const stickers = (posted as { stickers?: string[] } | null)?.stickers ?? [];
  expect(stickers[0]).toBe('emoji:⭐');
  expect(stickers[1]).toMatch(/^data:image\/png/);
  await win.getByTestId('guestbook-wall').screenshot({ path: testInfo.outputPath('stickers.png') });
});

test.describe('mail, facetime, and phone layouts', () => {
  test.beforeEach(async ({ page }) => openEditor(page));
  const add = async (page: Page, label: string) => {
    await toolbar(page).getByRole('button', { name: 'Add' }).click();
    await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: label }).click();
  };
  const inspector = (page: Page) => page.getByRole('complementary', { name: 'Inspector' });

  test('mail: sends to the owner’s inbox, with Gmail/Outlook fallbacks', async ({ page }) => {
    let posted: Record<string, unknown> | null = null;
    await page.route('**/api/contact', async (route) => {
      posted = route.request().postDataJSON();
      await route.fulfill({ status: 201, json: { id: 'm1' } });
    });
    await add(page, 'Mail (email me)');
    await desktopIcon(page, 'Mail').dblclick();
    const win = page.getByRole('dialog', { name: 'Mail' });
    await expect(win).toContainText('you@example.com');
    await expect(win.getByRole('link', { name: 'Gmail' })).toHaveAttribute('href', /mail\.google\.com.*to=you%40example\.com/);
    await win.getByLabel('Your name').fill('Ada Lovelace');
    await win.getByLabel('Your email').fill('ada@example.org');
    await win.getByLabel('Message').fill('Hi there');
    await win.getByRole('button', { name: 'Send' }).click();
    await expect(win.getByRole('status')).toHaveText('Message sent!');
    expect(posted).toMatchObject({ appId: 'mail-1', name: 'Ada Lovelace', email: 'ada@example.org', message: 'Hi there' });
  });

  test('facetime: with a video, the call button starts a FaceTime call', async ({ page }) => {
    await add(page, 'FaceTime (video hello)');
    await inspector(page).getByLabel('Upload Video').setInputFiles({ name: 'hi.webm', mimeType: 'video/webm', buffer: Buffer.from('fake') });
    await desktopIcon(page, 'FaceTime').dblclick();
    await page.getByRole('dialog', { name: 'FaceTime' }).getByRole('button', { name: 'FaceTime' }).click();
    const call = page.getByRole('dialog', { name: /^FaceTime with/ });
    await expect(call).toBeVisible();
    await call.getByRole('button', { name: 'End call' }).click();
    await expect(call).toHaveCount(0);
  });

  test('calendar: a Microsoft Bookings link gets a button, not a broken embed', async ({ page }) => {
    await add(page, 'Calendar (book a call)');
    await inspector(page).getByLabel('Booking link').fill('https://outlook.office.com/bookwithme/user/abc');
    await expect(inspector(page)).toContainText('can’t be shown inside other websites');
    await desktopIcon(page, 'Calendar').dblclick();
    const win = page.getByRole('dialog', { name: 'Calendar' });
    await expect(win.locator('iframe')).toHaveCount(0);
    await expect(win).toContainText('on Microsoft Bookings');
  });

});

test('Clean Up By Name lines the desktop icons up alphabetically', async ({ page }) => {
  await openEditor(page);
  await page.getByTestId('desktop-area').click({ button: 'right', position: { x: 600, y: 560 } });
  await page.getByRole('menuitem', { name: 'Clean Up By Name' }).click();
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
  await waitForSave(page);
});

test.describe('wallet, social, phone, photo links, headline style', () => {
  test.beforeEach(async ({ page }) => openEditor(page));
  const add = async (page: Page, label: string) => {
    await toolbar(page).getByRole('button', { name: 'Add' }).click();
    await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: label }).click();
  };
  const inspector = (page: Page) => page.getByRole('complementary', { name: 'Inspector' });

  test('wallet support cards link to payment pages and are recognised by URL', async ({ page }) => {
    await add(page, 'Wallet (badges & microcredentials)');
    const cards = inspector(page).getByRole('group', { name: 'Cards' });
    await cards.getByRole('button', { name: '+ Add card' }).click();
    await cards.getByLabel('Payment link').fill('https://venmo.com/u/jordan');
    await desktopIcon(page, 'Badges').dblclick();
    const win = page.getByRole('dialog', { name: 'Badges' });
    await expect(win.getByRole('region', { name: 'Support my work' }).getByRole('link', { name: /Venmo/ })).toHaveAttribute('href', 'https://venmo.com/u/jordan');
  });

  test('badges: a pass flips to its details, and the shelf and filters organise them', async ({ page }) => {
    await add(page, 'Wallet (badges & microcredentials)');
    const list = inspector(page).getByRole('group', { name: 'Badges' });
    await list.getByLabel('Title').first().fill('Google Certified Educator');
    await list.getByLabel('Issued by').first().fill('Google for Education');
    await list.getByLabel('Verify link (optional)').first().fill('https://www.credly.com/badges/abc');
    await list.getByRole('button', { name: '+ Add a badge' }).click();
    await list.getByLabel('Title').nth(1).fill('Apple Learning Coach');
    await list.getByLabel('Issued by').nth(1).fill('Apple');
    await desktopIcon(page, 'Badges').dblclick();
    const win = page.getByRole('dialog', { name: 'Badges' });
    await expect(win).toContainText('2 badges · 2 issuers');
    // Flip the front pass to see the verify link (in Edit mode the card itself is editable, so it has a flip button).
    await win.getByRole('button', { name: 'Flip pass' }).click();
    await expect(win.getByRole('link', { name: 'Verify ↗' })).toBeVisible();
    // Filter to one issuer, then show the shelf.
    await win.getByRole('radiogroup', { name: 'Filter' }).getByRole('radio', { name: /Apple/ }).click();
    await win.getByRole('radio', { name: 'Shelf' }).click();
    const shelf = win.getByRole('list', { name: 'Badge shelf' });
    await expect(shelf.getByRole('listitem')).toHaveCount(1);
    await shelf.getByRole('button', { name: /Apple Learning Coach/ }).click();
    const opened = page.getByRole('dialog', { name: 'Apple Learning Coach' });
    await expect(opened).toBeVisible();
    // While a credential is open, the window behind it doesn't scroll.
    const overflow = () => win.locator('.app-content').evaluate((el) => getComputedStyle(el).overflowY);
    expect(await overflow()).toBe('hidden');
    // ...and the opened credential covers the whole window below the title bar, down to its bottom edge.
    const [w, o, content] = await Promise.all([win.boundingBox(), opened.boundingBox(), win.locator('.app-content').boundingBox()]);
    expect(o!.y).toBeCloseTo(content!.y, 0);
    expect(o!.y + o!.height).toBeCloseTo(w!.y + w!.height, 0);
    expect(o!.width).toBeCloseTo(w!.width, 0);
    await opened.getByRole('button', { name: 'Done' }).click();
    await expect(opened).toHaveCount(0);
    expect(await overflow()).toBe('auto');
  });

  test('badges: import from a Credly profile, skipping ones already there', async ({ page }) => {
    await page.route('**/api/credly?**', (route) =>
      route.fulfill({
        json: {
          passes: [
            { id: 'credly-1', title: 'Creative Educator Level 1', issuer: 'Adobe Education', verifyUrl: 'https://www.credly.com/badges/1', earned: '2026-08-01', source: 'credly' },
            { id: 'credly-2', title: 'Creative Educator Leader', issuer: 'Adobe Education', verifyUrl: 'https://www.credly.com/badges/2', earned: '2026-08-01', source: 'credly' },
          ],
        },
      }),
    );
    await add(page, 'Wallet (badges & microcredentials)');
    const credly = inspector(page).getByLabel('Badge or certificate link');
    await credly.fill('https://www.credly.com/users/sam-lee/badges');
    await inspector(page).getByRole('button', { name: 'Import badges' }).click();
    await expect(inspector(page)).toContainText('Added 2 badges from Credly.');
    await inspector(page).getByRole('button', { name: 'Import badges' }).click();
    await expect(inspector(page)).toContainText('You already have all of these badges.');
    await desktopIcon(page, 'Badges').dblclick();
    await expect(page.getByRole('dialog', { name: 'Badges' })).toContainText('3 badges');
  });

  test('badges: add a Google for Education (Accredible) credential from its link', async ({ page }) => {
    let asked = '';
    await page.route('**/api/badge-link?**', (route) => {
      asked = new URL(route.request().url()).searchParams.get('url') ?? '';
      return route.fulfill({
        json: { passes: [{ id: 'accredible-1', title: 'Introduction to Gemini for Education', issuer: 'Google for Education', verifyUrl: 'https://edu.google.accredible.com/1', earned: '2026-05-13' }] },
      });
    });
    await add(page, 'Wallet (badges & microcredentials)');
    const link = 'https://edu.google.accredible.com/00000000-0000-4000-8000-000000000000#acc.AbCdEfGh';
    await inspector(page).getByLabel('Badge or certificate link').fill(link);
    await inspector(page).getByRole('button', { name: 'Import badges' }).click();
    await expect(inspector(page)).toContainText('Added 1 badge from Accredible.');
    expect(asked).toBe(link);
    await desktopIcon(page, 'Badges').dblclick();
    await expect(page.getByRole('dialog', { name: 'Badges' })).toContainText('Introduction to Gemini for Education');
  });

  test('social tiles recognise networks and show handles', async ({ page }) => {
    await add(page, 'Social (all my profiles)');
    const profiles = inspector(page).getByRole('group', { name: 'Profiles' });
    await profiles.getByRole('button', { name: '+ Add profile' }).click();
    await profiles.getByLabel('Profile link').nth(2).fill('https://bsky.app/profile/jordan.bsky.social');
    await desktopIcon(page, 'Social').dblclick();
    const win = page.getByRole('dialog', { name: 'Social' });
    await expect(win.getByRole('link', { name: /Bluesky/ })).toContainText('@jordan.bsky.social');
    await expect(win.getByRole('link', { name: /LinkedIn/ })).toBeVisible();
  });

  test('phone card has Call and Message links', async ({ page }) => {
    await add(page, 'Phone (call my office)');
    await desktopIcon(page, 'Phone').dblclick();
    const win = page.getByRole('dialog', { name: 'Phone' });
    await expect(win.getByRole('link', { name: 'Call' })).toHaveAttribute('href', 'tel:+15551234567');
    await expect(win.getByRole('link', { name: 'Message' })).toHaveAttribute('href', 'sms:+15551234567');
  });

  test('a photo with a link is clickable in the viewer', async ({ page }) => {
    await add(page, 'Photos');
    const photos = inspector(page).getByRole('group', { name: 'Photos' });
    await photos.getByRole('button', { name: '+ Add photo' }).click();
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    await photos.getByLabel('Upload Photo').setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: png });
    await photos.getByLabel('Caption').fill('Carle Place');
    await photos.getByLabel('Link (optional)').fill('https://www.carleplace.tech/');
    await desktopIcon(page, 'Photos').dblclick();
    const win = page.getByRole('dialog', { name: 'Photos' });
    await win.getByRole('button', { name: 'Carle Place' }).click();
    await expect(win.getByRole('link', { name: /Visit/ })).toHaveAttribute('href', 'https://www.carleplace.tech/');
    await expect(win.getByRole('link', { name: 'Open Carle Place' })).toHaveAttribute('href', 'https://www.carleplace.tech/');
  });

  test('headline style: font, size, and colour', async ({ page }) => {
    await toolbar(page).getByRole('button', { name: 'Site' }).click();
    await inspector(page).getByRole('radiogroup', { name: 'Headline font' }).getByRole('radio', { name: 'Geist Mono' }).click();
    await inspector(page).getByLabel('Size').fill('130');
    await inspector(page).getByLabel('Colour', { exact: true }).first().fill('#ff0000'); // the headline's is first; the Flurry screen saver has more
    const headline = page.getByTestId('headline');
    await expect(headline).toHaveCSS('color', 'rgb(255, 0, 0)');
    await expect(headline).toHaveCSS('font-family', /mono/i);
    await inspector(page).getByLabel('Show my name under it').uncheck();
    await expect(headline).not.toContainText('YOUR NAME', { ignoreCase: true });
  });
});

test('menu items point at an app from a dropdown, no typing', async ({ page }) => {
  await openEditor(page);
  await toolbar(page).getByRole('button', { name: 'Site' }).click();
  const items = page.getByRole('complementary', { name: 'Inspector' }).getByRole('group', { name: 'Menu items' });
  // The seed's "Resume" item already shows as the app it opens.
  await expect(items.getByLabel('Which app').first()).toHaveValue('resume');
  // Point "Contact" (an email link) at About Me instead.
  await items.getByLabel('When clicked').first().selectOption('app');
  await items.getByLabel('Which app').first().selectOption({ label: 'About Me' });
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await page.getByRole('banner').getByRole('button', { name: 'Contact' }).click();
  await expect(page.getByRole('dialog', { name: 'About Me', exact: true })).toBeVisible();
});

test('facetime detects a vertical video and uses a portrait window', async ({ page }) => {
  await openEditor(page);
  // Record a tiny 360×640 (portrait) WebM in the browser itself.
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 640;
    const ctx = canvas.getContext('2d')!;
    const rec = new MediaRecorder(canvas.captureStream(15), { mimeType: 'video/webm' });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    const done = new Promise((r) => (rec.onstop = r));
    rec.start();
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = i % 2 ? '#2e7d32' : '#1b5e20';
      ctx.fillRect(0, 0, 360, 640);
      await new Promise((r) => setTimeout(r, 60));
    }
    rec.stop();
    await done;
    const buf = new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer());
    let s = '';
    buf.forEach((b) => (s += String.fromCharCode(b)));
    return btoa(s);
  });
  await toolbar(page).getByRole('button', { name: 'Add' }).click();
  await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: 'FaceTime (video hello)' }).click();
  await page
    .getByRole('complementary', { name: 'Inspector' })
    .getByLabel('Upload Video')
    .setInputFiles({ name: 'portrait.webm', mimeType: 'video/webm', buffer: Buffer.from(base64, 'base64') });
  await desktopIcon(page, 'FaceTime').dblclick();
  await page.getByRole('dialog', { name: 'FaceTime' }).getByRole('button', { name: 'FaceTime' }).click();
  const call = page.getByRole('dialog', { name: /^FaceTime with/ });
  await expect(call).toHaveAttribute('data-orientation', 'portrait');
  // It covers the page rather than being squeezed (and cropped) inside the FaceTime app's window.
  await expect(page.getByRole('dialog', { name: 'FaceTime', exact: true }).getByRole('dialog', { name: /^FaceTime with/ })).toHaveCount(0);
  const box = (await call.boundingBox())!;
  expect(box.height).toBeGreaterThan(box.width);
});

test.describe('canva, slides, and wallpaper contrast', () => {
  test.beforeEach(async ({ page }) => openEditor(page));
  const inspector = (page: Page) => page.getByRole('complementary', { name: 'Inspector' });
  const add = async (page: Page, label: string) => {
    await toolbar(page).getByRole('button', { name: 'Add' }).click();
    await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: label }).click();
  };

  test('the Canva preset embeds a Smart embed link and warns about edit links', async ({ page }) => {
    await add(page, 'Canva design (embed)');
    await expect(inspector(page)).toContainText('Smart embed link');
    await inspector(page).getByLabel('URL').fill('https://www.canva.com/design/DAG123/edit');
    await expect(inspector(page)).toContainText('private editing link');
    await inspector(page).getByLabel('URL').fill('https://www.canva.com/design/DAG123/abcTOKEN/view?utm_content=x');
    await desktopIcon(page, 'Canva Design').dblclick();
    const win = page.getByRole('dialog', { name: 'Canva Design' });
    await expect(win.locator('iframe')).toHaveAttribute('src', 'https://www.canva.com/design/DAG123/abcTOKEN/view?embed');
    await expect(win.getByRole('link', { name: 'Open in Canva ↗' })).toBeVisible();
  });

  test('the Google Slides preset embeds a published presentation', async ({ page }) => {
    await add(page, 'Google Slides (embed)');
    await inspector(page).getByLabel('URL').fill('https://docs.google.com/presentation/d/e/2PACX-abc/pub?start=false');
    await desktopIcon(page, 'Presentation').dblclick();
    await expect(page.getByRole('dialog', { name: 'Presentation' }).locator('iframe')).toHaveAttribute(
      'src',
      'https://docs.google.com/presentation/d/e/2PACX-abc/embed?start=false&loop=false&delayms=3000',
    );
  });

  test('a dark photo wallpaper gets white, shadowed text on the phone', async ({ page }) => {
    const base64 = await page.evaluate(async () => {
      const c = document.createElement('canvas');
      c.width = 40;
      c.height = 40;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#1f3d2b';
      ctx.fillRect(0, 0, 40, 40);
      const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/png'));
      const buf = new Uint8Array(await blob.arrayBuffer());
      let s = '';
      buf.forEach((b) => (s += String.fromCharCode(b)));
      return btoa(s);
    });
    await toolbar(page).getByRole('button', { name: 'Wallpaper' }).click();
    await page.getByLabel('Upload wallpaper image').setInputFiles({ name: 'dark.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') });
    await toolbar(page).getByRole('button', { name: 'Phone' }).click();
    const status = page.getByTestId('phone-frame').getByTestId('status-bar');
    await expect(status).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(status).not.toHaveCSS('text-shadow', 'none');
  });
});

test.describe('the finale with motion allowed', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

test('the Game Center finale plays every act, from the editor preview', async ({ page }, testInfo) => {
  await openEditor(page);
  await toolbar(page).getByRole('button', { name: 'Add' }).click();
  await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: 'Game Center (achievements)' }).click();
  await page.getByRole('complementary', { name: 'Inspector' }).getByLabel('Reward message').fill('You rock! Here is a secret.');
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('portfolio:finale', { detail: 'full' })));

  const finale = page.getByTestId('finale');
  await expect(finale).toHaveAttribute('data-phase', 'glitch');
  await expect(finale).toHaveAttribute('data-phase', 'gravity', { timeout: 5000 });
  await expect(page.getByTestId('finale-breakout')).toBeVisible({ timeout: 8000 });
  const bricks = await page.getByTestId('finale-brick').count();
  expect(bricks).toBeGreaterThan(5); // every desktop + dock icon became a brick
  await page.screenshot({ path: testInfo.outputPath('finale-breakout.png') });

  await page.getByTestId('finale-breakout').getByRole('button', { name: 'Skip ›' }).click();
  await expect(page.getByRole('status', { name: 'Platinum trophy' })).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: testInfo.outputPath('finale-trophy.png') });
  await page.getByRole('button', { name: 'Continue ›' }).click();
  await expect(page.getByTestId('finale-credits')).toContainText('Special thanks');
  await page.getByTestId('finale-credits').getByRole('button', { name: 'Skip ›' }).click();

  const reward = page.getByRole('dialog', { name: 'Top Secret' });
  await expect(reward).toContainText('You rock! Here is a secret.');
  await expect(reward.getByRole('button', { name: 'Certificate' })).toBeVisible();
  await reward.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByTestId('finale')).toHaveCount(0);
  await expect(page.locator('[data-layout="desktop"]')).toHaveAttribute('data-golden', 'true');
});
});

test('with reduced motion, the finale skips straight to the trophy, credits, and reward', async ({ page }) => {
  await openEditor(page);
  await toolbar(page).getByRole('button', { name: 'Add' }).click();
  await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: 'Game Center (achievements)' }).click();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('portfolio:finale', { detail: 'full' })));
  await expect(page.getByTestId('finale-breakout')).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Top Secret' })).toBeVisible({ timeout: 10_000 });
});

test('freeform: the canvas fits the window and the Send form shows right under the toolbar', async ({ page }) => {
  await openEditor(page);
  await toolbar(page).getByRole('button', { name: 'Add' }).click();
  await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: /Freeform/ }).click();
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await desktopIcon(page, 'Freeform').dblclick();
  const win = page.getByRole('dialog', { name: 'Freeform' });
  await win.getByRole('button', { name: 'Fill screen' }).click();
  const canvas = win.getByRole('img', { name: /Drawing canvas/ });
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 100, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 160, { steps: 5 });
  await page.mouse.up();
  const w = (await win.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(w.y + w.height);
  await win.getByRole('button', { name: 'Send' }).click();
  await expect(win.getByLabel('Your name')).toBeInViewport();
  await expect(win.getByLabel('Your name')).toBeFocused();
});

test('a Spotify link offers the Spotify icon in one click', async ({ page }) => {
  await openEditor(page);
  await toolbar(page).getByRole('button', { name: 'Add' }).click();
  await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: 'Link or embed' }).click();
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await inspector.getByLabel('URL').fill('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
  await inspector.getByRole('button', { name: 'Use the Spotify icon' }).click();
  await expect(desktopIcon(page, 'New Link').locator('img')).toHaveAttribute('src', '/icons/catalog/spotify.webp');
  await expect(inspector.getByRole('button', { name: 'Use the Spotify icon' })).toHaveCount(0);
});

test.describe('finale song', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

  test('an uploaded song plays during the credits', async ({ page }) => {
    await openEditor(page);
    await toolbar(page).getByRole('button', { name: 'Add' }).click();
    await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: 'Game Center (achievements)' }).click();
    const inspector = page.getByRole('complementary', { name: 'Inspector' });
    await inspector.getByLabel('Upload Finale song (optional)').setInputFiles({ name: 'song.mp3', mimeType: 'audio/mpeg', buffer: Buffer.from('ID3fake') });
    await page.getByRole('button', { name: 'Close inspector' }).click();
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('portfolio:finale', { detail: 'full' })));
    await expect(page.getByTestId('finale-breakout')).toBeVisible({ timeout: 8000 });
    await page.getByTestId('finale-breakout').getByRole('button', { name: 'Skip ›' }).click();
    await page.getByRole('button', { name: 'Continue ›' }).click();
    await expect(page.getByTestId('finale-song')).toHaveAttribute('src', /^data:audio\/mpeg/);
  });

  test('music can be switched off', async ({ page }) => {
    await openEditor(page);
    await toolbar(page).getByRole('button', { name: 'Add' }).click();
    await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: 'Game Center (achievements)' }).click();
    await page.getByRole('complementary', { name: 'Inspector' }).getByLabel('Play music during the credits').uncheck();
    await page.getByRole('button', { name: 'Close inspector' }).click();
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('portfolio:finale', { detail: 'full' })));
    await page.getByTestId('finale-breakout').getByRole('button', { name: 'Skip ›' }).click({ timeout: 8000 });
    await page.getByRole('button', { name: 'Continue ›' }).click();
    await expect(page.getByTestId('finale-credits').getByRole('button', { name: 'Play music' })).toBeVisible();
  });
});

test('the menu bar: click it in Edit mode to open its settings, and switch its pieces off', async ({ page }) => {
  await openEditor(page);
  const bar = page.locator('header').filter({ has: page.getByRole('navigation', { name: 'Menu bar' }) });
  // Click the empty middle of the bar.
  const box = (await bar.boundingBox())!;
  await bar.click({ position: { x: box.width / 2, y: box.height / 2 } });
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await expect(inspector.getByText('Show in the menu bar')).toBeVisible();
  await inspector.getByLabel('Spotlight search').uncheck();
  await inspector.getByLabel('Time', { exact: true }).uncheck();
  await expect(bar.getByRole('button', { name: 'Spotlight Search' })).toHaveCount(0);
  await expect(bar.getByRole('button', { name: 'Control Center' })).toBeVisible();
  await inspector.getByLabel('Spotlight search').check();
  await expect(bar.getByRole('button', { name: 'Spotlight Search' })).toBeVisible();
});

test('the dot left of your name can become an icon, or go away', async ({ page }) => {
  await openEditor(page);
  await toolbar(page).getByRole('button', { name: 'Site' }).click();
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  const nav = page.getByRole('navigation', { name: 'Menu bar' });
  await inspector.getByLabel('Menu bar logo').selectOption('icon');
  const picker = page.getByRole('dialog', { name: /icon/i });
  await picker.getByRole('button').filter({ has: page.locator('img') }).first().click();
  await expect(nav.locator('img')).toHaveCount(1);
  await expect(inspector.getByRole('button', { name: 'Change icon…' })).toBeVisible();
  await inspector.getByLabel('Menu bar logo').selectOption('none');
  await expect(nav.locator('img')).toHaveCount(0);
  await expect(nav.locator('span.rounded-full')).toHaveCount(0);
});

test('media library: uploads are listed, marked in use, and can be reused in another field', async ({ page }) => {
  await openEditor(page);
  await toolbar(page).getByRole('button', { name: 'Site' }).click();
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await inspector.getByLabel('Upload Share image').setInputFiles({ name: 'share.png', mimeType: 'image/png', buffer: png });
  // Reuse it for the site icon.
  const iconField = inspector.getByText('Site icon (favicon)', { exact: true }).locator('..');
  await iconField.getByRole('button', { name: 'Choose from library…' }).click();
  const library = page.getByRole('dialog', { name: 'Choose from your library' });
  await expect(library.getByRole('list', { name: 'Files' })).toContainText('share.png');
  await expect(library).toContainText('In use');
  await library.getByRole('button', { name: 'Use this' }).click();
  await expect(library).toHaveCount(0);
  await expect(iconField.locator('img')).toHaveAttribute('src', /^data:image\/png/);
  // Browse from the ⋯ menu.
  await toolbar(page).getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: 'Media library…' }).click();
  const browse = page.getByRole('dialog', { name: 'Media library' });
  await expect(browse.getByRole('tab', { name: 'Images' })).toHaveAttribute('aria-selected', 'true');
  page.once('dialog', (d) => d.accept());
  await browse.getByRole('button', { name: 'Delete share.png' }).click();
  await expect(browse).toContainText('Nothing here yet');
});

test('media library: "Upload…" adds several files at once', async ({ page }) => {
  await openEditor(page);
  await toolbar(page).getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: 'Media library…' }).click();
  const browse = page.getByRole('dialog', { name: 'Media library' });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await browse.getByLabel('Upload…').setInputFiles([
    { name: 'one.png', mimeType: 'image/png', buffer: png },
    { name: 'two.png', mimeType: 'image/png', buffer: png },
  ]);
  const files = browse.getByRole('list', { name: 'Files' });
  await expect(files).toContainText('one.png');
  await expect(files).toContainText('two.png');
});

test('a Netflix link offers the Netflix icon, and it is in the icon library', async ({ page }) => {
  await openEditor(page);
  await toolbar(page).getByRole('button', { name: 'Add' }).click();
  await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: 'Link or embed' }).click();
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await inspector.getByLabel('URL').fill('https://www.netflix.com/title/80057281');
  await inspector.getByRole('button', { name: 'Use the Netflix icon' }).click();
  await expect(desktopIcon(page, 'New Link').locator('img')).toHaveAttribute('src', '/icons/catalog/netflix.webp');
  await inspector.getByRole('button', { name: 'Change icon…' }).click();
  await page.getByRole('dialog', { name: /icon/i }).getByRole('searchbox').fill('netflix');
  await expect(page.getByRole('dialog', { name: /icon/i }).getByRole('button', { name: 'Netflix' })).toBeVisible();
});

test('a Spotify playlist grows to fill a tall window', async ({ page }) => {
  await openEditor(page);
  await toolbar(page).getByRole('button', { name: 'Add' }).click();
  await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: 'Link or embed' }).click();
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await inspector.getByLabel('URL').fill('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
  await inspector.getByLabel('When opened').selectOption('embed');
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await desktopIcon(page, 'New Link').dblclick();
  const win = page.getByRole('dialog', { name: 'New Link' });
  await win.getByRole('button', { name: 'Fill screen' }).click();
  await expect.poll(async () => (await win.locator('iframe').boundingBox())!.height).toBeGreaterThan(450);
});

test('Control Center tiles can be switched off from Edit mode', async ({ page }) => {
  await openEditor(page);
  const bar = page.getByRole('navigation', { name: 'Menu bar' }).locator('..');
  await bar.getByRole('button', { name: 'Control Center' }).click();
  const cc = page.getByRole('dialog', { name: 'Control Center' });
  await cc.getByRole('button', { name: 'Customize Control Center…' }).click();
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await inspector.getByLabel('AirDrop (share my site)').uncheck();
  await inspector.getByLabel('Night Shift').uncheck();
  await bar.getByRole('button', { name: 'Control Center' }).click();
  await expect(cc.getByRole('switch', { name: /Dark Mode/ })).toBeVisible();
  await expect(cc.getByRole('button', { name: 'AirDrop' })).toHaveCount(0);
  await expect(cc.getByRole('switch', { name: 'Night Shift' })).toHaveCount(0);
  await expect(cc.getByRole('switch', { name: 'Focus' })).toBeVisible();
});

test('notification badges: a number or a dot on an app icon, switched on and off', async ({ page }) => {
  await openEditor(page);
  await desktopIcon(page, 'Project One').click();
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await inspector.getByLabel('Notification badge').selectOption('number');
  await inspector.getByLabel('Number on the badge').fill('3');
  const bubble = desktopIcon(page, 'Project One').getByTestId('notification-bubble');
  await expect(bubble).toHaveText('3');
  await inspector.getByLabel('Notification badge').selectOption('dot');
  await expect(bubble).toHaveAttribute('aria-label', 'New');
  await inspector.getByLabel('Notification badge').selectOption('off');
  await expect(bubble).toHaveCount(0);
});

test('badges: drop an image to make a pass, name it on the card, see the timeline and the widget', async ({ page }) => {
  await openEditor(page);
  await toolbar(page).getByRole('button', { name: 'Add' }).click();
  await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: 'Wallet (badges & microcredentials)' }).click();
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await inspector.getByLabel('Show as a widget (your newest badges)').check();
  await expect(page.getByTestId('desktop-area').getByText(/^Newest: Example Microcredential$/)).toBeVisible();
  await inspector.getByLabel('Show as a widget (your newest badges)').uncheck();
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await desktopIcon(page, 'Badges').dblclick();
  const win = page.getByRole('dialog', { name: 'Badges' });
  // Drop a (red, 1×1) badge image onto the window.
  const dataTransfer = await page.evaluateHandle(() => {
    const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], 'google-certified-educator.png', { type: 'image/png' }));
    return dt;
  });
  await win.locator('.app-content > div').dispatchEvent('drop', { dataTransfer });
  const title = win.getByLabel('Badge title');
  await expect(title).toHaveValue('Google Certified Educator');
  await win.getByLabel('Issued by').fill('Google for Education');
  await title.fill('Google Certified Educator L1');
  await expect(win).toContainText('2 badges');
  await win.getByRole('radio', { name: 'Timeline' }).click();
  const timeline = win.getByRole('list', { name: 'Badge timeline' });
  await expect(timeline).toContainText('Google Certified Educator L1');
  await expect(timeline).toContainText('2026');
});

test('badges: a flipped pass grows to show a long description and every skill — nothing scrolls', async ({ page }) => {
  await openEditor(page);
  await toolbar(page).getByRole('button', { name: 'Add' }).click();
  await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: 'Wallet (badges & microcredentials)' }).click();
  const list = page.getByRole('complementary', { name: 'Inspector' }).getByRole('group', { name: 'Badges' });
  await list.getByLabel('Description').first().fill('The earner of this badge has demonstrated innovation in education. '.repeat(8));
  await list.getByLabel('Skills (comma-separated)').first().fill('Communications, Creative Communication, Critical Thinking, Digital Literacy, Digital Media Training, Leadership, Leadership Development, Teaching, Coaching, Design');
  await list.getByLabel('Verify link (optional)').first().fill('https://www.credly.com/badges/abc');
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await desktopIcon(page, 'Badges').dblclick();
  const win = page.getByRole('dialog', { name: 'Badges' });
  await win.getByRole('button', { name: 'Flip pass' }).click();
  const details = win.getByTestId('pass-details');
  // Nothing inside the pass scrolls: it's all shown, and the card grew taller than its usual 250px.
  const { overflow, fits } = await details.evaluate((el) => ({ overflow: getComputedStyle(el).overflowY, fits: el.scrollHeight <= el.clientHeight + 1 }));
  expect(overflow).toBe('visible');
  expect(fits).toBe(true);
  await expect.poll(async () => (await win.getByTestId('pass').first().boundingBox())!.height).toBeGreaterThan(260);
  await expect(details.getByRole('listitem')).toHaveCount(10);
  await expect(win.getByRole('link', { name: 'Verify ↗' })).toBeVisible();
  // Flipped back, it's a normal-size pass again.
  await win.getByRole('button', { name: 'Flip back' }).click();
  await expect.poll(async () => (await win.getByTestId('pass').first().boundingBox())!.height).toBeLessThan(260);
});

test('badges: a certificate whose image link expires gets a saved copy of the image', async ({ page }) => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');
  await page.route('**/api/badge-link?**', (route) =>
    route.fulfill({
      json: {
        copyImage: true,
        passes: [{ id: 'skilljar-abc', title: 'MagicSchool Intermediate AI (Level 2)', issuer: 'The MagicSchool Team', imageUrl: 'https://cc.sj-cdn.net/c.jpg?Expires=1', verifyUrl: 'https://verify.skilljar.com/c/abc', earned: '2025-11-02' }],
      },
    }),
  );
  await page.route('**/api/badge-link/image?**', (route) => route.fulfill({ body: png, contentType: 'image/png' }));
  await openEditor(page);
  await toolbar(page).getByRole('button', { name: 'Add' }).click();
  await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: 'Wallet (badges & microcredentials)' }).click();
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  await inspector.getByLabel('Badge or certificate link').fill('https://verify.skilljar.com/c/abc');
  await inspector.getByRole('button', { name: 'Import badges' }).click();
  await expect(inspector).toContainText('Added 1 badge from Skilljar.');
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await desktopIcon(page, 'Badges').dblclick();
  const win = page.getByRole('dialog', { name: 'Badges' });
  await win.getByRole('radio', { name: 'Shelf' }).click();
  const shelfBadge = win.getByRole('list', { name: 'Badge shelf' }).getByRole('button', { name: /MagicSchool Intermediate AI/ });
  await expect(shelfBadge.locator('img')).toHaveAttribute('src', /^data:image\/png/);
});

test('badges: an image that stops loading shows a badge icon instead of a broken picture', async ({ page }) => {
  await page.route('**/broken-badge.png', (route) => route.fulfill({ status: 403, body: '{"error":"forbidden"}', contentType: 'application/json' }));
  await openEditor(page);
  await toolbar(page).getByRole('button', { name: 'Add' }).click();
  await page.getByRole('menu', { name: 'Add' }).getByRole('menuitem', { name: 'Wallet (badges & microcredentials)' }).click();
  const list = page.getByRole('complementary', { name: 'Inspector' }).getByRole('group', { name: 'Badges' });
  await list.getByLabel('Badge image URL').first().fill('https://example.com/broken-badge.png');
  await page.getByRole('button', { name: 'Close inspector' }).click();
  await desktopIcon(page, 'Badges').dblclick();
  const win = page.getByRole('dialog', { name: 'Badges' });
  await win.getByRole('radio', { name: 'Shelf' }).click();
  await expect(win.getByRole('list', { name: 'Badge shelf' }).getByTestId('badge-art-fallback')).toBeVisible();
});

test('Style: headline and body fonts apply live and are published', async ({ page }) => {
  await openEditor(page);
  await toolbar(page).getByRole('button', { name: 'Site' }).click();
  const inspector = page.getByRole('complementary', { name: 'Inspector' });
  const headingFonts = inspector.getByRole('radiogroup', { name: 'Headline font' });
  const bodyFonts = inspector.getByRole('radiogroup', { name: 'Body font' });
  await expect(headingFonts.getByRole('radio', { name: 'Instrument Serif' })).toHaveAttribute('aria-checked', 'true');
  await expect(bodyFonts.getByRole('radio', { name: 'Geist', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(headingFonts.getByRole('radio', { name: 'Pacifico' })).toHaveCSS('font-family', /Pacifico/);

  await headingFonts.getByRole('radio', { name: 'Playfair Display' }).click();
  await bodyFonts.getByRole('radio', { name: 'Nunito' }).click();
  await expect(headingFonts.getByRole('radio', { name: 'Playfair Display' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('headline')).toHaveCSS('font-family', /Playfair Display/);
  await expect(page.locator('[data-layout="desktop"]')).toHaveCSS('font-family', /Nunito/);
  await expect(page.locator('head link[rel="stylesheet"][href*="family=Playfair+Display:"][href*="family=Nunito:"]')).toHaveCount(1);

  page.once('dialog', (d) => d.accept());
  await toolbar(page).getByRole('button', { name: 'Publish' }).click();
  await expect(toolbar(page).getByRole('button', { name: 'Published ✓' })).toBeVisible();
  const published = await page.evaluate(() => localStorage.getItem('portfolio:localPublished'));
  expect(published).toContain('"headingFont":"playfair-display"');
  expect(published).toContain('"bodyFont":"nunito"');
});
