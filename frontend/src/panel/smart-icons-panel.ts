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
          <mwc-button raised @click=${this.addRule}>+ Add rule</mwc-button>
        </header>
        ${this.rules.length === 0 ? this.renderEmpty() : this.renderTable()}
      </ha-card>
      ${this.dialogOpen ? this.renderDialog() : nothing}
    `;
  }

  private renderEmpty() {
    return html`
      <div class="empty">
        <p>No rules yet.</p>
        <p>
          Click <strong>+ Add rule</strong> to drive any entity's icon color
          or glyph from another entity's state.
        </p>
      </div>
    `;
  }

  private renderTable() {
    const sorted = [...this.rules].sort((a, b) =>
      a.target === b.target
        ? b.priority - a.priority
        : a.target.localeCompare(b.target)
    );
    return html`
      <table>
        <thead>
          <tr>
            <th>Target</th>
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
    `;
  }

  private renderRow(rule: Rule) {
    const sourceLabel = (() => {
      const base = rule.source === rule.target ? '—' : rule.source;
      if (rule.source_attribute) {
        return base === '—'
          ? `(target).${rule.source_attribute}`
          : `${base}.${rule.source_attribute}`;
      }
      return base;
    })();
    return html`
      <tr>
        <td>${rule.target}</td>
        <td>${sourceLabel}</td>
        <td><span class="pill">${rule.mode}</span></td>
        <td>
          <ha-switch
            .checked=${rule.enabled}
            @change=${(e: Event) =>
              this.toggleRule(rule, (e.target as HTMLInputElement).checked)}
          ></ha-switch>
        </td>
        <td>${rule.priority}</td>
        <td class="actions">
          <mwc-button @click=${() => this.editRule(rule)}>Edit</mwc-button>
          <mwc-button @click=${() => this.deleteRule(rule)}>Delete</mwc-button>
        </td>
      </tr>
    `;
  }

  private renderDialog() {
    return html`
      <ha-dialog
        open
        heading=${this.editing ? 'Edit rule' : 'Add rule'}
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

  private async toggleRule(rule: Rule, enabled: boolean): Promise<void> {
    try {
      await this.hass.connection.sendMessagePromise({
        type: 'smart_icons/upsert',
        rule: { ...rule, enabled },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[smart-icons-panel] toggle failed', err);
    }
  }

  private async deleteRule(rule: Rule): Promise<void> {
    if (!confirm(`Delete rule for ${rule.target}?`)) return;
    try {
      await this.hass.connection.sendMessagePromise({
        type: 'smart_icons/delete',
        rule_id: rule.id,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[smart-icons-panel] delete failed', err);
    }
  }

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
