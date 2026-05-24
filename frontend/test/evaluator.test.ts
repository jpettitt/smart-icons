import { expect } from '@open-wc/testing';

import {
  evaluateMapping,
  evaluateRule,
  evaluateThresholds,
  mergeDecorations,
  pickWinner,
} from '../src/evaluator.js';
import type { Rule } from '../src/types.js';

function rule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: '01',
    targets: ['light.kitchen'],
    source: 'sensor.temp',
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

describe('evaluateThresholds (sparse positions)', () => {
  it('returns first matching numeric entry', () => {
    const r = evaluateThresholds(
      [
        { lt: 18, color: '#0000ff' },
        { lt: 25, color: '#00ff00' },
        { color: '#ff0000' },
      ],
      '15'
    );
    expect(r).to.eql({ color: '#0000ff' });
  });

  it('falls through to else entry', () => {
    const r = evaluateThresholds(
      [
        { lt: 18, color: '#0000ff' },
        { color: '#ff0000' },
      ],
      '30'
    );
    expect(r).to.eql({ color: '#ff0000' });
  });

  it('numeric comparators skip non-numeric state, else still matches', () => {
    const r = evaluateThresholds(
      [
        { lt: 18, color: '#0000ff' },
        { color: '#fallback' },
      ],
      'unknown'
    );
    expect(r).to.eql({ color: '#fallback' });
  });

  it('returns null if no entry matches and no else', () => {
    const r = evaluateThresholds([{ lt: 18, color: '#fff' }], 'unknown');
    expect(r).to.be.null;
  });

  it('honors gt / gte / lte', () => {
    expect(evaluateThresholds([{ gt: 24, color: '#a' }], '25')).to.eql({
      color: '#a',
    });
    expect(evaluateThresholds([{ gte: 25, color: '#b' }], '25')).to.eql({
      color: '#b',
    });
    expect(evaluateThresholds([{ lte: 25, color: '#c' }], '25')).to.eql({
      color: '#c',
    });
  });

  it('eq supports string and numeric', () => {
    expect(evaluateThresholds([{ eq: 'on', icon: 'mdi:check' }], 'on')).to.eql({
      icon: 'mdi:check',
    });
    expect(evaluateThresholds([{ eq: 5, icon: 'mdi:five' }], '5')).to.eql({
      icon: 'mdi:five',
    });
  });

  it('release sentinels yield explicit-null positions', () => {
    // Sentinel "inherit" / "" on a matching entry produces a position
    // of null for that field — the merger turns this into "clear the
    // attribute, blocking lower-priority contributions."
    expect(
      evaluateThresholds([{ lt: 18, color: 'inherit' }], '10')
    ).to.eql({ color: null });
    expect(evaluateThresholds([{ lt: 18, icon: '' }], '10')).to.eql({
      icon: null,
    });
  });

  it('background_color: bg-only entry returns just background_color', () => {
    expect(
      evaluateThresholds(
        [{ lt: 18, background_color: '#43a047' }],
        '10'
      )
    ).to.eql({ background_color: '#43a047' });
  });

  it('background_color: combined color + bg', () => {
    expect(
      evaluateThresholds(
        [{ lt: 18, color: '#ffff00', background_color: '#43a047' }],
        '10'
      )
    ).to.eql({ color: '#ffff00', background_color: '#43a047' });
  });
});

describe('evaluateMapping (sparse positions)', () => {
  it('matches exact string state', () => {
    const r = evaluateMapping({ on: { color: '#fff' } }, 'on');
    expect(r).to.eql({ color: '#fff' });
  });

  it('falls back to _else when key missing', () => {
    const r = evaluateMapping(
      { on: { color: '#fff' }, _else: { color: '#000' } },
      'something'
    );
    expect(r).to.eql({ color: '#000' });
  });

  it('returns null when no match and no _else', () => {
    expect(evaluateMapping({ on: { color: '#fff' } }, 'off')).to.be.null;
  });

  it('background_color: bg-only mapping entry', () => {
    expect(
      evaluateMapping({ on: { background_color: '#43a047' } }, 'on')
    ).to.eql({ background_color: '#43a047' });
  });

  it('empty decoration yields null', () => {
    // Mapping key with a literally empty decoration object — caller
    // didn't position on anything. Matches the editor's "skip
    // degenerate entries" rule and keeps the painter from cargo-
    // culting an empty decoration onto the host.
    expect(evaluateMapping({ on: {} }, 'on')).to.be.null;
  });
});

describe('evaluateRule', () => {
  it('returns null for disabled rules', () => {
    expect(
      evaluateRule(
        rule({
          mode: 'thresholds',
          thresholds: [{ color: '#fff' }],
          enabled: false,
        }),
        '20'
      )
    ).to.be.null;
  });

  it('returns null when source state is undefined', () => {
    expect(
      evaluateRule(
        rule({ mode: 'thresholds', thresholds: [{ color: '#fff' }] }),
        undefined
      )
    ).to.be.null;
  });

  it('returns null for unknown modes (e.g. a malformed template-mode rule that bypassed validation)', () => {
    // Template mode was removed in v0.3.0a3 along with the `template`
    // field; the evaluator no longer special-cases either. A rule
    // somehow reaching the evaluator with a stale `mode: template`
    // falls through to null.
    const r = rule({ mode: 'thresholds', thresholds: [{ color: '#fff' }] });
    (r as unknown as { mode: string }).mode = 'template';
    expect(evaluateRule(r, 'on')).to.be.null;
  });
});

describe('mergeDecorations', () => {
  it('inflates a single rule to the dense shape', () => {
    expect(
      mergeDecorations([rule({ priority: 10 })], [{ color: '#aaa' }])
    ).to.eql({ color: '#aaa', icon: null, background_color: null });
  });

  it('picks highest-priority value for an addressed field', () => {
    const rules = [
      rule({ id: 'a', priority: 10 }),
      rule({ id: 'b', priority: 20 }),
    ];
    const decs = [{ color: '#aaa' }, { color: '#bbb' }];
    expect(mergeDecorations(rules, decs)).to.eql({
      color: '#bbb',
      icon: null,
      background_color: null,
    });
  });

  it('returns null when no rule addresses anything', () => {
    expect(mergeDecorations([rule()], [null])).to.be.null;
  });

  it('skips null positions even at higher priority', () => {
    const rules = [
      rule({ id: 'a', priority: 10 }),
      rule({ id: 'b', priority: 99 }),
    ];
    const decs = [{ color: '#aaa' }, null];
    expect(mergeDecorations(rules, decs)).to.eql({
      color: '#aaa',
      icon: null,
      background_color: null,
    });
  });

  it('field-level merge: high-prio bg + low-prio color = both contribute', () => {
    // The v0.2 "winner takes all" semantic dropped Rule B's color and
    // icon here; the v0.3 merger keeps them because Rule A doesn't
    // take a position on those fields.
    const rules = [
      rule({ id: 'color_low', priority: 10 }),
      rule({ id: 'bg_high', priority: 99 }),
    ];
    const decs = [
      { color: '#aaa', icon: 'mdi:foo' },
      { background_color: '#43a047' },
    ];
    expect(mergeDecorations(rules, decs)).to.eql({
      color: '#aaa',
      icon: 'mdi:foo',
      background_color: '#43a047',
    });
  });

  it('equal priority: first declaration wins per field', () => {
    const rules = [
      rule({ id: 'first', priority: 10 }),
      rule({ id: 'second', priority: 10 }),
    ];
    const decs = [{ color: '#aaa' }, { color: '#bbb' }];
    expect(mergeDecorations(rules, decs)?.color).to.equal('#aaa');
  });

  it('sentinel release blocks lower-priority contribution', () => {
    // High-priority rule positions an explicit null on color; the
    // low-priority rule's color is intentionally dropped.
    const rules = [
      rule({ id: 'low', priority: 10 }),
      rule({ id: 'high', priority: 99 }),
    ];
    const decs = [
      { color: '#aaa' },
      { color: null },
    ];
    expect(mergeDecorations(rules, decs)).to.eql({
      color: null,
      icon: null,
      background_color: null,
    });
  });

  it('pickWinner alias matches mergeDecorations', () => {
    const rules = [rule({ priority: 10 })];
    const decs = [{ color: '#aaa' }];
    expect(pickWinner(rules, decs)).to.eql(mergeDecorations(rules, decs));
  });
});
