import { test, expect } from '@playwright/test';

// ── 1. Dashboard loads ────────────────────────────────────────────────────────

test('dashboard loads with stat cards', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('h1.page-title')).toContainText('Heirloom');

  // All four stat cards present
  await expect(page.locator('.stat-card')).toHaveCount(4);

  // Nav links visible
  await expect(page.locator('.nav-link', { hasText: 'Plantings' })).toBeVisible();
  await expect(page.locator('.nav-link', { hasText: 'Seeds' })).toBeVisible();
  await expect(page.locator('.nav-link', { hasText: 'Garden Map' })).toBeVisible();
});

// ── 2. Create a planting ──────────────────────────────────────────────────────

test('create a new planting and it appears in the list', async ({ page }) => {
  await page.goto('/');

  // Navigate to Plantings and count current entries
  await page.locator('.nav-link', { hasText: 'Plantings' }).click();
  await expect(page.locator('h1.page-title')).toContainText('Plantings');
  const before = await page.locator('tbody tr').count();

  // Open the New Planting modal
  await page.locator('button', { hasText: '+ New Planting' }).first().click();
  await expect(page.locator('.modal-title')).toContainText('New Planting');

  // Select the first real seed (index 0 = placeholder, 1 = "+ Add custom", 2+ = real seeds)
  const seedSelect = page.locator('select.form-input').first();
  await seedSelect.selectOption({ index: 2 });

  // Submit
  await page.locator('.modal-actions button.btn-primary').click();
  await expect(page.locator('.modal-title')).not.toBeVisible();

  // A new planting row appears in the table
  const after = await page.locator('tbody tr').count();
  expect(after).toBeGreaterThan(before);
});

// ── 3. Log an event on a planting ────────────────────────────────────────────

test('log an event on an existing planting and it appears in the timeline', async ({ page }) => {
  await page.goto('/');

  // Click the first planting from the Dashboard "Recent Plantings" card
  const recentCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: 'Recent Plantings' }) });
  await recentCard.locator('div[style*="cursor: pointer"]').first().click();

  // Should be on detail view — Log Event button is a primary button
  await expect(page.locator('h1.page-title')).toBeVisible();
  await page.locator('button.btn-primary', { hasText: '+ Log Event' }).click();
  await expect(page.locator('.modal-title')).toContainText('Log Event');

  // Fill in the details textarea
  const note = `E2E smoke test note ${Date.now()}`;
  await page.locator('textarea.form-input').fill(note);

  // Submit
  await page.locator('.modal-actions button.btn-primary').click();
  await expect(page.locator('.modal-title')).not.toBeVisible();

  // The note should appear in the timeline
  await expect(page.locator(`text=${note}`)).toBeVisible({ timeout: 5000 });
});

// ── 4. Garden Map loads and Seeds tab renders ─────────────────────────────────
// Note: bed planner paint requires pre-existing structures which aren't seeded
// in CI. This test verifies the Garden Map view and Seeds tab instead.

test('garden map and seeds tab load correctly', async ({ page }) => {
  await page.goto('/');

  // Garden Map loads
  await page.locator('.nav-link', { hasText: 'Garden Map' }).click();
  await expect(page.locator('h1.page-title')).toContainText('Garden Map');

  // Map controls are visible
  await expect(page.locator('button', { hasText: /Edit Mode|View Mode/ }).first()).toBeVisible();

  // Seeds tab loads and shows seed list
  await page.locator('.nav-link', { hasText: 'Seeds' }).click();
  await expect(page.locator('h1.page-title')).toContainText('Seed Inventory');
  await expect(page.locator('.card').first()).toBeVisible();
});
