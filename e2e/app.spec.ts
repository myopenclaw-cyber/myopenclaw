import { test, expect } from './fixtures/electron-app';

test.describe('Chat Page', () => {
  test('renders chat UI with input and sidebar', async ({ page }) => {
    // Chat section should be active
    await expect(page.locator('#chat')).toHaveClass(/active/);
    // Message textarea visible
    await expect(page.locator('#msg')).toBeVisible();
    // Sidebar nav visible
    await expect(page.locator('nav.menu')).toBeVisible();

    await expect(page).toHaveScreenshot('chat-page.png');
  });

  test('can type and send a message', async ({ page }) => {
    const msgInput = page.locator('#msg');
    await msgInput.click();
    await msgInput.fill('Hello from E2E test!');
    await expect(msgInput).toHaveValue('Hello from E2E test!');

    await expect(page).toHaveScreenshot('chat-message-typed.png');

    await msgInput.press('Enter');

    // Wait for user message to appear in chatBox
    await expect(page.locator('#chatBox .m.u')).toBeVisible({ timeout: 5_000 });

    // Wait for thinking bubble to disappear (gateway not available in E2E)
    await expect(page.locator('#streamingBubble')).toBeHidden({ timeout: 10_000 });

    // Input should be cleared after send
    await expect(msgInput).toHaveValue('');
    await expect(page).toHaveScreenshot('chat-after-send.png');
  });
});

test.describe('Navigation', () => {
  test('navigates between all tabs', async ({ page }) => {
    // Chat is default active
    await expect(page.locator('#chat')).toHaveClass(/active/);

    // Agents tab
    await page.locator('#tab-agents').click();
    await expect(page.locator('#agents')).toHaveClass(/active/, { timeout: 3_000 });
    await expect(page).toHaveScreenshot('agents-page.png');

    // Cron tab
    await page.locator('#tab-cron').click();
    await expect(page.locator('#cron')).toHaveClass(/active/, { timeout: 3_000 });
    await expect(page).toHaveScreenshot('cron-page.png');

    // Account tab
    await page.locator('#tab-account').click();
    await expect(page.locator('#account')).toHaveClass(/active/, { timeout: 3_000 });
    await expect(page).toHaveScreenshot('account-page.png');

    // Back to chat
    await page.locator('#tab-chat').click();
    await expect(page.locator('#chat')).toHaveClass(/active/, { timeout: 3_000 });
  });
});

test.describe('Agents Page', () => {
  test('shows agent list with main agent', async ({ page }) => {
    await page.locator('#tab-agents').click();
    await expect(page.locator('#agents')).toHaveClass(/active/, { timeout: 3_000 });
    await expect(page.locator('#agentList')).toBeVisible({ timeout: 5_000 });

    await expect(page).toHaveScreenshot('agents-list.png');
  });

  test('can open add-agent form', async ({ page }) => {
    await page.locator('#tab-agents').click();
    await expect(page.locator('#agents')).toHaveClass(/active/, { timeout: 3_000 });

    const addBtn = page.locator('button:has-text("Add Agent")');
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await expect(page).toHaveScreenshot('agents-add-form.png');
    }
  });
});

test.describe('Cron Page', () => {
  test('shows cron job list', async ({ page }) => {
    await page.locator('#tab-cron').click();
    await expect(page.locator('#cron')).toHaveClass(/active/, { timeout: 3_000 });

    await expect(page).toHaveScreenshot('cron-list.png');
  });

  test('can open add-cron form', async ({ page }) => {
    await page.locator('#tab-cron').click();
    await expect(page.locator('#cron')).toHaveClass(/active/, { timeout: 3_000 });

    const addBtn = page.locator('button:has-text("Add Cron Job"), button:has-text("Add Job")');
    if (await addBtn.first().isVisible()) {
      await addBtn.first().click();
      await expect(page.locator('#cronForm')).toBeVisible({ timeout: 3_000 });
      await expect(page).toHaveScreenshot('cron-add-form.png');
    }
  });
});

test.describe('Account Page', () => {
  test('shows account info and subscription status', async ({ page }) => {
    await page.locator('#tab-account').click();
    await expect(page.locator('#account')).toHaveClass(/active/, { timeout: 3_000 });

    await expect(page).toHaveScreenshot('account-page-full.png');
  });
});
