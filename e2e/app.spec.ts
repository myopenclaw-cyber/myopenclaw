import { test, expect, _electron as electron } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'e2e-screenshots');
const RUNTIME_TIMEOUT = 300_000; // 5 min — runtime download on first run

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
});

function shot(page: any, name: string) {
  return page.screenshot({ path: path.join(SCREENSHOTS_DIR, name), fullPage: true });
}

test('app reaches chat UI and allows interaction', async () => {
  const app = await electron.launch({
    args: [path.join(process.cwd(), 'main.js')],
    timeout: 30_000,
  });

  // First window is loading.html (runtime installer)
  const loadingPage = await app.firstWindow();
  await loadingPage.waitForLoadState('domcontentloaded');
  await shot(loadingPage, '01_loading_screen.png');

  console.log('Waiting for app to finish loading and switch to index.html...');

  // Wait for the window to navigate from loading.html → index.html
  // This happens after runtime download+install completes
  await loadingPage.waitForURL('**/index.html', { timeout: RUNTIME_TIMEOUT });

  // Now we're on the main chat UI
  const mainPage = loadingPage; // same window, new page content
  await mainPage.waitForLoadState('domcontentloaded');
  await shot(mainPage, '02_main_ui_loaded.png');

  // Wait for chat section to be active
  const chatSection = mainPage.locator('#chat.page.active');
  await expect(chatSection).toBeVisible({ timeout: 15_000 });
  await shot(mainPage, '03_chat_page.png');

  // Find the message textarea (id="msg")
  const msgInput = mainPage.locator('#msg');
  await expect(msgInput).toBeVisible({ timeout: 10_000 });

  // Screenshot before clicking
  await shot(mainPage, '04_before_click.png');

  // Click on the chat input
  await msgInput.click();
  await shot(mainPage, '05_input_focused.png');

  // Type a message
  await msgInput.fill('Hello from E2E test');
  await shot(mainPage, '06_message_typed.png');

  // Verify text was entered
  await expect(msgInput).toHaveValue('Hello from E2E test');

  // Click send button (Enter key)
  await msgInput.press('Enter');
  await mainPage.waitForTimeout(2000);
  await shot(mainPage, '07_after_send.png');

  console.log('E2E test PASSED');
  await app.close();
});
