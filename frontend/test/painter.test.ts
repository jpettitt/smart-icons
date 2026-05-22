import { expect } from '@open-wc/testing';

import { Painter } from '../src/painter.js';

/**
 * Build a `<ha-state-icon>` with the given entity_id and optional
 * smart_icons_color attribute baked into its stateObj. Mirrors the way
 * HA's tile cards populate stateObj on the icon host.
 */
function makeStateIcon(
  entityId: string,
  attributes: Record<string, unknown> = {}
): HTMLElement {
  const host = document.createElement('ha-state-icon');
  (host as unknown as { stateObj: unknown }).stateObj = {
    entity_id: entityId,
    state: 'on',
    attributes,
  };
  const inner = host.attachShadow({ mode: 'open' });
  inner.appendChild(document.createElement('ha-icon'));
  return host;
}

/** Wrap an ha-state-icon inside a custom-element shadow tree, mimicking
 *  the deep nesting of hui-tile-card → ha-card → ha-tile-icon → ha-state-icon. */
function makeTileCard(
  entityId: string,
  attributes: Record<string, unknown> = {}
): HTMLElement {
  const card = document.createElement('hui-tile-card-fake');
  const shadow = card.attachShadow({ mode: 'open' });
  const wrapper = document.createElement('div');
  wrapper.appendChild(makeStateIcon(entityId, attributes));
  shadow.appendChild(wrapper);
  return card;
}

function getStateIcon(host: HTMLElement): HTMLElement {
  return host.shadowRoot!
    .querySelector('div')!
    .querySelector('ha-state-icon') as HTMLElement;
}

async function nextTick(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

describe('Painter', () => {
  let painter: Painter;
  let host: HTMLElement;

  afterEach(() => {
    painter?.stop();
    host?.remove();
  });

  it('applies smart_icons_color attribute as style.color on initial scan', () => {
    host = makeTileCard('light.kitchen', { smart_icons_color: 'magenta' });
    document.body.appendChild(host);

    painter = new Painter();
    painter.start();

    const icon = getStateIcon(host);
    expect(icon.style.color).to.equal('magenta');
    expect(icon.dataset.smartIconsOwned).to.equal('color');
  });

  it('paints icons added via mutation into a nested shadow root', async () => {
    painter = new Painter();
    painter.start();

    host = makeTileCard('light.bed', { smart_icons_color: 'cyan' });
    document.body.appendChild(host);
    await nextTick();

    expect(getStateIcon(host).style.color).to.equal('cyan');
  });

  it('paints late-arriving hosts via catch-up scan', async () => {
    painter = new Painter();
    painter.start();

    host = makeTileCard('light.late', { smart_icons_color: 'purple' });
    // Drop the node into a fresh shadow root the painter hasn't observed,
    // so mutation events don't fire on a watched root. The catch-up scan
    // at 100 ms is the only thing that picks it up.
    const wrap = document.createElement('isolation-fake');
    const wrapShadow = wrap.attachShadow({ mode: 'open' });
    wrapShadow.appendChild(host);
    document.body.appendChild(wrap);

    await new Promise((r) => setTimeout(r, 150));

    expect(getStateIcon(host).style.color).to.equal('purple');
    wrap.remove();
  });

  it('does not paint hosts without smart_icons_color', () => {
    host = makeTileCard('light.plain');
    document.body.appendChild(host);

    painter = new Painter();
    painter.start();

    const icon = getStateIcon(host);
    expect(icon.style.color).to.equal('');
    expect(icon.dataset.smartIconsOwned).to.be.undefined;
  });

  it('releases the host when smart_icons_color is removed from attributes', async () => {
    host = makeTileCard('light.released', { smart_icons_color: 'red' });
    document.body.appendChild(host);
    painter = new Painter();
    painter.start();
    const icon = getStateIcon(host);
    expect(icon.style.color).to.equal('red');

    // Simulate the backend removing the attribute on a state update; the
    // next repaint should clear our inline style. (Headless WTR's rAF can
    // be flaky, so we use a small setTimeout for the wait.)
    delete (icon as unknown as { stateObj: { attributes: Record<string, unknown> } })
      .stateObj.attributes.smart_icons_color;
    painter.repaintAll();

    await new Promise((r) => setTimeout(r, 50));
    expect(icon.style.color).to.equal('');
    expect(icon.dataset.smartIconsOwned).to.be.undefined;
  });

  it('updates color when smart_icons_color changes', async () => {
    host = makeTileCard('light.mutate', { smart_icons_color: 'red' });
    document.body.appendChild(host);
    painter = new Painter();
    painter.start();
    const icon = getStateIcon(host);
    expect(icon.style.color).to.equal('red');

    (icon as unknown as { stateObj: { attributes: Record<string, unknown> } })
      .stateObj.attributes.smart_icons_color = 'blue';
    painter.repaintAll();

    await new Promise((r) => setTimeout(r, 50));
    expect(icon.style.color).to.equal('blue');
  });

  it('walks up to a state-badge wrapper to find entity_id when the ha-state-icon has none', () => {
    // Reproduces what HA's entities-card / more-info rows look like:
    // a <state-badge> with stateObj on the host, wrapping an
    // <ha-state-icon> inside its shadow root that only has data-*
    // attributes (no stateObj property of its own — passed down via
    // Lit binding that hasn't fired yet, or never fires in this
    // surface). Painter should walk up and find the entity_id on
    // the state-badge ancestor.
    const badge = document.createElement('state-badge-fake');
    (badge as unknown as { stateObj: unknown }).stateObj = {
      entity_id: 'sensor.outdoor_temperature',
      state: '74.3',
      attributes: { smart_icons_color: 'orange' },
    };
    const shadow = badge.attachShadow({ mode: 'open' });
    const icon = document.createElement('ha-state-icon');
    // Deliberately no stateObj on the ha-state-icon — this is the
    // failure mode the user reported.
    icon.dataset.domain = 'sensor';
    icon.dataset.state = '74.3';
    const innerShadow = icon.attachShadow({ mode: 'open' });
    innerShadow.appendChild(document.createElement('ha-icon'));
    shadow.appendChild(icon);
    document.body.appendChild(badge);
    host = badge;

    painter = new Painter();
    painter.start();

    expect(icon.style.color).to.equal('orange');
    expect(icon.dataset.smartIconsOwned).to.equal('color');
  });

  it('reads color from the watcher cache, not the host stateObj', () => {
    // Simulate the real-world race: card's stateObj is still the OLD
    // snapshot (Lit hasn't re-rendered yet), but the watcher cache —
    // updated synchronously inside the state_changed dispatch — has
    // the new color. Painter should use the watcher's value.
    host = makeTileCard('light.race', { smart_icons_color: 'navy' });
    document.body.appendChild(host);

    const fakeWatcher = {
      getAttribute(entityId: string, name: string): unknown {
        if (entityId === 'light.race' && name === 'smart_icons_color') {
          return 'crimson';
        }
        return undefined;
      },
    };

    painter = new Painter(
      fakeWatcher as unknown as ConstructorParameters<typeof Painter>[0]
    );
    painter.start();

    expect(getStateIcon(host).style.color).to.equal('crimson');
  });
});
