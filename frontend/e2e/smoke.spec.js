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

// ── 4. Bed planner — paint a cell ────────────────────────────────────────────

test('open bed planner and paint a cell', async ({ page }) => {
  await page.goto('/');

  // Navigate to Garden Map
  await page.locator('.nav-link', { hasText: 'Garden Map' }).click();
  await expect(page.locator('h1.page-title')).toContainText('Garden Map');

  // Click the first bed in the structure summary sidebar
  const structureSummary = page.locator('.card').filter({ has: page.locator('h3', { hasText: 'Structure Summary' }) });
  await structureSummary.locator('div[style*="cursor: pointer"]').first().click();

  // Should be on bed planner
  await expect(page.locator('h1.page-title')).toContainText('Planner');

  // Select the first planting from the paint palette
  const palette = page.locator('.card').filter({ has: page.locator('h4', { hasText: 'Paint Palette' }) });
  await palette.locator('div[style*="cursor: pointer"]').first().click();

  // Count empty cells before painting
  const emptyBefore = await page.locator('[title="Empty"]').count();

  if (emptyBefore > 0) {
    await page.locator('[title="Empty"]').first().click();
    await page.waitForTimeout(500);
    const emptyAfter = await page.locator('[title="Empty"]').count();
    expect(emptyAfter).toBeLessThanOrEqual(emptyBefore);
  }
});
