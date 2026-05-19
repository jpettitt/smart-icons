import { expect } from '@open-wc/testing';

import { Painter } from '../src/painter.js';
import type { Rule } from '../src/types.js';

function makeRule(target: string, dec: { color?: string; icon?: string }): Rule {
  return {
    id: '01',
    target,
    source: target,
    mode: 'mapping',
    mapping: { on: { color: dec.color ?? null, icon: dec.icon ?? null } },
    enabled: true,
    priority: 10,
    created: '',
    updated: '',
    source_kind: 'ui',
  };
}

/**
 * Build a `<ha-state-icon>` host whose entity_id is set on its stateObj,
 * with an inner `<ha-icon>` child in its shadow root — the modern HA
 * structure the painter looks for.
 */
function makeStateIcon(entityId: string, intrinsicIcon = 'mdi:default'): HTMLElement {
  const host = document.createElement('ha-state-icon');
  (host as unknown as { stateObj: { entity_id: string; state: string } }).stateObj = {
    entity_id: entityId,
    state: 'on',
  };
  const inner = host.attachShadow({ mode: 'open' });
  const haIcon = document.createElement('ha-icon');
  haIcon.setAttribute('icon', intrinsicIcon);
  inner.appendChild(haIcon);
  return host;
}

/**
 * Build a fake tile card — a custom-element wrapper whose shadow root
 * contains a deeply-nested `<ha-state-icon>`. Mirrors the real HA tile
 * card's structure, where the icon is inside the *card's* shadow tree,
 * not its light DOM.
 */
function makeTileCard(entityId: string): HTMLElement {
  const card = document.createElement('hui-tile-card-fake');
  const cardShadow = card.attachShadow({ mode: 'open' });
  // Wrap to ensure the host shadow root has descendants other than the
  // ha-state-icon itself — exercises the shadow-walking path properly.
  const wrapper = document.createElement('div');
  wrapper.appendChild(makeStateIcon(entityId));
  cardShadow.appendChild(wrapper);
  return card;
}

async function nextTick(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

describe('Painter discovery', () => {
  let painter: Painter;
  let host: HTMLElement;

  afterEach(() => {
    painter?.stop();
    host?.remove();
  });

  it('paints icons already in the DOM at start()', () => {
    host = makeTileCard('light.kitchen');
    document.body.appendChild(host);

    const rules: Rule[] = [makeRule('light.kitchen', { color: 'magenta' })];
    painter = new Painter(
      () => rules,
      () => 'on'
    );
    painter.start();

    const inner = host.shadowRoot!
      .querySelector('div')!
      .querySelector('ha-state-icon') as HTMLElement;
    expect(inner.style.color).to.equal('magenta');
    expect(inner.dataset.smartIconsOwned).to.contain('color');
  });

  it('paints icons added to a custom element’s shadow root via mutation', async () => {
    // Regression for the discovery bug: when hui-tile-card is added to a
    // parent shadow root, scanForIconsAndShadows is called on the new
    // *element*. Without descending into its shadow root we miss the
    // entire subtree.
    const rules: Rule[] = [makeRule('light.bed', { color: 'cyan' })];
    painter = new Painter(
      () => rules,
      () => 'on'
    );
    painter.start();

    host = makeTileCard('light.bed');
    document.body.appendChild(host);
    await nextTick(); // let the MutationObserver fire

    const inner = host.shadowRoot!
      .querySelector('div')!
      .querySelector('ha-state-icon') as HTMLElement;
    expect(inner.style.color).to.equal('cyan');
  });

  it('paints icons in deeply-nested shadow roots added later', async () => {
    // Two layers of custom-element shadow roots: outer wrapper added
    // first, inner tile-card added after. Both paths exercise the
    // "descend into own shadow root" fix.
    const rules: Rule[] = [makeRule('sensor.x', { color: 'orange' })];
    painter = new Painter(
      () => rules,
      () => 'on'
    );
    painter.start();

    host = document.createElement('outer-wrapper-fake');
    const outerShadow = host.attachShadow({ mode: 'open' });
    document.body.appendChild(host);
    await nextTick();

    const tile = makeTileCard('sensor.x');
    outerShadow.appendChild(tile);
    await nextTick();

    const inner = tile.shadowRoot!
      .querySelector('div')!
      .querySelector('ha-state-icon') as HTMLElement;
    expect(inner.style.color).to.equal('orange');
  });

  it('catch-up scan picks up hosts added after start() without any mutation', async () => {
    // Regression for the timing bug: Lit's batched template instantiation
    // doesn't always fire mutations our observers can see. To simulate
    // that, build the host *off* the document tree, start the painter,
    // then graft it on by reaching into the shadow root in a way that
    // looks (to MutationObserver) like nothing happened.
    const rules: Rule[] = [makeRule('light.late', { color: 'purple' })];
    painter = new Painter(
      () => rules,
      () => 'on'
    );
    painter.start();

    host = makeTileCard('light.late');
    // Defeat MutationObserver — drop the node in via the host's *parent*
    // shadowRoot before the parent has been observed (i.e. document.body
    // wrap inside a fresh shadow root the painter hasn't seen).
    const wrap = document.createElement('isolation-fake');
    const wrapShadow = wrap.attachShadow({ mode: 'open' });
    wrapShadow.appendChild(host);
    document.body.appendChild(wrap);

    // The first catch-up tick fires at 100ms; give it a hair more.
    await new Promise((r) => setTimeout(r, 150));

    const inner = host.shadowRoot!
      .querySelector('div')!
      .querySelector('ha-state-icon') as HTMLElement;
    expect(inner.style.color).to.equal('purple');

    wrap.remove();
  });

  it('does not paint hosts whose entity has no matching rule', async () => {
    const rules: Rule[] = [makeRule('light.kitchen', { color: 'red' })];
    painter = new Painter(
      () => rules,
      () => 'on'
    );
    painter.start();

    host = makeTileCard('light.other');
    document.body.appendChild(host);
    await nextTick();

    const inner = host.shadowRoot!
      .querySelector('div')!
      .querySelector('ha-state-icon') as HTMLElement;
    expect(inner.style.color).to.equal('');
    expect(inner.dataset.smartIconsOwned).to.be.undefined;
  });
});
