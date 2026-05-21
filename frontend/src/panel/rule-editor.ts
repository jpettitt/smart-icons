/**
 * `<smart-icons-rule-editor>` — form for creating or editing one rule.
 *
 * Uses plain HTML `<input>` / `<select>` styled with HA's CSS variables.
 * We tried HA's `ha-textfield` originally but it isn't reliably defined
 * by the time a custom-panel module loads (other ha-* elements like
 * ha-select and ha-switch are, but ha-textfield's lazy-load chunk isn't
 * guaranteed). Plain inputs always render, theme correctly via CSS
 * variables, and dodge the entire timing question.
 *
 * Emits `save` with the rule payload or `cancel`. The host panel is
 * responsible for actually persisting the rule via the WS API and for
 * showing/hiding this element inside an `ha-dialog`.
 */

import { LitElement, html, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import type { Hass, Rule, RuleMode, ThresholdEntry, Decoration } from '../types';
import { editorStyles } from './styles.js';

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
  mapping: Array<{ key: string; color: string; icon: string; _key: number }>;
  template: string;
  enabled: boolean;
  priority: number;
}

let _nextKey = 0;
function nextKey(): number {
  return _nextKey++;
}

@customElement('smart-icons-rule-editor')
export class SmartIconsRuleEditor extends LitElement {
  static override styles = editorStyles;

  @property({ attribute: false }) rule?: Rule;
  @property({ attribute: false }) hass?: Hass;
  @property({ type: String }) errorMessage = '';

  @state() private working: WorkingState = this.blankState();

  /** Per-mapping-row autocomplete: states the resolved source entity
   *  has been observed in (recorder history) plus its current state.
   *  Keyed in `_observedStatesCache` by entity id so we don't re-query
   *  on every render. */
  @state() private observedStates: readonly string[] = [];
  private _observedStatesCache = new Map<string, readonly string[]>();
  private _observedStatesEntityId = '';

  override connectedCallback(): void {
    super.connectedCallback();
    // HA's pickers are lazy-loaded; re-render when they land so plain
    // inputs upgrade. We use `ha-selector` for entities (HA's
    // higher-level dispatcher — same code path as options flows, handles
    // all version-specific picker variants internally) and
    // `ha-icon-picker` for icons.
    for (const tag of ['ha-icon-picker', 'ha-selector']) {
      if (!customElements.get(tag)) {
        void customElements
          .whenDefined(tag)
          .then(() => this.requestUpdate())
          .catch(() => {
            /* never loaded — stay on plain input fallback */
          });
      }
    }
  }

  override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('rule')) {
      this.working = this.rule ? this.hydrate(this.rule) : this.blankState();
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
    return html`
      <div class="icon-input">
        ${value
          ? html`<ha-icon class="icon-preview" .icon=${value}></ha-icon>`
          : html`<span class="icon-preview placeholder" aria-hidden="true"></span>`}
        <input
          type="text"
          placeholder="mdi:icon"
          .value=${value}
          @input=${(e: Event) =>
            onChange((e.target as HTMLInputElement).value)}
        />
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
    return html`
      <label class="field">
        <span class="label">${label}</span>
        <input
          type="text"
          list="smart-icons-entities"
          ?required=${required}
          placeholder=${placeholder}
          .value=${value}
          @input=${(e: Event) =>
            onChange((e.target as HTMLInputElement).value)}
        />
      </label>
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
        <label class="field">
          <span class="label">Source attribute</span>
          <input
            type="text"
            list="smart-icons-source-attributes"
            placeholder="leave blank to use the entity's state"
            .value=${this.working.source_attribute}
            @input=${(e: Event) =>
              this.patch({
                source_attribute: (e.target as HTMLInputElement).value,
              })}
          />
          <span class="hint">
            ${this.renderWatchingHint()}
          </span>
        </label>
      </section>

      <section class="group">
        <h3 class="group-title">Decoration</h3>
        <label class="field">
          <span class="label">Mode</span>
          <select
            .value=${this.working.mode}
            @change=${(e: Event) =>
              this.patch({
                mode: (e.target as HTMLSelectElement).value as RuleMode,
              })}
          >
            <option
              value="mapping"
              ?selected=${this.working.mode === 'mapping'}
            >
              Mapping (exact state → decoration)
            </option>
            <option
              value="thresholds"
              ?selected=${this.working.mode === 'thresholds'}
            >
              Thresholds (numeric ranges)
            </option>
            <option
              value="template"
              ?selected=${this.working.mode === 'template'}
            >
              Template (v0.2)
            </option>
          </select>
        </label>
        ${this.working.mode === 'thresholds'
          ? this.renderThresholds()
          : this.working.mode === 'mapping'
            ? this.renderMapping()
            : this.renderTemplate()}
        ${this.modeError
          ? html`<div class="inline-error">${this.modeError}</div>`
          : null}
      </section>

      <section class="group">
        <h3 class="group-title">Options</h3>
        <label class="field">
          <span class="label">Priority</span>
          <input
            type="number"
            .value=${String(this.working.priority)}
            @input=${(e: Event) =>
              this.patch({
                priority: Number((e.target as HTMLInputElement).value) || 0,
              })}
          />
          <span class="hint">
            When several rules target the same entity, the highest-priority
            enabled rule with a matching state wins.
          </span>
        </label>
      </section>

      ${this.errorMessage
        ? html`<div class="error">${this.errorMessage}</div>`
        : null}

      <div class="actions">
        <ha-button @click=${this.cancelClicked}>Cancel</ha-button>
        <ha-button
          variant="brand"
          ?disabled=${this.validationErrors.length > 0}
          @click=${this.save}
        >Save</ha-button>
      </div>
    `;
  }

  private cancelClicked = (): void => {
    this.dispatchEvent(
      new CustomEvent('cancel', { bubbles: true, composed: true })
    );
  };

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
      const hasEntries = this.working.thresholds.some(
        (t) =>
          this.thresholdComparator(t) !== null || t.color || t.icon
      );
      if (!hasEntries) return 'Thresholds mode needs at least one entry.';
    } else if (this.working.mode === 'mapping') {
      const hasKey = this.working.mapping.some(
        (m) => m.key.trim().length > 0
      );
      if (!hasKey) return 'Mapping mode needs at least one state → decoration entry.';
    } else if (this.working.mode === 'template') {
      if (!this.working.template.trim()) {
        return 'Template mode requires a non-empty Jinja template.';
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
          comparator is the "else" branch. Use ↑ ↓ to reorder.
        </legend>
        ${entries.length === 0
          ? html`<p class="fieldset-hint">
              No threshold entries yet. Each entry has a comparator
              (e.g. <code>&lt; 18</code>) plus a color or icon to apply.
              The first matching entry wins.
            </p>`
          : null}
        ${entries.map(
          (t, idx) => html`
            <div class="row threshold-row">
              <div class="reorder-buttons">
                <button
                  class="btn-icon"
                  ?disabled=${idx === 0}
                  @click=${() => this.moveThreshold(idx, -1)}
                  title="Move up"
                >↑</button>
                <button
                  class="btn-icon"
                  ?disabled=${idx === entries.length - 1}
                  @click=${() => this.moveThreshold(idx, 1)}
                  title="Move down"
                >↓</button>
              </div>
              <select
                .value=${this.thresholdComparator(t)}
                @change=${(e: Event) =>
                  this.setThresholdComparator(
                    idx,
                    (e.target as HTMLSelectElement).value
                  )}
                title="Comparator"
              >
                <option value="">(else)</option>
                <option value="lt">&lt;</option>
                <option value="lte">≤</option>
                <option value="gt">&gt;</option>
                <option value="gte">≥</option>
                <option value="eq">=</option>
              </select>
              <input
                type="text"
                placeholder="value"
                .value=${this.thresholdValue(t)}
                ?disabled=${this.thresholdComparator(t) === ''}
                @input=${(e: Event) =>
                  this.setThresholdValue(
                    idx,
                    (e.target as HTMLInputElement).value
                  )}
              />
              ${this.renderColorInput(t.color ?? '', (v) =>
                this.updateThreshold(idx, { color: v })
              )}
              ${this.renderIconField(t.icon ?? '', (v) =>
                this.updateThreshold(idx, { icon: v })
              )}
              <button
                class="btn-icon"
                @click=${() => this.removeThreshold(idx)}
                title="Remove"
              >×</button>
            </div>
          `
        )}
        <button class="btn-text add-button" @click=${this.addThreshold}>
          + Add entry
        </button>
      </fieldset>
    `;
  }

  private moveThreshold(idx: number, delta: -1 | 1): void {
    const target = idx + delta;
    if (target < 0 || target >= this.working.thresholds.length) return;
    const next = [...this.working.thresholds];
    [next[idx], next[target]] = [next[target], next[idx]];
    this.working = { ...this.working, thresholds: next };
  }

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
            <div class="row">
              <input
                type="text"
                placeholder="state"
                list="smart-icons-observed-states"
                .value=${m.key}
                @input=${(e: Event) =>
                  this.updateMapping(idx, {
                    key: (e.target as HTMLInputElement).value,
                  })}
              />
              ${this.renderColorInput(m.color, (v) =>
                this.updateMapping(idx, { color: v })
              )}
              ${this.renderIconField(m.icon, (v) =>
                this.updateMapping(idx, { icon: v })
              )}
              <button
                class="btn-icon"
                @click=${() => this.removeMapping(idx)}
                title="Remove"
              >×</button>
            </div>
          `
        )}
        <button class="btn-text add-button" @click=${this.addMapping}>
          + Add state
        </button>
      </fieldset>
    `;
  }

  private renderTemplate() {
    return html`
      <fieldset>
        <legend>
          Template mode (storage only in v0.1; runtime evaluation lands in v0.2).
        </legend>
        <input
          type="text"
          placeholder='{{ "#ff0000" if is_state(...) else "inherit" }}'
          .value=${this.working.template}
          @input=${(e: Event) =>
            this.patch({
              template: (e.target as HTMLInputElement).value,
            })}
        />
      </fieldset>
    `;
  }

  private renderColorInput(value: string, onChange: (v: string) => void) {
    return html`
      <div class="swatch-input">
        <input
          type="color"
          .value=${this.colorAsHex(value)}
          @input=${(e: Event) =>
            onChange((e.target as HTMLInputElement).value)}
          title="Pick a color"
        />
        <input
          type="text"
          placeholder="#hex, name, or var(--…)"
          .value=${value}
          @input=${(e: Event) =>
            onChange((e.target as HTMLInputElement).value)}
        />
      </div>
    `;
  }

  /** Convert any CSS color string to a hex the native picker accepts.
   *  Falls back to #888888 for inputs the browser can't resolve. */
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
      return /^#[0-9a-fA-F]{6}$/.test(out) ? out : '#888888';
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
            icon: (dec as Decoration).icon ?? '',
            _key: nextKey(),
          }))
        : [],
      template: rule.template ?? '',
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
      mapping: [{ key: '', color: '', icon: '', _key: nextKey() }],
      template: '',
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
    // Selector not available — fall back to a plain comma-separated input.
    return html`
      <label class="field">
        <span class="label">Target entities (comma-separated)</span>
        <input
          type="text"
          list="smart-icons-entities"
          placeholder="light.kitchen, light.living_room"
          .value=${this.working.targetEntities.join(', ')}
          @input=${(e: Event) =>
            this.patch({
              targetEntities: (e.target as HTMLInputElement).value
                .split(',')
                .map((s) => s.trim())
                .filter((s) => s.length > 0),
            })}
        />
      </label>
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
              <input
                type="text"
                placeholder="e.g. light.kitchen_*"
                .value=${g.value}
                @input=${(e: Event) =>
                  this.updateGlob(idx, (e.target as HTMLInputElement).value)}
              />
              <button
                class="btn-icon"
                @click=${() => this.removeGlob(idx)}
                title="Remove pattern"
              >×</button>
            </div>
            ${this.renderGlobPreview(g.value)}
          `
        )}
        <button class="btn-text add-button" @click=${this.addGlob}>
          + Add pattern
        </button>
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
   *  `[set]` (one of). Mirrors the backend's `_resolve_targets` so the
   *  preview matches what the injector actually applies. */
  private matchGlob(pattern: string): string[] {
    const re = new RegExp(
      '^' +
        pattern
          .replace(/[.+^$()|\\]/g, '\\$&')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.') +
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
        { lt: 0, color: '', icon: '', _key: nextKey() },
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
    patch: Partial<{ key: string; color: string; icon: string }>
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
        { key: '', color: '', icon: '', _key: nextKey() },
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
    const payload = this.serialize();
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
    const source = sourceTrimmed || entities[0] || '';
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
        if (t.icon) cleaned.icon = t.icon;
        return cleaned;
      });
    } else if (this.working.mode === 'mapping') {
      const mapping: Record<string, Decoration> = {};
      for (const entry of this.working.mapping) {
        if (!entry.key) continue;
        const dec: Decoration = {};
        if (entry.color) dec.color = entry.color;
        if (entry.icon) dec.icon = entry.icon;
        mapping[entry.key] = dec;
      }
      base.mapping = mapping;
    } else if (this.working.mode === 'template') {
      base.template = this.working.template;
    }

    return base;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'smart-icons-rule-editor': SmartIconsRuleEditor;
  }
}
