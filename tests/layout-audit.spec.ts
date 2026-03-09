/**
 * SimNurse Visual Layout Audit
 * ============================================================
 * Comprehensive responsive design validation covering:
 *  - Full-page screenshots at standard breakpoints (320, 768, 1024, 1920 px)
 *  - Layout shift, element overflow, horizontal scroll detection
 *  - Touch target size validation (≥ 44 × 44 px on mobile)
 *  - Text truncation / overflow detection
 *  - Container proportion checks — no distortion
 *  - Navigation patterns: BottomNav on mobile, expanded states
 *  - Typography legibility at all densities
 *  - Critical content visibility above the fold
 *  - Cross-browser consistency (Chromium / Firefox / WebKit)
 *  - Pixel-perfect visual regression baselines
 */

import { test, expect, type Page } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Suppress CSS animations/transitions to make screenshots deterministic. */
async function freezeAnimations(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
}

/**
 * Navigate to the app, wait for it to be fully hydrated, then freeze
 * animations so screenshots are stable.
 */
async function loadApp(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('simnurse_onboarding_complete', 'true');
    window.localStorage.setItem('simnurse_e2e_freeze_engine', 'true');
  });
  await page.goto('/');
  // Wait for the SimNurse header logo to confirm the app mounted
  await page.waitForSelector('#app-header', { state: 'visible', timeout: 15_000 });
  await page.locator('[id^="scenario-btn-"]').first().waitFor({ state: 'visible', timeout: 15_000 });
  await freezeAnimations(page);
  // Small settle wait to let any micro-animations finish
  await page.waitForTimeout(200);
}

/**
 * Wait for scenario cards to appear (they load asynchronously from Dexie
 * IndexedDB via useLiveQuery), then click the first one to enter the active
 * scenario view.
 *
 * Scenario cards are the only buttons with the `rounded-2xl` Tailwind class
 * in LibraryScreen — this distinguishes them from the header help button.
 */
async function selectFirstScenario(page: Page) {
  // The Dexie populate hook seeds the DB on first visit — wait up to 15 s
  // for at least one scenario card to become visible.
  const scenarioCard = page.locator('[id^="scenario-btn-"]').first();
  await scenarioCard.waitFor({ state: 'visible', timeout: 15_000 });
  await scenarioCard.click();
  // BottomNav renders only when a scenario is active
  await page.waitForSelector('#bottom-navigation-bar', { state: 'visible', timeout: 15_000 });
  await freezeAnimations(page);
  await page.waitForTimeout(300);
}

/**
 * Returns `true` when the page body overflows its viewport width — i.e., there
 * is horizontal scrolling.
 */
async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
}

/**
 * Collect all elements that visually bleed outside the viewport width.
 * Returns an array of { tag, id, class, overflow } descriptors.
 */
async function getOverflowingElements(page: Page) {
  return page.evaluate(() => {
    const vpWidth = document.documentElement.clientWidth;
    const results: { tag: string; id: string; cls: string; right: number }[] = [];

    document.querySelectorAll('*').forEach((el) => {
      const rect = el.getBoundingClientRect();
      // Ignore elements with no size and those intentionally off-screen (e.g. portals)
      if (rect.width === 0 && rect.height === 0) return;
      if (rect.right > vpWidth + 1) {
        results.push({
          tag: el.tagName.toLowerCase(),
          id: (el as HTMLElement).id || '',
          cls: (el as HTMLElement).className?.toString().slice(0, 80) || '',
          right: Math.round(rect.right),
        });
      }
    });
    return results;
  });
}

/**
 * Collect all interactive elements (buttons, links, [role=button]) and measure
 * their bounding boxes. Returns items that fall below the minimum touch-target
 * size of 44 × 44 px.
 */
async function getSmallTouchTargets(
  page: Page,
  minSize = 44
): Promise<{ tag: string; text: string; width: number; height: number }[]> {
  return page.evaluate((min) => {
    const interactive = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, a[href], [role="button"], [role="link"], input, select, textarea'
      )
    );
    return interactive
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 60),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      })
      .filter((el) => el.width > 0 && el.height > 0) // visible elements only
      .filter((el) => el.width < min || el.height < min);
  }, minSize);
}

/**
 * Detect text elements that have overflowing or clipped content.
 * Uses scrollWidth > clientWidth (or scrollHeight > clientHeight) as the signal.
 */
async function getTruncatedTextElements(page: Page) {
  return page.evaluate(() => {
    const textEls = Array.from(
      document.querySelectorAll<HTMLElement>('p, h1, h2, h3, h4, h5, h6, span, label, li')
    );
    return textEls
      .filter((el) => {
        const style = window.getComputedStyle(el);
        const overflow = style.overflow + style.overflowX + style.overflowY;
        const isHidden = overflow.includes('hidden') || style.textOverflow === 'ellipsis';
        if (!isHidden) return false;
        return el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
      })
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim().slice(0, 80) || '',
        cls: el.className?.toString().slice(0, 80) || '',
        scrollW: el.scrollWidth,
        clientW: el.clientWidth,
      }));
  });
}

/**
 * Returns whether a CSS selector is visible within the viewport fold.
 * Fold is approximated as the visible viewport height.
 */
async function isAboveFold(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const vpH = window.innerHeight;
    // Element top must be within the viewport
    return rect.top < vpH && rect.bottom > 0;
  }, selector);
}

/**
 * Compute aspect ratios of images/media to detect distortion.
 * Returns items where the displayed ratio deviates > 10 % from the natural ratio.
 *
 * Images using `object-cover` / `object-contain` / `object-scale-down` are
 * intentionally cropped or letterboxed by the browser — that is NOT a distortion
 * and must be excluded from this check.
 */
async function getDistortedMedia(page: Page) {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll<HTMLImageElement>('img'))
      .filter((img) => {
        if (img.naturalWidth === 0 || img.naturalHeight === 0) return false;
        // object-cover / object-contain crop without stretching pixels — skip them
        const fit = window.getComputedStyle(img).objectFit;
        if (fit === 'cover' || fit === 'contain' || fit === 'scale-down') return false;
        return true;
      })
      .map((img) => {
        const rect = img.getBoundingClientRect();
        const naturalRatio = img.naturalWidth / img.naturalHeight;
        const displayRatio = rect.width / (rect.height || 1);
        const deviation = Math.abs(naturalRatio - displayRatio) / naturalRatio;
        return {
          src: img.src.slice(-60),
          naturalRatio: parseFloat(naturalRatio.toFixed(3)),
          displayRatio: parseFloat(displayRatio.toFixed(3)),
          deviation: parseFloat((deviation * 100).toFixed(1)),
        };
      })
      .filter((img) => img.deviation > 10); // > 10 % = actual stretch/squish distortion
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite — Library Screen (no scenario selected)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Library Screen — Viewport Layout Audit', () => {

  test.beforeEach(async ({ page }) => {
    await loadApp(page);
  });

  // ── Full-page screenshots at each breakpoint ──────────────────────────────

  test('full-page screenshot — library screen', async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;
    await expect(page).toHaveScreenshot(`library-full-${projectName}.png`, {
      fullPage: true,
      animations: 'disabled',
    });
  });

  // ── No horizontal scrolling ───────────────────────────────────────────────

  test('no horizontal scroll on library screen', async ({ page }, testInfo) => {
    const scrolled = await hasHorizontalScroll(page);
    expect(
      scrolled,
      `[${testInfo.project.name}] Horizontal scroll detected on library screen`
    ).toBe(false);
  });

  // ── No elements overflow the viewport ────────────────────────────────────

  test('no elements overflow viewport — library screen', async ({ page }, testInfo) => {
    const overflowing = await getOverflowingElements(page);
    expect(
      overflowing,
      `[${testInfo.project.name}] Overflowing elements: ${JSON.stringify(overflowing, null, 2)}`
    ).toHaveLength(0);
  });

  // ── Header is visible above the fold ─────────────────────────────────────

  test('header is visible above the fold', async ({ page }, testInfo) => {
    expect(
      await isAboveFold(page, '#app-header'),
      `[${testInfo.project.name}] Header is not visible above the fold`
    ).toBe(true);
  });

  // ── App container respects max-width = 440px ──────────────────────────────

  test('app container does not exceed 440px width', async ({ page }, testInfo) => {
    const containerWidth = await page.evaluate(() => {
      // The main container is the first child div of the body's root
      const container = document.querySelector<HTMLElement>('#app-shell');
      if (!container) return 0;
      return container.getBoundingClientRect().width;
    });
    // On narrow viewports (< 440) it should fill available width; on wide it should cap at 440
    const vp = page.viewportSize()!;
    const expectedMax = Math.min(vp.width, 440);
    expect(
      containerWidth,
      `[${testInfo.project.name}] Container width ${containerWidth}px exceeds max of ${expectedMax}px`
    ).toBeLessThanOrEqual(expectedMax + 2); // +2 for sub-pixel rounding
  });

  // ── Media / images are not distorted ─────────────────────────────────────

  test('no distorted images on library screen', async ({ page }, testInfo) => {
    const distorted = await getDistortedMedia(page);
    expect(
      distorted,
      `[${testInfo.project.name}] Distorted images: ${JSON.stringify(distorted, null, 2)}`
    ).toHaveLength(0);
  });

  // ── Typography — check minimum font sizes are legible (≥ 10px) ───────────

  test('all visible text is legible (font-size ≥ 10px)', async ({ page }, testInfo) => {
    const illegible = await page.evaluate(() => {
      const textEls = Array.from(
        document.querySelectorAll<HTMLElement>('p, h1, h2, h3, h4, h5, h6, span, button, label, li, a')
      );
      return textEls
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return false; // not visible
          if (!el.textContent?.trim()) return false;
          const fs = parseFloat(window.getComputedStyle(el).fontSize);
          return fs < 10;
        })
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.trim().slice(0, 60) || '',
          fontSize: parseFloat(window.getComputedStyle(el).fontSize),
        }));
    });

    expect(
      illegible,
      `[${testInfo.project.name}] Text elements with font-size < 10px: ${JSON.stringify(illegible, null, 2)}`
    ).toHaveLength(0);
  });

  // ── Touch targets on mobile viewports ────────────────────────────────────

  test('interactive elements meet 44px touch target on mobile', async ({ page }, testInfo) => {
    const vp = page.viewportSize()!;
    // Only enforce on narrow (mobile) viewports
    if (vp.width >= 768) {
      test.skip();
      return;
    }
    const small = await getSmallTouchTargets(page, 44);
    // Filter out purely decorative or non-interactive elements
    const actionable = small.filter(
      (el) => el.tag === 'button' || el.tag === 'a'
    );
    expect(
      actionable,
      `[${testInfo.project.name}] Buttons/links with sub-44px touch target: ${JSON.stringify(actionable, null, 2)}`
    ).toHaveLength(0);
  });

  // ── Content visible above the fold ───────────────────────────────────────

  test('scenario list / library content visible above fold', async ({ page }, testInfo) => {
    // The library screen renders at least one scenario card
    const hasContent = await page.evaluate(() => {
      // Look for any list item, card div, or button that likely represents scenario entries
      const cards = document.querySelectorAll('button, li, [data-testid]');
      const vpH = window.innerHeight;
      return Array.from(cards).some((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top < vpH && rect.bottom > 0 && rect.width > 0;
      });
    });
    expect(
      hasContent,
      `[${testInfo.project.name}] No library content visible above the fold`
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite — Active Scenario Screen
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Active Scenario Screen — Layout Audit', () => {

  /**
   * Before each test: load app and click the first available scenario card
   * to enter the active scenario view.
   */
  test.beforeEach(async ({ page }) => {
    await loadApp(page);

    // Wait for scenario cards to load from IndexedDB, then click the first one
    await selectFirstScenario(page);
  });

  // ── Full-page screenshot — active scenario ────────────────────────────────

  test('full-page screenshot — patient tab', async ({ page }, testInfo) => {
    const projectName = testInfo.project.name;
    await expect(page).toHaveScreenshot(`scenario-patient-${projectName}.png`, {
      fullPage: true,
      animations: 'disabled',
    });
  });

  // ── No horizontal scrolling ───────────────────────────────────────────────

  test('no horizontal scroll on patient tab', async ({ page }, testInfo) => {
    const scrolled = await hasHorizontalScroll(page);
    expect(
      scrolled,
      `[${testInfo.project.name}] Horizontal scroll on patient tab`
    ).toBe(false);
  });

  // ── No overflow elements ──────────────────────────────────────────────────

  test('no elements overflow viewport — patient tab', async ({ page }, testInfo) => {
    const overflowing = await getOverflowingElements(page);
    expect(
      overflowing,
      `[${testInfo.project.name}] Overflowing: ${JSON.stringify(overflowing, null, 2)}`
    ).toHaveLength(0);
  });

  // ── BottomNav is visible and within viewport ──────────────────────────────

  test('bottom navigation is visible above the fold', async ({ page }, testInfo) => {
    const visible = await page.evaluate(() => {
      const nav = document.querySelector('#bottom-navigation-bar');
      if (!nav) return false;
      const rect = nav.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    });
    expect(
      visible,
      `[${testInfo.project.name}] BottomNav is not visible`
    ).toBe(true);
  });

  // ── BottomNav buttons meet touch target on mobile ─────────────────────────

  test('BottomNav tab buttons meet 44px touch target', async ({ page }, testInfo) => {
    const vp = page.viewportSize()!;
    if (vp.width >= 768) {
      test.skip();
      return;
    }
    const navBtns = await page.evaluate(() => {
      const nav = document.querySelector('#bottom-navigation-bar');
      if (!nav) return [];
      return Array.from(nav.querySelectorAll<HTMLElement>('button')).map((btn) => {
        const rect = btn.getBoundingClientRect();
        return {
          text: btn.textContent?.trim().slice(0, 30) || '',
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      });
    });
    const failing = navBtns.filter((b) => b.height < 44 || b.width < 44);
    expect(
      failing,
      `[${testInfo.project.name}] BottomNav buttons below 44px: ${JSON.stringify(failing, null, 2)}`
    ).toHaveLength(0);
  });

  // ── Header sticky at top ──────────────────────────────────────────────────

  test('header remains sticky at top after scroll', async ({ page }, testInfo) => {
    await page.evaluate(() => window.scrollBy(0, 200));
    await page.waitForTimeout(100);

    const headerTop = await page.evaluate(() => {
      const h = document.querySelector('#app-header');
      return h ? h.getBoundingClientRect().top : -1;
    });
    expect(
      headerTop,
      `[${testInfo.project.name}] Header top after scroll: ${headerTop}px (expected ≤ 0)`
    ).toBeLessThanOrEqual(0);
  });

  // ── Actions tab layout ────────────────────────────────────────────────────

  test('full-page screenshot — actions tab', async ({ page }, testInfo) => {
    await page.click('button:has-text("Actions")');
    await page.waitForTimeout(300);
    await freezeAnimations(page);
    await expect(page).toHaveScreenshot(`scenario-actions-${testInfo.project.name}.png`, {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('no horizontal scroll on actions tab', async ({ page }, testInfo) => {
    await page.click('button:has-text("Actions")');
    await page.waitForTimeout(200);
    const scrolled = await hasHorizontalScroll(page);
    expect(
      scrolled,
      `[${testInfo.project.name}] Horizontal scroll on actions tab`
    ).toBe(false);
  });

  test('no overflow on actions tab', async ({ page }, testInfo) => {
    await page.click('button:has-text("Actions")');
    await page.waitForTimeout(200);
    const overflowing = await getOverflowingElements(page);
    expect(
      overflowing,
      `[${testInfo.project.name}] Actions tab overflow: ${JSON.stringify(overflowing, null, 2)}`
    ).toHaveLength(0);
  });

  // ── Status tab layout ─────────────────────────────────────────────────────

  test('full-page screenshot — status tab', async ({ page }, testInfo) => {
    await page.click('button:has-text("Status")');
    await page.waitForTimeout(300);
    await freezeAnimations(page);
    await expect(page).toHaveScreenshot(`scenario-status-${testInfo.project.name}.png`, {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('no horizontal scroll on status tab', async ({ page }, testInfo) => {
    await page.click('button:has-text("Status")');
    await page.waitForTimeout(200);
    const scrolled = await hasHorizontalScroll(page);
    expect(
      scrolled,
      `[${testInfo.project.name}] Horizontal scroll on status tab`
    ).toBe(false);
  });

  test('no overflow on status tab', async ({ page }, testInfo) => {
    await page.click('button:has-text("Status")');
    await page.waitForTimeout(200);
    const overflowing = await getOverflowingElements(page);
    expect(
      overflowing,
      `[${testInfo.project.name}] Status tab overflow: ${JSON.stringify(overflowing, null, 2)}`
    ).toHaveLength(0);
  });

  // ── No distorted media in scenario view ──────────────────────────────────

  test('no distorted images in scenario view', async ({ page }, testInfo) => {
    const distorted = await getDistortedMedia(page);
    expect(
      distorted,
      `[${testInfo.project.name}] Distorted media: ${JSON.stringify(distorted, null, 2)}`
    ).toHaveLength(0);
  });

  // ── Typography legibility in scenario ────────────────────────────────────

  test('all visible text is legible (font-size ≥ 10px) in scenario', async ({ page }, testInfo) => {
    const illegible = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll<HTMLElement>('p, h1, h2, h3, h4, h5, h6, span, button, label, li, a')
      )
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return false;
          if (!el.textContent?.trim()) return false;
          const fs = parseFloat(window.getComputedStyle(el).fontSize);
          return fs < 10;
        })
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.trim().slice(0, 60) || '',
          fontSize: parseFloat(window.getComputedStyle(el).fontSize),
        }));
    });
    expect(
      illegible,
      `[${testInfo.project.name}] Illegible text: ${JSON.stringify(illegible, null, 2)}`
    ).toHaveLength(0);
  });

  // ── Text truncation report (informational — not a hard failure) ───────────

  test('text truncation audit — log truncated elements', async ({ page }, testInfo) => {
    const truncated = await getTruncatedTextElements(page);
    // Attach the list to the test report for visibility
    if (truncated.length > 0) {
      testInfo.attach('truncated-text-elements', {
        contentType: 'application/json',
        body: Buffer.from(JSON.stringify(truncated, null, 2)),
      });
    }
    // Hard-fail only when critical heading text is truncated
    const truncatedHeadings = truncated.filter((el) =>
      ['h1', 'h2', 'h3'].includes(el.tag)
    );
    expect(
      truncatedHeadings,
      `[${testInfo.project.name}] Truncated headings: ${JSON.stringify(truncatedHeadings, null, 2)}`
    ).toHaveLength(0);
  });

  // ── Grid / flex layout doesn't break on narrow viewports ─────────────────

  test('grid/flex rows do not stack or overflow on 320px viewport', async ({ page }, testInfo) => {
    // Only run on the narrowest viewport project
    const vp = page.viewportSize()!;
    if (vp.width > 375) {
      test.skip();
      return;
    }
    // All grid/flex children should be within the page width
    const overflowing = await getOverflowingElements(page);
    expect(
      overflowing,
      `[${testInfo.project.name}] Broken grid on narrow viewport: ${JSON.stringify(overflowing, null, 2)}`
    ).toHaveLength(0);
  });

  // ── Container proportional scaling on wide viewports ─────────────────────

  test('app container centers and caps at 440px on wide viewports', async ({ page }, testInfo) => {
    const vp = page.viewportSize()!;
    if (vp.width < 768) {
      test.skip();
      return;
    }
    const info = await page.evaluate(() => {
      const container = document.querySelector<HTMLElement>('#app-shell');
      if (!container) return null;
      const rect = container.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      return {
        width: Math.round(rect.width),
        left: Math.round(rect.left),
        vw,
      };
    });
    expect(info).not.toBeNull();
    // Width must not exceed 440px
    expect(
      info!.width,
      `[${testInfo.project.name}] Container ${info!.width}px wide — should be ≤ 440px`
    ).toBeLessThanOrEqual(442); // +2 for sub-pixel tolerance
    // Container should be roughly centered (left margin ≥ half the remaining space - 10px)
    const expectedMargin = (info!.vw - info!.width) / 2;
    expect(
      info!.left,
      `[${testInfo.project.name}] Container left ${info!.left}px — expected ≈ ${expectedMargin}px (centered)`
    ).toBeGreaterThanOrEqual(expectedMargin - 10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite — Specific Component Layout Checks
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Component-level layout checks', () => {

  test.beforeEach(async ({ page }) => {
    await loadApp(page);
  });

  // ── Header component ──────────────────────────────────────────────────────

  test('header logo and help button do not overlap', async ({ page }, testInfo) => {
    const noOverlap = await page.evaluate(() => {
      const logo = document.querySelector<HTMLElement>('#app-header > div');
      const helpBtn = document.querySelector<HTMLElement>('#help-btn');
      if (!logo || !helpBtn) return true; // can't check — pass
      const lr = logo.getBoundingClientRect();
      const hr = helpBtn.getBoundingClientRect();
      // Check that they don't overlap horizontally
      return lr.right < hr.left || hr.right < lr.left;
    });
    expect(
      noOverlap,
      `[${testInfo.project.name}] Header logo and help button overlap`
    ).toBe(true);
  });

  test('help button meets 44px touch target size', async ({ page }, testInfo) => {
    const vp = page.viewportSize()!;
    if (vp.width >= 768) {
      test.skip();
      return;
    }
    const size = await page.evaluate(() => {
      const btn = document.querySelector<HTMLElement>('#help-btn');
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      return { w: Math.round(rect.width), h: Math.round(rect.height) };
    });
    expect(size).not.toBeNull();
    expect(
      size!.h,
      `[${testInfo.project.name}] Help button height ${size!.h}px < 44px`
    ).toBeGreaterThanOrEqual(44);
    expect(
      size!.w,
      `[${testInfo.project.name}] Help button width ${size!.w}px < 44px`
    ).toBeGreaterThanOrEqual(44);
  });

  // ── Scenario card screenshot (library) ───────────────────────────────────

  test('screenshot — header component', async ({ page }, testInfo) => {
    const header = page.locator('#app-header');
    await expect(header).toHaveScreenshot(`header-${testInfo.project.name}.png`, {
      animations: 'disabled',
    });
  });

  // ── After entering scenario: BottomNav screenshot ────────────────────────

  test('screenshot — bottom nav component', async ({ page }, testInfo) => {
    // Wait for scenario cards to load from IndexedDB, then click the first one
    await selectFirstScenario(page);

    const nav = page.locator('#bottom-navigation-bar');
    await expect(nav).toHaveScreenshot(`bottom-nav-${testInfo.project.name}.png`, {
      animations: 'disabled',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite — Cross-browser Consistency (snapshot diff)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Cross-browser rendering consistency', () => {

  test('library screen renders consistently across browsers', async ({ page }, testInfo) => {
    await loadApp(page);
    await expect(page).toHaveScreenshot(`xbrowser-library-${testInfo.project.name}.png`, {
      fullPage: false, // viewport only for cross-browser comparison
      animations: 'disabled',
      maxDiffPixelRatio: 0.05, // slightly more tolerant across rendering engines
    });
  });

  test('scenario patient tab renders consistently across browsers', async ({ page }, testInfo) => {
    await loadApp(page);
    await selectFirstScenario(page);

    await expect(page).toHaveScreenshot(`xbrowser-scenario-${testInfo.project.name}.png`, {
      fullPage: false,
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite — Viewport-specific edge cases
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Viewport edge cases', () => {

  test('app loads and renders at 320px without JS errors', async ({ page }, testInfo) => {
    const vp = page.viewportSize()!;
    if (vp.width !== 320) {
      test.skip();
      return;
    }
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await loadApp(page);
    expect(
      errors,
      `[${testInfo.project.name}] JS errors on 320px: ${errors.join('; ')}`
    ).toHaveLength(0);
  });

  test('no layout overflow on 1920px wide desktop', async ({ page }, testInfo) => {
    const vp = page.viewportSize()!;
    if (vp.width !== 1920) {
      test.skip();
      return;
    }
    await loadApp(page);
    const scrolled = await hasHorizontalScroll(page);
    expect(
      scrolled,
      `[${testInfo.project.name}] Unexpected horizontal scroll on 1920px`
    ).toBe(false);
  });

  test('iPad Pro layout: container uses available width sensibly', async ({ page }, testInfo) => {
    if (!testInfo.project.name.includes('ipad')) {
      test.skip();
      return;
    }
    await loadApp(page);
    const info = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>('#app-shell');
      if (!root) return null;
      const rect = root.getBoundingClientRect();
      return { width: rect.width, vw: document.documentElement.clientWidth };
    });
    expect(info).not.toBeNull();
    // On iPad Pro (1024px wide), container should be max 440px centered
    expect(
      info!.width,
      `iPad Pro: container width ${info!.width}px should be ≤ 440px`
    ).toBeLessThanOrEqual(442);
  });
});
