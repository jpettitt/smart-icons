import { expect, test } from '@playwright/test';

/**
 * Smoke tests for the rule editor after the v0.3.0a2 conversion
 * to HA-native form elements. Each assertion targets the silent
 * zero-height failure mode the lazy-load guide warns about — if
 * an `ha-*` element didn't register, its rendered box collapses
 * to zero height with no console error.
 *
 * Test plan:
 *  1. + Add rule opens the dialog with a non-zero-height form.
 *  2. Mode `ha-selector` shows Mapping / Thresholds options.
 *  3. Mode switch swaps the body between Mapping and Thresholds.
 *  4. Source-attribute / Priority `ha-input` fields render.
 *  5. Add-row `ha-button` controls render and respond.
 *  6. Color picker swatch + hex `ha-input` coexist.
 *  7. Per-rule YAML toggle still works (the bare-textarea path).
 *  8. Cancel closes the dialog without persisting.
 */

const PANEL_URL = '/smart-icons';

/** Walk the panel's nested shadow roots and return the first element
 *  matching the selector at any depth. Smart Icons mounts via
 *  `_panel_custom` so the editor lives ~4 shadow roots deep:
 *  `home-assistant` → `home-assistant-main` → `partial-panel-resolver`
 *  → `ha-panel-custom` → `<smart-icons-panel>` → … . Playwright's
 *  `>>` selector engine handles open shadow roots natively via the
 *  `pierce/` or `css=` syntax; we lean on that. */
const PANEL = 'smart-icons-panel';

test.describe('Smart Icons panel — rule editor (v0.3.0a2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PANEL_URL);
    // Wait for the panel custom element to register and render at
    // least its outer ha-card. The painter's wait pattern is the
    // canonical "HA is alive" probe.
    await page.waitForFunction(
      () => Boolean(customElements.get('smart-icons-panel')),
      { timeout: 30_000 },
    );
  });

  test('+ Add rule opens the editor with non-zero form sections', async ({ page }) => {
    await page.locator(`${PANEL} ha-button`, { hasText: '+ Add rule' }).click();

    // Editor mounts inside an ha-dialog. Wait for it.
    const editor = page.locator('smart-icons-rule-editor');
    await expect(editor).toBeVisible({ timeout: 5_000 });

    // Every form section should have non-zero rendered height —
    // that's the canary for "did the ha-* elements load."
    const sections = editor.locator('section.group');
    const count = await sections.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await sections.nth(i).boundingBox();
      expect(box, `section ${i} bounding box`).not.toBeNull();
      expect(box!.height, `section ${i} height`).toBeGreaterThan(20);
    }

    await page.screenshot({
      path: 'test-e2e/screenshots/rule-editor-blank.png',
      fullPage: true,
    });

    // Cancel — no state changes.
    await editor.locator('ha-button', { hasText: /cancel/i }).click();
  });

  /** Switch the Mode dropdown to Thresholds. The editor contains
   *  three ha-selector instances (target entities, source entity,
   *  and Mode) — scoping by the Decoration section's group makes
   *  sure we click the right one. HA's ha-selector in
   *  select+dropdown mode opens a portaled menu whose options
   *  don't use role="option"; a text-based locator at the page
   *  level is the robust path. */
  async function selectThresholdsMode(page, editor) {
    // The editor has three ha-selector instances in mapping mode
    // (target entities, source entity, Mode) — the Decoration
    // section's selector is the third. Filter by hasText: 'Mode'
    // would be more semantic but fails when the selector's label
    // is rendered in a child shadow root that hasText doesn't
    // pierce; index-based is reliable here.
    await editor.locator('ha-selector').nth(2).click();
    await page
      .getByText('Thresholds (numeric ranges)', { exact: true })
      .click();
  }

  test('Mode ha-selector switches between Mapping and Thresholds', async ({ page }) => {
    await page.locator(`${PANEL} ha-button`, { hasText: '+ Add rule' }).click();
    const editor = page.locator('smart-icons-rule-editor');
    await expect(editor).toBeVisible();

    // Mapping mode is the default — the mapping fieldset should
    // be present with the "State → decoration" legend.
    await expect(
      editor.locator('fieldset legend', { hasText: /State/i }).first(),
    ).toBeVisible();

    await selectThresholdsMode(page, editor);

    // After switching, the Threshold-row fieldset should be present.
    await expect(
      editor.locator('fieldset legend', { hasText: /Threshold entries/i }),
    ).toBeVisible();

    await page.screenshot({
      path: 'test-e2e/screenshots/rule-editor-thresholds.png',
      fullPage: true,
    });

    await editor.locator('ha-button', { hasText: /cancel/i }).click();
  });

  test('add-row ha-buttons render (Add entry / Add state / Add pattern)', async ({ page }) => {
    await page.locator(`${PANEL} ha-button`, { hasText: '+ Add rule' }).click();
    const editor = page.locator('smart-icons-rule-editor');

    // Add state (mapping is default mode)
    const addState = editor.locator('ha-button', { hasText: '+ Add state' });
    await expect(addState).toBeVisible();
    expect((await addState.boundingBox())!.height).toBeGreaterThan(20);

    // Add pattern (visible in the targets section regardless of mode)
    const addPattern = editor.locator('ha-button', { hasText: '+ Add pattern' });
    await expect(addPattern).toBeVisible();
    expect((await addPattern.boundingBox())!.height).toBeGreaterThan(20);

    // Switch to thresholds for + Add entry
    await selectThresholdsMode(page, editor);
    const addEntry = editor.locator('ha-button', { hasText: '+ Add entry' });
    await expect(addEntry).toBeVisible();
    expect((await addEntry.boundingBox())!.height).toBeGreaterThan(20);

    await editor.locator('ha-button', { hasText: /cancel/i }).click();
  });

  test('Show code editor toggle reveals the YAML textarea', async ({ page }) => {
    await page.locator(`${PANEL} ha-button`, { hasText: '+ Add rule' }).click();
    const editor = page.locator('smart-icons-rule-editor');
    await editor.locator('button.text-toggle', { hasText: /code editor/i }).click();

    // Bare textarea per the guide — should be visible with non-zero
    // height.
    const yaml = editor.locator('textarea.yaml-area');
    await expect(yaml).toBeVisible();
    expect((await yaml.boundingBox())!.height).toBeGreaterThan(60);

    await page.screenshot({
      path: 'test-e2e/screenshots/rule-editor-yaml.png',
      fullPage: true,
    });

    await editor.locator('ha-button', { hasText: /cancel/i }).click();
  });
});
