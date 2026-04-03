import { test, expect } from '@playwright/test';

// Helper: create a planting and return to the plantings list
async function createPlanting(page) {
  await page.locator('.nav-link', { hasText: 'Plantings' }).click();
  await expect(page.locator('h1.page-title')).toContainText('Plantings');
  const before = await page.locator('tbody tr').count();
  await page.locator('button', { hasText: '+ New Planting' }).first().click();
  await expect(page.locator('.modal-title')).toContainText('New Planting');
  const seedSelect = page.locator('select.form-input').first();
  await seedSelect.selectOption({ index: 2 });
  await page.locator('.modal-actions button.btn-primary').click();
  await expect(page.locator('.modal-title')).not.toBeVisible();
  const after = await page.locator('tbody tr').count();
  expect(after).toBeGreaterThan(before);
  return { before, after };
}

// ── 5. Edit a seed's short label ─────────────────────────────────────────────

test('edit a seed short label and verify it saves', async ({ page }) => {
  await page.goto('/');
  await page.locator('.nav-link', { hasText: 'Seeds' }).click();
  await expect(page.locator('h1.page-title')).toContainText('Seed Inventory');

  // Click the first visible Edit button in the seed table
  await page.locator('button', { hasText: 'Edit' }).first().click();
  await expect(page.locator('.modal-title')).toBeVisible();

  // Short Label for Map input has maxLength=10 in the modal
  const labelInput = page.locator('input[maxlength="10"]');
  await labelInput.clear();
  await labelInput.fill('E2E');

  // Save
  await page.locator('.modal-actions button.btn-primary').click();
  await expect(page.locator('.modal-title')).not.toBeVisible();

  // Re-open the same seed to confirm the label persisted
  await page.locator('button', { hasText: 'Edit' }).first().click();
  await expect(page.locator('.modal-title')).toBeVisible();
  await expect(page.locator('input[maxlength="10"]')).toHaveValue('E2E');
  await page.locator('.modal-actions button.btn-secondary').click(); // Cancel
});

// ── 6. Delete a self-created planting ────────────────────────────────────────

test('delete a planting and verify it is removed from the list', async ({ page }) => {
  await page.goto('/');
  await createPlanting(page);

  // Capture count after creation
  const afterCreate = await page.locator('tbody tr').count();

  // Accept the confirmation dialog automatically
  page.on('dialog', dialog => dialog.accept());

  // Delete the last planting row (the one we just created)
  const rows = page.locator('tbody tr');
  const lastRow = rows.last();
  await lastRow.locator('button').last().click();

  // Row count must be less than after-create (handles category header removal too)
  await expect(page.locator('tbody tr')).not.toHaveCount(afterCreate, { timeout: 5000 });
});

// ── 7. Open planting detail and verify the Log Event button is present ────────

test('navigate to planting detail and see the Log Event button', async ({ page }) => {
  await page.goto('/');

  // Ensure at least one planting exists — CI starts with an empty DB
  await page.locator('.nav-link', { hasText: 'Plantings' }).click();
  await expect(page.locator('h1.page-title')).toContainText('Plantings');

  const hasPlantings = await page.locator('tbody tr').count();
  if (hasPlantings === 0) {
    await page.locator('button', { hasText: '+ New Planting' }).first().click();
    await expect(page.locator('.modal-title')).toContainText('New Planting');
    await page.locator('select.form-input').first().selectOption({ index: 2 });
    await page.locator('.modal-actions button.btn-primary').click();
    await expect(page.locator('.modal-title')).not.toBeVisible();
    await expect(page.locator('tbody tr')).not.toHaveCount(0, { timeout: 8000 });
  }

  // Go to Dashboard and click the first item in "Recent Plantings" to open detail
  await page.goto('/');
  const recentCard = page.locator('.card').filter({ has: page.locator('h3', { hasText: 'Recent Plantings' }) });
  await expect(recentCard.locator('div[style*="cursor: pointer"]').first()).toBeVisible({ timeout: 10000 });
  await recentCard.locator('div[style*="cursor: pointer"]').first().click();

  // Detail view loads
  await expect(page.locator('h1.page-title')).toBeVisible({ timeout: 5000 });

  // The primary action button to log an event must be present
  await expect(page.locator('button.btn-primary', { hasText: '+ Log Event' })).toBeVisible({ timeout: 5000 });
});

// ── 8. Photos view loads ──────────────────────────────────────────────────────

test('photos view loads correctly', async ({ page }) => {
  await page.goto('/');
  await page.locator('.nav-link', { hasText: 'Photos' }).click();
  await expect(page.locator('h1.page-title')).toContainText('Photos');

  // Either shows the empty state or a grid of photos
  const hasEmpty = await page.locator('text=No photos yet').isVisible();
  const hasPhotos = await page.locator('.photo-thumb, .photos-grid').first().isVisible().catch(() => false);
  expect(hasEmpty || hasPhotos).toBeTruthy();
});

// ── 9. Export produces a JSON download ───────────────────────────────────────

test('export button triggers a JSON download with expected keys', async ({ page }) => {
  await page.goto('/');

  // Intercept the download
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.locator('button', { hasText: /Export/i }).first().click(),
  ]);

  // The download should have a filename and produce a non-empty file
  const filename = download.suggestedFilename();
  expect(filename).toBeTruthy();

  // Read the stream and verify it is valid JSON with the expected top-level keys
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const json = JSON.parse(Buffer.concat(chunks).toString());

  expect(json).toHaveProperty('seeds');
  expect(json).toHaveProperty('plantings');
  expect(json).toHaveProperty('structures');
  expect(json).toHaveProperty('exported_at');
});
