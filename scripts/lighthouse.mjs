// Mobile Lighthouse run (Lighthouse's default mobile emulation + throttling) for the
// home page and one project page. Starts `next start` on :3100 if nothing is
// listening. Run `pnpm build` first. Reports land in artifacts/lighthouse/.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import lighthouse from 'lighthouse';
import { chromium } from '@playwright/test';

const BASE = process.env.LH_BASE ?? 'http://localhost:3100';
const PAGES = ['/', '/projects/formsmith'];
const OUT = path.resolve('artifacts/lighthouse');
fs.mkdirSync(OUT, { recursive: true });

async function up() {
  try {
    return (await fetch(BASE)).ok;
  } catch {
    return false;
  }
}

let server;
if (!(await up())) {
  server = spawn('pnpm', ['start', '--port', '3100'], { shell: true, stdio: 'ignore' });
  for (let i = 0; i < 60 && !(await up()); i++) await new Promise((r) => setTimeout(r, 500));
}

// Playwright's Chromium with a debugging port: no separate Chrome or launcher dependency.
const PORT = 9223;
const browser = await chromium.launch({ args: [`--remote-debugging-port=${PORT}`] });

const rows = [];
try {
  for (const page of PAGES) {
    const result = await lighthouse(`${BASE}${page}`, {
      port: PORT,
      output: 'html',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    });
    const name = page === '/' ? 'home' : page.replaceAll('/', '_').replace(/^_/, '');
    fs.writeFileSync(path.join(OUT, `${name}.html`), result.report);
    const c = result.lhr.categories;
    for (const key of ['accessibility', 'best-practices', 'seo']) {
      for (const ref of c[key].auditRefs) {
        const audit = result.lhr.audits[ref.id];
        if (ref.weight > 0 && audit.score !== null && audit.score < 1) console.log(`  [${page}] ${key}: ${audit.title}`);
      }
    }
    const a = result.lhr.audits;
    rows.push({
      page,
      performance: Math.round(c.performance.score * 100),
      accessibility: Math.round(c.accessibility.score * 100),
      'best-practices': Math.round(c['best-practices'].score * 100),
      seo: Math.round(c.seo.score * 100),
      LCP: a['largest-contentful-paint'].displayValue,
      TBT: a['total-blocking-time'].displayValue,
      CLS: a['cumulative-layout-shift'].displayValue,
    });
  }
} finally {
  await browser.close();
  // shell:true means server.pid is the shell; kill the whole tree (Windows needs taskkill).
  if (server) {
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F']);
    else server.kill();
  }
}

console.table(rows);
console.log(`HTML reports: ${OUT}`);
