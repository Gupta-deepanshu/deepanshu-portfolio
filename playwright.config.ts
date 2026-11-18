import { defineConfig, devices } from '@playwright/test';

/**
 * Two projects, both Chromium:
 *   smoke  – small functional checks (`pnpm test:e2e`)
 *   visual – screenshots of every section at 1440 and 375, carousel positions,
 *            reduced motion (`pnpm shots`); output goes to artifacts/ (gitignored)
 * Both fail on any browser console error, including WebGL init failures.
 * Runs against a production build (`pnpm build` first).
 */
const PORT = 3100;

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  timeout: 90_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Desktop Chrome'],
    launchOptions: {
      // Use the real GPU so WebGL renders as it does for visitors. On machines without
      // one (CI), set PW_SWIFTSHADER=1 for software WebGL: correct but very slow, and the
      // fluid sim can stall screenshots.
      args: process.env.PW_SWIFTSHADER
        ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
        : ['--enable-gpu', '--ignore-gpu-blocklist', ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : [])],
    },
  },
  projects: [
    { name: 'smoke', testMatch: /smoke\.spec\.ts/ },
    { name: 'visual', testMatch: /visual\.spec\.ts/ },
  ],
  webServer: {
    command: `pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
