/**
 * Unit tests for the rule editor's serialize / hydrate / validation
 * surface. We exercise these directly rather than through a Lit
 * fixture mount: the goal is to catch regressions in the working-state
 * shape (decoration field plumbing, mode validation), not in the
 * rendered HTML — that's the e2e test's job.
 */
import { expect, fixture, html } from '@open-wc/testing';

import '../src/panel/rule-editor.js';
import type { SmartIconsRuleEditor } from '../src/panel/rule-editor.js';
import type { Rule } from '../src/types.js';

function baseRule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: '01',
    targets: ['light.kitchen'],
    source: 'sensor.state',
    mode: 'mapping',
    mapping: { on: { color: '#fff' } },
    enabled: true,
    priority: 10,
    created: '',
    updated: '',
    source_kind: 'ui',
    ...overrides,
  };
}

async function makeEditor(rule?: Rule): Promise<SmartIconsRuleEditor> {
  const el = (await fixture(html`
    <smart-icons-rule-editor .rule=${rule ?? null}></smart-icons-rule-editor>
  `)) as SmartIconsRuleEditor;
  return el;
}

/** Cast through unknown so tests can poke at private state without
 *  TypeScript complaints. We're testing semantics that aren't exposed
 *  publicly; spelunking is intentional. */
function priv(el: SmartIconsRuleEditor): {
  working: {
    mode: string;
    thresholds: Array<Record<string, unknown>>;
    mapping: Array<Record<string, unknown>>;
    targetEntities: string[];
    targetGlobs: Array<{ value: string; _key: number }>;
    source: string;
  };
  modeError: string | null;
  serialize(): Partial<Rule>;
} {
  return el as unknown as ReturnType<typeof priv>;
}

describe('rule-editor: hydrate + serialize background_color', () => {
  it('hydrates a mapping rule with bg-only entry', async () => {
    const el = await makeEditor(
      baseRule({
        mode: 'mapping',
        mapping: { highlighted: { background_color: '#43a047' } },
      }),
    );
    const w = priv(el).working;
    expect(w.mapping[0].key).to.equal('highlighted');
    expect(w.mapping[0].background_color).to.equal('#43a047');
    expect(w.mapping[0].color).to.equal('');
  });

  it('hydrates a threshold rule with bg + color', async () => {
    const el = await makeEditor(
      baseRule({
        mode: 'thresholds',
        thresholds: [
          { lt: 18, color: '#ffff00', background_color: '#43a047' },
        ],
      }),
    );
    const t = priv(el).working.thresholds[0];
    expect(t.lt).to.equal(18);
    expect(t.color).to.equal('#ffff00');
    expect(t.background_color).to.equal('#43a047');
  });

  it('serializes a mapping bg-only entry without inventing a color', async () => {
    const el = await makeEditor(
      baseRule({
        mode: 'mapping',
        mapping: { on: { background_color: '#43a047' } },
      }),
    );
    const out = priv(el).serialize();
    expect(out.mapping).to.eql({ on: { background_color: '#43a047' } });
  });

  it('serializes a threshold bg-only entry without inventing a color', async () => {
    const el = await makeEditor(
      baseRule({
        mode: 'thresholds',
        thresholds: [{ lt: 18, background_color: '#43a047' }],
      }),
    );
    const out = priv(el).serialize();
    expect(out.thresholds).to.eql([
      { lt: 18, background_color: '#43a047' },
    ]);
  });
});

describe('rule-editor: degenerate mapping rows are dropped on serialize', () => {
  it('skips a key-only mapping row (no color/bg/icon)', async () => {
    // Hydrate a rule whose stored shape has a valid entry, then we
    // patch the working state to add a degenerate row alongside it,
    // mimicking what the user gets after clicking "+ Add state" and
    // typing a key but no decoration.
    const el = await makeEditor(
      baseRule({
        mode: 'mapping',
        mapping: { good: { color: '#fff' } },
      }),
    );
    const w = priv(el).working;
    w.mapping.push({
      key: 'empty',
      color: '',
      background_color: '',
      icon: '',
      _key: 99,
    });
    const out = priv(el).serialize();
    expect(Object.keys(out.mapping ?? {})).to.eql(['good']);
  });
});

describe('rule-editor: modeError catches incomplete entries', () => {
  it('flags an all-blank thresholds list', async () => {
    const el = await makeEditor(
      baseRule({ mode: 'thresholds', thresholds: [] }),
    );
    const w = priv(el).working;
    // Simulate the user clicking "+ Add entry" once (an empty seed row).
    w.thresholds.push({
      _key: 100,
      color: '',
      background_color: '',
      icon: '',
    });
    el.requestUpdate();
    await el.updateComplete;
    expect(priv(el).modeError).to.match(/thresholds mode needs/i);
  });

  it('accepts a bg-only thresholds entry', async () => {
    const el = await makeEditor(
      baseRule({
        mode: 'thresholds',
        thresholds: [{ lt: 18, background_color: '#43a047' }],
      }),
    );
    expect(priv(el).modeError).to.be.null;
  });

  it('flags a mapping with only key-and-no-decoration entries', async () => {
    const el = await makeEditor(
      baseRule({ mode: 'mapping', mapping: { on: { color: '#fff' } } }),
    );
    const w = priv(el).working;
    // Replace the one entry with a key-only row.
    w.mapping[0] = {
      key: 'on',
      color: '',
      background_color: '',
      icon: '',
      _key: 200,
    };
    el.requestUpdate();
    await el.updateComplete;
    expect(priv(el).modeError).to.match(/state → decoration/i);
  });

  it('accepts a mapping with bg-only entry', async () => {
    const el = await makeEditor(
      baseRule({
        mode: 'mapping',
        mapping: { on: { background_color: '#43a047' } },
      }),
    );
    expect(priv(el).modeError).to.be.null;
  });
});

describe('rule-editor: serialize source defaults align with backend', () => {
  // Backend `validate_rule` defaults source to target ONLY when there's
  // exactly one literal target AND no glob characters in it. Any other
  // case (multi-target, glob present, or both) → source stays empty,
  // meaning per-target evaluation. Frontend must match: serializing
  // with source-blank shouldn't pick the first literal entity as the
  // source when globs are also present.
  it('pure single-literal target with no source defaults source to the target', async () => {
    const el = await makeEditor(
      baseRule({
        targets: ['light.kitchen'],
        source: '',  // user left source blank
        mode: 'mapping',
        mapping: { on: { color: '#fff' } },
      }),
    );
    const out = priv(el).serialize();
    expect(out.source).to.equal('light.kitchen');
  });

  it('mixed literal + glob targets with no source leaves source empty (per-target)', async () => {
    // This was the bug: serialize() unconditionally fell back to
    // entities[0] when sourceTrimmed was empty, producing an explicit
    // source for a rule the user clearly authored as multi-target.
    // Backend would then evaluate ALL resolved targets against the one
    // literal's state — almost never the intent.
    const el = await makeEditor(
      baseRule({
        targets: ['light.kitchen'],
        source: '',
        mode: 'mapping',
        mapping: { on: { color: '#fff' } },
      }),
    );
    // Add a glob via the working state (no public API on the editor
    // for this, so we poke private state — same pattern as the
    // mapping/threshold tests above).
    priv(el).working.targetGlobs.push({ value: 'sensor.*', _key: 1 });
    const out = priv(el).serialize();
    expect(out.source).to.equal('');
    expect(out.targets).to.eql(['light.kitchen', 'sensor.*']);
  });

  it('glob-only targets with no source leaves source empty', async () => {
    // No literal entities at all — entities[0] is undefined; was
    // already correct via the `|| ''` chain. Locked in as a
    // regression test.
    const el = await makeEditor(
      baseRule({
        targets: ['sensor.*'],
        source: '',
        mode: 'mapping',
        mapping: { unknown: { color: '#f00' } },
      }),
    );
    const out = priv(el).serialize();
    expect(out.source).to.equal('');
  });

  it('explicit source is respected regardless of target shape', async () => {
    const el = await makeEditor(
      baseRule({
        targets: ['light.kitchen', 'light.bedroom'],
        source: 'input_select.scene',
        mode: 'mapping',
        mapping: { movie: { color: '#000' } },
      }),
    );
    expect(priv(el).modeError).to.be.null;
  });
});

/** Dirty-tracking is what gates the panel-level "Discard changes?"
 *  confirm: the panel listens for `dirty-changed` events to toggle
 *  the document-capture pointerdown / keydown guards that intercept
 *  backdrop-click and ESC dismissal of the ha-dialog wrapping this
 *  editor. If isDirty() ever lies, the user loses unsaved edits to
 *  a stray click — the whole point of the feature. */
describe('rule-editor: dirty tracking', () => {
  /** SmartIconsRuleEditor's reactive fields are `private`. A naive
   *  `Editor & { working: ... }` intersection collapses to `never`
   *  in strict TS because `private` members can't be widened
   *  through an intersection. Cast through `unknown` (same pattern
   *  the file-level `priv()` helper uses) to poke at internals. */
  type DirtyEditorPriv = {
    isDirty(): boolean;
    working: { source: string };
    cancelClicked: () => void;
    updateComplete: Promise<unknown>;
    rule?: Rule;
    addEventListener: HTMLElement['addEventListener'];
  };
  const priv = (el: SmartIconsRuleEditor): DirtyEditorPriv =>
    el as unknown as DirtyEditorPriv;

  it('reports clean on a freshly hydrated rule', async () => {
    const el = priv(await makeEditor(baseRule()));
    expect(el.isDirty()).to.be.false;
  });

  it('flips dirty after a working-state change', async () => {
    const el = priv(await makeEditor(baseRule()));
    expect(el.isDirty()).to.be.false;
    el.working = { ...el.working, source: 'sensor.changed' };
    await el.updateComplete;
    expect(el.isDirty()).to.be.true;
  });

  it('re-hydrating resets the snapshot to the new rule', async () => {
    const el = priv(await makeEditor(baseRule()));
    el.working = { ...el.working, source: 'sensor.changed' };
    await el.updateComplete;
    expect(el.isDirty()).to.be.true;
    // Swap rule → editor re-hydrates and resnapshots. Without this
    // reset, the next dialog open would inherit the prior session's
    // dirty flag and falsely block dismissal.
    el.rule = baseRule({ id: '02', source: 'sensor.b' });
    await el.updateComplete;
    expect(el.isDirty()).to.be.false;
  });

  it('fires dirty-changed with the new value once per transition', async () => {
    const el = priv(await makeEditor(baseRule()));
    const events: boolean[] = [];
    el.addEventListener('dirty-changed', (e: Event) => {
      events.push((e as CustomEvent<{ dirty: boolean }>).detail.dirty);
    });
    // First edit: clean → dirty.
    el.working = { ...el.working, source: 'sensor.a' };
    await el.updateComplete;
    // Second edit while already dirty: should NOT fire again — the
    // panel-side guard only cares about transitions.
    el.working = { ...el.working, source: 'sensor.b' };
    await el.updateComplete;
    // Revert to initial snapshot: dirty → clean.
    el.working = { ...el.working, source: 'sensor.state' };
    await el.updateComplete;
    expect(events).to.deep.equal([true, false]);
  });

  it('cancel-button event carries the current dirty state', async () => {
    const el = priv(await makeEditor(baseRule()));
    let detail: { dirty: boolean } | undefined;
    el.addEventListener('cancel-button', (e: Event) => {
      detail = (e as CustomEvent<{ dirty: boolean }>).detail;
    });
    // Clean cancel.
    el.cancelClicked();
    expect(detail?.dirty).to.be.false;
    // Dirty cancel.
    el.working = { ...el.working, source: 'sensor.changed' };
    await el.updateComplete;
    el.cancelClicked();
    expect(detail?.dirty).to.be.true;
  });
});
