import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { waitForToast } from './helpers/wait';

test.describe('Critical Flows', () => {

  test.describe('Actor Flow', () => {

    test('actor logs in and sees round detail with submissions', async ({ page }) => {
      await loginAs(page, 'actor');
      await page.goto('/rounds/round-demo-1');

      await expect(page.locator('h1')).toContainText('Round', { timeout: 10000 });
      await expect(page.locator('button:has-text("Submit Video")')).toBeVisible();
      await expect(page.locator('text=submissions received')).toBeVisible();
    });

    test('actor submits a video via URL', async ({ page }) => {
      await loginAs(page, 'actor');
      await page.goto('/rounds/round-demo-1');

      await expect(page.locator('h1')).toContainText('Round', { timeout: 10000 });

      await page.locator('button:has-text("Submit Video")').click();
      const dialog = page.locator('[role="dialog"][aria-label="Submit video"]');
      await expect(dialog).toBeVisible();

      await dialog.locator('button:has-text("URL")').click();
      await dialog.locator('input[type="url"]').fill('https://example.com/test-video.mp4');
      await dialog.locator('button[type="submit"]').click();

      // Modal should close and page should reload on success
      await expect(dialog).not.toBeVisible({ timeout: 10000 });
      await expect(page.locator('h1')).toContainText('Round', { timeout: 10000 });
    });

    test('actor sees no director-specific actions', async ({ page }) => {
      await loginAs(page, 'actor');
      await page.goto('/rounds/round-demo-1');

      await expect(page.locator('h1')).toContainText('Round', { timeout: 10000 });

      await expect(page.locator('button:has-text("Add Participants")')).toHaveCount(0);
      await expect(page.locator('button:has-text("Create Next Round")')).toHaveCount(0);
    });
  });

  test.describe('Director Flow', () => {

    test('director logs in and sees casting detail', async ({ page }) => {
      await loginAs(page, 'director');
      await page.goto('/castings/casting-demo-1');

      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Participants').first()).toBeVisible();
      await expect(page.locator('text=Rounds').first()).toBeVisible();
      await expect(page.locator('[title="Edit casting"]')).toBeVisible();
      await expect(page.locator('[title="Delete casting"]')).toBeVisible();
    });

    test('director sees submissions in round detail', async ({ page }) => {
      await loginAs(page, 'director');
      await page.goto('/rounds/round-demo-1');

      await expect(page.locator('h1')).toContainText('Round', { timeout: 10000 });

      const submissionCards = page.locator('text=Director\'s Note');
      await expect(submissionCards.first()).toBeVisible();

      const reviewButtons = page.locator('button:has-text("Review")');
      await expect(reviewButtons.first()).toBeVisible();
    });

    test('director can open edit casting modal', async ({ page }) => {
      await loginAs(page, 'director');
      await page.goto('/castings/casting-demo-1');

      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

      await page.locator('[title="Edit casting"]').click();
      await expect(page.locator('[role="dialog"][aria-label="Edit casting"]')).toBeVisible();

      const titleInput = page.locator('[role="dialog"][aria-label="Edit casting"] input[type="text"]');
      await expect(titleInput).not.toBeEmpty();

      await page.locator('[role="dialog"][aria-label="Edit casting"] button:has-text("Cancel")').click();
      await expect(page.locator('[role="dialog"][aria-label="Edit casting"]')).not.toBeVisible();
    });

    test('director can add participants to a round', async ({ page }) => {
      await loginAs(page, 'director');
      await page.goto('/rounds/round-demo-1');

      await expect(page.locator('h1')).toContainText('Round', { timeout: 10000 });

      await page.locator('button:has-text("Add Participants")').click();
      await expect(page.locator('[role="dialog"][aria-label="Add Participants"]')).toBeVisible();
      await expect(page.locator('[role="dialog"][aria-label="Add Participants"] textarea').first()).toBeVisible();

      await page.locator('[role="dialog"][aria-label="Add Participants"] button:has-text("Cancel")').click();
    });

    test('director can open Create Next Round modal', async ({ page }) => {
      await loginAs(page, 'director');
      await page.goto('/rounds/round-demo-1');

      await expect(page.locator('h1')).toContainText('Round', { timeout: 10000 });

      await page.locator('button:has-text("Create Next Round")').click();
      await expect(page.locator('[role="dialog"][aria-label="Create Next Round"]')).toBeVisible();
      await expect(page.locator('text=Minimum Score')).toBeVisible();

      await page.locator('[role="dialog"][aria-label="Create Next Round"] button:has-text("Cancel")').click();
    });

    test('director can delete a casting', async ({ page }) => {
      await loginAs(page, 'director');

      // Use the demo casting which the director is a participant of
      await page.goto('/castings/casting-demo-1');
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

      await page.locator('[title="Delete casting"]').click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      // Cancel to not destroy demo data
      await page.locator('[role="dialog"] button:has-text("Cancel")').click();
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });
  });

  test.describe('CRUD Casting', () => {

    test('director creates a new casting', async ({ page }) => {
      await loginAs(page, 'director');
      await page.goto('/castings/create');

      await expect(page.getByRole('heading', { name: 'Create Casting' })).toBeVisible({ timeout: 10000 });

      await page.locator('input[type="text"]').first().fill('E2E Test Casting');
      await page.locator('textarea').first().fill('Created by E2E tests');
      await page.locator('button:has-text("Crear Casting")').click();

      await expect(page).toHaveURL(/\/castings$/, { timeout: 10000 });
      await expect(page.locator('h3:has-text("E2E Test Casting")').first()).toBeVisible();
    });
  });

  test.describe('Preselector Flow', () => {

    test('preselector can view round detail', async ({ page }) => {
      await loginAs(page, 'preselector');
      await page.goto('/rounds/round-demo-1');

      await expect(page.locator('h1')).toContainText('Round', { timeout: 10000 });
      await expect(page.locator('text=submissions received')).toBeVisible();

      await expect(page.locator('button:has-text("Add Participants")')).toHaveCount(0);
      await expect(page.locator('button:has-text("Create Next Round")')).toHaveCount(0);
    });
  });

  test.describe('Navigation', () => {

    test('sidebar navigation between pages', async ({ page }) => {
      await loginAs(page, 'director');

      await page.locator('a[href="/castings"]').click();
      await expect(page).toHaveURL(/\/castings$/);
      await expect(page.getByRole('heading', { name: 'Casting Calls' })).toBeVisible();

      await page.locator('a[href="/castings/create"]').click();
      await expect(page).toHaveURL(/\/castings\/create$/);
      await expect(page.getByRole('heading', { name: 'Create Casting' })).toBeVisible();

      await page.locator('a[href="/dashboard"]').click();
      await expect(page).toHaveURL(/\/dashboard$/);
    });

    test('back navigation from round to casting', async ({ page }) => {
      await loginAs(page, 'director');
      await page.goto('/rounds/round-demo-1');

      await expect(page.locator('h1')).toContainText('Round', { timeout: 10000 });

      await page.locator('text=Back to Casting').click();
      await expect(page).toHaveURL(/\/castings\/casting-demo-1$/, { timeout: 10000 });
    });
  });
});
