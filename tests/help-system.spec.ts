/**
 * SimNurse Help System — Smoke Tests
 * ============================================================
 * Covers:
 *  - Help button opens HelpPanel
 *  - HelpPanel shows walkthrough CTA
 *  - Walkthrough stays idle until manually started
 *  - Walkthrough can be manually started and advanced with Next button
 *  - Manually started walkthrough can be skipped
 *  - Feedback widget appears in HelpPanel tip
 *  - Debrief ? button (skipped — requires full scenario run)
 */

import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Navigate to the library screen with a fresh localStorage so the library
 * walkthrough has NOT been completed.
 * Does NOT pre-complete anything.
 */
async function loadFreshApp(page: import('@playwright/test').Page) {
  // Clear all help-related localStorage keys so manual-start behavior is tested
  await page.addInitScript(() => {
    window.localStorage.removeItem('simnurse_completed_walkthroughs');
    window.localStorage.removeItem('simnurse_onboarding_complete');
    window.localStorage.removeItem('simnurse_e2e_freeze_engine');
  });
  await page.goto('/');
  // Wait for at least one scenario card (DB seeded)
  await page.waitForSelector('[id^="scenario-btn-"]', { state: 'visible', timeout: 15_000 });
}

/**
 * Navigate to the library screen with walkthrough already completed so the
 * panel can be tested in the replay state.
 */
async function loadAppWithTourCompleted(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'simnurse_completed_walkthroughs',
      JSON.stringify(['library-tour'])
    );
    window.localStorage.setItem('simnurse_e2e_freeze_engine', 'true');
  });
  await page.goto('/');
  await page.waitForSelector('[id^="scenario-btn-"]', { state: 'visible', timeout: 15_000 });
}

/**
 * Navigate to the debrief screen by starting any scenario and immediately ending it manually.
 * simnurse_e2e_freeze_engine is already handled in useScenarioEngine.ts — no engine change needed.
 */
async function reachDebrief(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'simnurse_completed_walkthroughs',
      JSON.stringify(['library-tour', 'preview-tour', 'patient-tour', 'actions-tour', 'status-tour'])
    );
    window.localStorage.setItem('simnurse_e2e_freeze_engine', 'true');
  });
  await page.goto('/');
  await page.waitForSelector('[id^="scenario-btn-"]', { state: 'visible', timeout: 15_000 });

  // Open preview modal
  await page.locator('[id^="scenario-btn-"]').first().click();
  await page.waitForSelector('#begin-scenario-btn', { state: 'visible', timeout: 5_000 });
  await page.click('#begin-scenario-btn');

  // End scenario immediately
  await page.waitForSelector('#finish-case-btn', { state: 'visible', timeout: 5_000 });
  await page.click('#finish-case-btn');

  // Confirm end using the modal's stable id once it appears.
  await page.waitForSelector('#end-scenario-confirm-btn', { state: 'visible', timeout: 5_000 });
  await page.click('#end-scenario-confirm-btn');

  // Wait for EvaluationSummary
  await page.waitForSelector('#score-gauge', { state: 'visible', timeout: 10_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

test('help button opens HelpPanel', async ({ page }) => {
  await loadAppWithTourCompleted(page);

  await page.click('#help-btn');

  // The HelpPanel header contains context label text for the library screen
  await expect(
    page.locator('text=Case Library Help').or(page.locator('text=Library Help'))
  ).toBeVisible({ timeout: 5_000 });
});

test('HelpPanel shows walkthrough CTA', async ({ page }) => {
  await loadAppWithTourCompleted(page);

  await page.click('#help-btn');

  // The panel must have a "Start Walkthrough" (or "Replay Walkthrough") button
  await expect(
    page
      .getByRole('button', { name: /start walkthrough/i })
      .or(page.getByRole('button', { name: /replay walkthrough/i }))
  ).toBeVisible({ timeout: 5_000 });
});

test('walkthrough does not auto-start after 2 seconds', async ({ page }) => {
  await loadFreshApp(page);

  // Wait beyond the former debounce window to verify tours stay manual-only
  await page.waitForTimeout(2500);

  await expect(page.getByRole('button', { name: /next/i })).not.toBeVisible();
  await expect(page.getByRole('button', { name: /skip tour/i })).not.toBeVisible();
});

test('walkthrough can be manually started and advanced with Next button', async ({ page }) => {
  await loadFreshApp(page);

  await page.click('#help-btn');
  await page
    .getByRole('button', { name: /start walkthrough/i })
    .or(page.getByRole('button', { name: /replay walkthrough/i }))
    .click();

  await expect(page.locator('h3', { hasText: 'Welcome to SimNurse' })).toBeVisible({ timeout: 3_000 });

  // Click "Next" to advance to step 2
  await page.getByRole('button', { name: /next/i }).click();

  // Second step title for library-tour is "Choose a Case"
  await expect(
    page.locator('text=Choose a Case')
  ).toBeVisible({ timeout: 3_000 });
});

test('manually started walkthrough can be skipped', async ({ page }) => {
  await loadFreshApp(page);

  await page.click('#help-btn');
  await page
    .getByRole('button', { name: /start walkthrough/i })
    .or(page.getByRole('button', { name: /replay walkthrough/i }))
    .click();
  await expect(page.locator('h3', { hasText: 'Welcome to SimNurse' })).toBeVisible({ timeout: 3_000 });

  // Click "Skip Tour" (or variant label)
  await page
    .getByRole('button', { name: /skip/i })
    .or(page.getByRole('button', { name: /skip tour/i }))
    .click();

  // Tour tooltip should disappear
  await expect(page.locator('h3', { hasText: 'Welcome to SimNurse' })).not.toBeVisible({ timeout: 3_000 });
  await expect(page.getByRole('button', { name: /next/i })).not.toBeVisible({ timeout: 3_000 });
});

test('feedback widget appears in HelpPanel tip', async ({ page }) => {
  await loadAppWithTourCompleted(page);

  // Open the help panel
  await page.click('#help-btn');
  await page.waitForSelector('[id^="help-panel"]', {
    state: 'visible',
    timeout: 5_000,
  }).catch(() => {
    // Panel may not have an id — fall back to waiting for content
  });

  // Find and click the first visible context-tip row.
  const firstTip = page.getByRole('button', { name: /reading scenario cards/i });

  await firstTip.click();

  // After expanding, thumbs-up and thumbs-down buttons must be visible
  await expect(page.getByRole('button', { name: /thumbs.?up|helpful|👍/i }).first()).toBeVisible({ timeout: 3_000 });

  await expect(page.getByRole('button', { name: /thumbs.?down|not helpful|👎/i }).first()).toBeVisible({ timeout: 3_000 });
});

test('debrief ? button opens HelpPanel', async ({ page }) => {
  await reachDebrief(page);

  // The EvaluationSummary renders a ? help button via onHelpClick prop
  const helpBtn = page
    .locator('#help-btn')
    .or(page.getByRole('button', { name: /help/i }).first());

  await expect(helpBtn).toBeVisible({ timeout: 5_000 });
  await helpBtn.click();

  // HelpPanel should show debrief context label
  await expect(page.getByRole('heading', { name: 'Debrief Help' })).toBeVisible({ timeout: 5_000 });
});
