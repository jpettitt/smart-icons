/**
 * `<smart-icons-panel>` — sidebar panel for managing rules.
 *
 * Registered by the integration's frontend.py as a `_panel_custom`. HA
 * passes us `hass` and `narrow` as Lit properties when the panel mounts.
 *
 * v0.1 scope: table of rules (target / source / mode / enabled), with
 * Add/Edit/Delete actions backed by the WS API. Sort, search,
 * drag-reorder, live preview, and YAML import/export are v0.2+.
 */

import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { RuleStore } from '../rule-store.js';
import type { Hass, Rule } from '../types.js';

import './rule-editor.js';
import { panelStyles } from './styles.js';

@customElement('smart-icons-panel')
export class SmartIconsPanel extends LitElement {
  static override styles = panelStyles;

  @property({ attribute: false }) hass!: Hass;
  @property({ type: Boolean, reflect: true }) narrow = false;

  @state() private rules: Rule[] = [];
  @state() private editing: Rule | null = null;
  @state() private dialogOpen = false;
  @state() private editorError = '';
  @state() private pendingDelete: Rule | null = null;
  // Cleared on next successful action or when the user dismisses it.
  // Used for failures from out-of-dialog actions (toggle, delete) where
  // there's no inline error surface — the editor has its own errorMessage.
  @state() private actionError = '';

  private store?: RuleStore;
  private unsubscribe?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    void this.initStore();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unsubscribe?.();
    void this.store?.disconnect();
  }

  override render() {
    return html`
      <ha-card>
        <header>
          <h1>Smart Icons</h1>
          <ha-button raised @click=${this.addRule}>+ Add rule</ha-button>
        </header>
        ${this.actionError
          ? html`
              <div class="action-error" role="alert">
                <span>${this.actionError}</span>
                <button
                  class="action-error-dismiss"
                  @click=${this.clearActionError}
                  aria-label="Dismiss"
                >×</button>
              </div>
            `
          : nothing}
        ${this.rules.length === 0 ? this.renderEmpty() : this.renderTable()}
      </ha-card>
      ${this.dialogOpen ? this.renderDialog() : nothing}
      ${this.pendingDelete ? this.renderDeleteConfirm() : nothing}
    `;
  }

  private clearActionError = (): void => {
    this.actionError = '';
  };

  private renderDeleteConfirm() {
    const rule = this.pendingDelete!;
    const label =
      rule.targets.length === 1
        ? rule.targets[0]
        : `${rule.targets.length} targets (${rule.targets[0]}…)`;
    return html`
      <ha-dialog
        open
        heading="Delete rule?"
        @closed=${this.cancelDelete}
      >
        <p>
          This permanently removes the rule for <code>${label}</code>.
          The color override (and on the next state update, the icon
          override) will be cleared.
        </p>
        <ha-button slot="secondaryAction" @click=${this.cancelDelete}
          >Cancel</ha-button
        >
        <ha-button
          slot="primaryAction"
          variant="danger"
          @click=${this.confirmDelete}
          >Delete</ha-button
        >
      </ha-dialog>
    `;
  }

  private renderEmpty() {
    return html`
      <div class="empty">
        <div class="empty-illustration">🎨</div>
        <h2>No rules yet</h2>
        <p class="empty-lead">
          Smart Icons lets any entity's icon take its color or glyph
          from another entity's state.
        </p>
        <p>
          A few examples to get started:
        </p>
        <ul class="empty-examples">
          <li>Color your kitchen light's icon by the kitchen sensor's temperature.</li>
          <li>Show a different glyph for <code>sun.sun</code> based on its azimuth.</li>
          <li>Highlight every <code>light.kitchen_*</code> entity together with a glob target.</li>
        </ul>
        <ha-button raised @click=${this.addRule}>+ Create your first rule</ha-button>
      </div>
    `;
  }

  private renderTable() {
    const sorted = [...this.rules].sort((a, b) => {
      const aKey = a.targets[0] ?? '';
      const bKey = b.targets[0] ?? '';
      return aKey === bKey
        ? b.priority - a.priority
        : aKey.localeCompare(bKey);
    });
    return html`
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Targets</th>
              <th>Source</th>
              <th>Mode</th>
              <th>Enabled</th>
              <th>Priority</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map((r) => this.renderRow(r))}
          </tbody>
        </table>
      </div>
    `;
  }

  private renderRow(rule: Rule) {
    const firstTarget = rule.targets[0] ?? '';
    const targetLabel =
      rule.targets.length <= 1
        ? firstTarget
        : `${firstTarget} (+${rule.targets.length - 1} more)`;
    const sourceIsTargetDefault =
      rule.targets.length === 1 && rule.source === firstTarget;
    const sourceLabel = (() => {
      const base = sourceIsTargetDefault ? '—' : rule.source;
      if (rule.source_attribute) {
        return base === '—'
          ? `(target).${rule.source_attribute}`
          : `${base}.${rule.source_attribute}`;
      }
      return base;
    })();
    return html`
      <tr>
        <td data-label="Targets" title=${rule.targets.join(', ')}>${targetLabel}</td>
        <td data-label="Source">${sourceLabel}</td>
        <td data-label="Mode"><span class="pill">${rule.mode}</span></td>
        <td data-label="Enabled">
          <ha-switch
            .checked=${rule.enabled}
            @change=${(e: Event) => {
              const target = e.target as HTMLInputElement;
              void this.toggleRule(rule, target.checked, target);
            }}
          ></ha-switch>
        </td>
        <td data-label="Priority">${rule.priority}</td>
        <td class="actions">
          <div class="action-buttons">
            <ha-button @click=${() => this.editRule(rule)}>Edit</ha-button>
            <ha-button @click=${() => this.duplicateRule(rule)}>Duplicate</ha-button>
            <ha-button @click=${() => this.deleteRule(rule)}>Delete</ha-button>
          </div>
        </td>
      </tr>
    `;
  }

  private renderDialog() {
    return html`
      <ha-dialog
        open
        heading=${this.dialogTitle}
        style="--dialog-content-padding: 0"
        @closed=${this.cancelEdit}
      >
        <smart-icons-rule-editor
          .hass=${this.hass}
          .rule=${this.editing ?? undefined}
          .errorMessage=${this.editorError}
          @save=${this.onEditorSave}
          @cancel=${this.cancelEdit}
        ></smart-icons-rule-editor>
      </ha-dialog>
    `;
  }

  /**
   * Three dialog modes:
   * - `editing === null`: fresh add (blank form, default title).
   * - `editing` set and has an id: editing an existing rule.
   * - `editing` set but `id === ''`: duplicate flow — same values
   *   pre-filled, but on save the backend assigns a fresh ulid because
   *   the serializer omits the id when it's empty.
   */
  private get dialogTitle(): string {
    if (!this.editing) return 'Add rule';
    if (!this.editing.id) return 'Duplicate rule';
    return 'Edit rule';
  }

  // ---- store wiring ----

  private async initStore(): Promise<void> {
    this.store = new RuleStore();
    // Synchronous cache hydrate gives the table data before the WS sync
    // resolves; the connect() that follows reconciles against the server.
    this.store.hydrateFromCache();
    this.unsubscribe = this.store.subscribe((rules) => {
      this.rules = rules;
    });
    try {
      await this.store.connect(this.hass.connection);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[smart-icons-panel] failed to connect WS', err);
    }
  }

  // ---- actions ----

  private addRule = (): void => {
    this.editing = null;
    this.editorError = '';
    this.dialogOpen = true;
  };

  private editRule(rule: Rule): void {
    this.editing = rule;
    this.editorError = '';
    this.dialogOpen = true;
  }

  private duplicateRule(rule: Rule): void {
    // Clone with id/created/updated cleared so the serializer treats it
    // as a brand-new rule on save. The editor's hydrate() copies every
    // other field, so the user lands on a pre-populated form ready to
    // tweak (most commonly: change the target entity).
    this.editing = { ...rule, id: '', created: '', updated: '' };
    this.editorError = '';
    this.dialogOpen = true;
  }

  private cancelEdit = (): void => {
    this.dialogOpen = false;
    this.editing = null;
    this.editorError = '';
  };

  private onEditorSave = async (e: CustomEvent<Partial<Rule>>): Promise<void> => {
    const payload = e.detail;
    this.editorError = '';
    try {
      await this.hass.connection.sendMessagePromise({
        type: 'smart_icons/upsert',
        rule: payload,
      });
      this.dialogOpen = false;
      this.editing = null;
    } catch (err) {
      this.editorError = this.errorMessage(err);
    }
  };

  private async toggleRule(
    rule: Rule,
    enabled: boolean,
    target: HTMLInputElement
  ): Promise<void> {
    try {
      await this.hass.connection.sendMessagePromise({
        type: 'smart_icons/upsert',
        rule: { ...rule, enabled },
      });
      this.actionError = '';
    } catch (err) {
      // Snap the switch back so the UI matches reality. The server-side
      // upsert never landed, so we shouldn't show the new state.
      target.checked = rule.enabled;
      this.actionError = `Couldn't ${enabled ? 'enable' : 'disable'} rule: ${this.errorMessage(err)}`;
    }
  }

  private deleteRule(rule: Rule): void {
    // Stage the rule for confirmation; the modal renders separately so
    // the user gets HA-native styling instead of the browser's confirm().
    this.pendingDelete = rule;
  }

  private cancelDelete = (): void => {
    this.pendingDelete = null;
  };

  private confirmDelete = async (): Promise<void> => {
    const rule = this.pendingDelete;
    this.pendingDelete = null;
    if (!rule) return;
    try {
      await this.hass.connection.sendMessagePromise({
        type: 'smart_icons/delete',
        rule_id: rule.id,
      });
      this.actionError = '';
    } catch (err) {
      const label = rule.targets[0] ?? rule.id;
      this.actionError = `Couldn't delete rule for ${label}: ${this.errorMessage(err)}`;
    }
  };

  private errorMessage(err: unknown): string {
    if (err && typeof err === 'object' && 'message' in err) {
      const m = (err as { message?: string }).message;
      if (typeof m === 'string') return m;
    }
    return String(err);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'smart-icons-panel': SmartIconsPanel;
  }
}
