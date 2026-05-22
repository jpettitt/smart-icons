import { expect } from '@open-wc/testing';

import {
  findRuleLineRanges,
  ruleToYaml,
  rulesToYaml,
  yamlToImportable,
} from '../src/panel/yaml.js';
import type { Rule } from '../src/types.js';

/** Make a fully-populated Rule with sane defaults; tests pass overrides
 *  to vary the mode-specific payload. */
function rule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: '01HXYZ',
    targets: ['light.kitchen'],
    source: 'input_select.scene',
    mode: 'mapping',
    mapping: { on: { color: '#ffaa00', icon: 'mdi:lightbulb' } },
    enabled: true,
    priority: 10,
    created: '2026-05-21T00:00:00',
    updated: '2026-05-21T00:00:00',
    source_kind: 'ui',
    ...overrides,
  };
}

describe('ruleToYaml', () => {
  it('omits id, created, updated, source_kind from output', () => {
    const out = ruleToYaml(rule());
    expect(out).not.to.include('id:');
    expect(out).not.to.include('created:');
    expect(out).not.to.include('updated:');
    expect(out).not.to.include('source_kind:');
  });

  it('omits enabled when true (default) and priority when 10 (default)', () => {
    const out = ruleToYaml(rule());
    expect(out).not.to.include('enabled:');
    expect(out).not.to.include('priority:');
  });

  it('emits enabled when false', () => {
    const out = ruleToYaml(rule({ enabled: false }));
    expect(out).to.include('enabled: false');
  });

  it('emits priority when non-default', () => {
    const out = ruleToYaml(rule({ priority: 50 }));
    expect(out).to.include('priority: 50');
  });

  it('omits empty source (per-target inferred)', () => {
    const out = ruleToYaml(rule({ source: '' }));
    expect(out).not.to.include('source:');
  });

  it('emits explicit source when set', () => {
    const out = ruleToYaml(rule({ source: 'sensor.foo' }));
    expect(out).to.include('source: sensor.foo');
  });

  it('omits source_attribute when null', () => {
    const out = ruleToYaml(rule({ source_attribute: null }));
    expect(out).not.to.include('source_attribute:');
  });

  it('emits source_attribute when set', () => {
    const out = ruleToYaml(rule({ source_attribute: 'brightness' }));
    expect(out).to.include('source_attribute: brightness');
  });

  it('serializes a thresholds rule cleanly', () => {
    const r = rule({
      mode: 'thresholds',
      mapping: undefined,
      thresholds: [
        { lte: -6, color: '#001144', icon: 'mdi:weather-night' },
        { color: '#ffeb3b', icon: 'mdi:weather-sunny' },
      ],
      source_attribute: 'elevation',
    });
    const out = ruleToYaml(r);
    expect(out).to.include('mode: thresholds');
    expect(out).to.include('source_attribute: elevation');
    expect(out).to.include('lte: -6');
    expect(out).to.include('mdi:weather-sunny');
  });

  it('serializes a glob multi-target rule', () => {
    const out = ruleToYaml(
      rule({ targets: ['lock.front_door', 'lock.*'], source: '' }),
    );
    expect(out).to.include('targets:');
    expect(out).to.include('lock.front_door');
    expect(out).to.include('lock.*');
    expect(out).not.to.include('source:');
  });

  it('round-trips a single rule through yamlToImportable', () => {
    const original = rule({
      targets: ['light.kitchen_main', 'light.kitchen_under_cab'],
      source_attribute: 'brightness',
      source: '',
      mode: 'thresholds',
      mapping: undefined,
      thresholds: [
        { lt: 64, color: '#552200' },
        { color: '#ffffaa' },
      ],
    });
    const text = ruleToYaml(original);
    const result = yamlToImportable(text);
    expect(result.parseError).to.be.null;
    expect(result.rules).to.have.lengthOf(1);
    const round = result.rules[0];
    expect(round.targets).to.deep.equal(original.targets);
    expect(round.mode).to.equal('thresholds');
    expect(round.thresholds).to.deep.equal(original.thresholds);
  });
});

describe('rulesToYaml', () => {
  it('wraps multiple rules under a top-level `rules:` key', () => {
    const out = rulesToYaml([
      rule({ targets: ['light.a'] }),
      rule({ targets: ['light.b'] }),
    ]);
    expect(out.startsWith('rules:')).to.be.true;
    expect(out).to.include('light.a');
    expect(out).to.include('light.b');
  });

  it('round-trips an empty list as `rules: []`', () => {
    const out = rulesToYaml([]);
    expect(out).to.include('rules: []');
  });

  it('round-trips through yamlToImportable', () => {
    const text = rulesToYaml([
      rule({ targets: ['light.a'] }),
      rule({ targets: ['light.b'] }),
    ]);
    const result = yamlToImportable(text);
    expect(result.parseError).to.be.null;
    expect(result.rules).to.have.lengthOf(2);
  });

  it('always omits ids — replace_all mints fresh ones server-side', () => {
    const out = rulesToYaml([rule({ id: '01HXYZ' })]);
    expect(out).not.to.include('id:');
    expect(out).not.to.include('01HXYZ');
  });
});

describe('findRuleLineRanges', () => {
  it('returns one whole-document range for a single-rule paste', () => {
    const text = 'targets:\n  - light.foo\nmode: mapping\n';
    const ranges = findRuleLineRanges(text);
    expect(ranges).to.deep.equal([{ start: 0, end: text.split('\n').length }]);
  });

  it('finds per-rule ranges in a `rules:` list', () => {
    const text = rulesToYaml([
      rule({ targets: ['light.a'] }),
      rule({ targets: ['light.b'] }),
      rule({ targets: ['light.c'] }),
    ]);
    const ranges = findRuleLineRanges(text);
    expect(ranges).to.have.lengthOf(3);
    // Ranges are contiguous and non-overlapping.
    for (let i = 0; i < ranges.length - 1; i++) {
      expect(ranges[i].end).to.equal(ranges[i + 1].start);
    }
    // Last range ends at the document's line count.
    expect(ranges[ranges.length - 1].end).to.equal(text.split('\n').length);
  });

  it('first range of a bulk paste covers the first rule only', () => {
    const text = rulesToYaml([
      rule({ targets: ['light.first'] }),
      rule({ targets: ['light.second'] }),
    ]);
    const ranges = findRuleLineRanges(text);
    const lines = text.split('\n').slice(ranges[0].start, ranges[0].end);
    const slice = lines.join('\n');
    expect(slice).to.include('light.first');
    expect(slice).not.to.include('light.second');
  });
});

describe('yamlToImportable', () => {
  it('returns parseError for empty input', () => {
    const r = yamlToImportable('');
    expect(r.rules).to.be.empty;
    expect(r.parseError).to.match(/Empty YAML/);
  });

  it('returns parseError for whitespace-only input', () => {
    const r = yamlToImportable('   \n  \t  ');
    expect(r.rules).to.be.empty;
    expect(r.parseError).to.match(/Empty YAML/);
  });

  it('returns parseError with line/col for malformed YAML', () => {
    const r = yamlToImportable('targets:\n  - lock.*\n  bad indent');
    expect(r.rules).to.be.empty;
    expect(r.parseError).to.match(/Line \d+, col \d+/);
  });

  it('rejects a top-level sequence (no `rules:` wrapper)', () => {
    const r = yamlToImportable('- targets: [light.foo]\n  mode: mapping\n');
    expect(r.rules).to.be.empty;
    expect(r.parseError).to.match(/single rule.*or.*`rules:` list/);
  });

  it('rejects `rules:` that points at a non-list', () => {
    const r = yamlToImportable('rules: not-a-list');
    expect(r.rules).to.be.empty;
    expect(r.parseError).to.match(/must be a list/);
  });

  it('rejects bulk entries that are not mappings', () => {
    const r = yamlToImportable('rules:\n  - just-a-string\n');
    expect(r.rules).to.be.empty;
    expect(r.parseError).to.match(/Rule 1.*not a mapping/);
  });

  it('accepts a single rule without the `rules:` wrapper', () => {
    const r = yamlToImportable(
      'targets:\n  - light.foo\nmode: mapping\nmapping:\n  on: { color: red }\n',
    );
    expect(r.parseError).to.be.null;
    expect(r.rules).to.have.lengthOf(1);
    expect(r.rules[0].targets).to.deep.equal(['light.foo']);
  });

  it('accepts a `rules:` list with multiple entries', () => {
    const r = yamlToImportable(
      'rules:\n' +
        '  - { targets: [light.a], mode: mapping, mapping: { on: { color: red } } }\n' +
        '  - { targets: [light.b], mode: mapping, mapping: { on: { color: blue } } }\n',
    );
    expect(r.parseError).to.be.null;
    expect(r.rules).to.have.lengthOf(2);
  });

  it('exposes errorLine + errorColumn for YAML syntax errors', () => {
    const r = yamlToImportable('targets:\n  - lock.*\n  bad indent\n');
    expect(r.parseError).to.match(/Line \d+, col \d+/);
    expect(r.errorLine).to.be.a('number');
    expect(r.errorColumn).to.be.a('number');
  });

  it('exposes errorRuleIndex when a bulk entry is not a mapping', () => {
    const r = yamlToImportable('rules:\n  - just-a-string\n');
    expect(r.errorRuleIndex).to.equal(0);
  });

  it('exposes errorRuleIndex pointing at the second bad entry', () => {
    const r = yamlToImportable(
      'rules:\n' +
        '  - { targets: [light.a], mode: mapping, mapping: { on: { color: red } } }\n' +
        '  - just-a-string\n',
    );
    expect(r.errorRuleIndex).to.equal(1);
  });

  it('errorLine points at the `rules:` line when its value is not a list', () => {
    // Two blank/comment lines before `rules:` to confirm line numbering
    // is computed against the original input, not a trimmed copy.
    const r = yamlToImportable('# header\n\nrules: not-a-list\n');
    expect(r.errorLine).to.equal(3);
  });

  it('errorLine is 1 when the top level is the wrong shape (sequence)', () => {
    const r = yamlToImportable(
      '- targets: [light.foo]\n  mode: mapping\n',
    );
    expect(r.errorLine).to.equal(1);
  });
});
