import { test } from '@playwright/test';

// Opens MyTimetable, then pauses so you can log in. Click Resume in the
// Playwright Inspector once you're signed in to save auth.storage.json.
test('auth setup (manual login)', async ({ page, context }) => {
  test.setTimeout(0);
  await page.goto('https://mytimetable.mcmaster.ca/criteria.jsp');
  await page.pause();
  await context.storageState({ path: 'auth.storage.json' });
});
