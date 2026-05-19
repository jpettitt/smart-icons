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
});
