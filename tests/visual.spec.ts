import type { Page } from '@playwright/test';
import { expect, markIntroSeen, scrollToY, test } from './fixtures';

/** Scroll reveals only fire on scroll, so walk the page before a full-page shot. */
async function revealAll(page: Page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 600) await scrollToY(page, y);
  await scrollToY(page, 0);
  await page.waitForTimeout(800);
}

const OUT = 'artifacts/screenshots';
const SECTIONS = ['top', 'about', 'experience', 'projects', 'skills', 'contact'];
/** Hero and About share one sticky stage background that lives outside both sections. */
const BG: Record<string, string> = { top: '[data-stage-bg]', about: '[data-stage-bg]' };

for (const width of [1440, 375]) {
  test(`sections @ ${width}px`, async ({ page }) => {
    await markIntroSeen(page);
    await page.setViewportSize({ width, height: width > 400 ? 900 : 812 });
    await page.goto('/');
    await page.waitForTimeout(2500); // hero letters + backgrounds settle
    for (const id of SECTIONS) {
      const top = await page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
      await scrollToY(page, top);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${OUT}/${width}/${SECTIONS.indexOf(id) + 1}-${id}.png` });
      // Regression: every section's background must actually be showing once you're in it
      // (catches ScrollTriggers measured before the projects pin spacer existed).
      const bgOpacity = await page.locator(BG[id] ?? `#${id} [data-bg]`).first().evaluate((el) => Number(getComputedStyle(el).opacity));
      expect(bgOpacity, `#${id} background opacity`).toBeGreaterThan(0.5);
    }
    await page.goto('/projects/formsmith');
    await revealAll(page);
    await page.screenshot({ path: `${OUT}/${width}/7-project-featured.png`, fullPage: true });
    await page.goto('/projects/travel');
    await revealAll(page);
    await page.screenshot({ path: `${OUT}/${width}/8-project-earlier.png`, fullPage: true });
  });
}

test('pinned carousel: all 6 positions @ 1440px', async ({ page }) => {
  await markIntroSeen(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  // Scroll to where the stage pins (its top reaches the viewport top).
  const top = await page.locator('[data-gl-slot="projects"]').evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  await scrollToY(page, top + 2);
  await page.waitForTimeout(800);
  const carousel = page.getByRole('group', { name: 'Projects' });
  const next = carousel.getByRole('button', { name: 'Next project' });
  for (let i = 1; i <= 6; i++) {
    await expect(carousel.locator('[aria-live="polite"]')).toContainText(`Project ${i} of 6`, { timeout: 6000 });
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${OUT}/carousel/${i}-of-6.png` });
    const budget = await page.evaluate(() => (window as unknown as { __glBudget?: () => { id: string; state: string }[] }).__glBudget?.());
    const active = (budget ?? []).filter((s) => s.state === 'active').length;
    expect(active).toBeLessThanOrEqual(2);
    if (i < 6) await next.click();
  }
});

test.describe('reduced motion', () => {
  test.use({ colorScheme: 'dark', reducedMotion: 'reduce' });
  test('renders the static version', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    // No intro overlay, no WebGL canvases, no Lenis, no pinned gallery.
    await expect(page.locator('html')).not.toHaveAttribute('data-intro', /.*/);
    await expect(page.locator('[data-bg] canvas, [data-gl-slot] canvas')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.classList.contains('lenis'))).toBe(false);
    await expect(page.locator('[data-gl-slot="projects"]')).toHaveCount(0);
    // Hero name is fully visible immediately.
    await page.screenshot({ path: `${OUT}/reduced-motion/hero.png` });
    for (const id of ['about', 'experience', 'projects', 'contact']) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/reduced-motion/${id}.png` });
    }
    // Content that animates for everyone else is at full opacity here.
    const opacity = await page.locator('#about [data-reveal]').first().evaluate((el) => getComputedStyle(el).opacity);
    expect(opacity).toBe('1');
  });
});
