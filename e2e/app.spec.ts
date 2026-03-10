import { test, expect, _electron as electron } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'e2e-screenshots');

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
});

function shot(page: any, name: string) {
  return page.screenshot({ path: path.join(SCREENSHOTS_DIR, name), fullPage: true });
}

test('app loads chat UI in E2E mode', async () => {
  // Launch with E2E mode: skips runtime download and gateway start
  const app = await electron.launch({
    args: [path.join(process.cwd(), 'main.js')],
    env: { ...process.env, MYOPENCLAW_E2E: '1' },
    timeout: 15_000,
  });

  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');

  // Should be on index.html immediately (no loading screen)
  await shot(page, '01_initial.png');

  // Wait for chat section (id="chat") to be active
  await page.waitForSelector('#chat.page.active, #chat.active', { timeout: 10_000 });
  await shot(page, '02_chat_page.png');

  // Find the message textarea
  const msgInput = page.locator('#msg');
  await expect(msgInput).toBeVisible({ timeout: 5_000 });
  await shot(page, '03_chat_input_visible.png');

  // Click on the input
  await msgInput.click();
  await shot(page, '04_input_clicked.png');

  // Type a message
  await msgInput.fill('Hello from E2E test!');
  await expect(msgInput).toHaveValue('Hello from E2E test!');
  await shot(page, '05_message_typed.png');

  // Hit Enter to send
  await msgInput.press('Enter');
  await page.waitForTimeout(1500);
  await shot(page, '06_after_send.png');

  // Navigate to Agents tab
  await page.locator('text=Agents').first().click();
  await page.waitForTimeout(500);
  await shot(page, '07_agents_page.png');

  // Navigate to API Keys tab
  await page.locator('text=API Keys').first().click();
  await page.waitForTimeout(500);
  await shot(page, '08_api_keys_page.png');

  // Navigate to Account tab
  await page.locator('text=Account').first().click();
  await page.waitForTimeout(500);
  await shot(page, '09_account_page.png');

  console.log('E2E test PASSED — all pages navigated successfully');
  await app.close();
});
