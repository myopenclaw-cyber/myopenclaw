import { test, expect, _electron as electron } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'e2e-screenshots');

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
});

test('app loads to chat UI', async () => {
  // Launch Electron app
  const app = await electron.launch({
    args: [path.join(process.cwd(), 'main.js')],
    timeout: 30000,
  });

  // Wait for first window
  const window = await app.firstWindow();
  await window.waitForLoadState('domcontentloaded');

  // Screenshot 1: initial state
  await window.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_initial.png'), fullPage: true });

  // Wait for loading screen to disappear (max 5 minutes for runtime download)
  // The loading screen has id="loadingScreen", main UI has id="mainContent" or similar
  try {
    // Wait for loading overlay to hide
    await window.waitForFunction(
      () => {
        const loading = document.getElementById('loadingScreen');
        return !loading || loading.style.display === 'none' || loading.classList.contains('hidden');
      },
      { timeout: 300000 } // 5 min
    );
  } catch {
    // Still take screenshot even if timeout
    await window.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_loading_timeout.png'), fullPage: true });
    throw new Error('Loading screen did not disappear within 5 minutes');
  }

  // Screenshot 2: main UI loaded
  await window.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_main_ui.png'), fullPage: true });

  // Verify chat input exists
  const chatInput = window.locator('textarea, input[type="text"], [contenteditable="true"]').first();
  await expect(chatInput).toBeVisible({ timeout: 10000 });

  // Screenshot 3: chat input visible
  await window.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_chat_ready.png'), fullPage: true });

  // Click on chat input
  await chatInput.click();
  await window.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_after_click.png'), fullPage: true });

  // Type a message
  await chatInput.type('Hello from E2E test', { delay: 50 });
  await window.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_typed_message.png'), fullPage: true });

  await app.close();
});
