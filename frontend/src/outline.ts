/**
 * Painted-icon decoration: color + (optional) colored background chip.
 *
 * Replaces the v0.3-line contrast-halo approach. After repeated
 * iteration the halo concept ran into a fundamental alpha-mask
 * problem: any technique that strokes or shadows an icon's alpha
 * silhouette also draws around internal cutouts (alert-circle's
 * exclamation, bell's clapper). The chip approach takes a
 * different route — render a colored circle BEHIND the icon, à la
 * Mushroom. The icon's own transparent cutouts show the chip color
 * cleanly with no artifact, because the cutout is just a hole in
 * the icon's path rendered over the chip's filled circle.
 *
 * Per-rule, not per-installation: rules that specify
 * `background_color` (mapping entry or threshold entry) get a chip;
 * rules without one get no chip. The injector writes
 * `smart_icons_background` onto the entity's state attributes when
 * a rule's decoration includes the field; the painter reads it on
 * each paint.
 *
 * The CSS approach:
 * - `background-color` and `border-radius: 50%` on the host turn the
 *   24-by-24 ha-state-icon box into a circular colored chip behind
 *   the icon.
 * - `box-shadow: 0 0 0 5px <color>` extends the chip beyond the
 *   host's intrinsic dimensions WITHOUT taking layout space (box-
 *   shadow doesn't push surrounding elements). 5 px spread on a
 *   24 px icon box gives a 34 px visible chip — Mushroom-ish ~1.42x
 *   ratio. Doesn't disturb the parent card's layout.
 */

/** Apply color + (when the rule specifies a background) Mushroom-
 *  style background chip to a painted host. Idempotent: equal-string
 *  guards before each style write avoid triggering setter-side
 *  observers when nothing changes. Always sets
 *  `dataset.smartIconsOwned` so the release path knows what to
 *  clean up.
 *
 *  An empty `color` string is the bg-only case: caller wants a chip
 *  but no foreground recolor. We clear any prior inline color we
 *  set (so the icon falls back to the theme/cascade default) and
 *  proceed to chip handling. Ownership is still claimed so the
 *  release path knows to undo us later.
 *
 *  `bgColor` accepts any CSS color string — hex, rgb(), rgba(),
 *  hsl(), CSS variable, named color. The painter sets it as a raw
 *  style.background-color value; the browser parses and validates.
 *  rgba() works for translucent chips. */
export function applyDecoration(
  host: HTMLElement,
  color: string,
  bgColor?: string | null,
): void {
  if (host.style.color !== color) host.style.color = color;
  host.dataset.smartIconsOwned = 'color';

  if (bgColor) {
    applyBackgroundChip(host, bgColor);
  } else {
    releaseBackgroundChip(host);
  }
}

/** Reset everything `applyDecoration` may have set on this host. */
export function releaseDecoration(host: HTMLElement): void {
  if (!host.dataset.smartIconsOwned) return;
  host.style.color = '';
  delete host.dataset.smartIconsOwned;
  releaseBackgroundChip(host);
}

function applyBackgroundChip(host: HTMLElement, bg: string): void {
  if (host.style.backgroundColor !== bg) host.style.backgroundColor = bg;
  if (host.style.borderRadius !== '50%') host.style.borderRadius = '50%';
  const shadow = `0 0 0 5px ${bg}`;
  if (host.style.boxShadow !== shadow) host.style.boxShadow = shadow;
}

function releaseBackgroundChip(host: HTMLElement): void {
  if (host.style.backgroundColor) host.style.backgroundColor = '';
  if (host.style.borderRadius) host.style.borderRadius = '';
  if (host.style.boxShadow) host.style.boxShadow = '';
}
