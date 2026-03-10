"""
Screenshot audit script for simnurse-app.
Captures full-page screenshots across mobile (390x844) and desktop (1024x768) viewports.
Assumes Vite dev server is already running at http://localhost:5173.

Usage:
    pip install playwright
    playwright install chromium
    python tmp_screenshot_audit.py
"""

import asyncio
import os
from pathlib import Path

from playwright.async_api import async_playwright, Page

BASE_URL = "http://localhost:5173"
OUTPUT_DIR = Path("d:/Projects/simnurse-app/tmp_screenshots")

VIEWPORTS = [
    {"name": "mobile", "width": 390, "height": 844},
    {"name": "desktop", "width": 1024, "height": 768},
]


def ss(name: str, suffix: str) -> Path:
    """Build an output path like tmp_screenshots/tmp_ss_<name>_<suffix>.png"""
    return OUTPUT_DIR / f"tmp_ss_{name}_{suffix}.png"


async def capture_flow(page: Page, suffix: str) -> None:
    """Run the full screenshot flow for a single page / viewport."""

    # ── 1. Library screen ──────────────────────────────────────────────────
    await page.goto(BASE_URL, wait_until="networkidle")
    await page.screenshot(path=str(ss("library", suffix)), full_page=True)
    print(f"[{suffix}] ✓ library")

    # ── 2. Preview modal ───────────────────────────────────────────────────
    first_card = page.locator('button[id^="scenario-btn-"]').first
    await first_card.wait_for(state="visible", timeout=10_000)
    await first_card.click()
    # Wait for the modal to appear — look for the begin button
    await page.locator("#begin-scenario-btn").wait_for(state="visible", timeout=10_000)
    await page.screenshot(path=str(ss("preview_modal", suffix)), full_page=True)
    print(f"[{suffix}] ✓ preview_modal")

    # ── 3. Patient tab (scenario running) ──────────────────────────────────
    await page.locator("#begin-scenario-btn").click()
    await asyncio.sleep(2)
    await page.screenshot(path=str(ss("patient_tab", suffix)), full_page=True)
    print(f"[{suffix}] ✓ patient_tab")

    # ── 4. Actions tab ──────────────────────────────────────────────────────
    await page.locator("#nav-tab-actions").click()
    await asyncio.sleep(1)
    await page.screenshot(path=str(ss("actions_tab", suffix)), full_page=True)
    print(f"[{suffix}] ✓ actions_tab")

    # ── 5. Status tab ───────────────────────────────────────────────────────
    await page.locator("#nav-tab-status").click()
    await asyncio.sleep(1)
    await page.screenshot(path=str(ss("status_tab", suffix)), full_page=True)
    print(f"[{suffix}] ✓ status_tab")

    # ── 6. Quick-inspection unlock (optional) ──────────────────────────────
    qi_btn = page.locator("#quick-inspection-btn")
    if await qi_btn.count() > 0:
        try:
            await qi_btn.wait_for(state="visible", timeout=3_000)
            await qi_btn.click()
            await asyncio.sleep(0.5)
            await page.screenshot(path=str(ss("status_unlocked", suffix)), full_page=True)
            print(f"[{suffix}] ✓ status_unlocked")
        except Exception as exc:
            print(f"[{suffix}] ⚠ quick-inspection-btn found but could not click: {exc}")
    else:
        print(f"[{suffix}] – quick-inspection-btn not present, skipping")

    # ── 7. Mini-monitor element screenshot ─────────────────────────────────
    mini = page.locator("#mini-monitor")
    if await mini.count() > 0:
        try:
            await mini.wait_for(state="visible", timeout=5_000)
            await mini.screenshot(path=str(ss("mini_monitor", suffix)))
            print(f"[{suffix}] ✓ mini_monitor")
        except Exception as exc:
            print(f"[{suffix}] ⚠ #mini-monitor visible but screenshot failed: {exc}")
    else:
        print(f"[{suffix}] – #mini-monitor not present on this view, skipping")


async def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Output directory: {OUTPUT_DIR}\n")

    async with async_playwright() as pw:
        for vp in VIEWPORTS:
            suffix = vp["name"]
            print(f"=== Viewport: {suffix} ({vp['width']}×{vp['height']}) ===")

            browser = await pw.chromium.launch(headless=True)
            context = await browser.new_context(
                viewport={"width": vp["width"], "height": vp["height"]},
                device_scale_factor=2 if suffix == "mobile" else 1,
            )
            page = await context.new_page()

            try:
                await capture_flow(page, suffix)
            except Exception as exc:
                print(f"[{suffix}] ✗ Flow failed: {exc}")
                raise
            finally:
                await context.close()
                await browser.close()

            print()

    print("All screenshots saved to", OUTPUT_DIR)


if __name__ == "__main__":
    asyncio.run(main())
