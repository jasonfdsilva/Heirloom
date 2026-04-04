/**
 * Playwright global setup — runs once before all E2E tests.
 *
 * In CI the database starts empty, but several tests require seeds to exist
 * (edit-seed label, createPlanting dropdown, add-lot dropdown).
 * This seeds the minimum required data when the DB has fewer than 3 seeds.
 * It is idempotent: if seeds already exist (local dev) it does nothing.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8086';

const TEST_SEEDS = [
  { name: 'Cherokee Purple Tomato', category: 'Tomatoes', start_indoors: 1, direct_sow: 0, organic: 0, suggested_indoor_weeks: 8, spacing_inches: 24 },
  { name: 'Shishito OG',            category: 'Peppers',  start_indoors: 1, direct_sow: 0, organic: 1, suggested_indoor_weeks: 8, spacing_inches: 18 },
  { name: 'Red Tabby F1',           category: 'Greens',   start_indoors: 0, direct_sow: 1, organic: 0, suggested_indoor_weeks: 0, spacing_inches: 6  },
];

export default async function globalSetup() {
  const resp = await fetch(`${BASE_URL}/api/seeds`);
  const seeds = await resp.json();
  if (seeds.length >= 3) return; // Already has enough data — local dev or re-run

  for (const seed of TEST_SEEDS) {
    await fetch(`${BASE_URL}/api/seeds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(seed),
    });
  }
}
