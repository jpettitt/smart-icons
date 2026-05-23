import { expect } from '@open-wc/testing';

import {
  applyDecoration,
  autoContrastOutline,
  isOutlineEnabled,
  releaseDecoration,
  setOutlineEnabled,
} from '../src/outline.js';

/** Build an ha-state-icon-shaped host with an inner SVG path the
 *  outline module can target. The shadow root + nested `<svg><path>`
 *  mirrors how HA wraps MDI glyphs (ha-state-icon → ha-svg-icon →
 *  inline SVG); the outline module's shadow-piercing walk should
 *  reach into all of it. */
function makeHostWithSvgPath(): HTMLElement {
  const host = document.createElement('ha-state-icon');
  const sr = host.attachShadow({ mode: 'open' });
  const svgNs = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNs, 'svg');
  const path = document.createElementNS(svgNs, 'path');
  path.setAttribute('d', 'M0,0 L10,10');
  svg.appendChild(path);
  sr.appendChild(svg);
  return host;
}

function getPath(host: HTMLElement): SVGPathElement {
  return host.shadowRoot!.querySelector('svg path')! as SVGPathElement;
}

describe('outline', () => {
  beforeEach(() => {
    // Each test starts with outlines on (the documented default).
    setOutlineEnabled(true);
  });

  describe('autoContrastOutline', () => {
    it('returns black for clearly-light colors (W3C luminance > 0.5)', () => {
      // Pure yellow (#FFFF00) luminance ≈ 0.93 → outline must be dark.
      expect(autoContrastOutline('#FFFF00')).to.equal('#000000');
      expect(autoContrastOutline('white')).to.equal('#000000');
      expect(autoContrastOutline('#FFD700')).to.equal('#000000');
    });

    it('returns white for clearly-dark colors (W3C luminance ≤ 0.5)', () => {
      // Dark red (#8B0000) luminance ≈ 0.05 → outline must be light.
      expect(autoContrastOutline('#8B0000')).to.equal('#ffffff');
      expect(autoContrastOutline('black')).to.equal('#ffffff');
      expect(autoContrastOutline('#4B0082')).to.equal('#ffffff');
    });

    it('is stable across repeated calls (memoization)', () => {
      // Not strictly observable from the outside, but the test pins
      // the contract: same input always gives the same answer, so
      // the memo can never get out of sync with re-computation.
      const first = autoContrastOutline('#FFFF00');
      const second = autoContrastOutline('#FFFF00');
      expect(first).to.equal(second);
    });
  });

  describe('outline-enabled flag', () => {
    it('defaults to true after module load', () => {
      // The module-level default is documented as true to match the
      // installation default and avoid a brief no-outline flash at
      // bootstrap.
      expect(isOutlineEnabled()).to.equal(true);
    });

    it('round-trips through setOutlineEnabled', () => {
      setOutlineEnabled(false);
      expect(isOutlineEnabled()).to.equal(false);
      setOutlineEnabled(true);
      expect(isOutlineEnabled()).to.equal(true);
    });
  });

  describe('applyDecoration', () => {
    let host: HTMLElement;

    afterEach(() => {
      host?.remove();
    });

    it('sets color + ownership marker', () => {
      host = makeHostWithSvgPath();
      document.body.appendChild(host);

      applyDecoration(host, '#FFFF00');

      expect(host.style.color).to.equal('rgb(255, 255, 0)');
      expect(host.dataset.smartIconsOwned).to.equal('color');
    });

    it('writes paint-order + stroke when outline is enabled', () => {
      host = makeHostWithSvgPath();
      document.body.appendChild(host);

      applyDecoration(host, '#FFFF00'); // yellow → black outline

      const path = getPath(host);
      // CSSOM normalizes `paint-order: stroke fill` by dropping the
      // trailing default (`fill` is implicit after `stroke`) — the
      // serialized form is just `stroke`. Behavior is identical.
      expect(path.style.paintOrder).to.equal('stroke');
      // Computed style normalizes hex to rgb; test the actual
      // inline-style value the module wrote.
      expect(path.style.stroke).to.equal('rgb(0, 0, 0)');
      expect(path.style.strokeWidth).to.equal('1.5');
      expect(path.style.strokeLinejoin).to.equal('round');
    });

    it('does NOT write stroke when outline is disabled', () => {
      setOutlineEnabled(false);
      host = makeHostWithSvgPath();
      document.body.appendChild(host);

      applyDecoration(host, '#FFFF00');

      const path = getPath(host);
      expect(path.style.paintOrder).to.equal('');
      expect(path.style.stroke).to.equal('');
      expect(path.style.strokeWidth).to.equal('');
      // Color + ownership still get set; only the stroke is gated.
      expect(host.style.color).to.equal('rgb(255, 255, 0)');
      expect(host.dataset.smartIconsOwned).to.equal('color');
    });

    it('removes a previously applied stroke when re-applied with outline off', () => {
      host = makeHostWithSvgPath();
      document.body.appendChild(host);

      // First paint with outline on — stroke gets written.
      applyDecoration(host, '#FFFF00');
      // See above — CSSOM normalizes the value.
      expect(getPath(host).style.paintOrder).to.equal('stroke');

      // Admin toggles outlines off; painter re-runs applyDecoration.
      setOutlineEnabled(false);
      applyDecoration(host, '#FFFF00');

      const path = getPath(host);
      expect(path.style.paintOrder).to.equal('');
      expect(path.style.stroke).to.equal('');
    });

    it('idempotent: applying the same color twice yields the same end state', () => {
      host = makeHostWithSvgPath();
      document.body.appendChild(host);

      applyDecoration(host, '#FFFF00');
      const firstColor = host.style.color;
      const firstStroke = getPath(host).style.stroke;

      applyDecoration(host, '#FFFF00');

      expect(host.style.color).to.equal(firstColor);
      expect(getPath(host).style.stroke).to.equal(firstStroke);
    });
  });

  describe('releaseDecoration', () => {
    let host: HTMLElement;

    afterEach(() => {
      host?.remove();
    });

    it('clears color, ownership, and stroke on a previously decorated host', () => {
      host = makeHostWithSvgPath();
      document.body.appendChild(host);
      applyDecoration(host, '#FFFF00');

      releaseDecoration(host);

      expect(host.style.color).to.equal('');
      expect(host.dataset.smartIconsOwned).to.equal(undefined);
      const path = getPath(host);
      expect(path.style.stroke).to.equal('');
      expect(path.style.paintOrder).to.equal('');
    });

    it('is a no-op on a host we never decorated', () => {
      // Hosts not owned by Smart Icons must not have their styles
      // touched — this protects against accidental cleanup of an
      // un-painted icon next to a painted one in the same shadow tree.
      host = makeHostWithSvgPath();
      document.body.appendChild(host);
      host.style.color = 'orange';
      const path = getPath(host);
      path.style.stroke = 'purple';

      releaseDecoration(host);

      expect(host.style.color).to.equal('orange');
      expect(path.style.stroke).to.equal('purple');
    });
  });
});
