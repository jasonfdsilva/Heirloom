import { test, expect } from '@playwright/test';

// Track IDs of plantings created during this run so we can delete them in cleanup
const createdPlantingIds = [];

// Helper: create a planting via the UI, capture its ID, return it
async function createPlanting(page) {
  await page.locator('.nav-link', { hasText: 'Plantings' }).click();
  await expect(page.locator('h1.page-title')).toContainText('Plantings');

  // Snapshot existing planting IDs before creation
  const beforeResp = await page.request.get('/api/plantings');
  const beforeIds = new Set((await beforeResp.json()).map(p => p.id));
  const before = beforeIds.size;

  // Open the New Planting modal
  await page.locator('button', { hasText: '+ New Planting' }).first().click();
  await expect(page.locator('.modal-title')).toContainText('New Planting');

  // Select the first real seed (index 0 = placeholder, 1 = "+ Add custom", 2+ = real seeds)
  const seedSelect = page.locator('select.form-input').first();
  await seedSelect.selectOption({ index: 2 });

  await page.locator('.modal-actions button.btn-primary').click();
  await expect(page.locator('.modal-title')).not.toBeVisible();

  // Capture the new planting's ID via the API so we can clean it up later
  const afterResp = await page.request.get('/api/plantings');
  const afterList = await afterResp.json();
  const newPlanting = afterList.find(p => !beforeIds.has(p.id));
  if (newPlanting) createdPlantingIds.push(newPlanting.id);

  return { before, after: afterList.length, id: newPlanting?.id, seedName: newPlanting?.seed_name };
}

// Clean up all plantings created during this test run
test.afterAll(async ({ request }) => {
  for (const id of createdPlantingIds) {
    await request.delete(`/api/plantings/${id}`).catch(() => {});
  }
  createdPlantingIds.length = 0;
});

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

  const { before, after } = await createPlanting(page);

  // Verify via API that a planting was created (row-count check is unreliable with
  // variety-grouped table where tbody tr count depends on grouping state)
  expect(after).toBeGreaterThan(before);
});

// ── 3. Log an event on a planting ────────────────────────────────────────────

test('log an event on an existing planting and it appears in the timeline', async ({ page }) => {
  await page.goto('/');

  // Ensure at least one planting exists (CI starts with empty DB; test 2 may have run first)
  await page.locator('.nav-link', { hasText: 'Plantings' }).click();
  await expect(page.locator('h1.page-title')).toContainText('Plantings');

  const rowCount = await page.locator('tbody tr').count();
  if (rowCount === 0) {
    await createPlanting(page);
    await expect(page.locator('tbody tr')).not.toHaveCount(0, { timeout: 8000 });
  }

  // Click the first planting from the Dashboard "Recent Plantings" card
  await page.goto('/');
  const recentCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: 'Recent Plantings' }) });
  await expect(recentCard.locator('div[style*="cursor: pointer"]').first()).toBeVisible({ timeout: 10000 });
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
