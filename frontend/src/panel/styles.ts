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
    white-space: nowrap;
  }
  .empty {
    text-align: center;
    padding: 32px 16px;
    color: var(--secondary-text-color, #727272);
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
`;

export const editorStyles = css`
  :host {
    display: block;
    min-width: 520px;
    color: var(--primary-text-color, #212121);
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
  /* HA's pickers — both require a .label property to render their
     floating-label layout correctly. Without it the input area
     collapses to zero height, which is what made the first picker
     attempt look broken. Both pickers get the same flex-friendly
     full-width container. */
  ha-icon-picker,
  ha-entity-picker {
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
  .row {
    display: grid;
    grid-template-columns: minmax(80px, 1fr) minmax(160px, 2fr) minmax(140px, 2fr) auto;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
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
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }
  .error {
    color: var(--error-color, #db4437);
    margin-top: 8px;
    padding: 8px 12px;
    background: var(--error-color, #db4437);
    background-color: color-mix(in srgb, var(--error-color, #db4437) 10%, transparent);
    border-radius: 4px;
  }
`;
