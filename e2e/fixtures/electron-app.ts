import { test as base, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import * as path from 'path';

type ElectronFixtures = {
  app: ElectronApplication;
  page: Page;
};

export const test = base.extend<ElectronFixtures>({
  app: async ({}, use) => {
    const app = await electron.launch({
      args: [path.join(process.cwd(), 'main.js')],
      env: { ...process.env, MYOPENCLAW_E2E: '1' },
      timeout: 30_000,
    });
    await use(app);
    await app.close();
  },

  page: async ({ app }, use) => {
    const page = await app.firstWindow();
    // Fix window size for consistent screenshots across platforms
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForLoadState('domcontentloaded');
    // Wait for chat page to be active (default landing page)
    await page.waitForSelector('#chat.page.active, #chat.active', { timeout: 10_000 });
    await use(page);
  },
});

export { expect } from '@playwright/test';
