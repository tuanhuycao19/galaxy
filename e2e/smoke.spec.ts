import { expect, test, type Page } from '@playwright/test';

/** Loads the app, waits for the loading screen to finish and dismisses the first-visit help. */
async function open(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true', { timeout: 40_000 });
  await page.locator('.help__start').click();
  // Leave focus on the page so global keyboard shortcuts apply.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  return errors;
}

test('loads, renders the scene and removes the loading screen', async ({ page }) => {
  const errors = await open(page);
  await expect(page.locator('#loading')).toHaveCount(0);
  const canvas = page.locator('#app canvas');
  await expect(canvas).toBeVisible();
  // A black (failed) canvas compresses to a tiny PNG; stars, orbits and planets don't.
  const shot = await canvas.screenshot();
  expect(shot.byteLength).toBeGreaterThan(20_000);
  expect(errors).toEqual([]);
});

test('selecting a body flies to it and shows its info', async ({ page }) => {
  const errors = await open(page);
  await page.locator('.body-list__button', { hasText: 'Trái Đất' }).click();
  const panel = page.locator('.info-panel');
  await expect(panel).toBeVisible();
  await expect(panel.locator('.info-panel__title')).toHaveText('Trái Đất');
  await expect(panel).toContainText('Cách Mặt Trời');
  await expect(panel).toContainText('AU');

  await page.locator('.info-panel .icon-button').click();
  await expect(panel).toBeHidden();
  expect(errors).toEqual([]);
});

test('toolbar controls respond', async ({ page }) => {
  await open(page);
  const play = page.locator('.toolbar .button').first();
  await expect(play).toHaveAttribute('aria-label', 'Tạm dừng');
  await play.click();
  await expect(play).toHaveAttribute('aria-label', 'Chạy');

  const scale = page.locator('.toolbar .button', { hasText: 'Tỉ lệ thật' });
  await scale.click();
  await expect(scale).toHaveAttribute('aria-pressed', 'true');

  const orbits = page.locator('.toolbar .button', { hasText: 'Quỹ đạo' });
  await orbits.click();
  await expect(orbits).toHaveAttribute('aria-pressed', 'false');
});

test.describe('keyboard', () => {
  test.skip(({ isMobile }) => isMobile, 'no keyboard on phones');

  test('shortcuts select bodies and change settings', async ({ page }) => {
    await open(page);
    await page.keyboard.press('6');
    await expect(page.locator('.info-panel__title')).toHaveText('Sao Thổ');
    await page.keyboard.press('Escape');
    await expect(page.locator('.info-panel')).toBeHidden();

    await page.keyboard.press('+');
    await expect(page.locator('.toolbar__speed-label')).toHaveText('1 tuần/giây');
    await page.keyboard.press('l');
    await expect(page.locator('.labels')).toBeHidden();

    await page.keyboard.press('h');
    await page.locator('#quality-select').selectOption('low');
    await expect(page.locator('#quality-select')).toHaveValue('low');
  });
});

test.describe('mobile layout', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone-only layout');

  test('panels stay on screen and do not overlap', async ({ page }) => {
    await open(page);
    await page.locator('.body-list__button', { hasText: 'Sao Mộc' }).tap();
    await expect(page.locator('.info-panel')).toBeVisible();

    const offscreen = await page.evaluate(
      () =>
        [...document.querySelectorAll('.toolbar button')].filter((b) => {
          const r = b.getBoundingClientRect();
          return r.left < 0 || r.right > window.innerWidth;
        }).length,
    );
    expect(offscreen).toBe(0);

    const info = await page.locator('.info-panel').boundingBox();
    const toolbar = await page.locator('.toolbar').boundingBox();
    expect(info!.y + info!.height).toBeLessThanOrEqual(toolbar!.y);
  });
});

test('zooms from space down to the family on the beach and back', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = await open(page);
  const html = page.locator('html');

  await page.locator('.body-list__button', { hasText: 'Gia đình ở biển' }).click();
  await expect(html).toHaveAttribute('data-view', 'diving');
  await expect(page.locator('.info-panel__title')).toContainText('Mỹ Khê');
  await expect(page.locator('.toolbar__speed-label')).toHaveText('Thời gian thực');

  await expect(html).toHaveAttribute('data-view', 'surface', { timeout: 90_000 });
  await expect(page.locator('.info-panel')).toContainText('Giờ địa phương');
  // Space labels are hidden on the beach.
  await expect(page.locator('.labels')).toBeHidden();
  const shot = await page.locator('#app canvas').screenshot();
  expect(shot.byteLength).toBeGreaterThan(20_000);

  await page.locator('.toolbar .button', { hasText: 'Toàn cảnh' }).click();
  await expect(html).toHaveAttribute('data-view', 'space', { timeout: 60_000 });
  await expect(page.locator('.toolbar__speed-label')).toHaveText('1 ngày/giây');
  expect(errors).toEqual([]);
});
