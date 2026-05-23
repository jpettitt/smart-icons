import { expect } from '@open-wc/testing';

import {
  evaluateMapping,
  evaluateRule,
  evaluateThresholds,
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

describe('evaluateThresholds', () => {
  it('returns first matching numeric entry', () => {
    const r = evaluateThresholds(
      [
        { lt: 18, color: '#0000ff' },
        { lt: 25, color: '#00ff00' },
        { color: '#ff0000' },
      ],
      '15'
    );
    expect(r).to.eql({ color: '#0000ff', icon: null });
  });

  it('falls through to else entry', () => {
    const r = evaluateThresholds(
      [
        { lt: 18, color: '#0000ff' },
        { color: '#ff0000' },
      ],
      '30'
    );
    expect(r).to.eql({ color: '#ff0000', icon: null });
  });

  it('numeric comparators skip non-numeric state, else still matches', () => {
    const r = evaluateThresholds(
      [
        { lt: 18, color: '#0000ff' },
        { color: '#fallback' },
      ],
      'unknown'
    );
    expect(r).to.eql({ color: '#fallback', icon: null });
  });

  it('returns null if no entry matches and no else', () => {
    const r = evaluateThresholds([{ lt: 18, color: '#fff' }], 'unknown');
    expect(r).to.be.null;
  });

  it('honors gt / gte / lte', () => {
    expect(evaluateThresholds([{ gt: 24, color: '#a' }], '25')).to.eql({
      color: '#a',
      icon: null,
    });
    expect(evaluateThresholds([{ gte: 25, color: '#b' }], '25')).to.eql({
      color: '#b',
      icon: null,
    });
    expect(evaluateThresholds([{ lte: 25, color: '#c' }], '25')).to.eql({
      color: '#c',
      icon: null,
    });
  });

  it('eq supports string and numeric', () => {
    expect(evaluateThresholds([{ eq: 'on', icon: 'mdi:check' }], 'on')).to.eql({
      color: null,
      icon: 'mdi:check',
    });
    expect(evaluateThresholds([{ eq: 5, icon: 'mdi:five' }], '5')).to.eql({
      color: null,
      icon: 'mdi:five',
    });
  });

  it('release sentinels yield null decoration', () => {
    expect(
      evaluateThresholds([{ lt: 18, color: 'inherit' }], '10')
    ).to.be.null;
    expect(evaluateThresholds([{ lt: 18, icon: '' }], '10')).to.be.null;
  });
});

describe('evaluateMapping', () => {
  it('matches exact string state', () => {
    const r = evaluateMapping({ on: { color: '#fff' } }, 'on');
    expect(r).to.eql({ color: '#fff', icon: null });
  });

  it('falls back to _else when key missing', () => {
    const r = evaluateMapping(
      { on: { color: '#fff' }, _else: { color: '#000' } },
      'something'
    );
    expect(r).to.eql({ color: '#000', icon: null });
  });

  it('returns null when no match and no _else', () => {
    expect(evaluateMapping({ on: { color: '#fff' } }, 'off')).to.be.null;
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

  it('returns null for template mode (runtime evaluation is demand-driven)', () => {
    expect(
      evaluateRule(
        rule({ mode: 'template', template: '{{ "#fff" }}' }),
        'on'
      )
    ).to.be.null;
  });
});

describe('pickWinner', () => {
  it('picks highest-priority non-null decoration', () => {
    const rules = [
      rule({ id: 'a', priority: 10 }),
      rule({ id: 'b', priority: 20 }),
    ];
    const decs = [
      { color: '#aaa', icon: null },
      { color: '#bbb', icon: null },
    ];
    expect(pickWinner(rules, decs)).to.eql({ color: '#bbb', icon: null });
  });

  it('returns null when every decoration is null', () => {
    expect(pickWinner([rule()], [null])).to.be.null;
  });

  it('skips null decorations even at higher priority', () => {
    const rules = [
      rule({ id: 'a', priority: 10 }),
      rule({ id: 'b', priority: 99 }),
    ];
    const decs = [{ color: '#aaa', icon: null }, null];
    expect(pickWinner(rules, decs)).to.eql({ color: '#aaa', icon: null });
  });
});
