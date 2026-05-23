/**
 * `<smart-icons-panel>` — sidebar panel for managing rules.
 *
 * Registered by the integration's frontend.py as a `_panel_custom`. HA
 * passes us `hass` and `narrow` as Lit properties when the panel mounts.
 *
 * Current surfaces: table of rules with Edit / Duplicate / Delete
 * actions backed by the admin-only WS API; per-rule YAML view via the
 * editor's Show code editor toggle; whole-config YAML view via the
 * panel-level Show code editor toggle (atomic replace_all save);
 * installation-wide outline toggle (Contrasting outline on painted
 * icons). Sort, search, drag-reorder priority, and import/export
 * still on the roadmap (see TODO.md).
 */

import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ref, createRef, type Ref } from 'lit/directives/ref.js';

import { RuleStore } from '../rule-store.js';
import type { Hass, Rule } from '../types.js';

import './rule-editor.js';
import { panelStyles } from './styles.js';
import { findRuleLineRanges, rulesToYaml, yamlToImportable } from './yaml.js';

interface RuleError {
  index: number;
  message: string;
}

interface CodeError {
  /** Free-form message used for parse failures and connection
   *  errors. Becomes a clickable jump-link when one of the jump
   *  fields below is also set. May co-exist with `ruleErrors`. */
  message?: string;
  /** Per-rule server validation failures from a replace_all batch.
   *  Each entry is rendered as a clickable item that focuses + selects
   *  that rule's lines in the textarea. */
  ruleErrors?: RuleError[];
  /** Clicking the `message` jumps to this zero-based rule index. */
  jumpRule?: number;
  /** Clicking the `message` jumps to this 1-indexed line in the
   *  textarea. Used for YAML syntax errors and shape errors that
   *  pin to a specific source line. */
  jumpLine?: number;
  /** Optional 1-indexed column alongside `jumpLine`. When present,
   *  the cursor is placed at that column (no selection); otherwise
   *  the whole line is selected. */
  jumpColumn?: number;
}

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
  // Used for failures from out-of-dialog actions (toggle, delete, import)
  // where there's no inline error surface — the editor has its own
  // errorMessage.
  @state() private actionError = '';

  // Per-rule YAML lives inside the rule editor itself via the
  // "Show code editor" toggle (HA automation-editor pattern).
  // Whole-config YAML lives here on the panel via the same toggle —
  // entering code mode dumps every rule as a top-level `rules:` list
  // (ids included so save can match each entry to its store record);
  // exiting via Save replaces the whole config.
  @state() private codeMode = false;
  @state() private codeText = '';
  // What we wrote into codeText when entering code mode. Compared
  // against codeText on the way back to visual to decide whether to
  // warn about unsaved changes. Reset on enter, NOT on save — a
  // failed save should still gate the toggle.
  @state() private codeInitialText = '';
  @state() private codeError: CodeError | null = null;
  @state() private codeSubmitting = false;
  // Set true when the user tries to leave code mode with unsaved
  // edits. Renders a confirmation modal; the actual toggle only
  // fires after the user clicks Discard.
  @state() private pendingDiscard = false;

  // Installation-wide options. Hydrated from the backend on connect
  // and kept live via the `smart_icons_options_updated` event. We
  // default `outlineEnabled` to true to match the backend default —
  // a brief mismatch between mount and the WS round-trip would
  // otherwise render the checkbox in the wrong state.
  @state() private outlineEnabled = true;

  private store?: RuleStore;
  private unsubscribe?: () => void;
  private optionsUnsub?: () => void;
  // Ref into the panel-level YAML textarea so per-rule error items
  // can focus + select-range to highlight the failing rule.
  private codeTextareaRef: Ref<HTMLTextAreaElement> = createRef();

  override connectedCallback(): void {
    super.connectedCallback();
    void this.initStore();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unsubscribe?.();
    this.optionsUnsub?.();
    void this.store?.disconnect();
  }

  override render() {
    return html`
      <ha-card>
        <header>
          <h1>Smart Icons</h1>
          ${this.codeMode
            ? nothing
            : html`<ha-button raised @click=${this.addRule}>+ Add rule</ha-button>`}
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
        ${this.renderOptionsRow()}
        ${this.codeMode ? this.renderCodeView() : this.renderVisualView()}
      </ha-card>
      ${this.dialogOpen ? this.renderDialog() : nothing}
      ${this.pendingDelete ? this.renderDeleteConfirm() : nothing}
      ${this.pendingDiscard ? this.renderDiscardConfirm() : nothing}
    `;
  }

  /** Installation-wide options row. Uses HA's native `<ha-switch>`,
   *  the canonical option-toggle element across HA's own settings,
   *  backup, and onboarding panels. ha-switch is reliably defined
   *  by the time any custom panel mounts (verified by grepping
   *  hass_frontend — separate concern from `ha-textfield`, which
   *  *was* lazy-load-unreliable and is the reason the rule editor
   *  uses plain inputs styled with HA CSS variables). */
  private renderOptionsRow() {
    return html`
      <div class="options-row">
        <label class="option-toggle">
          <span class="option-label">
            <strong>Contrasting outline on painted icons</strong>
            <span class="option-help">
              Adds a black/white outline (auto-picked for contrast) to
              every icon Smart Icons paints. Helps when the painted
              color matches the card background (e.g. yellow icons on
              a light theme).
            </span>
          </span>
          <ha-switch
            .checked=${this.outlineEnabled}
            @change=${this.toggleOutline}
          ></ha-switch>
        </label>
      </div>
    `;
  }

  /** Visual mode: the existing table (or empty state) plus a
   *  "Show code editor" text toggle at the bottom-left. */
  private renderVisualView() {
    return html`
      ${this.rules.length === 0 ? this.renderEmpty() : this.renderTable()}
      <div class="panel-actions">
        <button
          type="button"
          class="text-toggle"
          @click=${this.toggleCodeView}
        >
          Show code editor
        </button>
      </div>
    `;
  }

  /** Code mode: full-width YAML textarea + sticky bottom bar with the
   *  toggle on the left and a Save button on the right. Save sends
   *  the whole `rules:` list through the atomic `replace_all` WS
   *  command — server validates everything before touching storage,
   *  so existing rules are never partially updated on failure. */
  private renderCodeView() {
    return html`
      <textarea
        class="yaml-area panel-yaml"
        spellcheck="false"
        ${ref(this.codeTextareaRef)}
        .value=${this.codeText}
        @input=${(e: Event) => {
          this.codeText = (e.target as HTMLTextAreaElement).value;
          // Any keystroke means the user is reacting to the previous
          // error — clear it so the inline-error block doesn't linger.
          if (this.codeError) this.codeError = null;
        }}
        ?disabled=${this.codeSubmitting}
      ></textarea>
      ${this.codeError ? this.renderCodeError(this.codeError) : nothing}
      <div class="panel-actions">
        <button
          type="button"
          class="text-toggle"
          @click=${this.toggleCodeView}
          ?disabled=${this.codeSubmitting}
        >
          Show visual editor
        </button>
        <ha-button
          variant="brand"
          ?disabled=${this.codeSubmitting || !this.codeText.trim()}
          @click=${this.saveCodeChanges}
        >${this.codeSubmitting ? 'Saving…' : 'Save'}</ha-button>
      </div>
    `;
  }

  /** Inline error block under the YAML textarea. Always shows a
   *  "rules unchanged" header so atomicity is explicit, then renders
   *  either a per-rule clickable list (server validation failures)
   *  or a single message (parse errors, transport failures). The
   *  single message becomes clickable when we have a jump target. */
  private renderCodeError(err: CodeError) {
    const hasRuleErrors = err.ruleErrors && err.ruleErrors.length > 0;
    const header = hasRuleErrors
      ? 'Save aborted — rules unchanged.'
      : 'Rules unchanged.';
    return html`
      <div class="inline-error" role="alert">
        <div class="inline-error-message">${header}</div>
        ${hasRuleErrors
          ? html`
              <ul class="rule-error-list">
                ${err.ruleErrors!.map(
                  (e) => html`
                    <li>
                      ${this.renderClickableError(
                        `Rule ${e.index + 1}: ${e.message}`,
                        () => this.jumpToRule(e.index),
                      )}
                    </li>
                  `,
                )}
              </ul>
            `
          : nothing}
        ${err.message
          ? this.renderMessageMaybeClickable(err)
          : nothing}
      </div>
    `;
  }

  /** Render the free-form message either as a clickable jump-link
   *  (when err has a jumpRule or jumpLine target) or as plain text. */
  private renderMessageMaybeClickable(err: CodeError) {
    const handler = this.jumpHandlerFor(err);
    if (handler) {
      return this.renderClickableError(err.message!, handler);
    }
    return html`<div class="inline-error-message">${err.message}</div>`;
  }

  /** Shared "▸ clickable error" UI used for both per-rule items and
   *  the single-message-with-jump case. */
  private renderClickableError(text: string, handler: () => void) {
    return html`
      <button
        type="button"
        class="rule-error-item"
        @click=${handler}
        title="Jump to the error"
      >${text}</button>
    `;
  }

  /** Return the jump handler implied by an error's location fields,
   *  or null if there's nothing to jump to. */
  private jumpHandlerFor(err: CodeError): (() => void) | null {
    if (err.jumpRule !== undefined) {
      const idx = err.jumpRule;
      return () => this.jumpToRule(idx);
    }
    if (err.jumpLine !== undefined) {
      const line = err.jumpLine;
      const col = err.jumpColumn;
      return () => this.jumpToLine(line, col);
    }
    return null;
  }

  /** Focus the textarea and select the lines of the given rule.
   *  Falls back to a no-op if the YAML is in a shape we can't parse
   *  line-by-line (flow style, etc) — the error text is still
   *  visible, just not clickable-to-highlight. */
  private jumpToRule(ruleIndex: number): void {
    const ta = this.codeTextareaRef.value;
    if (!ta) return;
    const ranges = findRuleLineRanges(ta.value);
    const range = ranges[ruleIndex];
    if (!range) return;
    const lines = ta.value.split('\n');
    let startChar = 0;
    for (let i = 0; i < range.start; i++) startChar += lines[i].length + 1;
    let endChar = startChar;
    for (let i = range.start; i < range.end; i++) {
      endChar += lines[i].length + 1;
    }
    endChar = Math.min(endChar, ta.value.length);
    ta.focus();
    ta.setSelectionRange(startChar, endChar);
  }

  /** Focus the textarea and either place the caret at (line, column)
   *  or select the whole line when no column is given. Used for YAML
   *  syntax errors and shape errors that pin to a single source line.
   *  Line and column are 1-indexed to match the user-visible
   *  `Line N, col C` format. */
  private jumpToLine(line: number, column?: number): void {
    const ta = this.codeTextareaRef.value;
    if (!ta) return;
    const lines = ta.value.split('\n');
    if (line < 1 || line > lines.length) return;
    const lineIdx = line - 1;
    let lineStart = 0;
    for (let i = 0; i < lineIdx; i++) lineStart += lines[i].length + 1;
    const lineEnd = lineStart + lines[lineIdx].length;
    ta.focus();
    if (column && column >= 1 && column <= lines[lineIdx].length + 1) {
      const offset = lineStart + (column - 1);
      ta.setSelectionRange(offset, offset);
    } else {
      ta.setSelectionRange(lineStart, lineEnd);
    }
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
        <!-- Buttons live in the dialog body (unnamed slot), not in
             slot="primaryAction" / "secondaryAction" — modern ha-dialog
             dropped those named slots so slotted children are silently
             hidden by the browser. The rule editor uses the same
             content-area pattern (rule-editor.ts .actions div). -->
        <div class="dialog-actions">
          <ha-button @click=${this.cancelDelete}>Cancel</ha-button>
          <ha-button variant="danger" @click=${this.confirmDelete}
            >Delete</ha-button
          >
        </div>
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
    void this.initOptions();
  }

  /** Hydrate installation-wide options and subscribe to live changes.
   *
   *  Independent from `initStore` so a failure to read options doesn't
   *  block rule loading and vice versa. Both run concurrently against
   *  the same WS connection. On any error the local state stays at the
   *  default (matching the backend default), so the panel remains
   *  usable; only the checkbox may briefly lag the on-disk value. */
  private async initOptions(): Promise<void> {
    try {
      const result = await this.hass.connection.sendMessagePromise<{
        options: { outline_enabled?: boolean };
      }>({ type: 'smart_icons/get_options' });
      if (typeof result.options.outline_enabled === 'boolean') {
        this.outlineEnabled = result.options.outline_enabled;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[smart-icons-panel] failed to read options', err);
    }
    try {
      this.optionsUnsub = await this.hass.connection.subscribeEvents<{
        data: { outline_enabled?: boolean };
      }>((event) => {
        if (typeof event.data.outline_enabled === 'boolean') {
          this.outlineEnabled = event.data.outline_enabled;
        }
      }, 'smart_icons_options_updated');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        '[smart-icons-panel] failed to subscribe to options updates',
        err,
      );
    }
  }

  private toggleOutline = async (e: Event): Promise<void> => {
    const checked = (e.target as HTMLInputElement).checked;
    // Optimistic local update — the bus event will reconcile if
    // something diverges. Saves a flicker on slow connections.
    this.outlineEnabled = checked;
    try {
      await this.hass.connection.sendMessagePromise({
        type: 'smart_icons/update_options',
        options: { outline_enabled: checked },
      });
    } catch (err) {
      // Roll back the optimistic update and surface the error.
      this.outlineEnabled = !checked;
      this.actionError =
        err instanceof Error
          ? `Failed to update options: ${err.message}`
          : 'Failed to update options.';
    }
  };

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

  // ---- whole-config YAML mode ----

  private toggleCodeView = (): void => {
    if (this.codeSubmitting) return;
    if (this.codeMode) {
      // Code → Visual. If the textarea differs from what we wrote
      // into it on entry, gate the toggle behind a confirm — losing
      // unsaved edits because of a misclick would be a nasty
      // surprise. No diff → toggle immediately.
      if (this.codeText !== this.codeInitialText) {
        this.pendingDiscard = true;
        return;
      }
      this.exitCodeMode();
    } else {
      // Visual → Code: snapshot every current rule into one YAML
      // document. No ids — the `replace_all` save mints fresh ones
      // server-side for the new rule set.
      const text = rulesToYaml(this.rules);
      this.codeText = text;
      this.codeInitialText = text;
      this.codeError = null;
      this.codeMode = true;
    }
  };

  /** Exit code mode without committing. Also clears any pending
   *  discard-confirm in case we got here via the modal. */
  private exitCodeMode(): void {
    this.codeMode = false;
    this.codeError = null;
    this.pendingDiscard = false;
  }

  private renderDiscardConfirm() {
    return html`
      <ha-dialog
        open
        heading="Discard changes?"
        @closed=${this.cancelDiscard}
      >
        <p>
          You have unsaved changes in the code editor. Switching back
          to the visual editor will discard them.
        </p>
        <!-- See note on the delete-confirm modal above: ha-dialog's
             primaryAction / secondaryAction named slots don't exist in
             modern HA, so buttons go in the content area. -->
        <div class="dialog-actions">
          <ha-button @click=${this.cancelDiscard}>Cancel</ha-button>
          <ha-button variant="danger" @click=${this.confirmDiscard}
            >Discard</ha-button
          >
        </div>
      </ha-dialog>
    `;
  }

  private cancelDiscard = (): void => {
    this.pendingDiscard = false;
  };

  private confirmDiscard = (): void => {
    this.exitCodeMode();
  };

  /** Save the whole-config YAML as the new configuration.
   *
   *  Atomic via the backend's `smart_icons/replace_all` command:
   *  the server validates every rule first and only swaps storage if
   *  all pass. On failure, the existing rules are left untouched and
   *  the response carries per-rule error indices we render as
   *  clickable items below the textarea.
   *
   *  Failure modes the user can see:
   *    - Parse error (client-side, before WS call) — single message.
   *    - Per-rule validation (server `rule_errors`) — clickable list,
   *      first failure auto-selected in the textarea.
   *    - Transport / unknown error — single message ending in
   *      "Rules unchanged" so atomicity is explicit. */
  private saveCodeChanges = async (): Promise<void> => {
    const parsed = yamlToImportable(this.codeText);
    if (parsed.parseError) {
      // Client-side parse / shape failure — surface the location
      // (line/col or rule index) so the message is clickable and we
      // can auto-jump the textarea selection to the problem.
      this.codeError = {
        message: parsed.parseError,
        jumpLine: parsed.errorLine,
        jumpColumn: parsed.errorColumn,
        jumpRule: parsed.errorRuleIndex,
      };
      void this.updateComplete.then(() => this.autoJumpToFirstError());
      return;
    }
    this.codeError = null;
    this.codeSubmitting = true;
    try {
      await this.hass.connection.sendMessagePromise({
        type: 'smart_icons/replace_all',
        rules: parsed.rules,
      });
      this.codeSubmitting = false;
      this.exitCodeMode();
      this.actionError = `Saved ${parsed.rules.length} rule${parsed.rules.length === 1 ? '' : 's'}.`;
    } catch (err) {
      this.codeSubmitting = false;
      // The server's replace_all error frame can include a
      // `rule_errors` array. home-assistant-js-websocket rejects the
      // promise with the `error` object body, so the fields land on
      // `err` directly.
      const e = err as {
        rule_errors?: RuleError[];
        message?: string;
      };
      if (e.rule_errors && e.rule_errors.length > 0) {
        this.codeError = { ruleErrors: e.rule_errors };
      } else {
        this.codeError = { message: this.errorMessage(err) };
      }
      void this.updateComplete.then(() => this.autoJumpToFirstError());
    }
  };

  /** After codeError is set, focus the textarea on whichever error
   *  came first — the first ruleError if there's a list, otherwise
   *  the single message's jump target if it has one. No-op when
   *  there's no location to jump to (e.g. plain transport error). */
  private autoJumpToFirstError(): void {
    const err = this.codeError;
    if (!err) return;
    if (err.ruleErrors && err.ruleErrors.length > 0) {
      this.jumpToRule(err.ruleErrors[0].index);
      return;
    }
    const handler = this.jumpHandlerFor(err);
    if (handler) handler();
  }

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
