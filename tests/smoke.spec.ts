import { projects } from '../src/content/projects';
import { expect, markIntroSeen, scrollToY, test } from './fixtures';

test.beforeEach(async ({ page }) => {
  await markIntroSeen(page);
});

test('home page shows name, role, experience and projects without waiting', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Deepanshu Gupta' })).toBeVisible();
  await expect(page.getByText('Senior Frontend Engineer').first()).toBeVisible();
  await expect(page.locator('#experience')).toContainText('Accenture');
  await expect(page.locator('#projects')).toContainText('Formsmith');
});

test('every project page loads', async ({ page }) => {
  for (const p of projects) {
    const res = await page.goto(`/projects/${p.slug}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: p.title })).toBeVisible();
  }
});

test('unknown project shows the not-found page', async ({ page }) => {
  // With Partial Prerendering the static shell streams before notFound() runs, so
  // the HTTP status can be 200; Next marks the page noindex and renders not-found.
  await page.goto('/projects/does-not-exist');
  await expect(page.getByRole('heading', { name: 'This reel is blank.' })).toBeVisible();
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1);
});

test('placeholder links show "Coming soon" instead of linking', async ({ page }) => {
  await page.goto('/projects/formsmith');
  const placeholders = page.locator('[data-placeholder]');
  await expect(placeholders.first()).toBeVisible();
  await expect(placeholders.first()).toContainText('Coming soon');
  await expect(placeholders.first()).toHaveAttribute('aria-disabled', 'true');
  // No anchor on the page points at the PLACEHOLDER sentinel.
  expect(await page.locator('a[href*="PLACEHOLDER"]').count()).toBe(0);
});

test('carousel keyboard navigation moves between projects (desktop)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const section = page.locator('#projects');
  const top = await section.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  await scrollToY(page, top + 200);
  const carousel = page.getByRole('group', { name: 'Projects' });
  await carousel.getByRole('button', { name: 'Next project' }).focus();
  const live = carousel.locator('[aria-live="polite"]');
  await expect(live).toContainText('Project 1 of 6');
  await page.keyboard.press('ArrowRight');
  await expect(live).toContainText('Project 2 of 6', { timeout: 5000 });
  await page.keyboard.press('ArrowRight');
  await expect(live).toContainText('Project 3 of 6', { timeout: 5000 });
  await page.keyboard.press('ArrowLeft');
  await expect(live).toContainText('Project 2 of 6', { timeout: 5000 });
});

test('mobile shows the swipe carousel, not the pinned gallery', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.locator('[data-gl-slot="projects"]')).toHaveCount(0);
  await expect(page.locator('#projects li[data-index]')).toHaveCount(6);
});

for (const width of [1440, 375]) {
  test(`outline D is gone behind Skills and Contact @ ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width > 400 ? 900 : 812 });
    await page.goto('/');
    await page.waitForTimeout(1500); // desktop: pinned reel mounts and refreshes triggers
    const outline = page.locator('[data-outline-d]');
    for (const id of ['experience', 'skills', 'contact']) {
      const top = await page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
      await scrollToY(page, top + (id === 'experience' ? 400 : 0));
      await page.waitForTimeout(600);
      const opacity = await outline.evaluate((el) => Number(getComputedStyle(el).opacity));
      if (id === 'experience') expect(opacity, 'outline D shows behind Experience').toBeGreaterThan(0.5);
      else expect(opacity, `outline D hidden behind ${id}`).toBe(0);
    }
  });
}

test('skills: every group is real HTML; desktop deck pins and deals through all six', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const section = page.locator('#skills');
  for (const label of ['Languages', 'Frameworks', 'Styling', 'APIs & CMS', 'Testing & tools', 'AI']) {
    await expect(section.getByRole('heading', { level: 3, name: label })).toHaveCount(1);
  }
  await expect(section).toContainText('B.Tech in Computer Science');
  const top = await section.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  await scrollToY(page, top);
  const groups = section.getByRole('list', { name: 'Skill groups' });
  await expect(groups.locator('[aria-current="step"]')).toContainText('Languages');
  await groups.getByRole('button', { name: /AI/ }).click();
  await expect(groups.locator('[aria-current="step"]')).toContainText('AI', { timeout: 5000 });
});
