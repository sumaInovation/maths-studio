// OL දත්ත නිරූපණය: සමූහිත සංඛ්‍යාත and සමුච්චිත සංඛ්‍යාත ගණනය (UI එකෙන් වෙන්කරලා)

export type ClassRow = { lo: number; hi: number; f: number };
export type FullRow = ClassRow & { mid: number; fx: number; cf: number };
export type Stats = {
  n: number;
  rows: FullRow[];
  sumFx: number;
  mean: number;
  modal: ClassRow | null; // වැඩිම සංඛ්‍යාතය ඇති පන්තිය
  medianClass: ClassRow | null;
  q1: number;
  median: number;
  q3: number;
  iqr: number;
  range: number; // අවසාන ඉහළ සීමාව - මුල් පහළ සීමාව
  equalWidth: boolean;
  width: number | null;
};

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const fmt = (n: number) => (Number.isFinite(n) ? String(round2(n)) : '—');

/** "12, 14 15\n16" -> [12,14,15,16] */
export function parseNumbers(text: string): number[] {
  return text
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map(Number)
    .filter((v) => Number.isFinite(v));
}

/** පරාසය ÷ පන්ති ගණන, ඉහළට වටයා "ලස්සන" අගයකට (1, 2, 5, 10 ...) */
export function niceWidth(v: number): number {
  if (!(v > 0)) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 5, 10]) if (m * e >= v - 1e-9) return m * e;
  return 10 * e;
}

/** අමු දත්ත, පන්ති ගණන -> පන්ති ප්‍රාන්තර (lo ≤ x < hi) */
export function groupRaw(values: number[], classes: number): ClassRow[] {
  if (!values.length) return [];
  const min = Math.min(...values), max = Math.max(...values);
  const w = niceWidth((max - min) / Math.max(1, classes));
  const start = Math.floor(min / w + 1e-9) * w;
  const count = Math.floor((max - start) / w + 1e-9) + 1;
  const rows: ClassRow[] = [];
  for (let i = 0; i < count; i++) {
    const lo = round2(start + i * w), hi = round2(start + (i + 1) * w);
    rows.push({ lo, hi, f: values.filter((x) => x >= lo - 1e-9 && x < hi - 1e-9).length });
  }
  return rows;
}

/** සමුච්චිත සංඛ්‍යාතය target ට සමාන වන x (පන්තිය තුළ රේඛීය අන්තර්ගණනය) */
export function percentile(rows: FullRow[], target: number): number {
  if (!rows.length) return NaN;
  if (target <= 0) return rows[0].lo;
  let prev = 0;
  for (const r of rows) {
    if (r.cf >= target - 1e-12 && r.f > 0) return r.lo + ((target - prev) / r.f) * (r.hi - r.lo);
    prev = r.cf;
  }
  return rows[rows.length - 1].hi;
}

export function computeStats(input: ClassRow[]): Stats | null {
  const rows0 = input.filter((r) => Number.isFinite(r.lo) && Number.isFinite(r.hi) && r.hi > r.lo && r.f >= 0 && Number.isFinite(r.f));
  if (!rows0.length) return null;
  let cf = 0, sumFx = 0;
  const rows: FullRow[] = rows0.map((r) => {
    cf += r.f;
    const mid = (r.lo + r.hi) / 2;
    sumFx += r.f * mid;
    return { ...r, mid, fx: r.f * mid, cf };
  });
  const n = cf;
  if (n <= 0) return null;
  const maxF = Math.max(...rows.map((r) => r.f));
  const modalRow = rows.find((r) => r.f === maxF) ?? null;
  const half = n / 2;
  const medianRow = rows.find((r) => r.cf >= half - 1e-12 && r.f > 0) ?? null;
  const w0 = rows[0].hi - rows[0].lo;
  const equalWidth = rows.every((r) => Math.abs(r.hi - r.lo - w0) < 1e-9);
  const q1 = percentile(rows, n / 4), median = percentile(rows, n / 2), q3 = percentile(rows, (3 * n) / 4);
  return {
    n, rows, sumFx, mean: sumFx / n,
    modal: modalRow && { lo: modalRow.lo, hi: modalRow.hi, f: modalRow.f },
    medianClass: medianRow && { lo: medianRow.lo, hi: medianRow.hi, f: medianRow.f },
    q1, median, q3, iqr: q3 - q1,
    range: rows[rows.length - 1].hi - rows[0].lo,
    equalWidth, width: equalWidth ? w0 : null,
  };
}

/** "ලස්සන" අක්ෂ පියවරක් (≈ target ticks) */
export function niceStep(max: number, target = 6): number {
  if (!(max > 0)) return 1;
  const raw = max / target;
  const e = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5, 10]) if (m * e >= raw - 1e-12) return m * e; // සංඛ්‍යාත සඳහා 2.5 වැනි අගයන් එපා
  return 10 * e;
}

/** monotone cubic (Fritsch–Carlson): ඔගයිව් වක්‍රය සුමට ලෙස අඳින්න, අඩු වෙන්නේ නැහැ */
export function monotoneCurve(xs: number[], ys: number[], per = 16): [number, number][] {
  const n = xs.length;
  if (n < 3) return xs.map((x, i) => [x, ys[i]] as [number, number]);
  const dx = xs.slice(1).map((x, i) => x - xs[i]);
  const m = ys.slice(1).map((y, i) => (y - ys[i]) / dx[i]);
  const t: number[] = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  const out: [number, number][] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < per; j++) {
      const u = j / per, h = dx[i];
      const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
      out.push([xs[i] + u * h, h00 * ys[i] + h10 * h * t[i] + h01 * ys[i + 1] + h11 * h * t[i + 1]]);
    }
  }
  out.push([xs[n - 1], ys[n - 1]]);
  return out;
}