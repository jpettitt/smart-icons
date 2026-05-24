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
