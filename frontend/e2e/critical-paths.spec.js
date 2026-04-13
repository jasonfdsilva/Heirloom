import { test, expect } from '@playwright/test';

// Track IDs of plantings created during this run so we can delete them in cleanup
const createdPlantingIds = [];

// Helper: create a planting via the UI, capture its ID and seed name, return them
async function createPlanting(page) {
  await page.locator('.nav-link', { hasText: 'Plantings' }).click();
  await expect(page.locator('h1.page-title')).toContainText('Plantings');

  // Snapshot existing planting IDs before creation
  const beforeResp = await page.request.get('/api/plantings');
  const beforeIds = new Set((await beforeResp.json()).map(p => p.id));
  const before = beforeIds.size;

  await page.locator('button', { hasText: '+ New Planting' }).first().click();
  await expect(page.locator('.modal-title')).toContainText('New Planting');
  const seedSelect = page.locator('select.form-input').first();
  await seedSelect.selectOption({ index: 2 });
  // Capture the seed name so we can find the row in the table later
  const seedName = await seedSelect.evaluate(el => el.options[el.selectedIndex].text.trim());
  await page.locator('.modal-actions button.btn-primary').click();
  await expect(page.locator('.modal-title')).not.toBeVisible();

  // Poll the API until the new planting appears (row-count check is unreliable with
  // variety-grouped table where adding a 2nd planting of the same variety doesn't
  // change tbody tr count)
  let afterList = [];
  let newPlanting = null;
  for (let i = 0; i < 10; i++) {
    const afterResp = await page.request.get('/api/plantings');
    afterList = await afterResp.json();
    newPlanting = afterList.find(p => !beforeIds.has(p.id));
    if (newPlanting) break;
    await page.waitForTimeout(400);
  }
  if (newPlanting) createdPlantingIds.push(newPlanting.id);

  return { before, after: afterList.length, id: newPlanting?.id, seedName };
}

// Clean up all plantings created during this test run
test.afterAll(async ({ request }) => {
  for (const id of createdPlantingIds) {
    await request.delete(`/api/plantings/${id}`).catch(() => {});
  }
  createdPlantingIds.length = 0;
});

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
  const { id, seedName } = await createPlanting(page);

  // Capture count after creation
  const afterCreate = await page.locator('tbody tr').count();

  // Accept the confirmation dialog automatically
  page.on('dialog', dialog => dialog.accept());

  // Find the specific row containing our newly created planting.
  // The dropdown option may include "(OG)" or other suffixes not shown in the table,
  // so use the base name (text before any parenthetical) for matching.
  const baseName = seedName.split('(')[0].trim();
  const targetRow = page.locator('tbody tr').filter({ hasText: baseName }).first();
  await targetRow.locator('button').last().click();

  // Row count must be less than after-create (handles category header removal too)
  await expect(page.locator('tbody tr')).not.toHaveCount(afterCreate, { timeout: 5000 });

  // Remove from cleanup list since it's already deleted via the UI
  createdPlantingIds.splice(createdPlantingIds.indexOf(id), 1);
});

// ── 7. Open planting detail and verify the Log Event button is present ────────

test('navigate to planting detail and see the Log Event button', async ({ page }) => {
  await page.goto('/');

  // Ensure at least one planting exists — CI starts with an empty DB
  await page.locator('.nav-link', { hasText: 'Plantings' }).click();
  await expect(page.locator('h1.page-title')).toContainText('Plantings');

  const hasPlantings = await page.locator('tbody tr').count();
  if (hasPlantings === 0) {
    await createPlanting(page);
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

// ── 9. Bulk log event applies to multiple plantings ──────────────────────────

test('bulk log event applies to multiple plantings', async ({ page }) => {
  await page.goto('/');

  // Create 2 new plantings to use as our bulk targets
  const { id: id1 } = await createPlanting(page);
  const { id: id2 } = await createPlanting(page);

  await page.locator('.nav-link', { hasText: 'Plantings' }).click();
  await expect(page.locator('h1.page-title')).toContainText('Plantings');

  // Enter bulk select mode
  await page.locator('button', { hasText: 'Select' }).first().click();

  // Target the exact rows by planting ID so we always hit our newly created plantings,
  // regardless of how many pre-existing plantings of the same variety are present.
  await page.locator(`tr[data-planting-id="${id1}"]`).locator('input[type="checkbox"]').click();
  await page.locator(`tr[data-planting-id="${id2}"]`).locator('input[type="checkbox"]').click();

  // Floating bar should show 2 selected
  await expect(page.locator('.bulk-action-bar')).toContainText('2 plantings selected');

  // Open bulk event modal
  await page.locator('.bulk-action-bar button', { hasText: 'Log Event' }).click();
  await expect(page.locator('.modal-title')).toContainText('Log Event — 2 plantings');

  // Select "Note" event type and enter details
  await page.locator('.modal select.form-input').selectOption('note');
  await page.locator('.modal textarea.form-input').fill('E2E bulk test event');

  // Submit
  await page.locator('.modal-actions button.btn-primary').click();
  await expect(page.locator('.modal-title')).not.toBeVisible({ timeout: 5000 });

  // Bulk mode should be exited (floating bar gone)
  await expect(page.locator('.bulk-action-bar')).not.toBeVisible();

  // Verify via API that both plantings have the new event
  if (id1 && id2) {
    const resp = await page.request.get('/api/plantings?year=2026');
    const allPlantings = await resp.json();
    const p1 = allPlantings.find(p => p.id === id1);
    const p2 = allPlantings.find(p => p.id === id2);

    expect(p1?.events?.some(e => e.details === 'E2E bulk test event')).toBe(true);
    expect(p2?.events?.some(e => e.details === 'E2E bulk test event')).toBe(true);
  }
  // Cleanup: plantings (and their events) will be deleted in afterAll
});

// ── 11. Add a seed lot manually and verify it appears in the seeds table ──────

const createdLotIds = [];

test('add a seed lot manually and verify it appears in the seeds table', async ({ page }) => {
  await page.goto('/');
  await page.locator('.nav-link', { hasText: 'Seeds' }).click();
  await expect(page.locator('h1.page-title')).toContainText('Seed Inventory');

  // Click the global "+ New Packet" button
  await page.locator('button', { hasText: '+ New Packet' }).click();
  await expect(page.locator('.modal-title')).toContainText('Add Seed Packet');

  // Select the first seed from the dropdown (index 1 since index 0 is placeholder)
  const seedSelect = page.locator('select.form-input').first();
  await seedSelect.selectOption({ index: 1 });

  // Wait for lot code to auto-fetch (the generate-code API call)
  await page.waitForTimeout(600);

  // Fill in year and supplier
  const yearInput = page.locator('input[type="number"]').first();
  await yearInput.fill('2026');
  const supplierInput = page.locator('input[placeholder*="Johnny"]');
  await supplierInput.fill('Test Supplier E2E');

  // Submit
  await page.locator('.modal-actions button.btn-primary').click();
  await expect(page.locator('.modal-title')).not.toBeVisible();

  // Verify via API that the lot was created
  const resp = await page.request.get('/api/seed-lots');
  const lots = await resp.json();
  const created = lots.find(l => l.supplier === 'Test Supplier E2E');
  expect(created).toBeTruthy();
  expect(created.packed_for_year).toBe(2026);
  if (created) createdLotIds.push(created.id);

  // Expand the variety row to see lot sub-row
  const expandBtn = page.locator('button', { hasText: '▶' }).first();
  if (await expandBtn.isVisible()) {
    await expandBtn.click();
    await expect(page.getByText('Test Supplier E2E')).toBeVisible();
  }
});

test.afterAll(async ({ request }) => {
  for (const id of createdLotIds) {
    await request.delete(`/api/seed-lots/${id}`).catch(() => {});
  }
});

// ── 12. Quick Plant modal — plant now from BedPlanner ─────────────────────────

const quickPlantIds = [];

test('quick plant modal creates a planting and auto-selects it for painting', async ({ page }) => {
  // Requires at least one structure — skip if DB has none (CI without init_db seed)
  const structResp = await page.request.get('/api/structures');
  const structures = await structResp.json();
  test.skip(structures.length === 0, 'No structures in DB — skipping BedPlanner test');

  const firstStructure = structures[0];

  await page.goto('/');
  await page.locator('.nav-link', { hasText: 'Garden Map' }).click();
  await expect(page.locator('h1.page-title')).toContainText('Garden Map');

  // Click the first structure in the Structure Summary panel to open BedPlanner
  await page.locator('.card').filter({ has: page.locator('h3', { hasText: 'Structure Summary' }) })
    .locator('div[style*="cursor: pointer"]').first().click();

  await expect(page.locator('h1.page-title')).toContainText('Planner');

  // Click "+ New" — should open QuickPlantModal, NOT the full PlantingModal
  await page.locator('button', { hasText: '+ New' }).click();
  await expect(page.locator('.modal-title')).toContainText('🌱 Plant Now');

  // Verify method toggle and date label default
  await expect(page.locator('button', { hasText: /Direct Sow/ })).toBeVisible();
  await expect(page.locator('button', { hasText: /Nursery Buy/ })).toBeVisible();

  // Toggle to Nursery Buy and verify label changes
  await page.locator('button', { hasText: /Nursery Buy/ }).click();
  await expect(page.locator('text=PLANTED DATE')).toBeVisible();

  // Switch back to Direct Sow
  await page.locator('button', { hasText: /Direct Sow/ }).click();
  await expect(page.locator('text=SOW DATE')).toBeVisible();

  // Snapshot existing plantings
  const beforeResp = await page.request.get('/api/plantings?year=2026');
  const beforeIds = new Set((await beforeResp.json()).map(p => p.id));

  // Select the first real seed option, then force Direct Sow (seed may auto-set nursery)
  const seedSelect = page.locator('.modal select').first();
  await seedSelect.selectOption({ index: 1 });
  await page.locator('button', { hasText: /Direct Sow/ }).click();
  await expect(page.locator('text=SOW DATE')).toBeVisible();

  // Submit
  await page.locator('button', { hasText: /Start Planting/ }).click();
  await expect(page.locator('.modal-title')).not.toBeVisible({ timeout: 5000 });

  // The status bar should now show the planting is selected for painting
  await expect(page.locator('text=/Painting:/')).toBeVisible({ timeout: 5000 });

  // Verify the planting was created in the DB
  let newPlanting = null;
  for (let i = 0; i < 10; i++) {
    const afterResp = await page.request.get('/api/plantings?year=2026');
    const afterList = await afterResp.json();
    newPlanting = afterList.find(p => !beforeIds.has(p.id));
    if (newPlanting) break;
    await page.waitForTimeout(400);
  }

  expect(newPlanting).toBeTruthy();
  expect(newPlanting.method).toBe('direct');
  expect(newPlanting.direct_sow_date).toBeTruthy();
  expect(newPlanting.structure_id).toBe(firstStructure.id);
  if (newPlanting) quickPlantIds.push(newPlanting.id);
});

test.afterAll(async ({ request }) => {
  for (const id of quickPlantIds) {
    await request.delete(`/api/plantings/${id}`).catch(() => {});
  }
});

// ── 13. Quick Plant modal — seed lot selection ────────────────────────────────

test('quick plant modal shows lot dropdown and sends seed_lot_id when a lot is selected', async ({ page }) => {
  // Find a seed that has at least one lot
  const lotsResp = await page.request.get('/api/seed-lots');
  const allLots = await lotsResp.json();
  test.skip(allLots.length === 0, 'No seed lots in DB — skipping lot selection test');

  const firstLot = allLots[0];
  const seedId = firstLot.seed_id;

  // Also need a structure
  const structResp = await page.request.get('/api/structures');
  const structures = await structResp.json();
  test.skip(structures.length === 0, 'No structures in DB — skipping lot selection test');
  const firstStructure = structures[0];

  // Navigate to BedPlanner for the first structure
  await page.goto('/');
  await page.locator('.nav-link', { hasText: 'Garden Map' }).click();
  await expect(page.locator('h1.page-title')).toContainText('Garden Map');

  await page.locator('.card').filter({ has: page.locator('h3', { hasText: 'Structure Summary' }) })
    .locator('div[style*="cursor: pointer"]').first().click();
  await expect(page.locator('h1.page-title')).toContainText('Planner', { timeout: 5000 });

  // Open QuickPlantModal
  await page.locator('button', { hasText: '+ New' }).click();
  await expect(page.locator('.modal-title')).toContainText('🌱 Plant Now');

  // Select the seed that has a lot
  const seedSelect = page.locator('.modal select').first();
  await seedSelect.selectOption({ value: seedId });

  // The Seed Packet dropdown should now be visible
  await expect(page.locator('label', { hasText: 'Seed Packet' })).toBeVisible({ timeout: 3000 });

  // Select the first lot
  const lotSelect = page.locator('select').filter({ hasText: '— Any packet —' });
  await lotSelect.selectOption({ value: String(firstLot.id) });

  // Snapshot before submit
  const beforeResp = await page.request.get('/api/plantings?year=2026');
  const beforeIds = new Set((await beforeResp.json()).map(p => p.id));

  await page.locator('button', { hasText: /Start Planting/ }).click();
  await expect(page.locator('.modal-title')).not.toBeVisible({ timeout: 5000 });

  // Poll for the new planting
  let newPlanting = null;
  for (let i = 0; i < 10; i++) {
    const afterResp = await page.request.get('/api/plantings?year=2026');
    const afterList = await afterResp.json();
    newPlanting = afterList.find(p => !beforeIds.has(p.id));
    if (newPlanting) break;
    await page.waitForTimeout(400);
  }

  expect(newPlanting).toBeTruthy();
  expect(newPlanting.seed_lot_id).toBe(firstLot.id);
  if (newPlanting) quickPlantIds.push(newPlanting.id);
});

// Export/import feature was intentionally removed in Batch 3.
// Backups are handled at the DB level via scripts/backup.sh.
