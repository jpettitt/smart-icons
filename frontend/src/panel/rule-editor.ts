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
  target: string;
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
        ${this.renderEntityField(
          'Target entity',
          'e.g. light.kitchen',
          this.working.target,
          (v) => this.patch({ target: v }),
          true
        )}
      </section>

      <section class="group">
        <h3 class="group-title">React to</h3>
        ${this.renderEntityField(
          'Source entity',
          'defaults to target',
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
            ${this.working.source_attribute
              ? html`Watching <code>${this.sourceEntityForDisplay}.${this
                  .working.source_attribute}</code>`
              : html`Watching the state of <code>${this
                  .sourceEntityForDisplay}</code>. Pick a state attribute
                (e.g. <code>azimuth</code>) for numeric-attribute rules.`}
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
        <button
          class="btn-text"
          @click=${() =>
            this.dispatchEvent(
              new CustomEvent('cancel', { bubbles: true, composed: true })
            )}
        >
          Cancel
        </button>
        <button class="btn-primary" @click=${this.save}>Save</button>
      </div>
    `;
  }

  /** Entity id used in the "Watching …" hint — falls back to target. */
  private get sourceEntityForDisplay(): string {
    return (
      this.working.source.trim() ||
      this.working.target.trim() ||
      '(entity)'
    );
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
    return html`
      <fieldset>
        <legend>
          Threshold entries — first matching wins; the entry with no
          comparator is the "else" branch.
        </legend>
        ${this.working.thresholds.map(
          (t, idx) => html`
            <div class="row">
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

  private renderMapping() {
    return html`
      <fieldset>
        <legend>
          State → decoration. <code>_else</code> is the fallback bucket.
        </legend>
        ${this.working.mapping.map(
          (m, idx) => html`
            <div class="row">
              <input
                type="text"
                placeholder="state"
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
    return {
      id: rule.id,
      target: rule.target,
      source: rule.source === rule.target ? '' : rule.source,
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
      target: '',
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
    const target = this.working.target.trim();
    const source = this.working.source.trim() || target;
    const sourceAttribute = this.working.source_attribute.trim();
    const base: Partial<Rule> = {
      target,
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
