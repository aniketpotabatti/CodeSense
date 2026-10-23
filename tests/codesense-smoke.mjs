import { chromium } from "playwright-core";

/**
 * CodeSense smoke automation: load sample -> Explain -> Review -> Apply,
 * plus a browser-smoke-style load check on desktop and mobile.
 *
 * Runs against the dev server already serving http://127.0.0.1:8080
 * (started via startup.sh / `npm run dev`). Uses the installed playwright-core
 * so no extra dependency is required.
 *
 * Notes:
 * - The "Apply" step is best-effort: demo mode returns markdown, not a parsed
 *   refactor diff, so no "Preview & Apply" button appears. That is expected
 *   behaviour, not a regression.
 * - `browser-smoke.mjs` is the canonical smoke pass but its output-path guard
 *   requires a `/workspace` prefix that cannot resolve on this Windows host,
 *   so this script reproduces its checks (status, body text, horizontal
 *   overflow, console/page errors) without writing screenshots.
 */
(async () => {
  const browser = await chromium.launch({ headless: true });
  const failures = [];

  const checkViewport = async (name, width, height, interactive = false) => {
    const errors = { console: [], page: [] };
    const page = await browser.newPage({
      viewport: { width, height },
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.console.push(msg.text());
    });
    page.on("pageerror", (err) => errors.page.push(String(err?.message || err)));

    try {
      const resp = await page.goto("http://127.0.0.1:8080/", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      const status = resp?.status() ?? 0;
      await page.waitForTimeout(1000);

      const bodyText = (await page.locator("body").innerText().catch(() => "")) || "";
      const horizontalOverflow = await page.evaluate(() => {
        const el = document.documentElement;
        return el.scrollWidth > el.clientWidth + 1;
      });

      console.log(
        `[${name}] status=${status} bodyTextLen=${bodyText.trim().length} horizontalOverflow=${horizontalOverflow} consoleErrors=${errors.console.length} pageErrors=${errors.page.length}`,
      );

      if (status >= 400 || status === 0) failures.push(`${name}: HTTP ${status}`);
      if (errors.console.length > 0) failures.push(`${name}: ${errors.console.length} console error(s)`);
      if (errors.page.length > 0) failures.push(`${name}: ${errors.page.length} page error(s)`);
      if (horizontalOverflow) failures.push(`${name}: horizontal overflow`);
      if (bodyText.trim().length < 10) failures.push(`${name}: no visible body text`);

      if (interactive) {
        const explainBtn = page
          .locator("button")
          .filter({ hasText: /Explain/ })
          .first();
        const reviewBtn = page
          .locator("button")
          .filter({ hasText: /Review/ })
          .first();
        if ((await explainBtn.count()) === 0) failures.push(`${name}: Explain button missing`);
        if ((await reviewBtn.count()) === 0) failures.push(`${name}: Review button missing`);

        if ((await explainBtn.count()) > 0) {
          await explainBtn.click();
          await page.waitForTimeout(2500);
          const explainText = ((await page.locator("aside").textContent()) || "").trim();
          console.log(`[${name}] explain insight length: ${explainText.length}`);
          if (explainText.length < 10) failures.push(`${name}: no explain insight`);
        }

        if ((await reviewBtn.count()) > 0) {
          await reviewBtn.click();
          await page.waitForTimeout(2500);
          const reviewText = ((await page.locator("aside").textContent()) || "").trim();
          console.log(`[${name}] review insight length: ${reviewText.length}`);
          if (reviewText.length < 10) failures.push(`${name}: no review insight`);

          const previewApply = page
            .locator("button")
            .filter({ hasText: /Preview & Apply/ })
            .first();
          if ((await previewApply.count()) > 0) {
            await previewApply.click();
            await page.waitForTimeout(1000);
            const dialog = page.locator("[role=dialog]");
            if ((await dialog.count()) > 0) {
              const confirm = dialog
                .locator("button")
                .filter({ hasText: /Apply/ })
                .first();
              if ((await confirm.count()) > 0) {
                await confirm.click();
                await page.waitForTimeout(1000);
                console.log(`[${name}] refactor applied via diff dialog`);
              } else {
                failures.push(`${name}: diff dialog opened but no Apply button`);
              }
            } else {
              failures.push(`${name}: Preview & Apply clicked but no dialog opened`);
            }
          } else {
            console.log(`[${name}] no refactor "Preview & Apply" button (demo review ships no refactor)`);
          }
        }
      }
    } catch (err) {
      failures.push(`${name}: unexpected error: ${err.message}`);
    } finally {
      await page.close();
    }
  };

  await checkViewport("desktop", 1280, 800, true);
  await checkViewport("mobile", 390, 844, false);

  await browser.close();

  if (failures.length) {
    console.error("SMOKE FAIL:", failures);
    process.exit(1);
  }
  console.log("SMOKE PASS");
  process.exit(0);
})();
