import { expect } from '@open-wc/testing';

import { Painter, applyStateObjPatch } from '../src/painter.js';

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

  it('paints a chip when only smart_icons_background is set (bg-only rule)', () => {
    // Bg-only rules: the entity has the background attribute but no
    // color attribute. The painter should still render the chip and
    // leave the icon's natural color alone.
    host = makeTileCard('light.bg_only', {
      smart_icons_background: '#43a047',
    });
    document.body.appendChild(host);

    painter = new Painter();
    painter.start();

    const icon = getStateIcon(host);
    expect(icon.style.color).to.equal('');
    expect(icon.style.backgroundColor).to.equal('rgb(67, 160, 71)');
    expect(icon.style.borderRadius).to.equal('50%');
    expect(icon.style.boxShadow).to.contain('rgb(67, 160, 71)');
    expect(icon.dataset.smartIconsOwned).to.equal('color');
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

describe('applyStateObjPatch', () => {
  // Pure form of patchHaStateIcon — takes the class directly so the
  // test can build a fake Lit-shaped class without polluting the
  // global customElements registry (which is permanent for the
  // browser session and would interfere with the other painter tests).

  function makeFakeIconClass(): {
    klass: CustomElementConstructor;
    setHistory: unknown[];
  } {
    // Track what HA's underlying setter receives so we can verify the
    // patch calls through, not just shadows the property.
    const setHistory: unknown[] = [];

    // Plain class with a `stateObj` accessor on its prototype, the
    // shape Lit's @property decorator produces. Not a true
    // HTMLElement subclass — we don't need to register it; the patch
    // walks `prototype`, not the registry.
    class FakeIcon {
      style: { color: string } = { color: '' };
      dataset: Record<string, string | undefined> = {};
    }
    Object.defineProperty(FakeIcon.prototype, 'stateObj', {
      get() {
        return undefined;
      },
      set(v: unknown) {
        setHistory.push(v);
      },
      enumerable: true,
      configurable: true,
    });

    return {
      klass: FakeIcon as unknown as CustomElementConstructor,
      setHistory,
    };
  }

  it('wraps the stateObj setter so smart_icons_color becomes inline color', () => {
    const { klass } = makeFakeIconClass();
    const result = applyStateObjPatch(klass);
    expect(result.ok).to.be.true;

    const inst = new (klass as unknown as { new (): { style: { color: string }; dataset: Record<string, string | undefined>; stateObj: unknown } })();
    inst.stateObj = {
      entity_id: 'sensor.foo',
      state: '42',
      attributes: { smart_icons_color: '#abcdef' },
    };
    expect(inst.style.color).to.equal('#abcdef');
    expect(inst.dataset.smartIconsOwned).to.equal('color');
  });

  it("calls the original setter so Lit's reactive machinery still runs", () => {
    const { klass, setHistory } = makeFakeIconClass();
    applyStateObjPatch(klass);

    const inst = new (klass as unknown as { new (): { stateObj: unknown } })();
    const payload = { entity_id: 'sensor.bar', state: 'on', attributes: {} };
    inst.stateObj = payload;
    expect(setHistory).to.have.lengthOf(1);
    expect(setHistory[0]).to.equal(payload);
  });

  it('applies the chip when only smart_icons_background is set on the stateObj', () => {
    // FakeIcon's default `style` only has `color` — applyDecoration's
    // chip path writes backgroundColor / borderRadius / boxShadow, so
    // we extend the style shape here so the patch's writes land
    // somewhere observable instead of throwing.
    const { klass } = makeFakeIconClass();
    applyStateObjPatch(klass);

    const inst = new (klass as unknown as {
      new (): {
        style: { color: string; backgroundColor?: string; borderRadius?: string; boxShadow?: string };
        dataset: Record<string, string | undefined>;
        stateObj: unknown;
      };
    })();
    inst.style.backgroundColor = '';
    inst.style.borderRadius = '';
    inst.style.boxShadow = '';

    inst.stateObj = {
      entity_id: 'sensor.bg_only',
      state: 'on',
      attributes: { smart_icons_background: '#43a047' },
    };

    // No color override — style.color stays empty.
    expect(inst.style.color).to.equal('');
    // Chip applied via the bg path.
    expect(inst.style.backgroundColor).to.equal('#43a047');
    expect(inst.style.borderRadius).to.equal('50%');
    expect(inst.style.boxShadow).to.contain('#43a047');
    expect(inst.dataset.smartIconsOwned).to.equal('color');
  });

  it('clears color and the dataset marker when smart_icons_color is absent', () => {
    const { klass } = makeFakeIconClass();
    applyStateObjPatch(klass);

    const inst = new (klass as unknown as { new (): { style: { color: string }; dataset: Record<string, string | undefined>; stateObj: unknown } })();
    inst.stateObj = {
      entity_id: 'sensor.foo',
      state: 'on',
      attributes: { smart_icons_color: '#abcdef' },
    };
    expect(inst.style.color).to.equal('#abcdef');

    // Subsequent stateObj with the attribute removed — we should
    // release the inline color and the dataset marker.
    inst.stateObj = {
      entity_id: 'sensor.foo',
      state: 'on',
      attributes: {},
    };
    expect(inst.style.color).to.equal('');
    expect(inst.dataset.smartIconsOwned).to.be.undefined;
  });

  it('is idempotent — re-applying does not double-wrap', () => {
    const { klass, setHistory } = makeFakeIconClass();
    expect(applyStateObjPatch(klass).ok).to.be.true;
    expect(applyStateObjPatch(klass).ok).to.be.true;

    const inst = new (klass as unknown as { new (): { stateObj: unknown } })();
    inst.stateObj = { attributes: {} };
    // If we'd double-wrapped, the original setter would be called
    // twice. Confirm exactly once.
    expect(setHistory).to.have.lengthOf(1);
  });

  it('returns ok:false with a reason when stateObj is not on the prototype', () => {
    class NoStateObj {
      style = { color: '' };
      dataset: Record<string, string | undefined> = {};
    }
    const result = applyStateObjPatch(
      NoStateObj as unknown as CustomElementConstructor,
    );
    expect(result.ok).to.be.false;
    expect(result.reason).to.match(/stateObj/);
  });
});
