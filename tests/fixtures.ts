import { test as base, expect, type Page } from '@playwright/test';

/** Every test fails if the page logs a console error or throws (WebGL included). */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
      await use(errors);
      expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Skip the first-visit intro so screenshots and tests start on content. */
export async function markIntroSeen(page: Page) {
  await page.addInitScript(() => localStorage.setItem('intro-seen', '1'));
}

/** Scroll in steps so ScrollTrigger/IntersectionObserver see real scrolling. */
export async function scrollToY(page: Page, y: number) {
  await page.evaluate(async (target) => {
    const step = () => new Promise((r) => requestAnimationFrame(() => r(null)));
    const start = window.scrollY;
    const n = 20;
    for (let i = 1; i <= n; i++) {
      window.scrollTo(0, start + ((target - start) * i) / n);
      await step();
    }
  }, y);
  await page.waitForTimeout(500);
}
