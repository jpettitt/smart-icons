import { expect } from '@open-wc/testing';

import { applyDecoration, releaseDecoration } from '../src/outline.js';

/** Bare ha-state-icon-shaped host. The chip-style decoration this
 *  module applies operates on the host element directly (no shadow-
 *  root traversal needed), so a host without inner content is
 *  sufficient. */
function makeHost(): HTMLElement {
  return document.createElement('ha-state-icon');
}

describe('outline (visual-prototype: background chip)', () => {
  describe('applyDecoration', () => {
    let host: HTMLElement;

    afterEach(() => {
      host?.remove();
    });

    it('sets color + ownership marker', () => {
      host = makeHost();
      document.body.appendChild(host);

      applyDecoration(host, '#FFFF00');

      expect(host.style.color).to.equal('rgb(255, 255, 0)');
      expect(host.dataset.smartIconsOwned).to.equal('color');
    });

    it('paints a circular background chip when the rule specifies a bg color', () => {
      host = makeHost();
      document.body.appendChild(host);

      applyDecoration(host, '#FFFF00', '#43a047');

      // Chip = bg-color + border-radius + box-shadow ring. The
      // box-shadow extends the visible chip beyond the host's
      // intrinsic 24x24 box without taking layout space.
      expect(host.style.backgroundColor).to.equal('rgb(67, 160, 71)');
      expect(host.style.borderRadius).to.equal('50%');
      expect(host.style.boxShadow).to.contain('rgb(67, 160, 71)');
    });

    it('paints NO chip when the rule does not specify a bg color', () => {
      host = makeHost();
      document.body.appendChild(host);

      applyDecoration(host, '#FFFF00');

      expect(host.style.color).to.equal('rgb(255, 255, 0)');
      expect(host.dataset.smartIconsOwned).to.equal('color');
      // No chip — same end state as a rule without a background field.
      expect(host.style.backgroundColor).to.equal('');
      expect(host.style.borderRadius).to.equal('');
      expect(host.style.boxShadow).to.equal('');
    });

    it('paints a chip with NO color override when called with empty color', () => {
      // Bg-only rule: caller wants the chip but no foreground recolor.
      // applyDecoration should still own the host and apply the chip,
      // but leave the icon's natural color alone (style.color = '').
      host = makeHost();
      host.style.color = 'rebeccapurple';
      document.body.appendChild(host);

      applyDecoration(host, '', '#43a047');

      // style.color cleared so theme/cascade default takes over.
      expect(host.style.color).to.equal('');
      expect(host.dataset.smartIconsOwned).to.equal('color');
      expect(host.style.backgroundColor).to.equal('rgb(67, 160, 71)');
      expect(host.style.borderRadius).to.equal('50%');
      expect(host.style.boxShadow).to.contain('rgb(67, 160, 71)');
    });

    it('accepts rgba bg colors (translucent chip)', () => {
      // The painter sets the value as a raw style.backgroundColor;
      // the browser parses any CSS-valid color string. rgba() in
      // particular lets users author translucent chips.
      host = makeHost();
      document.body.appendChild(host);

      applyDecoration(host, '#FFFF00', 'rgba(67, 160, 71, 0.5)');

      expect(host.style.backgroundColor).to.equal('rgba(67, 160, 71, 0.5)');
      expect(host.style.boxShadow).to.contain('rgba(67, 160, 71, 0.5)');
    });

    it('clears the chip when the rule drops the bg color', () => {
      host = makeHost();
      document.body.appendChild(host);

      // First paint with a chip, second paint without.
      applyDecoration(host, '#FFFF00', '#43a047');
      expect(host.style.backgroundColor).to.equal('rgb(67, 160, 71)');

      applyDecoration(host, '#FFFF00');
      expect(host.style.backgroundColor).to.equal('');
      expect(host.style.borderRadius).to.equal('');
      expect(host.style.boxShadow).to.equal('');
    });

    it('idempotent: applying the same color twice yields the same end state', () => {
      host = makeHost();
      document.body.appendChild(host);

      applyDecoration(host, '#FFFF00', '#43a047');
      const firstColor = host.style.color;
      const firstBg = host.style.backgroundColor;
      const firstShadow = host.style.boxShadow;

      applyDecoration(host, '#FFFF00', '#43a047');

      expect(host.style.color).to.equal(firstColor);
      expect(host.style.backgroundColor).to.equal(firstBg);
      expect(host.style.boxShadow).to.equal(firstShadow);
    });
  });

  describe('releaseDecoration', () => {
    let host: HTMLElement;

    afterEach(() => {
      host?.remove();
    });

    it('clears every style applyDecoration set on a previously decorated host', () => {
      host = makeHost();
      document.body.appendChild(host);
      applyDecoration(host, '#FFFF00', '#43a047');

      releaseDecoration(host);

      expect(host.style.color).to.equal('');
      expect(host.dataset.smartIconsOwned).to.equal(undefined);
      expect(host.style.backgroundColor).to.equal('');
      expect(host.style.borderRadius).to.equal('');
      expect(host.style.boxShadow).to.equal('');
    });

    it('is a no-op on a host we never decorated', () => {
      host = makeHost();
      document.body.appendChild(host);
      host.style.color = 'orange';
      host.style.backgroundColor = 'purple';

      releaseDecoration(host);

      expect(host.style.color).to.equal('orange');
      expect(host.style.backgroundColor).to.equal('purple');
    });
  });
});
