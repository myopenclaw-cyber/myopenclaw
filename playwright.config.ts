import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 360000,       // 6 min per test (runtime download can take long)
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  use: {
    trace: 'on',
    screenshot: 'on',
  },
});
