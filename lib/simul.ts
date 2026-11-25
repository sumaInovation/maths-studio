// සමගාමී රේඛීය සමීකරණ (ax + by = c) පියවරෙන් පියවර විසඳන logic:
// ඉවත් කිරීමේ ක්‍රමය සහ ආදේශ ක්‍රමය.
import { compile, fraction, parse } from 'mathjs';
import { gcd, implicitify, near, normalize, par, q, qAbs, qMul, qSub, qTex, qVal, ratPoly, type Q, type Step } from './steps';

export type Eq = { a: number; b: number; k: number }; // a x + b y = k
export type SimulSolution = {
  status: 'unique' | 'none' | 'infinite';
  steps: Step[];
  answer?: { xTex: string; yTex: string; xv: number; yv: number };
  message?: string;
};
export type SimulMethodId = 'elim' | 'subst';
export type SimulResult =
  | { kind: 'error'; message: string }
  | {
      kind: 'ok';
      eqs: [Eq, Eq];
      pre: Step[];
      methods: { id: SimulMethodId; name: string; solution: SimulSolution }[];
    };

type Var = 'x' | 'y';
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
const eqTex = (e: Eq, label?: string) =>
  `${ratPoly([[q(e.a), 'x'], [q(e.b), 'y']])} = ${e.k}${label ? `\\qquad (${label})` : ''}`;

// c × (v)  ->  tex
const coefParen = (c: Q, v: Q) => {
  if (c.n === 0) return '';
  const val = `\\left(${qTex(v)}\\right)`;
  if (c.n === 1 && c.d === 1) return val;
  if (c.n === -1 && c.d === 1) return `-${val}`;
  return `${qTex(c)}${val}`;
};
// [coef, value] ලැයිස්තුව -> a(v1) + b(v2)
function sumParen(terms: [Q, Q][]): string {
  const parts: string[] = [];
  terms.forEach(([c, v]) => {
    if (c.n === 0) return;
    if (!parts.length) parts.push(coefParen(c, v));
    else parts.push((c.n < 0 ? '- ' : '+ ') + coefParen(qAbs(c), v));
  });
  return parts.length ? parts.join(' ') : '0';
}

// V හි සංගුණකය cV, W හි සංගුණකය cW (අගය Wv), දකුණු පැත්ත k  ->  V සොයමු
function backSub(cV: number, V: Var, cW: number, Wv: Q, k: number) {
  const known = qMul(q(cW), Wv);
  const lhs = ratPoly([[q(cV), V]]);
  const lines: string[] = [];
  if (cW !== 0) {
    const w = coefParen(q(Math.abs(cW)), Wv);
    lines.push(`${lhs} ${cW < 0 ? '-' : '+'} ${w} = ${k}`);
    lines.push(`${lhs} ${known.n < 0 ? '-' : '+'} ${qTex(qAbs(known))} = ${k}`);
  }
  const rhs = qSub(q(k), known);
  const val = q(rhs.n, rhs.d * cV);
  if (cV !== 1) lines.push(`${lhs} = ${qTex(rhs)}`);
  lines.push(`${V} = ${qTex(val)}`);
  return { lines, val };
}

// exact අගය Q බවට (mathjs Fraction හෝ number)
function toQ(v: any): Q | null {
  if (v && typeof v === 'object' && 'n' in v && 'd' in v && 's' in v) return q(Number(v.s) * Number(v.n), Number(v.d)); // mathjs Fraction වල s, n, d BigInt විය හැක
  if (typeof v === 'number' && Number.isFinite(v)) {
    for (let d = 1; d <= 1000; d++) if (near(v * d)) return q(Math.round(v * d), d);
  }
  return null;
}

// ළමයා type කරපු මුල් සමීකරණයටම x, y වෙනුවට අගයන් ආදේශ කරලා පෙන්වනවා
function verifyOriginal(src: string, xv: Q, yv: Q, label: string): string[] | null {
  try {
    const parts = normalize(src).split('=');
    if (parts.length !== 2) return null;
    const scope = { x: fraction(xv.n, xv.d), y: fraction(yv.n, yv.d) };
    const val: Record<string, string> = { x: qTex(xv), y: qTex(yv) };
    const handler = (node: any) =>
      node.type === 'SymbolNode' && (node.name === 'x' || node.name === 'y')
        ? `\\left(${val[node.name]}\\right)`
        : undefined;
    const side = (t: string) => implicitify(parse(t)).toTex({ implicit: 'hide', handler });
    const ev = (t: string) => toQ(parse(t).evaluate(scope));
    const L = ev(parts[0]), R = ev(parts[1]);
    if (!L || !R) return null;
    const ok = L.n === R.n && L.d === R.d;
    return [
      `(${label})\\;\\; ${side(parts[0])} = ${side(parts[1])}`,
      `${qTex(L)} = ${qTex(R)} \\;${ok ? '\\checkmark' : '\\times'}`,
    ];
  } catch {
    return null;
  }
}

function verifyStep(e1: Eq, e2: Eq, xv: Q, yv: Q, orig?: [string, string]): Step {
  const std = (e: Eq, label: string) => [
    `(${label})\\;\\; ${sumParen([[q(e.a), xv], [q(e.b), yv]])} = ${e.k} \\;\\checkmark`,
  ];
  const lines = [e1, e2].flatMap((e, i) => (orig && verifyOriginal(orig[i], xv, yv, String(i + 1))) || std(e, String(i + 1)));
  return {
    title: orig ? 'පිළිතුර මුල් සමීකරණ දෙකටම ආදේශ කර පරීක්ෂා කරමු' : 'පිළිතුර සමීකරණ දෙකටම ආදේශ කර පරීක්ෂා කරමු',
    tex: lines,
  };
}

function done(steps: Step[], xv: Q, yv: Q, e1: Eq, e2: Eq, orig?: [string, string]): SimulSolution {
  steps.push(verifyStep(e1, e2, xv, yv, orig));
  return {
    status: 'unique',
    steps,
    answer: { xTex: qTex(xv), yTex: qTex(yv), xv: qVal(xv), yv: qVal(yv) },
  };
}

const noSolution = (steps: Step[]): SimulSolution => ({
  status: 'none',
  steps,
  message: 'විසඳුමක් නැත. රේඛා දෙක සමාන්තරයි (ඡේදනය වන්නේ නැහැ).',
});
const infinite = (steps: Step[]): SimulSolution => ({
  status: 'infinite',
  steps,
  message: 'අනන්ත විසඳුම් ඇත. රේඛා දෙකම එකම රේඛාවයි (සමපාත වේ).',
});

// ----- සමීකරණයක් x හෝ y එකකට පමණක් සීමා වූ විට -----
function direct(e1: Eq, e2: Eq, steps: Step[], orig?: [string, string]): SimulSolution {
  const D = e1.a * e2.b - e2.a * e1.b;
  if (D === 0) {
    // එකම විචල්‍යයක් ඇති සමීකරණ දෙකක් (උදා: 2y = 4 සහ 3y = 9)
    const V: Var = e1.a === 0 && e2.a === 0 ? 'y' : 'x';
    const c1 = V === 'y' ? e1.b : e1.a, c2 = V === 'y' ? e2.b : e2.a;
    const v1 = q(e1.k, c1), v2 = q(e2.k, c2);
    steps.push({
      title: `සමීකරණ දෙකෙන්ම ${V} සොයමු`,
      tex: [`${V} = ${qTex(v1)}\\qquad (1)`, `${V} = ${qTex(v2)}\\qquad (2)`],
    });
    return v1.n === v2.n && v1.d === v2.d ? infinite(steps) : noSolution(steps);
  }
  // සරල සමීකරණය (එක් විචල්‍යයක් පමණක් ඇති) තෝරමු
  let src: 1 | 2, V: Var;
  if (e1.a === 0) { src = 1; V = 'y'; }
  else if (e1.b === 0) { src = 1; V = 'x'; }
  else if (e2.a === 0) { src = 2; V = 'y'; }
  else { src = 2; V = 'x'; }
  const s = src === 1 ? e1 : e2, o = src === 1 ? e2 : e1;
  const cs = V === 'y' ? s.b : s.a;
  const W: Var = V === 'x' ? 'y' : 'x';
  const val = q(s.k, cs);
  steps.push({
    title: `(${src}) සමීකරණයේ ${W} නැති නිසා ${V} කෙලින්ම සොයමු`,
    tex: [`${ratPoly([[q(cs), V]])} = ${s.k}`, `${V} = ${qTex(val)}`],
  });
  const cOV = W === 'x' ? o.a : o.b, cOW = V === 'x' ? o.a : o.b;
  const bs = backSub(cOV, W, cOW, val, o.k);
  steps.push({ title: `(${src === 1 ? 2 : 1}) ට ${V} = ${qTex(val)} ආදේශ කර ${W} සොයමු`, tex: bs.lines });
  const xv = V === 'x' ? val : bs.val, yv = V === 'y' ? val : bs.val;
  return done(steps, xv, yv, e1, e2, orig);
}

// ---------- ඉවත් කිරීමේ ක්‍රමය ----------
function elimination(e1: Eq, e2: Eq, orig?: [string, string]): SimulSolution {
  const steps: Step[] = [];
  const canX = e1.a !== 0 && e2.a !== 0, canY = e1.b !== 0 && e2.b !== 0;
  if (!canX && !canY) return direct(e1, e2, steps, orig);

  const Lx = canX ? lcm(Math.abs(e1.a), Math.abs(e2.a)) : Infinity;
  const Ly = canY ? lcm(Math.abs(e1.b), Math.abs(e2.b)) : Infinity;
  const V: Var = Lx <= Ly ? 'x' : 'y';
  const W: Var = V === 'x' ? 'y' : 'x';
  const c1 = V === 'x' ? e1.a : e1.b, c2 = V === 'x' ? e2.a : e2.b;
  const L = V === 'x' ? Lx : Ly;
  const m1 = L / Math.abs(c1), m2 = L / Math.abs(c2);
  const s1: Eq = { a: e1.a * m1, b: e1.b * m1, k: e1.k * m1 };
  const s2: Eq = { a: e2.a * m2, b: e2.b * m2, k: e2.k * m2 };
  const l1 = m1 !== 1 ? '3' : '1';
  const l2 = m2 !== 1 ? '4' : '2';

  const scaleLines: string[] = [];
  if (m1 !== 1) scaleLines.push(`(1) \\times ${m1}: \\quad ${eqTex(s1, '3')}`);
  if (m2 !== 1) scaleLines.push(`(2) \\times ${m2}: \\quad ${eqTex(s2, '4')}`);
  if (scaleLines.length) {
    steps.push({
      title: `${V} හි සංගුණක සමාන කිරීමට සමීකරණ ගුණ කරමු`,
      tex: scaleLines,
      note: `${V} ඉවත් කිරීමට ${V} හි සංගුණක සමාන (හෝ ප්‍රතිවිරුද්ධ) විය යුතුයි.`,
    });
  }

  const sameSign = c1 * m1 === c2 * m2;
  const sg = sameSign ? -1 : 1;
  const res: Eq = { a: s1.a + sg * s2.a, b: s1.b + sg * s2.b, k: s1.k + sg * s2.k };
  const Wc = W === 'x' ? res.a : res.b;
  steps.push({
    title: `(${l1}) ${sameSign ? '−' : '+'} (${l2}) : ${V} ඉවත් වෙයි`,
    tex: [
      `(${l1}) ${sameSign ? '-' : '+'} (${l2}):`,
      Wc === 0 ? `0 = ${res.k}` : `${ratPoly([[q(Wc), W]])} = ${res.k}`,
    ],
    note: sameSign ? `${V} හි සංගුණක සමාන නිසා සමීකරණ අඩු කරමු.` : `${V} හි සංගුණක ප්‍රතිවිරුද්ධ නිසා සමීකරණ එකතු කරමු.`,
  });

  if (Wc === 0) {
    steps.push({
      title: res.k === 0 ? '0 = 0 සත්‍යයි' : `0 = ${res.k} අසත්‍යයි`,
      tex: [res.k === 0 ? '0 = 0' : `0 \\neq ${res.k}`],
    });
    return res.k === 0 ? infinite(steps) : noSolution(steps);
  }

  const Wv = q(res.k, Wc);
  steps.push({ title: `${W} සොයමු`, tex: [`${W} = ${qTex(Wv)}`] });

  const cV = c1, cW = V === 'x' ? e1.b : e1.a;
  const bs = backSub(cV, V, cW, Wv, e1.k);
  steps.push({ title: `(1) ට ${W} = ${qTex(Wv)} ආදේශ කර ${V} සොයමු`, tex: bs.lines });
  const xv = V === 'x' ? bs.val : Wv, yv = V === 'y' ? bs.val : Wv;
  return done(steps, xv, yv, e1, e2, orig);
}

// ---------- ආදේශ ක්‍රමය ----------
function substitution(e1: Eq, e2: Eq, orig?: [string, string]): SimulSolution {
  const steps: Step[] = [];
  if ((e1.a === 0 || e1.b === 0 || e2.a === 0 || e2.b === 0) && !(e1.a !== 0 && e2.a !== 0) && !(e1.b !== 0 && e2.b !== 0)) {
    return direct(e1, e2, steps, orig);
  }

  type Cand = { e: 1 | 2; S: Var; s: number; t: number };
  const cands: Cand[] = [
    { e: 1, S: 'x', s: e1.a, t: e1.b },
    { e: 1, S: 'y', s: e1.b, t: e1.a },
    { e: 2, S: 'x', s: e2.a, t: e2.b },
    { e: 2, S: 'y', s: e2.b, t: e2.a },
  ].filter((c) => c.s !== 0 && c.t !== 0) as Cand[];
  const pick = cands.find((c) => Math.abs(c.s) === 1) ?? cands[0];
  if (!pick) return direct(e1, e2, steps, orig);

  const { e, S, s, t } = pick;
  const T: Var = S === 'x' ? 'y' : 'x';
  const src = e === 1 ? e1 : e2, oth = e === 1 ? e2 : e1;
  const o = e === 1 ? 2 : 1;
  const k = src.k;

  const exprS = ratPoly([[q(-t, s), T], [q(k, s), '']]);
  const isoLine = `${ratPoly([[q(s), S]])} = ${ratPoly([[q(-t), T], [q(k), '']])}`;
  const exprLine = `${S} = ${exprS}`;
  steps.push({
    title: `(${e}) සමීකරණයෙන් ${S} ප්‍රකාශ කරමු`,
    tex: isoLine === exprLine ? [exprLine] : [isoLine, exprLine],
  });

  const sO = S === 'x' ? oth.a : oth.b, tO = S === 'x' ? oth.b : oth.a;
  const pref = sO === 1 ? '' : sO === -1 ? '-' : `${sO}`;
  const tPart = tO === 0 ? '' : ` ${tO < 0 ? '-' : '+'} ${Math.abs(tO) === 1 ? '' : Math.abs(tO)}${T}`;
  steps.push({
    title: `(${o}) හි ${S} වෙනුවට ආදේශ කරමු`,
    tex: [`${pref}\\left(${exprS}\\right)${tPart} = ${oth.k}`],
  });

  const Tc = qSub(q(tO), qMul(q(sO), q(t, s)));
  const Cc = qMul(q(sO), q(k, s));
  const rhs = qSub(q(oth.k), Cc);
  steps.push({
    title: 'වරහන් ඉවත් කර සුළු කරමු',
    tex: [`${ratPoly([[Tc, T], [Cc, '']])} = ${oth.k}`, Tc.n === 0 ? `0 = ${qTex(rhs)}` : `${ratPoly([[Tc, T]])} = ${qTex(rhs)}`],
  });
  if (Tc.n === 0) {
    return rhs.n === 0 ? infinite(steps) : noSolution(steps);
  }
  const Tval = qMul(rhs, q(Tc.d, Tc.n)); // Tc = n/d  ->  T = rhs·d/n
  steps.push({ title: `${T} සොයමු`, tex: [`${T} = ${qTex(Tval)}`] });

  const coef = q(-t, s), cst = q(k, s);
  const termC = coef.n === 0 ? '' : coefParen(coef, Tval);
  const sub =
    coef.n === 0
      ? qTex(cst)
      : cst.n === 0
        ? termC
        : `${termC} ${cst.n < 0 ? '-' : '+'} ${qTex(qAbs(cst))}`;
  const Sval = q(coef.n * Tval.n * cst.d + cst.n * coef.d * Tval.d, coef.d * Tval.d * cst.d);
  steps.push({
    title: `${S} = ${exprS} ට ${T} = ${qTex(Tval)} ආදේශ කරමු`,
    tex: [`${S} = ${sub}`, `${S} = ${qTex(Sval)}`],
  });
  const xv = S === 'x' ? Sval : Tval, yv = S === 'y' ? Sval : Tval;
  return done(steps, xv, yv, e1, e2, orig);
}

// ax + by = k  ->  y = ...  (Graph tab එකට). සිරස් රේඛාවක් (b = 0) නම් null.
export function lineExpr(e: Eq): string | null {
  if (e.b === 0) return null;
  const parts: string[] = [];
  const add = (r: Q, v: string) => {
    if (r.n === 0) return;
    const abs = qAbs(r);
    const num = abs.d === 1 ? `${abs.n}` : `(${abs.n}/${abs.d})`;
    const body = v === '' ? num : abs.n === 1 && abs.d === 1 ? v : abs.d === 1 ? `${num}${v}` : `${num}*${v}`;
    if (!parts.length) parts.push(r.n < 0 ? `-${body}` : body);
    else parts.push(`${r.n < 0 ? '-' : '+'} ${body}`);
  };
  add(q(-e.a, e.b), 'x');
  add(q(e.k, e.b), '');
  return parts.length ? parts.join(' ') : '0';
}

// ---------- ආදානය parse කිරීම ----------
function parseEq(src: string): { eq: Eq; scaled: number } | string {
  const s = normalize(src).trim();
  if (!s) return 'සමීකරණ දෙකම ලියන්න.';
  const parts = s.split('=');
  if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) return `"${src}" හි "=" ලකුණ නිවැරදි නැහැ.`;
  let f: (x: number, y: number) => number;
  try {
    const code = compile(`(${parts[0]}) - (${parts[1]})`);
    f = (x, y) => {
      const v = code.evaluate({ x, y });
      if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('bad');
      return v;
    };
    f(0, 0);
  } catch {
    return 'x සහ y පමණක් භාවිතා කරලා හරියට ලියන්න (උදා: 2x + y = 7).';
  }
  const f0 = f(0, 0), a0 = f(1, 0) - f0, b0 = f(0, 1) - f0, k0 = -f0;
  for (const [X, Y] of [[2, 3], [-1, 2], [3, -2]]) {
    const want = f0 + a0 * X + b0 * Y;
    if (Math.abs(f(X, Y) - want) > 1e-7 * (1 + Math.abs(want))) {
      return 'සමීකරණ රේඛීය විය යුතුයි (x², xy වැනි පද නොතිබිය යුතුයි).';
    }
  }
  if (Math.abs(a0) < 1e-12 && Math.abs(b0) < 1e-12) return 'සමීකරණයේ x හෝ y අඩංගු විය යුතුයි.';
  let t = 0;
  for (let i = 1; i <= 1000; i++) {
    if (near(a0 * i) && near(b0 * i) && near(k0 * i)) { t = i; break; }
  }
  if (!t) return 'සංගුණක පූර්ණ සංඛ්‍යා, දශම හෝ සරල භාග විය යුතුයි.';
  return { eq: { a: Math.round(a0 * t), b: Math.round(b0 * t), k: Math.round(k0 * t) }, scaled: t };
}

export function solveSimultaneous(s1: string, s2: string): SimulResult {
  const p1 = parseEq(s1), p2 = parseEq(s2);
  if (typeof p1 === 'string') return { kind: 'error', message: p1 };
  if (typeof p2 === 'string') return { kind: 'error', message: p2 };
  let e1 = p1.eq, e2 = p2.eq;

  // සංගුණක වල පොදු සාධකය ඉවත් කරමු (වඩා සරල සංඛ්‍යා)
  const reduce = (e: Eq): Eq => {
    const g = gcd(gcd(e.a, e.b), e.k) || 1;
    return { a: e.a / g, b: e.b / g, k: e.k / g };
  };
  const r1 = reduce(e1), r2 = reduce(e2);
  const changed = r1.a !== e1.a || r1.b !== e1.b || r1.k !== e1.k || r2.a !== e2.a || r2.b !== e2.b || r2.k !== e2.k;
  const note =
    p1.scaled > 1 || p2.scaled > 1
      ? 'භාග / දශම ඉවත් කිරීමට සමීකරණ ගුණ කර ඇත.'
      : undefined;
  e1 = r1;
  e2 = r2;

  const pre: Step[] = [
    {
      title: 'සමීකරණ දෙක සම්මත ආකාරයට ලියමු (ax + by = c)',
      tex: [eqTex(e1, '1'), eqTex(e2, '2')],
      note: note ?? (changed ? 'පොදු සාධක බෙදා සරල කර ඇත.' : undefined),
    },
  ];

  return {
    kind: 'ok',
    eqs: [e1, e2],
    pre,
    methods: [
      { id: 'elim', name: 'ඉවත් කිරීමේ ක්‍රමය', solution: elimination(e1, e2, [s1, s2]) },
      { id: 'subst', name: 'ආදේශ ක්‍රමය', solution: substitution(e1, e2, [s1, s2]) },
    ],
  };
}