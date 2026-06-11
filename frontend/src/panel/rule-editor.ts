/**
 * `<smart-icons-rule-editor>` — form for creating or editing one rule.
 *
 * Uses HA-native `ha-input` / `ha-selector` / `ha-button` /
 * `ha-icon-picker` per `docs/ha-elements-guide.md`. A few elements
 * are intentionally bare HTML where the guide endorses it (decision
 * tree, item 4): the `<input type="color">` swatch picker (no
 * first-class HA color element), the per-rule `<textarea>` YAML
 * editor (`ha-code-editor` is overkill), and the bare `<button>`
 * row-delete affordances (icon-button-style, not primary actions).
 * Each carries a code comment naming the guide.
 *
 * Emits `save` with the rule payload or `cancel`. The host panel is
 * responsible for actually persisting the rule via the WS API and for
 * showing/hiding this element inside an `ha-dialog`.
 */

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { Hass, Rule, RuleMode, ThresholdEntry, Decoration } from '../types';
import { editorStyles } from './styles.js';
import { ruleToYaml, yamlToImportable } from './yaml.js';

interface WorkingState {
  id?: string;
  /** Literal entity ids — driven by ha-selector with `multiple: true`. */
  targetEntities: string[];
  /** Glob patterns — driven by a separate text-input list. Each entry
   *  is a pattern like `light.kitchen_*` that the backend resolves at
   *  apply time. */
  targetGlobs: Array<{ value: string; _key: number }>;
  source: string;
  source_attribute: string;
  mode: RuleMode;
  thresholds: Array<ThresholdEntry & { _key: number }>;
  mapping: Array<{
    key: string;
    color: string;
    background_color: string;
    icon: string;
    _key: number;
  }>;
  enabled: boolean;
  priority: number;
}

let _nextKey = 0;
function nextKey(): number {
  return _nextKey++;
}

/** Option labels for the threshold-comparator dropdown. Labels include
 *  both the math symbol and a plain-English phrase so the dropdown
 *  reads at a glance even when the symbol is hard to see at typical
 *  panel size. The empty string maps to "(else)" — the trailing entry
 *  that's the no-comparator branch run when nothing else matches.
 *  Kept as a module-level constant so the array identity is stable
 *  across renders (ha-selector re-runs its options-changed lifecycle
 *  when the array reference changes). */
const COMPARATOR_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '', label: '(else)' },
  { value: 'lt', label: '< Less than' },
  { value: 'lte', label: '≤ Less than or equal' },
  { value: 'gt', label: '> Greater than' },
  { value: 'gte', label: '≥ Greater than or equal' },
  { value: 'eq', label: '= Equal to' },
];

@customElement('smart-icons-rule-editor')
export class SmartIconsRuleEditor extends LitElement {
  static override styles = editorStyles;

  @property({ attribute: false }) rule?: Rule;
  @property({ attribute: false }) hass?: Hass;
  @property({ type: String }) errorMessage = '';

  @state() private working: WorkingState = this.blankState();

  /** YAML code-editor mode (HA's "Show code editor" pattern). When true,
   *  the form is hidden and a YAML textarea is shown instead. Save in
   *  code mode parses the YAML and dispatches the result; toggling back
   *  to visual parses + re-hydrates the form. */
  @state() private codeMode = false;
  @state() private codeText = '';
  @state() private codeError = '';

  /** Per-mapping-row autocomplete: states the resolved source entity
   *  has been observed in (recorder history) plus its current state.
   *  Keyed in `_observedStatesCache` by entity id so we don't re-query
   *  on every render. */
  @state() private observedStates: readonly string[] = [];
  private _observedStatesCache = new Map<string, readonly string[]>();
  private _observedStatesEntityId = '';

  /** JSON snapshot of (working + codeMode + codeText) taken right after
   *  hydrate. Drives `isDirty()` and the `dirty-changed` event the
   *  panel uses to gate ha-dialog's scrim-click auto-close. Set in
   *  willUpdate when the `rule` property changes; kept stable across
   *  all subsequent edits until the next rule swap. */
  private initialSnapshot = '';
  /** Last dirty value we fired `dirty-changed` for. Prevents firing on
   *  every keystroke when the answer hasn't actually changed (dirty
   *  flipped clean → dirty once, not once per character). */
  private lastDirtyEmitted = false;

  override connectedCallback(): void {
    super.connectedCallback();
    // HA's element chunks are lazy-loaded; re-render when each lands so
    // the form upgrades from any zero-height placeholders. The ha-*
    // elements we expect to use:
    //   - ha-selector: target entities, source entity, mode dropdown,
    //     threshold comparator
    //   - ha-icon-picker: decoration glyph picker
    //   - ha-input: every text/number field; also the fallback when
    //     ha-selector / ha-icon-picker haven't loaded yet
    //   - ha-button: primary actions (Add entry / Add state / Add
    //     pattern, Cancel, Save)
    //   - ha-switch: the Enabled/Disabled toggle
    // See docs/ha-elements-guide.md for which elements load reliably
    // and which need this defensive `whenDefined` upgrade.
    for (const tag of [
      'ha-icon-picker',
      'ha-selector',
      'ha-input',
      'ha-button',
      'ha-switch',
      'ha-sortable',
      'ha-icon',
      'ha-code-editor',
    ]) {
      if (!customElements.get(tag)) {
        void customElements
          .whenDefined(tag)
          .then(() => this.requestUpdate())
          .catch(() => {
            /* never loaded — leave the unupgraded element in place */
          });
      }
    }
  }

  override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('rule')) {
      this.working = this.rule ? this.hydrate(this.rule) : this.blankState();
      // Re-snapshot for dirty detection. Capture the post-hydrate
      // state so an unedited fresh-open reports dirty=false even
      // though the rule swap technically changed the working state.
      this.codeMode = false;
      this.codeText = '';
      this.codeError = '';
      this.initialSnapshot = this.snapshotKey();
      this.lastDirtyEmitted = false;
    }
    // Keep the observed-states datalist in sync with whichever entity
    // is currently driving evaluation. For explicit-source rules
    // that's `working.source`; for per-target rules it's the first
    // literal target (mapping authors typically want to see the
    // states a representative entity has been in).
    const effectiveSource = this.observedSourceForAutocomplete();
    if (effectiveSource !== this._observedStatesEntityId) {
      this._observedStatesEntityId = effectiveSource;
      void this.refreshObservedStates(effectiveSource);
    }
  }

  /** After every render-causing change, fire `dirty-changed` if the
   *  dirty status flipped. The host panel listens and toggles
   *  ha-dialog's `scrimClickAction` / `escapeKeyAction` to gate
   *  accidental click-outside dismissal mid-edit. Skip when the
   *  initial snapshot hasn't been taken yet (first render before
   *  rule property lands). */
  override updated(_changed: Map<string, unknown>): void {
    if (!this.initialSnapshot) return;
    const dirty = this.isDirty();
    if (dirty === this.lastDirtyEmitted) return;
    this.lastDirtyEmitted = dirty;
    this.dispatchEvent(
      new CustomEvent('dirty-changed', {
        detail: { dirty },
        bubbles: true,
        composed: true,
      })
    );
  }

  /** Entity id we'll query for the mapping-key autocomplete. Empty
   *  when nothing is selected yet — caller should bail. */
  private observedSourceForAutocomplete(): string {
    const explicit = this.working.source.trim();
    if (explicit) return explicit;
    return this.working.targetEntities[0] || '';
  }

  /** Populate `observedStates` for `entityId`. Queries the recorder
   *  for the last 7 days of distinct state values, merges in the
   *  current state, and caches the result. Quiet failure: if the
   *  recorder is disabled or the call fails we still get the
   *  current state as a one-element list. */
  private async refreshObservedStates(entityId: string): Promise<void> {
    if (!entityId || !this.hass) {
      this.observedStates = [];
      return;
    }
    const cached = this._observedStatesCache.get(entityId);
    if (cached) {
      this.observedStates = cached;
      return;
    }

    const current = this.hass.states[entityId]?.state;
    // Optimistic: show the current state immediately so the datalist
    // isn't empty while we wait for the recorder round-trip.
    if (current) this.observedStates = [current];

    const seen = new Set<string>();
    if (current) seen.add(current);

    try {
      const end = new Date();
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      const result = await this.hass.connection.sendMessagePromise<
        Record<string, Array<{ s?: string; state?: string }>>
      >({
        type: 'history/history_during_period',
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        entity_ids: [entityId],
        minimal_response: true,
        no_attributes: true,
        // History API normalizes its row shape under minimal_response
        // to `{ s, lu }`; older HA versions return full `{ state, last_updated }`.
      });
      const series = result?.[entityId];
      if (Array.isArray(series)) {
        for (const row of series) {
          const value = row.s ?? row.state;
          if (typeof value === 'string' && value) seen.add(value);
        }
      }
    } catch {
      // Recorder disabled or component unavailable — keep whatever we
      // already had from `hass.states`.
    }
    // Skip stale results: if the user changed entity while the call
    // was in flight, don't overwrite the newer suggestions.
    if (entityId !== this._observedStatesEntityId) return;
    const list = [...seen].sort();
    this._observedStatesCache.set(entityId, list);
    this.observedStates = list;
  }

  /**
   * Icon field: HA's `ha-icon-picker` if available (modern HA exposes
   * it built on top of `ha-picker` — selection works correctly with a
   * `.label` set, matches the pattern weather-radar-card uses), with
   * an `<ha-icon>` preview + plain text input as a defensive fallback
   * for HA versions where the picker isn't shipped.
   */
  private renderIconField(
    value: string,
    onChange: (v: string) => void
  ): TemplateResult {
    if (customElements.get('ha-icon-picker') && this.hass) {
      return html`
        <ha-icon-picker
          .hass=${this.hass}
          .value=${value}
          .label=${'Icon'}
          @value-changed=${(e: CustomEvent<{ value: string }>) =>
            onChange(e.detail?.value ?? '')}
        ></ha-icon-picker>
      `;
    }
    // ha-icon-picker not yet defined — fall back to ha-input. Re-renders
    // once whenDefined resolves in connectedCallback. ha-input is itself
    // reliably loaded in the panel context (see docs/ha-elements-guide.md).
    return html`
      <div class="icon-input">
        ${value
          ? html`<ha-icon class="icon-preview" .icon=${value}></ha-icon>`
          : html`<span class="icon-preview placeholder" aria-hidden="true"></span>`}
        <ha-input
          label="Icon"
          .value=${value}
          @input=${(e: Event) =>
            onChange((e.target as HTMLInputElement).value)}
        ></ha-input>
      </div>
    `;
  }

  private get entityIds(): readonly string[] {
    if (!this.hass) return [];
    return Object.keys(this.hass.states).sort();
  }

  /**
   * Entity field: HA's `ha-selector` with an `entity` selector config —
   * the same component HA's own options flows use. Wrapping at this
   * level rather than reaching for `ha-entity-picker` directly avoids
   * the click/hover layout bug we saw with the lower-level picker in
   * the dialog context (see weather-radar-card editor.ts for the
   * upstream-validated pattern).
   *
   * Falls back to a plain input + `<datalist>` autocomplete if
   * `ha-selector` isn't loaded by render time.
   */
  private renderEntityField(
    label: string,
    placeholder: string,
    value: string,
    onChange: (v: string) => void,
    required = false
  ): TemplateResult {
    if (customElements.get('ha-selector') && this.hass) {
      return html`
        <div class="field">
          <ha-selector
            .hass=${this.hass}
            .selector=${{ entity: {} }}
            .value=${value}
            .label=${label}
            @value-changed=${(e: CustomEvent<{ value: string }>) =>
              onChange(e.detail?.value ?? '')}
          ></ha-selector>
        </div>
      `;
    }
    // ha-selector not yet defined — fall back to ha-input. The
    // `<datalist>` autocomplete that the bare input had is dropped:
    // ha-input doesn't support datalist out of the box, and the
    // ha-selector path that this fallback covers has its own
    // autocomplete dropdown. Re-renders once whenDefined resolves.
    return html`
      <div class="field">
        <ha-input
          label=${label}
          ?required=${required}
          placeholder=${placeholder}
          .value=${value}
          @input=${(e: Event) =>
            onChange((e.target as HTMLInputElement).value)}
        ></ha-input>
      </div>
    `;
  }

  override render() {
    return html`
      <datalist id="smart-icons-entities">
        ${this.entityIds.map(
          (id) => html`<option value=${id}></option>`
        )}
      </datalist>
      <datalist id="smart-icons-source-attributes">
        ${this.sourceAttributes.map(
          (a) => html`<option value=${a}></option>`
        )}
      </datalist>
      <datalist id="smart-icons-observed-states">
        ${this.observedStates.map(
          (s) => html`<option value=${s}></option>`
        )}
      </datalist>

      ${this.codeMode ? this.renderCodeView() : this.renderVisualView()}

      ${this.errorMessage
        ? html`<div class="error">${this.errorMessage}</div>`
        : null}

      <div class="actions">
        <button
          type="button"
          class="text-toggle"
          @click=${this.toggleCodeView}
        >
          ${this.codeMode ? 'Show visual editor' : 'Show code editor'}
        </button>
        <div class="actions-right">
          <ha-button @click=${this.cancelClicked}>Cancel</ha-button>
          <ha-button
            variant="brand"
            ?disabled=${this.saveDisabled}
            @click=${this.save}
          >Save</ha-button>
        </div>
      </div>
    `;
  }

  /** Mode dropdown using ha-selector's select config. The selector
   *  requires `.label` to render its floating-label layout (see
   *  docs/ha-elements-guide.md). */
  private renderModeSelector() {
    const options: { value: string; label: string }[] = [
      { value: 'mapping', label: 'Mapping (exact state → decoration)' },
      { value: 'thresholds', label: 'Thresholds (numeric ranges)' },
    ];
    return html`
      <ha-selector
        .hass=${this.hass}
        .selector=${{ select: { options, mode: 'dropdown' } }}
        .value=${this.working.mode}
        .label=${'Mode'}
        @value-changed=${(e: CustomEvent<{ value: string }>) =>
          this.patch({ mode: (e.detail?.value ?? 'mapping') as RuleMode })}
      ></ha-selector>
    `;
  }

  /** The YAML textarea + parse error display, shown when codeMode is on.
   *  Same visual treatment as the panel's Import dialog. */
  private renderCodeView() {
    return html`
      <header class="dialog-header">
        <label class="enabled-toggle">
          <ha-switch
            .checked=${this.working.enabled}
            @change=${(e: Event) =>
              this.patch({
                enabled: (e.target as HTMLInputElement).checked,
              })}
          ></ha-switch>
          <span>${this.working.enabled ? 'Enabled' : 'Disabled'}</span>
        </label>
      </header>
      ${this.codeError
        ? html`<div class="inline-error" role="alert">${this.codeError}</div>`
        : null}
      <!-- Per-rule YAML editor — ha-code-editor is HA's canonical
           YAML/code surface (CodeMirror 6 underneath). Used by the
           automation editor, blueprint inspector, trace viewer, etc.
           Lazy-loaded chunk: connectedCallback registers a
           whenDefined upgrade so we re-render once it lands. -->
      <ha-code-editor
        class="yaml-area"
        mode="yaml"
        autocomplete-entities
        autocomplete-icons
        disable-fullscreen
        dir="ltr"
        .hass=${this.hass}
        .value=${this.codeText}
        @value-changed=${(e: CustomEvent<{ value: string }>) => {
          this.codeText = e.detail?.value ?? '';
          // Clear any prior parse error as soon as the user types;
          // we'll re-validate on toggle or save.
          if (this.codeError) this.codeError = '';
        }}
        @editor-save=${this.save}
      ></ha-code-editor>
    `;
  }

  /** The original form-based view (the visual editor). Identical to
   *  what render() used to produce; pulled into a method so the YAML
   *  toggle can swap it out cleanly. */
  private renderVisualView() {
    return html`
      <header class="dialog-header">
        <label class="enabled-toggle">
          <ha-switch
            .checked=${this.working.enabled}
            @change=${(e: Event) =>
              this.patch({
                enabled: (e.target as HTMLInputElement).checked,
              })}
          ></ha-switch>
          <span>${this.working.enabled ? 'Enabled' : 'Disabled'}</span>
        </label>
      </header>

      <section class="group">
        <h3 class="group-title">Apply to</h3>
        ${this.renderTargetEntitiesField()}
        ${this.renderTargetGlobsField()}
        ${this.targetsError
          ? html`<div class="inline-error">${this.targetsError}</div>`
          : null}
      </section>

      <section class="group">
        <h3 class="group-title">React to</h3>
        ${this.renderEntityField(
          'Source entity',
          this.isPerTarget
            ? 'leave blank — per-target source'
            : 'defaults to target',
          this.working.source,
          (v) => this.patch({ source: v })
        )}
        <div class="field">
          <ha-input
            label="Source attribute"
            placeholder="leave blank to use the entity's state"
            .value=${this.working.source_attribute}
            @input=${(e: Event) =>
              this.patch({
                source_attribute: (e.target as HTMLInputElement).value,
              })}
          ></ha-input>
          <span class="hint">
            ${this.renderWatchingHint()}
          </span>
        </div>
      </section>

      <section class="group">
        <h3 class="group-title">Decoration</h3>
        <div class="field">
          ${this.renderModeSelector()}
        </div>
        ${this.working.mode === 'thresholds'
          ? this.renderThresholds()
          : this.renderMapping()}
        ${this.modeError
          ? html`<div class="inline-error">${this.modeError}</div>`
          : null}
      </section>

      <section class="group">
        <h3 class="group-title">Options</h3>
        <div class="field">
          <ha-input
            label="Priority"
            type="number"
            .value=${String(this.working.priority)}
            @input=${(e: Event) =>
              this.patch({
                priority: Number((e.target as HTMLInputElement).value) || 0,
              })}
          ></ha-input>
          <span class="hint">
            When several rules target the same entity, the highest-priority
            enabled rule with a matching state wins.
          </span>
        </div>
      </section>

    `;
  }

  /** True when the Save button should be disabled. In visual mode this
   *  follows the existing form validation; in code mode it's the YAML
   *  being empty (we parse on save and report errors then). */
  private get saveDisabled(): boolean {
    if (this.codeMode) return !this.codeText.trim();
    return this.validationErrors.length > 0;
  }

  /** Toggle between the visual form and the YAML code editor.
   *  Visual → Code: serialize the form's current state to YAML.
   *  Code → Visual: parse the YAML and re-hydrate the form. On parse
   *  error, the toggle is refused and the error is shown above the
   *  textarea (matches HA's automation-editor behavior). */
  private toggleCodeView = (): void => {
    if (this.codeMode) {
      // Code → Visual: parse and hydrate.
      const { rules, parseError } = yamlToImportable(this.codeText);
      if (parseError) {
        this.codeError = parseError;
        return;
      }
      const parsed = rules[0];
      if (!parsed) {
        this.codeError = 'YAML did not contain a rule.';
        return;
      }
      this.working = this.hydrate(this.partialToRule(parsed));
      this.codeMode = false;
      this.codeError = '';
    } else {
      // Visual → Code: build a Rule from the form state and dump.
      const payload = this.serialize();
      this.codeText = ruleToYaml(this.partialToRule(payload));
      this.codeError = '';
      this.codeMode = true;
    }
  };

  /** Promote a Partial<Rule> from the form serializer (or YAML parse)
   *  back to a full Rule by filling in sensible defaults for everything
   *  the form does not surface. Used by both toggle directions. */
  private partialToRule(p: Partial<Rule>): Rule {
    return {
      id: this.working.id ?? '',
      targets: p.targets ?? [],
      source: p.source ?? '',
      source_attribute: p.source_attribute ?? null,
      mode: (p.mode ?? 'mapping') as RuleMode,
      thresholds: p.thresholds,
      mapping: p.mapping,
      enabled: p.enabled ?? true,
      priority: p.priority ?? 10,
      created: '',
      updated: '',
      source_kind: 'ui',
    };
  }

  private cancelClicked = (): void => {
    // Named `cancel-button` (not `cancel`) so it doesn't collide
    // with the native <dialog>'s `cancel` event when this editor
    // is hosted inside an ha-dialog. The panel listens for both
    // separately — ESC fires the dialog's cancel, button click
    // fires this.
    this.dispatchEvent(
      new CustomEvent('cancel-button', {
        detail: { dirty: this.isDirty() },
        bubbles: true,
        composed: true,
      })
    );
  };

  /** JSON key over the user-editable surface. Used both for the
   *  initial snapshot and for `isDirty()` comparisons. Includes
   *  codeMode + codeText because the YAML view is a real edit
   *  surface — half-written YAML is just as much lost work as
   *  half-filled form fields. */
  private snapshotKey(): string {
    return JSON.stringify({
      working: this.working,
      codeMode: this.codeMode,
      codeText: this.codeText,
    });
  }

  /** True when the user has made any change since the dialog opened.
   *  Public so the host panel can read it on close attempts (the
   *  ha-dialog scrim/ESC gate reads this via a ref instead of
   *  threading dirty state through a `dirty-changed` event). */
  public isDirty(): boolean {
    return (
      this.initialSnapshot !== '' &&
      this.snapshotKey() !== this.initialSnapshot
    );
  }

  /** Called by the host panel from the dialog's action-slot Save
   *  button. Fires the `save` event with the serialized payload only
   *  if validation passes. */
  public submit(): boolean {
    if (this.validationErrors.length > 0) return false;
    this.save();
    return true;
  }

  /** Aggregated list of validation errors. Drives the Save button's
   *  disabled state in the host panel. Per-section render code reads
   *  the individual getters below to place each error inline near its
   *  source field. */
  public get validationErrors(): readonly string[] {
    return [
      this.targetsError,
      this.sourceError,
      this.modeError,
    ].filter((e): e is string => e !== null);
  }

  private get targetsError(): string | null {
    const entities = this.working.targetEntities;
    const globs = this.working.targetGlobs
      .map((g) => g.value.trim())
      .filter((v) => v.length > 0);
    if (entities.length === 0 && globs.length === 0) {
      return 'Pick at least one target entity or add a glob pattern.';
    }
    return null;
  }

  private get sourceError(): string | null {
    // No required-source rule any more: empty source means "per-target"
    // (each matched target reacts to its own state).
    return null;
  }

  private get modeError(): string | null {
    if (this.working.mode === 'thresholds') {
      // An entry is "meaningful" if it sets a comparator OR any of the
      // decoration fields. v0.2 missed bg, and the comparator check
      // was `!== null` against a function that returns '' for none —
      // so every row, even blank, looked meaningful. This is the fix.
      const hasMeaningfulEntry = this.working.thresholds.some(
        (t) =>
          this.thresholdComparator(t) !== '' ||
          t.color ||
          t.background_color ||
          t.icon,
      );
      if (!hasMeaningfulEntry) {
        return 'Thresholds mode needs at least one entry.';
      }
    } else if (this.working.mode === 'mapping') {
      // A mapping row must both have a key AND set at least one
      // decoration field. A key-only row would round-trip as
      // `mapping["on"] = {}`, which validates server-side but does
      // nothing at runtime (the evaluator's _normalize_decoration
      // returns null for an empty dict). Rejecting it here keeps the
      // UI honest.
      const hasMeaningfulEntry = this.working.mapping.some(
        (m) =>
          m.key.trim().length > 0 &&
          (m.color || m.background_color || m.icon),
      );
      if (!hasMeaningfulEntry) {
        return 'Mapping mode needs at least one state → decoration entry (key + color, background, or icon).';
      }
    }
    return null;
  }

  /** Entity id used in the "Watching …" hint — defaults to the first
   *  literal target if `source` is unset (matches backend default). */
  private get sourceEntityForDisplay(): string {
    const sourceTrimmed = this.working.source.trim();
    if (sourceTrimmed) return sourceTrimmed;
    return this.working.targetEntities[0] || '(entity)';
  }

  /** Whether this rule is currently in "per-target" mode (no explicit
   *  source, and either multiple targets or any glob present). The
   *  injector evaluates each matched target against its own state. */
  private get isPerTarget(): boolean {
    if (this.working.source.trim()) return false;
    const entities = this.working.targetEntities;
    const globs = this.working.targetGlobs.filter((g) => g.value.trim());
    return entities.length > 1 || globs.length > 0;
  }

  /** Contextual "Watching …" hint that explains what the source side of
   *  the rule will read at evaluation time. Differs for single-source
   *  vs per-target modes. */
  private renderWatchingHint(): TemplateResult {
    const attr = this.working.source_attribute.trim();
    if (this.isPerTarget) {
      return attr
        ? html`Per-target: each matched entity's
            <code>.${attr}</code> attribute drives its own decoration.`
        : html`Per-target: each matched entity reacts to its own state.
            Set a state attribute (e.g. <code>brightness</code>) to use
            an attribute instead.`;
    }
    const ent = this.sourceEntityForDisplay;
    return attr
      ? html`Watching <code>${ent}.${attr}</code>`
      : html`Watching the state of <code>${ent}</code>. Pick a state
          attribute (e.g. <code>azimuth</code>) for numeric-attribute rules.`;
  }

  /** Attribute keys of the currently-selected source entity, for the
   *  source-attribute autocomplete datalist. Updates live as the user
   *  types into the source field. */
  private get sourceAttributes(): readonly string[] {
    const id = this.sourceEntityForDisplay;
    const attrs = this.hass?.states?.[id]?.attributes;
    if (!attrs) return [];
    return Object.keys(attrs).sort();
  }

  private renderThresholds() {
    const entries = this.working.thresholds;
    return html`
      <fieldset>
        <legend>
          Threshold entries — first matching wins; the entry with no
          comparator is the "else" branch. Drag the handle to reorder.
        </legend>
        ${entries.length === 0
          ? html`<p class="fieldset-hint">
              No threshold entries yet. Each entry has a comparator
              (e.g. <code>&lt; 18</code>) plus a color or icon to apply.
              The first matching entry wins.
            </p>`
          : null}
        <!-- ha-sortable is HA's canonical drag-reorder wrapper. It
             attaches SortableJS to its FIRST DIRECT CHILD (the
             container div below, not to ha-sortable itself), then
             uses handle-selector + draggable-selector to identify
             which descendants initiate drags and which participate
             as items. The explicit .rollback=false matches HA's
             own editors and avoids SortableJS leaving a stale
             comment placeholder behind when Lit re-renders the
             list on a state change. -->
        <!-- prettier-ignore -->
        <!-- (Lit/TS template-literal parser interprets dollar-brace
             inside HTML comments — so any rollback / interpolation
             example is paraphrased above rather than written
             literally.) -->
        <ha-sortable
          handle-selector=".handle"
          draggable-selector=".threshold-row"
          .rollback=${false}
          @item-moved=${this.onThresholdMoved}
        >
          <div class="threshold-rows">
        ${entries.map(
          (t, idx) => html`
            <div class="threshold-row">
              <!-- Drag handle — HA's canonical "six dots" mdi:drag
                   glyph picked up by ha-sortable via the
                   handle-selector. Sits in column 1, aligned to the
                   top of the row content. -->
              <div class="handle" title="Drag to reorder">
                <ha-icon icon="mdi:drag"></ha-icon>
              </div>
              <div class="threshold-row-fields">
                <!-- Row 1: comparator dropdown + value on the same
                     line so the test reads naturally ("< 32"). -->
                <div class="threshold-comparator-row">
                  <ha-selector
                    .hass=${this.hass}
                    .selector=${{
                      select: {
                        options: COMPARATOR_OPTIONS,
                        mode: 'dropdown',
                      },
                    }}
                    .value=${this.thresholdComparator(t)}
                    .label=${'Comparator'}
                    @value-changed=${(e: CustomEvent<{ value: string }>) =>
                      this.setThresholdComparator(idx, e.detail?.value ?? '')}
                  ></ha-selector>
                  <ha-input
                    label="Value"
                    .value=${this.thresholdValue(t)}
                    ?disabled=${this.thresholdComparator(t) === ''}
                    @input=${(e: Event) =>
                      this.setThresholdValue(
                        idx,
                        (e.target as HTMLInputElement).value
                      )}
                  ></ha-input>
                </div>
                <!-- Row 2: icon color + background color side by side
                     so the visual pair is obvious. The painter applies
                     style.color for the icon and background-color +
                     border-radius + box-shadow for the chip. -->
                ${this.renderColorPair(
                  t.color ?? '',
                  t.background_color ?? '',
                  (v) => this.updateThreshold(idx, { color: v }),
                  (v) => this.updateThreshold(idx, { background_color: v }),
                )}
                ${this.renderIconField(t.icon ?? '', (v) =>
                  this.updateThreshold(idx, { icon: v })
                )}
                <ha-button
                  class="row-delete"
                  variant="danger"
                  @click=${() => this.removeThreshold(idx)}
                >
                  <ha-icon icon="mdi:delete" slot="start"></ha-icon>
                  Delete
                </ha-button>
              </div>
            </div>
          `
        )}
          </div>
        </ha-sortable>
        <ha-button
          variant="neutral"
          @click=${this.addThreshold}
        >+ Add entry</ha-button>
      </fieldset>
    `;
  }

  /** Reorder a threshold entry on a successful drag drop. Event detail
   *  shape `{ oldIndex, newIndex }` matches ha-sortable's contract and
   *  HA's own _itemMoved handlers across the frontend codebase. */
  private onThresholdMoved = (
    e: CustomEvent<{ oldIndex: number; newIndex: number }>,
  ): void => {
    e.stopPropagation();
    const { oldIndex, newIndex } = e.detail;
    if (
      oldIndex === newIndex ||
      oldIndex < 0 ||
      newIndex < 0 ||
      oldIndex >= this.working.thresholds.length ||
      newIndex >= this.working.thresholds.length
    ) {
      return;
    }
    const next = [...this.working.thresholds];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    this.working = { ...this.working, thresholds: next };
  };

  private renderMapping() {
    const entries = this.working.mapping;
    const noKeys = entries.every((m) => !m.key.trim());
    return html`
      <fieldset>
        <legend>
          State → decoration. <code>_else</code> is the fallback bucket.
        </legend>
        ${noKeys
          ? html`<p class="fieldset-hint">
              Add one entry per state value (e.g. <code>on</code>,
              <code>off</code>) — or use <code>_else</code> as a catch-all
              fallback. Each entry can set a color, an icon, or both.
            </p>`
          : null}
        ${this.observedStates.length > 0
          ? html`<p class="fieldset-hint">
              Autocomplete suggests states
              <code>${this._observedStatesEntityId}</code> has been in
              recently (last 7 days, via recorder).
            </p>`
          : null}
        ${entries.map(
          (m, idx) => html`
            <!-- Mapping rows mirror the threshold-row layout: a
                 single column-flex container holds the State input,
                 the color pair, the icon picker, and a row-level
                 Delete button (right-aligned at the bottom). -->
            <div class="mapping-row">
              <ha-input
                label="State"
                .value=${m.key}
                @input=${(e: Event) =>
                  this.updateMapping(idx, {
                    key: (e.target as HTMLInputElement).value,
                  })}
              ></ha-input>
              ${this.renderColorPair(
                m.color,
                m.background_color,
                (v) => this.updateMapping(idx, { color: v }),
                (v) => this.updateMapping(idx, { background_color: v }),
              )}
              ${this.renderIconField(m.icon, (v) =>
                this.updateMapping(idx, { icon: v })
              )}
              <ha-button
                class="row-delete"
                variant="danger"
                @click=${() => this.removeMapping(idx)}
              >
                <ha-icon icon="mdi:delete" slot="start"></ha-icon>
                Delete
              </ha-button>
            </div>
          `
        )}
        <ha-button
          variant="neutral"
          @click=${this.addMapping}
        >+ Add state</ha-button>
      </fieldset>
    `;
  }

  private renderColorInput(
    value: string,
    onChange: (v: string) => void,
    label = 'Color',
  ) {
    return html`
      <div class="swatch-input">
        <!-- Native <input type="color"> per docs/ha-elements-guide.md
             decision tree, item 4: HA has no first-class hex color
             picker, and the native swatch is the most reliable
             cross-version solution. The text field next to it
             accepts any CSS color string (hex, rgb(), rgba(), hsl(),
             var(--…), named) — useful when the swatch's hex-only
             limit isn't enough (e.g. translucent rgba chips). -->
        <input
          type="color"
          .value=${this.colorAsHex(value)}
          @input=${(e: Event) =>
            onChange((e.target as HTMLInputElement).value)}
          title="Pick a color"
        />
        <ha-input
          label=${label}
          placeholder="#hex, rgba(), name, var(--…)"
          .value=${value}
          @input=${(e: Event) =>
            onChange((e.target as HTMLInputElement).value)}
        ></ha-input>
      </div>
    `;
  }

  /** Render a foreground/background color pair on a single row.
   *  Background (chip) is optional — empty string means "no chip" and
   *  the painter applies the icon's painted color without any
   *  surrounding circle. */
  private renderColorPair(
    fg: string,
    bg: string,
    onFgChange: (v: string) => void,
    onBgChange: (v: string) => void,
  ) {
    return html`
      <div class="color-pair">
        ${this.renderColorInput(fg, onFgChange, 'Icon color')}
        ${this.renderColorInput(bg, onBgChange, 'Background')}
      </div>
    `;
  }

  /** Convert any CSS color string to a hex the native picker accepts.
   *  Falls back to #888888 for inputs the browser can't resolve.
   *
   *  For translucent inputs (rgba / hsla with alpha < 1) canvas
   *  `fillStyle` returns the rgba() form, not hex. We parse the RGB
   *  part out and hex-encode it so the swatch picker can at least
   *  show the opaque equivalent — the alpha is conveyed by the
   *  text field next to the swatch, not the swatch itself
   *  (HTML's <input type="color"> is hex-only by spec). */
  private colorAsHex(v: string): string {
    if (!v) return '#888888';
    if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
    if (/^#[0-9a-fA-F]{3}$/.test(v)) {
      return (
        '#' +
        v
          .slice(1)
          .split('')
          .map((c) => c + c)
          .join('')
      );
    }
    try {
      const ctx = document.createElement('canvas').getContext('2d');
      if (!ctx) return '#888888';
      ctx.fillStyle = v;
      const out = ctx.fillStyle;
      if (/^#[0-9a-fA-F]{6}$/.test(out)) return out;
      // Canvas returns rgba()/rgb() for translucent or
      // odd-but-resolved inputs. Extract the RGB triple and hex
      // it ourselves — drops the alpha for swatch-display only.
      const m = /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/.exec(
        out,
      );
      if (m) {
        const hex = (n: string): string =>
          Math.round(Number(n)).toString(16).padStart(2, '0');
        return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
      }
      return '#888888';
    } catch {
      return '#888888';
    }
  }

  // ---- state helpers ----

  private patch(update: Partial<WorkingState>): void {
    this.working = { ...this.working, ...update };
  }

  private hydrate(rule: Rule): WorkingState {
    const entities: string[] = [];
    const globs: WorkingState['targetGlobs'] = [];
    for (const t of rule.targets) {
      if (/[*?[]/.test(t)) {
        globs.push({ value: t, _key: nextKey() });
      } else {
        entities.push(t);
      }
    }
    const firstLiteral = entities[0];
    return {
      id: rule.id,
      targetEntities: entities,
      targetGlobs: globs,
      // Source defaults to the first literal target; show blank when
      // that's the case so the "defaults to first target" semantics
      // are visible. Show explicit value when source differs.
      source: rule.source === firstLiteral ? '' : rule.source,
      source_attribute: rule.source_attribute ?? '',
      mode: rule.mode,
      thresholds: (rule.thresholds ?? []).map((t) => ({
        ...t,
        _key: nextKey(),
      })),
      mapping: rule.mapping
        ? Object.entries(rule.mapping).map(([key, dec]) => ({
            key,
            color: (dec as Decoration).color ?? '',
            background_color: (dec as Decoration).background_color ?? '',
            icon: (dec as Decoration).icon ?? '',
            _key: nextKey(),
          }))
        : [],
      enabled: rule.enabled,
      priority: rule.priority,
    };
  }

  private blankState(): WorkingState {
    return {
      targetEntities: [],
      targetGlobs: [],
      source: '',
      source_attribute: '',
      mode: 'mapping',
      thresholds: [],
      mapping: [
        { key: '', color: '', background_color: '', icon: '', _key: nextKey() },
      ],
      enabled: true,
      priority: 10,
    };
  }

  /** Literal entity targets via ha-selector with `multiple: true`. Same
   *  picker UX HA's options flows use. Falls back to a plain text input
   *  with datalist autocomplete if the selector chunk isn't loaded. */
  private renderTargetEntitiesField(): TemplateResult {
    if (customElements.get('ha-selector') && this.hass) {
      return html`
        <div class="field">
          <ha-selector
            .hass=${this.hass}
            .selector=${{ entity: { multiple: true } }}
            .value=${this.working.targetEntities}
            .label=${'Target entities'}
            @value-changed=${(e: CustomEvent<{ value: string[] }>) =>
              this.patch({ targetEntities: e.detail?.value ?? [] })}
          ></ha-selector>
        </div>
      `;
    }
    // Selector not available — fall back to ha-input as a
    // comma-separated text field. Same as renderEntityField's fallback
    // path: the bare datalist autocomplete is dropped because ha-input
    // doesn't expose `list=`, and the ha-selector path covers
    // autocomplete on its own once it loads.
    return html`
      <div class="field">
        <ha-input
          label="Target entities (comma-separated)"
          placeholder="light.kitchen, light.living_room"
          .value=${this.working.targetEntities.join(', ')}
          @input=${(e: Event) =>
            this.patch({
              targetEntities: (e.target as HTMLInputElement).value
                .split(',')
                .map((s) => s.trim())
                .filter((s) => s.length > 0),
            })}
        ></ha-input>
      </div>
    `;
  }

  /** Optional list of glob patterns. Each row is a plain text input
   *  with a live "Matches N entities" preview underneath. */
  private renderTargetGlobsField(): TemplateResult {
    return html`
      <fieldset>
        <legend>
          Glob patterns (optional) — match many entities at once.
          E.g. <code>light.kitchen_*</code> or <code>sensor.temp_?</code>.
        </legend>
        ${this.working.targetGlobs.length === 0
          ? html`<p class="fieldset-hint">
              No patterns. Use the picker above for individual entities,
              or click <strong>+ Add pattern</strong> to target a group.
            </p>`
          : null}
        ${this.working.targetGlobs.map(
          (g, idx) => html`
            <div class="target-row">
              <ha-input
                label="Glob pattern"
                placeholder="e.g. light.kitchen_*"
                .value=${g.value}
                @input=${(e: Event) =>
                  this.updateGlob(idx, (e.target as HTMLInputElement).value)}
              ></ha-input>
              <!-- Row-delete affordance per docs/ha-elements-guide.md
                   decision tree, item 4. -->
              <button
                class="btn-icon"
                @click=${() => this.removeGlob(idx)}
                title="Remove pattern"
              >×</button>
            </div>
            ${this.renderGlobPreview(g.value)}
          `
        )}
        <ha-button
          variant="neutral"
          @click=${this.addGlob}
        >+ Add pattern</ha-button>
      </fieldset>
    `;
  }

  /** Render a "Matches N entities: ..." hint under a glob target row.
   *  Returns nothing for empty input. Computes against the current
   *  hass.states snapshot so the user sees what their pattern matches. */
  private renderGlobPreview(value: string): TemplateResult | null {
    const trimmed = value.trim();
    if (!trimmed || !/[*?[]/.test(trimmed)) return null;
    if (!this.hass) return null;
    const matches = this.matchGlob(trimmed);
    if (matches.length === 0) {
      return html`<div class="target-hint target-hint--empty">
        No entities match this pattern yet.
      </div>`;
    }
    const preview = matches.slice(0, 3).join(', ');
    const more = matches.length > 3 ? ` (+${matches.length - 3} more)` : '';
    return html`<div class="target-hint">
      Matches ${matches.length}
      ${matches.length === 1 ? 'entity' : 'entities'}:
      <code>${preview}</code>${more}
    </div>`;
  }

  /** Tiny glob matcher matching Python's fnmatch: `*` (any), `?` (one),
   *  `[set]` (one of), `[!set]` (none of). Mirrors the backend's
   *  `_resolve_targets` so the preview matches what the injector
   *  actually applies. JavaScript regex character-class syntax uses
   *  `^` for negation where fnmatch uses `!`, so translate that
   *  before letting the resulting char-class fall through unescaped.
   *  Note: square brackets are NOT in the escape list above precisely
   *  so positive `[abc]` sets pass through as valid regex char
   *  classes; only the `[!` → `[^` translation is needed for parity. */
  private matchGlob(pattern: string): string[] {
    const re = new RegExp(
      '^' +
        pattern
          .replace(/[.+^$()|\\]/g, '\\$&')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.')
          .replace(/\[!/g, '[^') +
        '$'
    );
    return Object.keys(this.hass?.states ?? {})
      .filter((id) => re.test(id))
      .sort();
  }

  private updateGlob(idx: number, value: string): void {
    this.working = {
      ...this.working,
      targetGlobs: this.working.targetGlobs.map((g, i) =>
        i === idx ? { ...g, value } : g
      ),
    };
  }

  private addGlob = (): void => {
    this.working = {
      ...this.working,
      targetGlobs: [
        ...this.working.targetGlobs,
        { value: '', _key: nextKey() },
      ],
    };
  };

  private removeGlob(idx: number): void {
    this.working = {
      ...this.working,
      targetGlobs: this.working.targetGlobs.filter((_, i) => i !== idx),
    };
  }

  // ---- thresholds ----

  private thresholdComparator(t: ThresholdEntry): string {
    for (const c of ['lt', 'lte', 'gt', 'gte', 'eq'] as const) {
      if (t[c] !== undefined) return c;
    }
    return '';
  }

  private thresholdValue(t: ThresholdEntry): string {
    for (const c of ['lt', 'lte', 'gt', 'gte', 'eq'] as const) {
      if (t[c] !== undefined) return String(t[c]);
    }
    return '';
  }

  private setThresholdComparator(idx: number, comparator: string): void {
    const current = this.working.thresholds[idx];
    const cleaned = { ...current };
    for (const c of ['lt', 'lte', 'gt', 'gte', 'eq'] as const) delete cleaned[c];
    if (comparator) {
      const raw = this.thresholdValue(current);
      const num = Number(raw);
      const value =
        comparator === 'eq' && Number.isNaN(num)
          ? raw
          : !Number.isNaN(num)
            ? num
            : 0;
      (cleaned as Record<string, unknown>)[comparator] = value;
    }
    this.working = {
      ...this.working,
      thresholds: this.working.thresholds.map((t, i) =>
        i === idx ? cleaned : t
      ),
    };
  }

  private setThresholdValue(idx: number, raw: string): void {
    const current = this.working.thresholds[idx];
    const cmp = this.thresholdComparator(current);
    if (!cmp) return;
    const num = Number(raw);
    const value = cmp === 'eq' && Number.isNaN(num) ? raw : num;
    this.working = {
      ...this.working,
      thresholds: this.working.thresholds.map((t, i) =>
        i === idx ? { ...t, [cmp]: value } : t
      ),
    };
  }

  private updateThreshold(idx: number, patch: Partial<ThresholdEntry>): void {
    this.working = {
      ...this.working,
      thresholds: this.working.thresholds.map((t, i) =>
        i === idx ? { ...t, ...patch } : t
      ),
    };
  }

  private addThreshold = (): void => {
    this.working = {
      ...this.working,
      thresholds: [
        ...this.working.thresholds,
        {
          lt: 0,
          color: '',
          background_color: '',
          icon: '',
          _key: nextKey(),
        },
      ],
    };
  };

  private removeThreshold(idx: number): void {
    this.working = {
      ...this.working,
      thresholds: this.working.thresholds.filter((_, i) => i !== idx),
    };
  }

  // ---- mapping ----

  private updateMapping(
    idx: number,
    patch: Partial<{
      key: string;
      color: string;
      background_color: string;
      icon: string;
    }>
  ): void {
    this.working = {
      ...this.working,
      mapping: this.working.mapping.map((m, i) =>
        i === idx ? { ...m, ...patch } : m
      ),
    };
  }

  private addMapping = (): void => {
    this.working = {
      ...this.working,
      mapping: [
        ...this.working.mapping,
        {
          key: '',
          color: '',
          background_color: '',
          icon: '',
          _key: nextKey(),
        },
      ],
    };
  };

  private removeMapping(idx: number): void {
    this.working = {
      ...this.working,
      mapping: this.working.mapping.filter((_, i) => i !== idx),
    };
  }

  // ---- save ----

  private save = (): void => {
    let payload: Partial<Rule>;
    if (this.codeMode) {
      // YAML is the source of truth when the code editor is open.
      // Parse here so the error path stays inside the editor; if it
      // fails we surface the parse error in the inline-error slot
      // above the textarea and refuse to dispatch.
      const { rules, parseError } = yamlToImportable(this.codeText);
      if (parseError) {
        this.codeError = parseError;
        return;
      }
      const parsed = rules[0];
      if (!parsed) {
        this.codeError = 'YAML did not contain a rule.';
        return;
      }
      payload = parsed;
      // Preserve id so editing an existing rule still updates it
      // rather than creating a new one. The YAML serializer strips id
      // on export, so without this every YAML-edit save would mint a
      // fresh ulid and orphan the original.
      if (this.working.id) payload.id = this.working.id;
    } else {
      payload = this.serialize();
    }
    this.dispatchEvent(
      new CustomEvent('save', {
        detail: payload,
        bubbles: true,
        composed: true,
      })
    );
  };

  private serialize(): Partial<Rule> {
    const entities = this.working.targetEntities;
    const globs = this.working.targetGlobs
      .map((g) => g.value.trim())
      .filter((v) => v.length > 0);
    const targets = [...entities, ...globs];
    const sourceTrimmed = this.working.source.trim();
    // Match backend `validate_rule`'s default-source semantics:
    // ONLY a pure single-literal target with no globs gets its source
    // auto-defaulted to the target. Any mixed-target or multi-target
    // shape leaves the source empty, which the injector reads as
    // per-target evaluation. Previously this fell back to
    // `entities[0]` unconditionally, which produced an explicit
    // single-source rule for users who clearly authored a multi-
    // target rule and left the source blank intentionally.
    const isPureSingleLiteral = entities.length === 1 && globs.length === 0;
    const source =
      sourceTrimmed || (isPureSingleLiteral ? entities[0] : '');
    const sourceAttribute = this.working.source_attribute.trim();
    const base: Partial<Rule> = {
      targets,
      source,
      mode: this.working.mode,
      enabled: this.working.enabled,
      priority: this.working.priority,
    };
    if (sourceAttribute) base.source_attribute = sourceAttribute;
    if (this.working.id) base.id = this.working.id;

    if (this.working.mode === 'thresholds') {
      base.thresholds = this.working.thresholds.map(({ _key, ...t }) => {
        const cleaned: ThresholdEntry = {};
        for (const c of ['lt', 'lte', 'gt', 'gte', 'eq'] as const) {
          if (t[c] !== undefined) {
            (cleaned as Record<string, unknown>)[c] = t[c];
          }
        }
        if (t.color) cleaned.color = t.color;
        if (t.background_color) cleaned.background_color = t.background_color;
        if (t.icon) cleaned.icon = t.icon;
        return cleaned;
      });
    } else if (this.working.mode === 'mapping') {
      const mapping: Record<string, Decoration> = {};
      for (const entry of this.working.mapping) {
        if (!entry.key) continue;
        // Skip key-only rows: serializing them as `{key: {}}` would
        // pass schema validation but the evaluator returns null for
        // an empty decoration, so the rule looks present in storage
        // and YAML but does nothing at runtime. Better to drop the
        // empty row entirely — the user can re-add it when ready.
        if (!entry.color && !entry.background_color && !entry.icon) continue;
        const dec: Decoration = {};
        if (entry.color) dec.color = entry.color;
        if (entry.background_color) {
          dec.background_color = entry.background_color;
        }
        if (entry.icon) dec.icon = entry.icon;
        mapping[entry.key] = dec;
      }
      base.mapping = mapping;
    }

    return base;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'smart-icons-rule-editor': SmartIconsRuleEditor;
  }
}
