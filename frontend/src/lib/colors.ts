// 5-stop yellow → purple scale
export const SCALE: Array<[number, string]> = [
  [0,   '#ffffb2'],  // Sufficient
  [25,  '#fecc5c'],
  [50,  '#fd8d3c'],
  [75,  '#f03b20'],
  [100, '#4d0066'],  // Critical Gap
];

/** Mapbox GL expression for fill-color based on gap_score property */
export function buildFillColorExpression(): mapboxgl.Expression {
  const stops: (number | string)[] = [];
  for (const [val, color] of SCALE) {
    stops.push(val, color);
  }
  return ['interpolate', ['linear'], ['get', 'gap_score'], ...stops];
}

/** Interpolate color for a given 0-100 score (used in legend) */
export function scoreToColor(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));
  for (let i = SCALE.length - 1; i >= 0; i--) {
    if (clamped >= SCALE[i][0]) {
      if (i === SCALE.length - 1) return SCALE[i][1];
      const [lo, colorLo] = SCALE[i];
      const [hi, colorHi] = SCALE[i + 1];
      const t = (clamped - lo) / (hi - lo);
      return interpolateHex(colorLo as string, colorHi as string, t);
    }
  }
  return SCALE[0][1];
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function interpolateHex(colorA: string, colorB: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(colorA);
  const [r2, g2, b2] = hexToRgb(colorB);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${bl})`;
}
