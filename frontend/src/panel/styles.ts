/**
 * Shared styles for the Smart Icons panel UI.
 *
 * Plain HTML inputs styled with HA's CSS variables (`--primary-text-color`,
 * `--divider-color`, etc.) so we get theme-correct colors and dark-mode
 * adaptation without depending on ha-textfield's load order. ha-switch
 * is the only HA-specific input we use; everything else is `<input>` /
 * `<select>` / `<button>`.
 */

import { css } from 'lit';

export const panelStyles = css`
  :host {
    display: block;
    padding: 24px 16px;
    max-width: 1200px;
    margin: 0 auto;
    box-sizing: border-box;
    color: var(--primary-text-color, #212121);
  }
  ha-card {
    padding: 16px;
    /* container-type: inline-size lets us write @container queries
       below that respond to the card's own width, not the viewport.
       Viewport-based media queries miss the sidebar-open case (the
       panel iframe is narrower but the viewport isn't). */
    container-type: inline-size;
    container-name: panel;
  }
  /* min-width: 0 chain so the table can shrink with its container
     instead of being pushed wider by long target names or the
     non-wrapping actions column. Without this, flex/grid ancestors
     hand the table their content-width rather than their box-width. */
  .table-wrap {
    min-width: 0;
    overflow-x: auto;
  }
  /* Banner for failures from out-of-dialog actions (toggle, delete).
     Sits above the table so it can't be missed; dismissible via the × button. */
  .action-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 0 0 12px;
    padding: 8px 12px;
    color: var(--error-color, #db4437);
    background-color: color-mix(
      in srgb,
      var(--error-color, #db4437) 10%,
      transparent
    );
    border-radius: 4px;
    font-size: 0.9em;
  }
  .action-error-dismiss {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 1.4em;
    line-height: 1;
    padding: 2px 8px;
    border-radius: 4px;
  }
  /* Panel-level action bar (visual mode: just the toggle link;
     code mode: toggle on left, Save on right). Mirrors the editor's
     .actions bar but lives directly in the panel content rather than
     inside a dialog. Not sticky — the panel scrolls as a whole. */
  .panel-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--divider-color, #e0e0e0);
  }
  /* Action row at the bottom of an ha-dialog body — the workaround
     for modern ha-dialog dropping its primaryAction / secondaryAction
     named slots. Right-aligns Cancel + Confirm to match HA's own
     visual convention for confirmation modals. */
  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
  }
  /* "Show code editor" / "Show visual editor" toggle. Plain text in
     the primary color — matches HA's automation-editor pattern. */
  .text-toggle {
    background: none;
    border: none;
    color: var(--primary-color, #03a9f4);
    cursor: pointer;
    font: inherit;
    font-size: 0.95em;
    font-weight: 500;
    padding: 8px 12px;
    border-radius: 4px;
    margin: 0;
  }
  .text-toggle:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }
  .text-toggle:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 1px;
  }
  .text-toggle:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  /* YAML textarea for the panel's whole-config code view. Same shape
     as the editor's .yaml-area (the two stylesheets are scoped to
     different shadow roots, so each one declares it once). */
  .yaml-area {
    width: 100%;
    min-height: 420px;
    max-height: 70vh;
    box-sizing: border-box;
    padding: 10px 12px;
    background: var(--code-editor-background-color, var(--card-background-color, #fff));
    color: var(--primary-text-color, #212121);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    font-family: var(--code-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
    font-size: 0.9em;
    line-height: 1.4;
    resize: vertical;
    white-space: pre;
    tab-size: 2;
  }
  .yaml-area:focus {
    outline: none;
    border-color: var(--primary-color, #03a9f4);
  }
  /* Inline error block below the YAML textarea (parse failures,
     server validation failures, transport errors). Wider than the
     table's action-error banner — this surface accepts a free-form
     message and an optional clickable per-rule list. */
  .inline-error {
    margin: 12px 0 0;
    padding: 8px 12px;
    color: var(--warning-color, #ff9800);
    background-color: color-mix(
      in srgb,
      var(--warning-color, #ff9800) 8%,
      transparent
    );
    border-radius: 4px;
    font-size: 0.9em;
  }
  .inline-error-message {
    white-space: pre-wrap;
  }
  /* Per-rule error list — clicking an item focuses the textarea and
     selects the failing rule's lines. Render as plain buttons so the
     whole row is the click target and keyboard navigation works. */
  .rule-error-list {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
  }
  .rule-error-list li {
    margin: 2px 0;
  }
  .rule-error-item {
    background: none;
    border: none;
    text-align: left;
    color: inherit;
    cursor: pointer;
    font: inherit;
    padding: 4px 6px;
    border-radius: 3px;
    width: 100%;
    display: block;
    white-space: pre-wrap;
  }
  .rule-error-item::before {
    content: '▸ ';
    font-weight: bold;
  }
  .rule-error-item:hover {
    background-color: color-mix(
      in srgb,
      var(--warning-color, #ff9800) 16%,
      transparent
    );
  }
  .rule-error-item:focus-visible {
    outline: 2px solid var(--warning-color, #ff9800);
    outline-offset: 1px;
  }
  .action-error-dismiss:hover {
    background: color-mix(
      in srgb,
      var(--error-color, #db4437) 15%,
      transparent
    );
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  h1 {
    font-size: 1.4em;
    margin: 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th,
  td {
    text-align: left;
    padding: 8px;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
    vertical-align: middle;
  }
  th {
    font-weight: 500;
    color: var(--secondary-text-color, #727272);
  }
  td.actions {
    text-align: right;
  }
  .action-buttons {
    display: inline-flex;
    gap: 12px;
    align-items: center;
  }
  .empty {
    text-align: center;
    padding: 40px 24px;
    color: var(--secondary-text-color, #727272);
    max-width: 540px;
    margin: 0 auto;
  }
  .empty-illustration {
    font-size: 3em;
    margin-bottom: 8px;
  }
  .empty h2 {
    margin: 0 0 12px;
    color: var(--primary-text-color, #212121);
  }
  .empty-lead {
    font-size: 1.05em;
    margin: 0 0 16px;
  }
  .empty-examples {
    text-align: left;
    display: inline-block;
    margin: 8px 0 20px;
    padding-left: 20px;
  }
  .empty-examples li {
    margin-bottom: 6px;
  }
  .empty-examples code {
    background: var(--secondary-background-color, #f5f5f5);
    padding: 1px 4px;
    border-radius: 3px;
    font-family: var(--code-font-family, monospace);
    font-size: 0.9em;
    color: var(--primary-text-color, #212121);
  }
  .pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.85em;
    background: var(--divider-color, #e0e0e0);
    color: var(--primary-text-color, #212121);
  }
  button.btn-text,
  button.btn-primary {
    background: none;
    border: none;
    color: var(--primary-color, #03a9f4);
    text-transform: uppercase;
    font-size: 0.9em;
    font-weight: 500;
    padding: 8px 16px;
    cursor: pointer;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }
  button.btn-text:hover,
  button.btn-primary:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }
  button.btn-primary {
    background: var(--primary-color, #03a9f4);
    color: var(--text-primary-color, #fff);
  }
  button.btn-primary:hover {
    background: var(--primary-color, #03a9f4);
    filter: brightness(1.1);
  }
  button.btn-primary:disabled,
  button.btn-text:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  button.btn-primary:disabled:hover {
    filter: none;
  }

  /* Narrow-container layout: the table reformats as a vertical stack
     of cards (one card per rule). Each cell becomes a labeled row
     using the data-label attribute we set in renderRow(). Avoids
     horizontal overflow and preserves all the info.

     Uses a container query against ha-card (declared as a
     container above) so the trigger is the card's own width — this
     correctly fires when the HA sidebar opens and squeezes the
     panel, where a viewport-based @media query would miss it.

     Threshold ~860px: the actions column carries three ha-buttons
     (~270px) on top of five other columns, so anything narrower
     than ~900px clips. Card-stack reads better than a horizontally-
     scrolling table below that. */
  @container panel (max-width: 860px) {
    :host {
      padding: 12px 8px;
    }
    ha-card {
      padding: 12px;
    }
    header {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }
    table,
    thead,
    tbody,
    tr,
    th,
    td {
      display: block;
    }
    thead {
      display: none;
    }
    tbody tr {
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    }
    tbody td {
      border-bottom: none;
      padding: 4px 0;
      display: grid;
      grid-template-columns: 92px 1fr;
      gap: 8px;
      align-items: center;
    }
    tbody td::before {
      content: attr(data-label);
      font-size: 0.85em;
      font-weight: 500;
      color: var(--secondary-text-color, #727272);
    }
    tbody td.actions {
      display: block;
      padding-top: 10px;
      margin-top: 8px;
      border-top: 1px solid var(--divider-color, #e0e0e0);
      text-align: left;
    }
    tbody td.actions::before {
      content: none;
    }
    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
  }
`;

export const editorStyles = css`
  :host {
    /* We zero out --dialog-content-padding on the host ha-dialog so
       our sticky save bar can sit flush against the dialog's edge.
       That means the editor itself has to provide its own content
       padding around everything *except* the sticky actions row
       (which has its own padding via .actions). */
    display: block;
    width: 100%;
    padding: 16px 16px 0;
    color: var(--primary-text-color, #212121);
    box-sizing: border-box;
  }
  .actions {
    /* Pull the bar out to the editor's edge so its border-top spans
       the full dialog width, not the inset content area. */
    margin-left: -16px;
    margin-right: -16px;
  }
  /* Mobile: tighter padding and the sticky bar drops back to static
     flow. Sticky-bottom positioning interacts unpredictably with how
     ha-dialog wraps its content area on small viewports (the dialog
     can grow taller than the viewport, the scroll container can shift,
     and the bar visually ends up floating over the wrong content).
     Static actions sit at the natural end of the form — user scrolls
     to bottom to save, which is the normal mobile pattern. */
  @media (max-width: 600px) {
    :host {
      padding: 8px 8px 0;
    }
    .actions {
      position: static;
      margin-left: -8px;
      margin-right: -8px;
      padding: 10px 12px;
    }
    .group {
      margin-bottom: 12px;
    }
    fieldset {
      padding: 8px;
    }
    .row {
      gap: 6px;
      padding: 8px 0;
    }
    .row > select {
      flex-basis: 64px;
    }
    .row > input[type='text'],
    .row .swatch-input,
    .row .icon-input,
    .row ha-icon-picker {
      flex-basis: 100%;
    }
  }
  .dialog-header {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin: 0 0 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
  }
  .enabled-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.95em;
    color: var(--primary-text-color, #212121);
  }
  .group {
    margin: 0 0 20px;
  }
  .group-title {
    font-size: 0.8em;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--secondary-text-color, #727272);
    margin: 0 0 10px;
    font-weight: 500;
  }
  .field {
    display: block;
    margin-bottom: 12px;
  }
  .field .label {
    display: block;
    font-size: 0.85em;
    color: var(--secondary-text-color, #727272);
    margin-bottom: 4px;
  }
  .hint {
    display: block;
    font-size: 0.8em;
    color: var(--secondary-text-color, #727272);
    margin-top: 4px;
  }
  .hint code {
    background: var(--secondary-background-color, #f5f5f5);
    padding: 1px 4px;
    border-radius: 3px;
    font-family: var(--code-font-family, monospace);
    font-size: 0.95em;
  }
  input[type='text'],
  input[type='number'],
  select {
    width: 100%;
    padding: 8px 10px;
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    color: var(--primary-text-color, #212121);
    font: inherit;
    box-sizing: border-box;
  }
  input[type='text']:focus,
  input[type='number']:focus,
  select:focus {
    outline: none;
    border-color: var(--primary-color, #03a9f4);
  }
  /* HA's selector + icon picker both want full-width and a sensible
     min-width:0 so they don't blow out flex parents. ha-selector is
     used for entity fields (HA's options-flow dispatcher); ha-icon-picker
     for icons. Both require a .label to render their floating-label
     layout correctly. */
  ha-icon-picker,
  ha-selector {
    display: block;
    width: 100%;
    min-width: 0;
  }
  /* Fallback icon input (when ha-icon-picker isn't available). */
  .icon-input {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .icon-input .icon-preview {
    flex: 0 0 24px;
    width: 24px;
    height: 24px;
    color: var(--primary-text-color, #212121);
  }
  .icon-input .icon-preview.placeholder {
    display: inline-block;
    border: 1px dashed var(--divider-color, #e0e0e0);
    border-radius: 4px;
  }
  .icon-input input {
    flex: 1;
    min-width: 0;
  }
  input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  /* Mapping and threshold rows use flex-wrap so controls flow naturally
     onto a second line when the dialog gets narrow. Each input has a
     flex-basis that yields its preferred size while still shrinking. */
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    padding: 10px 0;
    border-bottom: 1px solid var(--divider-color, #e0e0e0);
  }
  .row:last-of-type {
    border-bottom: none;
  }
  .row > * {
    min-width: 0;
  }
  .row > select {
    flex: 0 0 80px;
  }
  .row > input[type='text'] {
    flex: 1 1 140px;
  }
  .row .swatch-input,
  .row .icon-input,
  .row ha-icon-picker {
    flex: 1 1 200px;
  }
  .row > .btn-icon {
    flex: 0 0 auto;
  }
  .reorder-buttons {
    display: flex;
    flex-direction: column;
    gap: 0;
    flex: 0 0 auto;
  }
  .reorder-buttons .btn-icon {
    padding: 0 6px;
    font-size: 1em;
    line-height: 1.2;
  }
  /* Targets list: each row is a single text input plus a remove button. */
  .target-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .target-row input {
    flex: 1;
    min-width: 0;
  }
  .target-row .btn-icon:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  /* For thresholds rows: comparator + value + color + icon + remove = 5 cols */
  .row:has(select:not(.legacy)) {
    grid-template-columns:
      80px
      minmax(80px, 1fr)
      minmax(160px, 2fr)
      minmax(140px, 2fr)
      auto;
  }
  .swatch-input {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .swatch-input input[type='color'] {
    width: 32px;
    height: 32px;
    flex: 0 0 32px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    padding: 0;
    cursor: pointer;
    background: none;
  }
  .swatch-input input[type='text'] {
    flex: 1;
    min-width: 0;
  }
  fieldset {
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 6px;
    padding: 12px;
    margin: 0 0 16px;
  }
  legend {
    padding: 0 6px;
    font-size: 0.85em;
    color: var(--secondary-text-color, #727272);
  }
  legend code {
    background: var(--secondary-background-color, #f5f5f5);
    padding: 1px 4px;
    border-radius: 3px;
  }
  .fieldset-hint {
    font-size: 0.9em;
    color: var(--secondary-text-color, #727272);
    margin: 4px 0 12px;
  }
  .fieldset-hint code {
    background: var(--secondary-background-color, #f5f5f5);
    padding: 1px 4px;
    border-radius: 3px;
    font-family: var(--code-font-family, monospace);
  }
  /* Glob preview hint under each target row. */
  .target-hint {
    font-size: 0.8em;
    color: var(--secondary-text-color, #727272);
    padding: 0 4px 6px;
    margin-top: -4px;
  }
  .target-hint code {
    background: var(--secondary-background-color, #f5f5f5);
    padding: 1px 4px;
    border-radius: 3px;
    font-family: var(--code-font-family, monospace);
    font-size: 0.95em;
  }
  .target-hint--empty {
    color: var(--warning-color, #ff9800);
  }
  .add-button {
    margin-top: 8px;
  }
  button.btn-text,
  button.btn-primary {
    background: none;
    border: none;
    color: var(--primary-color, #03a9f4);
    text-transform: uppercase;
    font-size: 0.9em;
    font-weight: 500;
    padding: 8px 16px;
    cursor: pointer;
    border-radius: 4px;
    letter-spacing: 0.5px;
  }
  button.btn-text:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }
  button.btn-primary {
    background: var(--primary-color, #03a9f4);
    color: var(--text-primary-color, #fff);
  }
  button.btn-primary:hover {
    filter: brightness(1.1);
  }
  button.btn-icon {
    background: none;
    border: none;
    color: var(--secondary-text-color, #727272);
    cursor: pointer;
    font-size: 1.4em;
    line-height: 1;
    padding: 4px 8px;
    border-radius: 4px;
  }
  button.btn-icon:hover {
    color: var(--error-color, #db4437);
    background: var(--secondary-background-color, #f5f5f5);
  }
  /* Sticky actions row pinned to the bottom of the editor. The host
     panel sets the dialog content padding to 0 on the ha-dialog so
     this bar can sit flush against the dialog edge with no gap. The
     actions have their own internal padding so they stay visually
     separated from the content.

     Layout matches HA's automation editor: a "Show code editor" /
     "Show visual editor" toggle on the left (text-style button),
     Cancel + Save on the right. justify-content: space-between
     pushes them apart with the toggle anchored left. */
  .actions {
    position: sticky;
    bottom: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    padding: 12px 16px;
    background: var(--card-background-color, #fff);
    border-top: 1px solid var(--divider-color, #e0e0e0);
    z-index: 1;
  }
  .actions-right {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  /* "Show code editor" / "Show visual editor" toggle in the action bar.
     Plain text styled with the primary color — matches HA's
     automation-editor pattern (no button background, no border,
     subtle hover background only). */
  .text-toggle {
    background: none;
    border: none;
    color: var(--primary-color, #03a9f4);
    cursor: pointer;
    font: inherit;
    font-size: 0.95em;
    font-weight: 500;
    padding: 8px 12px;
    border-radius: 4px;
    margin: 0;
  }
  .text-toggle:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }
  .text-toggle:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 1px;
  }
  /* YAML textarea used by the editor's code-editor mode. Same shape
     as the panel's import dialog (the panel duplicates this in its
     own stylesheet — both use HA's CSS variables for theming). */
  .yaml-area {
    width: 100%;
    min-height: 320px;
    max-height: 60vh;
    box-sizing: border-box;
    padding: 10px 12px;
    background: var(--code-editor-background-color, var(--card-background-color, #fff));
    color: var(--primary-text-color, #212121);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 4px;
    font-family: var(--code-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
    font-size: 0.9em;
    line-height: 1.4;
    resize: vertical;
    white-space: pre;
    tab-size: 2;
  }
  .yaml-area:focus {
    outline: none;
    border-color: var(--primary-color, #03a9f4);
  }
  .error {
    color: var(--error-color, #db4437);
    margin-top: 8px;
    padding: 8px 12px;
    background: var(--error-color, #db4437);
    background-color: color-mix(in srgb, var(--error-color, #db4437) 10%, transparent);
    border-radius: 4px;
  }
  /* Inline validation error placed near the field(s) it refers to. */
  .inline-error {
    margin: 6px 0 0;
    padding: 6px 10px;
    color: var(--warning-color, #ff9800);
    background-color: color-mix(
      in srgb,
      var(--warning-color, #ff9800) 8%,
      transparent
    );
    border-radius: 4px;
    font-size: 0.85em;
  }
`;
