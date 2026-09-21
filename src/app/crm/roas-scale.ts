/**
 * The two scales behind the return-on-spend chart.
 *
 * Pulled out of the component for one reason: a dual axis chart is only
 * readable when its two axes share gridlines, and that is an arithmetic
 * property which can be checked. It was not shared, so the right-hand 3.0x
 * label sat halfway between two left-hand gridlines and the chart read as
 * though nobody had lined anything up. scripts/check-chart-axes.mjs now fails
 * the build if that ever comes back.
 */

/** A round step, no smaller than max/targetTicks, so n of them cover max. */
export function niceStep(max: number, targetTicks = 4): number {
  if (max <= 0) return 1;
  const raw = max / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  return (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
}

export interface Scale {
  /** Money axis. */
  top: number;
  step: number;
  ticks: number[];
  /** Ratio axis, on the same number of divisions. */
  rTop: number;
  rStep: number;
  rTicks: number[];
  divisions: number;
}

/**
 * Both axes from one peak each.
 *
 * The money axis is chosen first because it carries the bars, which are what
 * the chart is mostly about. The ratio axis then takes however many divisions
 * that produced, so every ratio label lands on a gridline that already exists.
 */
export function scaleFor(peak: number, peakRatio: number): Scale {
  const step = niceStep(Math.max(1, peak));
  const top = Math.ceil(Math.max(1, peak) / step) * step;
  const divisions = Math.max(1, Math.round(top / step));
  const rStep = niceStep(Math.max(peakRatio, 0.5), divisions);
  const rTop = rStep * divisions;
  return {
    top, step, divisions,
    ticks: Array.from({ length: divisions + 1 }, (_, i) => i * step),
    rTop, rStep,
    rTicks: Array.from({ length: divisions + 1 }, (_, i) => i * rStep),
  };
}
