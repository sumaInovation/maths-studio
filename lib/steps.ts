// OL ගණිතය: වර්ගජ (සහ රේඛීය) සමීකරණ පියවරෙන් පියවර විසඳන logic.
// UI එකෙන් වෙන්කරලා තියෙන්නේ පස්සේ quiz engine එකටත් පාවිච්චි කරන්න පුළුවන් වෙන්න.
import { compile, parse, OperatorNode } from 'mathjs';

export type Step = { title: string; tex: string[]; note?: string };
export type Root = { label: string; tex: string; value: number; exact: boolean };
export type Solution = { ok: boolean; steps: Step[]; roots: Root[]; message?: string };
export type MethodId = 'factor' | 'square' | 'formula';
export type Method = { id: MethodId; name: string; solution: Solution };
export type Quad = { a: number; b: number; c: number };
export type SolveResult =
  | { kind: 'error'; message: string }
  | { kind: 'linear'; pre: Step[]; solution: Solution; orig: Quad }
  | { kind: 'quadratic'; pre: Step[]; eq: Quad; methods: Method[]; orig: Quad };

// ---------- helpers ----------
export const gcd = (a: number, b: number): number => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};

export type Q = { n: number; d: number };
export const q = (n: number, d = 1): Q => {
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
};
export const qMul = (x: Q, y: Q) => q(x.n * y.n, x.d * y.d);
export const qSub = (x: Q, y: Q) => q(x.n * y.d - y.n * x.d, x.d * y.d);
export const qNeg = (x: Q) => q(-x.n, x.d);
export const qAbs = (x: Q) => q(Math.abs(x.n), x.d);
export const qVal = (x: Q) => x.n / x.d;
export const qTex = (x: Q) => (x.d === 1 ? `${x.n}` : `${x.n < 0 ? '-' : ''}\\frac{${Math.abs(x.n)}}{${x.d}}`);

// p(-3) -> "(-3)"
export const par = (n: number) => (n < 0 ? `(${n})` : `${n}`);

// coefficient (rational) සහිත බහුපද -> tex
export function ratPoly(terms: [Q, string][]): string {
  const parts: string[] = [];
  terms.forEach(([c, v]) => {
    if (c.n === 0) return;
    const neg = c.n < 0;
    const abs = qAbs(c);
    const body = v === '' ? qTex(abs) : abs.n === 1 && abs.d === 1 ? v : qTex(abs) + v;
    if (!parts.length) parts.push((neg ? '-' : '') + body);
    else parts.push((neg ? '- ' : '+ ') + body);
  });
  return parts.length ? parts.join(' ') : '0';
}
const intPoly = (a: number, b: number, c: number) =>
  ratPoly([[q(a), 'x^{2}'], [q(b), 'x'], [q(c), '']]);

// n = k²·m  (m හැකි තරම් කුඩා)
function simplifySqrt(n: number) {
  for (let i = Math.floor(Math.sqrt(n)); i >= 1; i--) {
    if (n % (i * i) === 0) return { k: i, m: n / (i * i) };
  }
  return { k: 1, m: n };
}
const sqrtTex = (n: number) => {
  const { k, m } = simplifySqrt(n);
  return m === 1 ? `${k}` : k === 1 ? `\\sqrt{${m}}` : `${k}\\sqrt{${m}}`;
};

// ---------- ax² + bx + c = 0 හි මූල (සූත්රයෙන්) ----------
function rootsFromFormula(a: number, b: number, D: number): Root[] {
  if (D < 0) return [];
  const den = 2 * a;
  if (D === 0) {
    const r = q(-b, den);
    return [{ label: 'x', tex: qTex(r), value: qVal(r), exact: true }];
  }
  const s = Math.round(Math.sqrt(D));
  if (s * s === D) {
    const r1 = q(-b - s, den), r2 = q(-b + s, den);
    return [
      { label: 'x_1', tex: qTex(r1), value: qVal(r1), exact: true },
      { label: 'x_2', tex: qTex(r2), value: qVal(r2), exact: true },
    ];
  }
  const { k, m } = simplifySqrt(D);
  const g = gcd(gcd(b, k), den);
  const bb = -b / g, kk = k / g, dd = den / g;
  const sq = kk === 1 ? `\\sqrt{${m}}` : `${kk}\\sqrt{${m}}`;
  const mk = (sign: '+' | '-') => {
    const num = bb === 0 ? (sign === '-' ? '-' : '') + sq : `${bb} ${sign} ${sq}`;
    return dd === 1 ? num : `\\frac{${num}}{${dd}}`;
  };
  return [
    { label: 'x_1', tex: mk('-'), value: (-b - Math.sqrt(D)) / den, exact: false },
    { label: 'x_2', tex: mk('+'), value: (-b + Math.sqrt(D)) / den, exact: false },
  ];
}

// ---------- 1) සාධක වෙන් කිරීම ----------
function factorSolution(eq: Quad): Solution {
  const { a, b, c } = eq;
  const steps: Step[] = [
    {
      title: 'a, b, c හඳුනාගන්න',
      tex: [`${intPoly(a, b, c)} = 0`, `a = ${a},\\quad b = ${b},\\quad c = ${c}`],
    },
  ];

  if (c === 0) {
    const inner = ratPoly([[q(a), 'x'], [q(b), '']]);
    steps.push({
      title: 'c = 0 නිසා x පොදු සාධකයක් ලෙස ඉවත් කරමු',
      tex: [`x\\left(${inner}\\right) = 0`],
    });
    const r2 = q(-b, a);
    steps.push({
      title: 'සාධක දෙකෙන් එකක් බිංදුව විය යුතුයි',
      tex: [`x = 0 \\quad \\text{or} \\quad ${inner} = 0`, `x = 0 \\quad \\text{or} \\quad x = ${qTex(r2)}`],
    });
    const roots: Root[] = [{ label: 'x_1', tex: '0', value: 0, exact: true }];
    if (r2.n !== 0) roots.push({ label: 'x_2', tex: qTex(r2), value: qVal(r2), exact: true });
    roots.sort((x, y) => x.value - y.value);
    roots.forEach((r, i) => (r.label = roots.length === 1 ? 'x' : `x_${i + 1}`));
    return { ok: true, steps, roots };
  }

// ===== b = 0 nam: වර්ග දෙකක අන්තරය (Difference of Two Squares) =====
if (b === 0) {
  // a x² + c = 0  =>  x² = -c / a
  const k = q(-c, a); // x² = k

  // k < 0 nam - D < 0
  if (k.n < 0) {
    steps.push({
      title: 'b = 0 නිසා වර්ග දෙකක අන්තරය',
      tex: [`${intPoly(a, b, c)} = 0`],
      note: 'b = 0 නිසා මැද පදයක් නැත.',
    });
    steps.push({
      title: 'තාත්වික මූල නැත',
      tex: [`x^{2} = ${qTex(k)} < 0`],
      note: 'සංඛ්යාවක වර්ගය ඍණ විය නොහැකි නිසා තාත්වික මූල නැත.',
    });
    return { ok: true, steps, roots: [] };
  }

  // k = 0
  if (k.n === 0) {
    steps.push({
      title: 'b = 0 නිසා වර්ග දෙකක අන්තරය',
      tex: [`${intPoly(a, b, c)} = 0`, `x^{2} = 0`],
    });
    steps.push({
      title: 'සාධක දෙකෙන් එකක් බිංදුව විය යුතුයි',
      tex: [`x = 0`],
    });
    return { ok: true, steps, roots: [{ label: 'x', tex: '0', value: 0, exact: true }] };
  }

  const sn = Math.round(Math.sqrt(k.n));
  const sd = Math.round(Math.sqrt(k.d));
  const isPerfect = sn * sn === k.n && sd * sd === k.d;

  if (isPerfect) {
    const r = q(sn, sd);
    const rTex = qTex(r);
    // KELINMA factor - ± kalin liyanne na
    steps.push({
      title: 'b = 0 නිසා වර්ග දෙකක අන්තරය',
      tex: [`${intPoly(a, b, c)} = 0`],
      note: 'b = 0 නිසා මැද පදයක් නැත. කෙලින්ම වර්ග දෙකක අන්තරය ලෙස ලියමු.',
    });
    steps.push({
      title: 'වර්ග දෙකක අන්තරය ලෙස සාධක ලියමු',
      tex: [
        `x^{2} - ${qTex(k)} = \\left[x^{2} - \\left(${rTex}\\right)^{2}\\right] = \\left[x - ${rTex}\\right]\\left[x + ${rTex}\\right] = 0`,
      ],
      note: 'a² - b² = (a - b)(a + b) සූත්රය.',
    });
    steps.push({
      title: 'සාධක දෙකෙන් එකක් බිංදුව විය යුතුයි',
      tex: [
        `x - ${rTex} = 0 \\;\\Rightarrow\\; x = ${rTex}`,
        `x + ${rTex} = 0 \\;\\Rightarrow\\; x = ${qTex(qNeg(r))}`,
      ],
    });
    const roots: Root[] = [
      { label: 'x_1', tex: qTex(qNeg(r)), value: -qVal(r), exact: true },
      { label: 'x_2', tex: qTex(r), value: qVal(r), exact: true },
    ].sort((x, y) => x.value - y.value);
    roots.forEach((rt, i) => (rt.label = `x_${i + 1}`));
    return { ok: true, steps, roots };
  }

  // Surd - KELINMA factor
  const sqrtKTex = `\\sqrt{${qTex(k)}}`;
  const roots = rootsFromFormula(a, b, b * b - 4 * a * c);
  steps.push({
    title: 'b = 0 නිසා වර්ග දෙකක අන්තරය',
    tex: [`${intPoly(a, b, c)} = 0`],
    note: 'b = 0 නිසා මැද පදයක් නැත. කෙලින්ම වර්ග දෙකක අන්තරය ලෙස ලියමු.',
  });
  steps.push({
    title: 'වර්ග දෙකක අන්තරය ලෙස සාධක ලියමු',
    tex: [
      `x^{2} - ${qTex(k)} = \\left[x^{2} - \\left(${sqrtKTex}\\right)^{2}\\right] = \\left[x - ${sqrtKTex}\\right]\\left[x + ${sqrtKTex}\\right] = 0`,
    ],
    note: 'a² - b² = (a - b)(a + b) සූත්රය.',
  });
  steps.push({
    title: 'සාධක දෙකෙන් එකක් බිංදුව විය යුතුයි',
    tex: [
      `x - ${sqrtKTex} = 0 \\;\\Rightarrow\\; x = ${sqrtKTex}`,
      `x + ${sqrtKTex} = 0 \\;\\Rightarrow\\; x = -${sqrtKTex}`,
    ],
  });
  return { ok: true, steps, roots };
}
    


  const ac = a * c;
  steps.push({
    title: 'a × c ගුණිතය සොයමු',
    tex: [`a \\times c = ${par(a)} \\times ${par(c)} = ${ac}`],
    note: `ගුණිතය ${ac} ද, එකතුව b = ${b} ද වන සංඛ්යා දෙකක් සොයන්න.`,
  });

  // සුදුසු සංඛ්යා යුගලය සොයමු
  const tryPair = (p: number, s: number) => {
    const g1 = gcd(a, p);
    const a1 = a / g1, p1 = p / g1;
    const g2 = s / a1;
    if (!Number.isInteger(g2) || g2 === 0 || c !== g2 * p1) return null;
    return { p, s, g1, a1, p1, g2 };
  };
  let found: ReturnType<typeof tryPair> = null;
  const lim = Math.floor(Math.sqrt(Math.abs(ac)));
  outer: for (let d = 1; d <= lim; d++) {
    if (ac % d !== 0) continue;
    const e = Math.abs(ac) / d;
    const pairs: [number, number][] = ac > 0 ? [[d, e], [-d, -e]] : [[d, -e], [-d, e]];
    for (const [x, y] of pairs) {
      if (x + y !== b) continue;
      found = tryPair(x, y) || tryPair(y, x);
      if (found) break outer;
    }
  }

  if (!found) {
    // FIX: Integer walin ba nam, rational / surd walin factor karamu
    // OL rule: D < 0 nam witharak solution na
    const D = b * b - 4 * a * c;

    if (D < 0) {
      steps.push({
        title: 'විචාරකය බලමු - D < 0',
        tex: [
          `D = b^{2} - 4ac = ${par(b)}^{2} - 4 \\times ${par(a)} \\times ${par(c)} = ${D}`,
          `D < 0`,
        ],
        note: 'D ඍණ නිසා තාත්වික මූල නැත. සාධක වෙන් කිරීමටත් තාත්වික සාධක නැත.',
      });
      return { ok: true, steps, roots: [] };
    }

    const roots = rootsFromFormula(a, b, D);

    steps.push({
      title: 'පූර්ණ සංඛ්යා යුගලයකින් සාධක වෙන් කළ නොහැක - විචාරකයෙන් බලමු',
      tex: [
        `D = b^{2} - 4ac = ${D}`,
        `x = \\frac{-b \\pm \\sqrt{D}}{2a} = \\frac{${-b} \\pm ${sqrtTex(D)}}{${2 * a}}`,
      ],
      note: 'මෙහි මූල භාග / දශම / වර්ගමූල විය හැක. Integer වලින් පමණක් සාධක වෙන් කළ නොහැක.',
    });

    // Rational roots nam - fraction factors
    if (roots.length === 2 && roots[0].exact && roots[1].exact) {
      const toFrac = (v: number): Q => {
        for (let d = 1; d <= 100; d++) {
          const n = Math.round(v * d);
          if (Math.abs(v - n / d) < 1e-9) return q(n, d);
        }
        return q(Math.round(v), 1);
      };
      const r1 = toFrac(roots[0].value);
      const r2 = toFrac(roots[1].value);

      const fmt = (r: Q) => {
        const d = r.d, n = r.n;
        const xPart = d === 1 ? 'x' : `${d}x`;
        if (n === 0) return `\\left(${xPart}\\right)`;
        return `\\left(${xPart} ${n > 0 ? '-' : '+'} ${Math.abs(n)}\\right)`;
      };

      steps.push({
        title: 'භාග මූල වලින් සාධක ලියමු',
        tex: [
          `x = ${roots[0].tex},\\quad x = ${roots[1].tex}`,
          `${fmt(r1)}${fmt(r2)} = 0`,
        ],
        note: 'මූල භාගයක් නම්, හරයෙන් ගුණ කර සාධකය ලියන්න.',
      });
      steps.push({
        title: 'සාධක දෙකෙන් එකක් බිංදුව විය යුතුයි',
        tex: [
          `${fmt(r1)} = 0 \\;\\Rightarrow\\; x = ${roots[0].tex}`,
          `${fmt(r2)} = 0 \\;\\Rightarrow\\; x = ${roots[1].tex}`,
        ],
      });
      return { ok: true, steps, roots };
    }

    // Irrational - surd walin factor
    if (roots.length === 2) {
      steps.push({
        title: 'වර්ගමූල මූල වලින් සාධක ලියමු',
        tex: [
          `x = ${roots[0].tex},\\quad x = ${roots[1].tex}`,
          `\\left(x - (${roots[0].tex})\\right)\\left(x - (${roots[1].tex})\\right) = 0`,
        ],
        note: 'D පරිපූර්ණ වර්ගයක් නොවන නිසා මූල වර්ගමූල වලින් ලැබේ. සාධක වෙන් කිරීමත් වර්ගමූල වලින්ම ලියන්න.',
      });
      return { ok: true, steps, roots };
    }

    // D == 0 - single root
    if (roots.length === 1) {
      steps.push({
        title: 'සමාන මූලයක්',
        tex: [`x = ${roots[0].tex}`],
      });
      return { ok: true, steps, roots };
    }

    return { ok: true, steps, roots: [] };
  }

  const { p, s, g1, a1, p1, g2 } = found;
  steps.push({
    title: 'සුදුසු සංඛ්යා දෙක',
    tex: [`${par(p)} \\times ${par(s)} = ${ac},\\qquad ${par(p)} + ${par(s)} = ${b}`],
  });
  steps.push({
    title: 'මැද පදය කඩමු',
    tex: [`${ratPoly([[q(a), 'x^{2}'], [q(p), 'x'], [q(s), 'x'], [q(c), '']])} = 0`],
  });
  steps.push({
    title: 'යුගල දෙකකට කාණ්ඩ කරමු',
    tex: [
      `\\left(${ratPoly([[q(a), 'x^{2}'], [q(p), 'x']])}\\right) + \\left(${ratPoly([[q(s), 'x'], [q(c), '']])}\\right) = 0`,
    ],
  });
  const B1 = ratPoly([[q(a1), 'x'], [q(p1), '']]);
  const g1x = g1 === 1 ? 'x' : `${g1}x`;
  const g2abs = Math.abs(g2);
  const g2tex = g2abs === 1 ? '' : `${g2abs}`;
  steps.push({
    title: 'එක් එක් කාණ්ඩයෙන් පොදු සාධකය ඉවත් කරමු',
    tex: [`${g1x}\\left(${B1}\\right) ${g2 < 0 ? '-' : '+'} ${g2tex}\\left(${B1}\\right) = 0`],
  });
  const B2 = ratPoly([[q(g1), 'x'], [q(g2), '']]);
  steps.push({
    title: 'පොදු වරහන ඉවත් කරමු',
    tex: [`\\left(${B1}\\right)\\left(${B2}\\right) = 0`],
  });
  const r1 = q(-p1, a1), r2 = q(-g2, g1);
  steps.push({
    title: 'සාධක දෙකෙන් එකක් බිංදුව විය යුතුයි',
    tex: [
      `${B1} = 0 \\;\\Rightarrow\\; x = ${qTex(r1)}`,
      `${B2} = 0 \\;\\Rightarrow\\; x = ${qTex(r2)}`,
    ],
  });
  const vals = [r1, r2].sort((x, y) => qVal(x) - qVal(y));
  const same = vals[0].n === vals[1].n && vals[0].d === vals[1].d;
  const roots: Root[] = same
    ? [{ label: 'x', tex: qTex(vals[0]), value: qVal(vals[0]), exact: true }]
    : vals.map((r, i) => ({ label: `x_${i + 1}`, tex: qTex(r), value: qVal(r), exact: true }));
  return { ok: true, steps, roots };
}

// ---------- 2) වර්ග සම්පූර්ණ කිරීම ----------
function squareSolution(eq: Quad): Solution {
  const { a, b, c } = eq;
  const steps: Step[] = [
    {
      title: 'a, b, c හඳුනාගන්න',
      tex: [`${intPoly(a, b, c)} = 0`, `a = ${a},\\quad b = ${b},\\quad c = ${c}`],
    },
  ];
  const bq = q(b, a), cq = q(c, a);
  if (a !== 1) {
    steps.push({
      title: `x² හි සංගුණකය 1 කිරීමට දෙපැත්තම ${a} න් බෙදමු`,
      tex: [`${ratPoly([[q(1), 'x^{2}'], [bq, 'x'], [cq, '']])} = 0`],
    });
  }
  steps.push({
    title: 'නියත පදය දකුණු පැත්තට ගමු',
    tex: [`${ratPoly([[q(1), 'x^{2}'], [bq, 'x']])} = ${qTex(qNeg(cq))}`],
  });
  const h = q(b, 2 * a); // x හි සංගුණකයෙන් භාගයක්
  const h2 = qMul(h, h);
  steps.push({
    title: 'x හි සංගුණකයෙන් භාගයක් වර්ග කර දෙපැත්තටම එකතු කරමු',
    tex: [
      `\\left(\\frac{${qTex(bq)}}{2}\\right)^{2} = \\left(${qTex(h)}\\right)^{2} = ${qTex(h2)}`,
      `${ratPoly([[q(1), 'x^{2}'], [bq, 'x'], [h2, '']])} = ${qTex(qNeg(cq))} + ${qTex(h2)}`,
    ],
  });
  const r = qSub(h2, cq);
  const left = h.n === 0 ? 'x' : `x ${h.n < 0 ? '-' : '+'} ${qTex(qAbs(h))}`;
  steps.push({
    title: 'වම් පැත්ත පරිපූර්ණ වර්ගයක් ලෙස ලියමු',
    tex: [`\\left(${left}\\right)^{2} = ${qTex(r)}`],
  });

  const D = b * b - 4 * a * c;
  if (r.n < 0) {
    steps.push({
      title: 'තාත්වික මූල නැත',
      tex: [`\\left(${left}\\right)^{2} < 0`],
      note: 'සංඛ්යාවක වර්ගය ඍණ විය නොහැකි නිසා තාත්වික මූල නැත.',
    });
    return { ok: true, steps, roots: [] };
  }
  if (r.n === 0) {
    steps.push({
      title: 'දෙපැත්තේම වර්ගමූලය ගනිමු',
      tex: [`${left} = 0`, `x = ${qTex(qNeg(h))}`],
    });
    return { ok: true, steps, roots: rootsFromFormula(a, b, D) };
  }
  const sn = Math.round(Math.sqrt(r.n)), sd = Math.round(Math.sqrt(r.d));
  const perfect = sn * sn === r.n && sd * sd === r.d;
  steps.push({
    title: 'දෙපැත්තේම වර්ගමූලය ගනිමු',
    tex: [
      `${left} = \\pm\\sqrt{${qTex(r)}}`,
      ...(perfect
        ? [`${left} = \\pm ${qTex(q(sn, sd))}`, `x = ${qTex(qNeg(h))} \\pm ${qTex(q(sn, sd))}`]
        : [`x = ${qTex(qNeg(h))} \\pm \\sqrt{${qTex(r)}}`]),
    ],
  });
  const roots = rootsFromFormula(a, b, D);
  steps.push({
    title: 'සුළු කර මූල දෙක ලියමු',
    tex: roots.map((rt) => `${rt.label} = ${rt.tex}`),
  });
  return { ok: true, steps, roots };
}

// ---------- 3) සූත්රය ----------
function formulaSolution(eq: Quad): Solution {
  const { a, b, c } = eq;
  const steps: Step[] = [
    {
      title: 'a, b, c හඳුනාගන්න',
      tex: [`${intPoly(a, b, c)} = 0`, `a = ${a},\\quad b = ${b},\\quad c = ${c}`],
    },
    {
      title: 'සූත්රය',
      tex: [`x = \\frac{-b \\pm \\sqrt{b^{2} - 4ac}}{2a}`],
    },
  ];
  const D = b * b - 4 * a * c;
  steps.push({
    title: 'විචාරකය (discriminant) D = b² − 4ac සොයමු',
    tex: [`D = ${par(b)}^{2} - 4 \\times ${par(a)} \\times ${par(c)}`, `D = ${b * b} - ${par(4 * a * c)} = ${D}`],
  });
  if (D < 0) {
    steps.push({
      title: 'D < 0',
      tex: [`D = ${D} < 0`],
      note: 'විචාරකය ඍණ නිසා තාත්වික මූල නැත.',
    });
    return { ok: true, steps, roots: [] };
  }
  steps.push({
    title: D === 0 ? 'D = 0 නිසා සමාන මූල දෙකක් (එක මූලයක්)' : 'D > 0 නිසා වෙනස් මූල දෙකක්',
    tex: [
      `x = \\frac{-${par(b)} \\pm \\sqrt{${D}}}{2 \\times ${par(a)}}`,
      `x = \\frac{${-b} \\pm ${D === 0 ? '0' : sqrtTex(D)}}{${2 * a}}`,
    ],
  });
  const roots = rootsFromFormula(a, b, D);
  steps.push({
    title: 'මූල දෙක ලියමු',
    tex: roots.map((rt) => `${rt.label} = ${rt.tex}`),
  });
  return { ok: true, steps, roots };
}

// ax² + bx + c  ->  "2x^2 + 7x + 3"  (Graph tab එකේ input එකට යවන්න)
export function polyExpr(a: number, b: number, c: number): string {
  const parts: string[] = [];
  const add = (coef: number, v: string) => {
    const r = Math.round(coef * 1e6) / 1e6;
    if (r === 0) return;
    const abs = Math.abs(r);
    const body = v === '' ? String(abs) : abs === 1 ? v : `${abs}${v}`;
    if (!parts.length) parts.push(r < 0 ? `-${body}` : body);
    else parts.push(`${r < 0 ? '-' : '+'} ${body}`);
  };
  add(a, 'x^2');
  add(b, 'x');
  add(c, '');
  return parts.length ? parts.join(' ') : '0';
}

// ---------- ආදානය parse කිරීම ----------
export const normalize = (s: string) =>
  s.replace(/²/g, '^2').replace(/³/g, '^3').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, ' ');

export function implicitify(node: any): any {
  const mapped = node.map(implicitify);
  if (
    mapped.type === 'OperatorNode' &&
    mapped.fn === 'multiply' &&
    mapped.args.length === 2 &&
    !mapped.args[1].isConstantNode
  ) {
    return new OperatorNode('*', 'multiply', mapped.args, true);
  }
  return mapped;
}

// "x^2 - 2x - 3 = 0"  ->  school format tex
export function equationTex(input: string): string {
  try {
    const parts = normalize(input).split('=');
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) return '';
    const side = (s: string) => implicitify(parse(s)).toTex({ implicit: 'hide' });
    return `${side(parts[0])} = ${side(parts[1])}`;
  } catch {
    return '';
  }
}

export const near = (v: number) => Math.abs(v - Math.round(v)) < 1e-8 * Math.max(1, Math.abs(v));

export function solveEquation(input: string): SolveResult {
  const src = normalize(input).trim();
  if (!src) return { kind: 'error', message: 'සමීකරණයක් type කරන්න.' };
  const parts = src.split('=');
  if (parts.length > 2) return { kind: 'error', message: '"=" ලකුණ එක් වතාවක් පමණක් භාවිතා කරන්න.' };
  const left = parts[0], right = parts.length === 2 ? parts[1] : '0';
  if (!left.trim() || !right.trim()) return { kind: 'error', message: 'සමීකරණයේ දෙපැත්තම ලියන්න.' };

  let f: (x: number) => number;
  try {
    const code = compile(`(${left}) - (${right})`);
    f = (x: number) => {
      const v = code.evaluate({ x });
      if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('bad');
      return v;
    };
    f(0);
  } catch {
    return { kind: 'error', message: 'සමීකරණය හරියට ලියලා නැහැ. x පමණක් භාවිතා කරන්න.' };
  }

  let a0: number, b0: number, c0: number;
  try {
    const fm1 = f(-1), f0 = f(0), f1 = f(1);
    c0 = f0;
    a0 = (f1 + fm1) / 2 - f0;
    b0 = (f1 - fm1) / 2;
    for (const t of [2, -2, 3, -3, 0.5]) {
      const want = a0 * t * t + b0 * t + c0;
      if (Math.abs(f(t) - want) > 1e-7 * (1 + Math.abs(want))) {
        return { kind: 'error', message: 'මේක වර්ගජ (ax² + bx + c = 0) හෝ රේඛීය සමීකරණයක් නෙවෙයි.' };
      }
    }
  } catch {
    return { kind: 'error', message: 'සමීකරණය ගණනය කරන්න බැරි වුණා.' };
  }

  // දශම / භාග සංගුණක පූර්ණ සංඛ්යා බවට
  let k = 0;
  for (let t = 1; t <= 1000; t++) {
    if (near(a0 * t) && near(b0 * t) && near(c0 * t)) { k = t; break; }
  }
  if (!k) return { kind: 'error', message: 'සංගුණක පූර්ණ සංඛ්යා, දශම හෝ සරල භාග විය යුතුයි.' };

  let A = Math.round(a0 * k), B = Math.round(b0 * k), C = Math.round(c0 * k);
  const pre: Step[] = [
    {
      title: 'සමීකරණය සම්මත ආකාරයට ලියමු',
      tex: [`${ratPoly([[q(A, k), 'x^{2}'], [q(B, k), 'x'], [q(C, k), '']])} = 0`],
    },
  ];
  if (k > 1) {
    pre.push({
      title: `භාග / දශම ඉවත් කිරීමට දෙපැත්තම ${k} න් ගුණ කරමු`,
      tex: [`${intPoly(A, B, C)} = 0`],
    });
  }

  // රේඛීය
  if (A === 0) {
    if (B === 0) {
      return {
        kind: 'error',
        message: C === 0 ? 'x ට ඕනෑම අගයක් සත්යයි (අනන්ත විසඳුම්).' : 'මේ සමීකරණයට විසඳුමක් නැහැ.',
      };
    }
    const r = q(-C, B);
    const steps: Step[] = [
      { title: 'රේඛීය සමීකරණයක්', tex: [`${ratPoly([[q(B), 'x'], [q(C), '']])} = 0`] },
      { title: 'නියත පදය දකුණට ගමු', tex: [`${ratPoly([[q(B), 'x']])} = ${-C}`] },
      { title: `දෙපැත්තම ${B} න් බෙදමු`, tex: [`x = ${qTex(r)}`] },
    ];
    return {
      kind: 'linear',
      pre,
      orig: { a: a0, b: b0, c: c0 },
      solution: { ok: true, steps, roots: [{ label: 'x', tex: qTex(r), value: qVal(r), exact: true }] },
    };
  }

  if (A < 0) {
    A = -A; B = -B; C = -C;
    pre.push({ title: 'x² හි සංගුණකය ධන කිරීමට දෙපැත්තම −1 න් ගුණ කරමු', tex: [`${intPoly(A, B, C)} = 0`] });
  }
  const g = gcd(gcd(A, B), C);
  if (g > 1) {
    A /= g; B /= g; C /= g;
    pre.push({ title: `පොදු සාධකය ${g} න් දෙපැත්තම බෙදමු`, tex: [`${intPoly(A, B, C)} = 0`] });
  }

  const eq: Quad = { a: A, b: B, c: C };
  return {
    kind: 'quadratic',
    pre,
    eq,
    orig: { a: a0, b: b0, c: c0 },
    methods: [
      { id: 'factor', name: 'සාධක වෙන් කිරීම', solution: factorSolution(eq) },
      { id: 'square', name: 'වර්ග සම්පූර්ණ කිරීම', solution: squareSolution(eq) },
      { id: 'formula', name: 'සූත්රය', solution: formulaSolution(eq) },
    ],
  };
}