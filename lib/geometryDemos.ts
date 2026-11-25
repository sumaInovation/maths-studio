// O/L ජ්‍යාමිතිය - JSXGraph demos
// ⚠️ theorem = පොතේ වචනවලින්ම. hint = ගුරුවරයාගේ පැහැදිලි කිරීම පමණයි, exam එකට ලියන්න එපා.
// AUDIT: පහත source එකේ "PDF: ..." කියලා තියෙන්නේ මම මේ PDF එකේම බැලුවා කියන එක.
// "10 ශ්‍රේණිය" කියලා තියෙන්නේ මේ PDF 3ක නැති, 10 ශ්‍රේණිය පොතේ තියෙන ඒවා - photo එකක් එව්වොත් ඒකත් check කරලා දෙන්නම්.

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Ctx = ReturnType<typeof makeCtx>;
export type Demo = { id: string; group: string; title: string; theorem: string; hint: string; source?: string; build: (c: Ctx) => void; };
const COL = { blue: '#2563eb', green: '#16a34a', orange: '#ea580c', red: '#dc2626', purple: '#7c3aed', dark: '#111827', grey: '#64748b', teal: '#0d9488' };
const RAD = 180 / Math.PI;
const dir = (V: any, P: any) => Math.atan2(P.Y() - V.Y(), P.X() - V.X());
const delta = (V: any, P1: any, P2: any) => { let d = dir(V, P2) - dir(V, P1); while (d > Math.PI) d -= 2 * Math.PI; while (d <= -Math.PI) d += 2 * Math.PI; return d; };
export const deg = (V: any, P1: any, P2: any) => Math.abs(delta(V, P1, P2)) * RAD;
export const dist = (P: any, Q: any) => Math.hypot(P.X() - Q.X(), P.Y() - Q.Y());
export const f1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);
const side = (A: any, B: any, P: any) => Math.sign((B.X() - A.X()) * (P.Y() - A.Y()) - (B.Y() - A.Y()) * (P.X() - A.X()));
export function makeCtx(board: any) {
  const bb = board.getBoundingBox(); let infoN = 0;
  const pt = (x: any, y: any, name: string, o: any = {}) => board.create('point', [x, y], { name, size: 6, strokeColor: '#1e3a8a', fillColor: COL.blue, showInfobox: false, label: { fontSize: 22, offset: [10, 10] }, ...o });
  const dep = (fx: () => number, fy: () => number, name = '', o: any = {}) => board.create('point', [fx, fy], { name, size: 4, fixed: true, showInfobox: false, strokeColor: COL.grey, fillColor: '#94a3b8', label: { fontSize: 22, offset: [10, 10] }, ...o });
  const seg = (A: any, B: any, color = COL.dark, o: any = {}) => board.create('segment', [A, B], { strokeColor: color, strokeWidth: 3, fixed: true, highlight: false, ...o });
  const ang = (V: any, P1: any, P2: any, r: number, color: string, txt: () => string, reflex?: () => boolean) => {
    const d = () => { const x = delta(V, P1, P2); return reflex && reflex() ? x - (x >= 0 ? 1 : -1) * 2 * Math.PI : x; };
    board.create('curve', [(t: number) => V.X() + r * Math.cos(dir(V, P1) + d() * t), (t: number) => V.Y() + r * Math.sin(dir(V, P1) + d() * t), 0, 1], { strokeColor: color, strokeWidth: 4, highlight: false, fixed: true });
    const mid = () => dir(V, P1) + d() / 2;
    board.create('text', [() => V.X() + (r + 0.9) * Math.cos(mid()), () => V.Y() + (r + 0.9) * Math.sin(mid()), txt], { fontSize: 19, strokeColor: color, anchorX: 'middle', anchorY: 'middle', fixed: true, parse: false, highlight: false });
  };
  const info = (fn: () => string, color = COL.dark) => { const i = infoN++; return board.create('text', [bb[0] + 0.5, bb[1] - 0.8 - i * 1.15, fn], { fontSize: 22, strokeColor: color, fixed: true, anchorX: 'left', anchorY: 'top', parse: false, highlight: false }); };
  const square = (P: any, Q: any, color: string, txt?: () => string) => {
    const corners = () => { const vx = Q.X() - P.X(), vy = Q.Y() - P.Y(); const nx = -vy, ny = vx; return [[P.X(), P.Y()], [Q.X(), Q.Y()], [Q.X() + nx, Q.Y() + ny], [P.X() + nx, P.Y() + ny]]; };
    const sq = board.create('curve', [[], []], { strokeColor: color, strokeWidth: 2, fillColor: color, fillOpacity: 0.25, fixed: true, highlight: false });
    sq.updateDataArray = function () { const c = corners(); this.dataX = [...c.map((p) => p[0]), c[0][0]]; this.dataY = [...c.map((p) => p[1]), c[0][1]]; };
    if (txt) { board.create('text', [() => { const c = corners(); return (c[0][0] + c[2][0]) / 2; }, () => { const c = corners(); return (c[0][1] + c[2][1]) / 2; }, txt], { fontSize: 20, strokeColor: color, anchorX: 'middle', anchorY: 'middle', fixed: true, parse: false, highlight: false }); }
    return sq;
  };
  const polyArea = (...pts: any[]) => { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a.X() * b.Y() - b.X() * a.Y(); } return Math.abs(s) / 2; };
  const fillPoly = (pts: any[], color: string, opacity = 0.18) => board.create('polygon', pts, { fillColor: color, fillOpacity: opacity, borders: { strokeWidth: 0 }, fixed: true, highlight: false, vertices: { visible: false } });
  const circle = (O: any, r: number) => board.create('circle', [O, r], { strokeColor: COL.dark, strokeWidth: 3, fixed: true, highlight: false });
  const onCircle = (circ: any, O: any, r: number, a: number, name: string, o: any = {}) => board.create('glider', [O.X() + r * Math.cos((a * Math.PI) / 180), O.Y() + r * Math.sin((a * Math.PI) / 180), circ], { name, size: 6, strokeColor: '#1e3a8a', fillColor: COL.blue, showInfobox: false, label: { fontSize: 22, offset: [10, 10] }, ...o });
  return { board, bb, pt, dep, seg, ang, info, square, circle, onCircle, polyArea, fillPoly };
}
const parallel = (kind: 'corr' | 'alt' | 'co') => (c: Ctx) => {
  const { board, pt, dep, ang, info } = c; const y1 = 2.5, y2 = -2.5;
  const l1 = board.create('line', [[-30, y1], [30, y1]], { strokeColor: COL.dark, strokeWidth: 3, fixed: true, highlight: false });
  const l2 = board.create('line', [[-30, y2], [30, y2]], { strokeColor: COL.dark, strokeWidth: 3, fixed: true, highlight: false });
  const X = board.create('glider', [-2, y1, l1], { name: 'P', size: 6, fillColor: COL.blue, strokeColor: '#1e3a8a', showInfobox: false, label: { fontSize: 22, offset: [10, 10] } });
  const Y = board.create('glider', [3, y2, l2], { name: 'Q', size: 6, fillColor: COL.blue, strokeColor: '#1e3a8a', showInfobox: false, label: { fontSize: 22, offset: [10, -20] } });
  board.create('line', [X, Y], { strokeColor: COL.purple, strokeWidth: 3, fixed: true, highlight: false }); void pt;
  const d = () => dist(X, Y) || 1;
  const XR = dep(() => X.X() + 3, () => y1, '', { visible: false }); const YR = dep(() => Y.X() + 3, () => y2, '', { visible: false });
  const YL = dep(() => Y.X() - 3, () => y2, '', { visible: false });
  const XU = dep(() => X.X() + (3 * (X.X() - Y.X())) / d(), () => X.Y() + (3 * (X.Y() - Y.Y())) / d(), '', { visible: false });
  let a1: () => number, a2: () => number;
  if (kind === 'corr') { ang(X, XU, XR, 1.1, COL.blue, () => `${f1(deg(X, XU, XR))}°`); ang(Y, X, YR, 1.1, COL.orange, () => `${f1(deg(Y, X, YR))}°`); a1 = () => deg(X, XU, XR); a2 = () => deg(Y, X, YR); info(() => `∠1 = ${f1(a1())}°`, COL.blue); info(() => `∠2 = ${f1(a2())}°`, COL.orange); info(() => `∠1 = ∠2  (අනුරූප කෝණ සමානයි)`); }
  else if (kind === 'alt') { ang(X, Y, XR, 1.1, COL.blue, () => `${f1(deg(X, Y, XR))}°`); ang(Y, X, YL, 1.1, COL.orange, () => `${f1(deg(Y, X, YL))}°`); a1 = () => deg(X, Y, XR); a2 = () => deg(Y, X, YL); info(() => `∠1 = ${f1(a1())}°`, COL.blue); info(() => `∠2 = ${f1(a2())}°`, COL.orange); info(() => `∠1 = ∠2  (ඒකාන්තර කෝණ සමානයි)`); }
  else { ang(X, Y, XR, 1.1, COL.blue, () => `${f1(deg(X, Y, XR))}°`); ang(Y, X, YR, 1.1, COL.orange, () => `${f1(deg(Y, X, YR))}°`); a1 = () => deg(X, Y, XR); a2 = () => deg(Y, X, YR); info(() => `∠1 = ${f1(a1())}°`, COL.blue); info(() => `∠2 = ${f1(a2())}°`, COL.orange); info(() => `∠1 + ∠2 = ${f1(a1() + a2())}°  (= සෘජුකෝණ දෙකකි)`); }
};
const parallelogram = (c: Ctx, buildFn: (pts: any) => void) => {
  const A = c.pt(-5, -2, 'A'); const B = c.pt(3, -2, 'B'); const D = c.pt(-3, 3, 'D');
  const C = c.dep(() => B.X() + D.X() - A.X(), () => B.Y() + D.Y() - A.Y(), 'C');
  c.seg(A, B); c.seg(B, C); c.seg(C, D); c.seg(D, A); buildFn({ A, B, C, D });
};
export const DEMOS: Demo[] = [
  { id: 'tri-sum', group: 'ත්‍රිකෝණ', title: 'අභ්‍යන්තර කෝණ එකතුව',
    theorem: 'ත්‍රිකෝණයක අභ්‍යන්තර කෝණ තුනේ එකතුව සෘජුකෝණ දෙකකි.',
    hint: 'A, B, C ඇදලා බලන්න. කෝණ වෙනස් වුණත් එකතුව සෘජුකෝණ දෙකක් ම යි.',
    source: '10 ශ්‍රේණිය - PDF 3ක නැත.',
    build: (c) => { const A = c.pt(-6, -3, 'A'), B = c.pt(5, -3, 'B'), C = c.pt(-1, 5, 'C'); c.seg(A, B); c.seg(B, C); c.seg(C, A); const a = () => deg(A, B, C), b = () => deg(B, C, A), g = () => deg(C, A, B); c.ang(A, B, C, 1.2, COL.blue, () => `${f1(a())}°`); c.ang(B, C, A, 1.2, COL.green, () => `${f1(b())}°`); c.ang(C, A, B, 1.2, COL.orange, () => `${f1(g())}°`); c.info(() => `∠A = ${f1(a())}°`, COL.blue); c.info(() => `∠B = ${f1(b())}°`, COL.green); c.info(() => `∠C = ${f1(g())}°`, COL.orange); c.info(() => `∠A + ∠B + ∠C = ${f1(a() + b() + g())}°`); },
  },
  { id: 'tri-ext', group: 'ත්‍රිකෝණ', title: 'බාහිර කෝණය',
    theorem: 'ත්‍රිකෝණයක බාහිර කෝණය, අභ්‍යන්තර සම්මුඛ කෝණ දෙකේ එකතුවට සමාන වේ.',
    hint: '∠ACD සහ ∠A + ∠B සසඳන්න.',
    source: '10 ශ්‍රේණිය - මේ PDF 3ක නැත.',
    build: (c) => { const A = c.pt(1, 5, 'A'), B = c.pt(-6, -3, 'B'), C = c.pt(3, -3, 'C'); const D = c.dep(() => C.X() + (4 * (C.X() - B.X())) / (dist(B, C) || 1), () => C.Y() + (4 * (C.Y() - B.Y())) / (dist(B, C) || 1), 'D'); c.seg(A, B); c.seg(B, C); c.seg(C, A); c.seg(C, D, COL.dark, { dash: 2 }); const ext = () => deg(C, A, D), a = () => deg(A, B, C), b = () => deg(B, A, C); c.ang(C, A, D, 1.2, COL.red, () => `${f1(ext())}°`); c.ang(A, B, C, 1.2, COL.blue, () => `${f1(a())}°`); c.ang(B, A, C, 1.2, COL.green, () => `${f1(b())}°`); c.info(() => `∠ACD (බාහිර) = ${f1(ext())}°`, COL.red); c.info(() => `∠A = ${f1(a())}°`, COL.blue); c.info(() => `∠B = ${f1(b())}°`, COL.green); c.info(() => `∠A + ∠B = ${f1(a() + b())}°`); },
  },
  { id: 'tri-iso', group: 'ත්‍රිකෝණ', title: 'සමද්විපාද ත්‍රිකෝණය',
    theorem: 'සමද්විපාද ත්‍රිකෝණයක පාද කෝණ සමාන වේ.',
    hint: 'A හෝ B ඇදලා බලන්න. AB = AC ලෙස C හැසිරෙනවා.',
    source: '10 ශ්‍රේණිය - මේ PDF 3ක නැත.',
    build: (c) => { const A = c.pt(0, 5, 'A'), B = c.pt(-4, -3, 'B'); const C = c.dep(() => 2 * A.X() - B.X(), () => B.Y(), 'C'); c.seg(A, B); c.seg(B, C); c.seg(C, A); const b = () => deg(B, A, C), cc = () => deg(C, B, A); c.ang(B, A, C, 1.2, COL.blue, () => `${f1(b())}°`); c.ang(C, B, A, 1.2, COL.green, () => `${f1(cc())}°`); c.info(() => `AB = ${f1(dist(A, B))}    AC = ${f1(dist(A, C))}`); c.info(() => `∠B = ${f1(b())}°`, COL.blue); c.info(() => `∠C = ${f1(cc())}°`, COL.green); },
  },
  { id: 'tri-midpoint', group: 'ත්‍රිකෝණ', title: 'මධ්‍ය ලක්ෂ්‍ය ප්‍රමේයය',
    theorem: 'ත්‍රිකෝණයේ පාද දෙකක මධ්‍ය ලක්ෂ්‍ය යා කරන රේඛාව ත්‍රිකෝණයේ තුන්වන පාදයට සමාන්තර වන අතර, දිගින් එම පාදයෙන් අඩක් වේ.',
    hint: 'AP = BP සහ AQ = QC නම් PQ // BC සහ PQ = BC / 2 වේ.',
    source: 'PDF: උඹ එවපු screenshot එකේ වචනවලින්ම',
    build: (c) => { const A = c.pt(-1, 5, 'A'), B = c.pt(-6, -3, 'B'), C = c.pt(5, -3, 'C'); const P = c.dep(() => (A.X() + B.X()) / 2, () => (A.Y() + B.Y()) / 2, 'P'); const Q = c.dep(() => (A.X() + C.X()) / 2, () => (A.Y() + C.Y()) / 2, 'Q'); c.seg(A, B); c.seg(B, C); c.seg(C, A); c.seg(P, Q, COL.red); c.info(() => `AP = ${f1(dist(A, P))}   PB = ${f1(dist(P, B))}`, COL.blue); c.info(() => `AQ = ${f1(dist(A, Q))}   QC = ${f1(dist(Q, C))}`, COL.green); c.info(() => `PQ = ${f1(dist(P, Q))}   BC / 2 = ${f1(dist(B, C) / 2)}`, COL.red); c.info(() => `PQ // BC  සහ  PQ = BC / 2`); },
  },
  { id: 'pyth', group: 'ත්‍රිකෝණ', title: 'පයිතගරස් ප්‍රමේයය',
    theorem: 'සෘජුකෝණී ත්‍රිකෝණයක කර්ණය මත අඳින ලද සමචතුරස්‍රයේ වර්ගඵලය, සෘජුකෝණය අඩංගු ඉතිරි පැති මත අඳින ලද සමචතුරස්‍රවල වර්ගඵලවල එකතුවට සමාන වේ.',
    hint: 'A සහ B ඇදලා බලන්න. සමචතුරස්‍ර තුනේ වර්ගඵල සසඳන්න.',
    source: 'PDF: III කොටස, 11 පිටුව - "පයිතගරස් ප්‍රමේයය" කොටුව',
    build: (c) => { const { board } = c; const Cc = c.pt(-3, -2, 'C', { fixed: true, fillColor: COL.grey }); const hl = board.create('line', [[-3, -2], [0, -2]], { visible: false }); const vl = board.create('line', [[-3, -2], [-3, 0]], { visible: false }); const B = board.create('glider', [2, -2, hl], { name: 'B', size: 6, fillColor: COL.blue, strokeColor: '#1e3a8a', showInfobox: false, label: { fontSize: 22, offset: [10, -20] } }); const A = board.create('glider', [-3, 2, vl], { name: 'A', size: 6, fillColor: COL.blue, strokeColor: '#1e3a8a', showInfobox: false, label: { fontSize: 22, offset: [-25, 10] } }); c.seg(Cc, B); c.seg(Cc, A); c.seg(A, B); const a2 = () => dist(Cc, B) ** 2, b2 = () => dist(Cc, A) ** 2, c2 = () => dist(A, B) ** 2; c.square(B, Cc, COL.blue, () => `BC² = ${f1(a2())}`); c.square(Cc, A, COL.green, () => `AC² = ${f1(b2())}`); c.square(A, B, COL.orange, () => `AB² = ${f1(c2())}`); c.info(() => `∠C = 90°`); c.info(() => `BC² + AC² = ${f1(a2())} + ${f1(b2())} = ${f1(a2() + b2())}`); c.info(() => `AB² = ${f1(c2())}`); },
  },
  { id: 'tri-thales', group: 'ත්‍රිකෝණ', title: 'තේල්ස් ප්‍රමේයය (සමානුපාතික බෙදීම)',
    theorem: 'ත්‍රිකෝණයක එක් පාදයකට සමාන්තර ව අඳින ලද සරල රේඛාවක් එහි ඉතිරි පාද දෙක සමානුපාතික ව බෙදයි.',
    hint: 'PQ රේඛාව BC ට සමාන්තරව තියාගෙන P ඇදලා බලන්න. AP / PB = AQ / QC ද?',
    source: 'PDF: II කොටස, 78 පිටුව - "ප්‍රමේයය" කොටුව',
    build: (c) => { const A = c.pt(-1, 5, 'A'), B = c.pt(-6, -3, 'B'), C = c.pt(5, -3, 'C'); const t = 0.45; const P = c.dep(() => A.X() + t * (B.X() - A.X()), () => A.Y() + t * (B.Y() - A.Y()), 'P'); const Q = c.dep(() => A.X() + t * (C.X() - A.X()), () => A.Y() + t * (C.Y() - A.Y()), 'Q'); c.seg(A, B); c.seg(B, C); c.seg(C, A); c.seg(P, Q, COL.red); c.info(() => `AP / PB = ${f1(dist(A, P) / (dist(P, B) || 1))}`, COL.blue); c.info(() => `AQ / QC = ${f1(dist(A, Q) / (dist(Q, C) || 1))}`, COL.green); c.info(() => `PQ // BC`); },
  },
  { id: 'tri-similar-aaa', group: 'ත්‍රිකෝණ', title: 'සමකෝණික ත්‍රිකෝණ (AAA)',
    theorem: 'ත්‍රිකෝණ දෙකක අනුරූප කෝණ සමාන නම්, එම ත්‍රිකෝණ දෙක සමකෝණික වේ.',
    hint: 'කෝණ සමාන නම් පැති සමානුපාතික වෙනවා. "සමාන" නෙවෙයි, "සමකෝණික" කියලා ලියන්න.',
    source: 'PDF: II කොටස, 81 පිටුව - "ප්‍රමේයය" කොටුව',
    build: (c) => { const A = c.pt(-6, -3, 'A'), B = c.pt(-1, -3, 'B'), Cc = c.pt(-4, 3, 'C'); const k = 1.6; const D = c.dep(() => A.X() + 9, () => A.Y(), 'D'); const E = c.dep(() => D.X() + k * (B.X() - A.X()), () => D.Y(), 'E'); const F = c.dep(() => D.X() + k * (Cc.X() - A.X()), () => D.Y() + k * (Cc.Y() - A.Y()), 'F'); c.seg(A, B); c.seg(B, Cc); c.seg(Cc, A); c.seg(D, E, COL.orange); c.seg(E, F, COL.orange); c.seg(F, D, COL.orange); c.info(() => `DE ÷ AB = ${f1(dist(D, E) / (dist(A, B) || 1))}`, COL.blue); c.info(() => `DF ÷ AC = ${f1(dist(D, F) / (dist(A, Cc) || 1))}`, COL.orange); c.info(() => `∠A = ∠D = ${f1(deg(A, B, Cc))}°`); },
  },
  { id: 'tri-similar-sides', group: 'ත්‍රිකෝණ', title: 'සමකෝණික ත්‍රිකෝණ (පැති)',
    theorem: 'ත්‍රිකෝණ දෙකක අනුරූප පැති සමානුපාතික නම්, එම ත්‍රිකෝණ දෙක සමකෝණික වේ.',
    hint: 'පැති අනුපාත තුනම සමාන නම්, කෝණත් සමාන වෙනවා.',
    source: 'PDF: II කොටස, 82-83 පිටු - "ප්‍රමේයය" කොටුව',
    build: (c) => { const A = c.pt(-6, -3, 'A'), B = c.pt(-1, -3, 'B'), Cc = c.pt(-4, 3, 'C'); const k = 1.6; const D = c.dep(() => A.X() + 9, () => A.Y(), 'D'); const E = c.dep(() => D.X() + k * (B.X() - A.X()), () => D.Y(), 'E'); const F = c.dep(() => D.X() + k * (Cc.X() - A.X()), () => D.Y() + k * (Cc.Y() - A.Y()), 'F'); c.seg(A, B); c.seg(B, Cc); c.seg(Cc, A); c.seg(D, E, COL.orange); c.seg(E, F, COL.orange); c.seg(F, D, COL.orange); c.info(() => `DE ÷ AB = ${f1(dist(D, E) / (dist(A, B) || 1))}`, COL.blue); c.info(() => `EF ÷ BC = ${f1(dist(E, F) / (dist(B, Cc) || 1))}`, COL.green); c.info(() => `DF ÷ AC = ${f1(dist(D, F) / (dist(A, Cc) || 1))}`, COL.orange); },
  },
  { id: 'par-corr', group: 'සමාන්තර රේඛා', title: 'අනුරූප කෝණ',
    theorem: 'සමාන්තර රේඛා දෙකක් තීර්යක් රේඛාවකින් ඡේදනය කළ විට අනුරූප කෝණ සමාන වේ.',
    hint: 'P සහ Q ඇදන්න. ∠1 සහ ∠2 සසඳන්න.', source: '10 ශ්‍රේණිය - මේ PDF 3ක නැත.', build: parallel('corr') },
  { id: 'par-alt', group: 'සමාන්තර රේඛා', title: 'ඒකාන්තර කෝණ',
    theorem: 'සමාන්තර රේඛා දෙකක් තීර්යක් රේඛාවකින් ඡේදනය කළ විට ඒකාන්තර කෝණ සමාන වේ.',
    hint: 'P සහ Q ඇදන්න. Z හැඩයේ කෝණ දෙක සමානද?', source: '10 ශ්‍රේණිය - මේ PDF 3ක නැත.', build: parallel('alt') },
  { id: 'par-co', group: 'සමාන්තර රේඛා', title: 'ඒකපාර්ශ්වික කෝණ',
    theorem: 'සමාන්තර රේඛා දෙකක් තීර්යක් රේඛාවකින් ඡේදනය කළ විට ඒකපාර්ශ්වික කෝණවල එකතුව සෘජුකෝණ දෙකකි.',
    hint: 'P සහ Q ඇදන්න. ∠1 + ∠2 බලන්න.', source: '10 ශ්‍රේණිය - මේ PDF 3ක නැත.', build: parallel('co') },
  { id: 'para-opp', group: 'සමාන්තරාස්‍ර', title: 'සම්මුඛ පැති / කෝණ සමානයි',
    theorem: 'සමාන්තරාස්‍රයක සම්මුඛ පැති සමාන වේ. සමාන්තරාස්‍රයක සම්මුඛ කෝණ සමාන වේ.',
    hint: 'A, B, D ඇදලා බලන්න. AB = CD ද? ∠A = ∠C ද?',
    source: 'PDF: II කොටස, 84-85 පිටු',
    build: (c) => parallelogram(c, ({ A, B, C, D }) => { c.info(() => `AB = ${f1(dist(A, B))}   CD = ${f1(dist(C, D))}`, COL.blue); c.info(() => `AD = ${f1(dist(A, D))}   BC = ${f1(dist(B, C))}`, COL.green); c.info(() => `∠A = ${f1(deg(A, B, D))}°   ∠C = ${f1(deg(C, B, D))}°`, COL.orange); }),
  },
  { id: 'para-diag', group: 'සමාන්තරාස්‍ර', title: 'විකර්ණ එකිනෙක දෙකොටස් කරයි',
    theorem: 'සමාන්තරාස්‍රයක විකර්ණ දෙක එකිනෙක දෙකොටස් කරයි.',
    hint: 'A, B, D ඇදලා බලන්න. AO = OC ද? BO = OD ද?',
    source: 'PDF: II කොටස, 86 පිටුව - "ප්‍රමේයය" කොටුව',
    build: (c) => parallelogram(c, ({ A, B, C, D }) => { const O = c.dep(() => (A.X() + C.X()) / 2, () => (A.Y() + C.Y()) / 2, 'O'); c.seg(A, C, COL.purple, { dash: 2 }); c.seg(B, D, COL.purple, { dash: 2 }); c.info(() => `AO = ${f1(dist(A, O))}   OC = ${f1(dist(O, C))}`, COL.blue); c.info(() => `BO = ${f1(dist(B, O))}   OD = ${f1(dist(O, D))}`, COL.green); }),
  },
  { id: 'para-rhombus', group: 'සමාන්තරාස්‍ර', title: 'රොම්බසය - විකර්ණ ලම්බකයි',
    theorem: 'රොම්බසයක විකර්ණ දෙක ලම්බකව දෙකොටස් වේ.',
    hint: 'AB = AD වෙන විදියට D ඇදලා බලන්න. එතකොට විකර්ණ අතර කෝණය 90° ද?',
    source: 'PDF: II කොටස, 87-88 පිටු',
    build: (c) => { const A = c.pt(-4, -2, 'A'), B = c.pt(2, -2, 'B'); const D = c.pt(-1, 3, 'D'); const C = c.dep(() => B.X() + D.X() - A.X(), () => B.Y() + D.Y() - A.Y(), 'C'); c.seg(A, B); c.seg(B, C); c.seg(C, D); c.seg(D, A); const O = c.dep(() => (A.X() + C.X()) / 2, () => (A.Y() + C.Y()) / 2, 'O'); c.seg(A, C, COL.purple, { dash: 2 }); c.seg(B, D, COL.purple, { dash: 2 }); c.info(() => `AB = ${f1(dist(A, B))}  BC = ${f1(dist(B, C))}  CD = ${f1(dist(C, D))}  DA = ${f1(dist(D, A))}`); c.info(() => `∠AOB = ${f1(deg(O, A, B))}°`, COL.red); },
  },
  { id: 'area-same-base', group: 'වර්ගඵල', title: 'එකම පාදය - එකම සමාන්තර යුගලය',
    theorem: 'එකම පාදයක් සහ එකම සමාන්තර රේඛා යුගලයක් අතර ඇති ත්‍රිකෝණ දෙකක වර්ගඵල සමාන වේ.',
    hint: 'A ඉහළ රේඛාව දිගේ ඇදන්න. වර්ගඵලය වෙනස් නොවේ.',
    source: 'PDF: I කොටස, 91 පිටුව',
    build: (c) => { const { board } = c; const B = c.pt(-5, -2, 'B'), Cc = c.pt(5, -2, 'C'); const top = board.create('line', [[-8, 3], [8, 3]], { strokeColor: COL.grey, strokeWidth: 2, dash: 2, fixed: true, highlight: false }); const A = board.create('glider', [-2, 3, top], { name: 'A', size: 6, fillColor: COL.blue, strokeColor: '#1e3a8a', showInfobox: false, label: { fontSize: 22, offset: [10, 10] } }); const D = board.create('glider', [3, 3, top], { name: 'D', size: 6, fillColor: COL.orange, strokeColor: '#9a3412', showInfobox: false, label: { fontSize: 22, offset: [10, 10] } }); c.seg(B, Cc); c.seg(A, B); c.seg(A, Cc); c.seg(D, B, COL.orange); c.seg(D, Cc, COL.orange); c.fillPoly([A, B, Cc], COL.blue); c.fillPoly([D, B, Cc], COL.orange, 0.12); c.info(() => `△ABC වර්ගඵලය = ${f1(c.polyArea(A, B, Cc))}`, COL.blue); c.info(() => `△DBC වර්ගඵලය = ${f1(c.polyArea(D, B, Cc))}`, COL.orange); },
  },
  { id: 'area-para-tri', group: 'වර්ගඵල', title: 'සමාන්තරාස්‍රය = ත්‍රිකෝණය × 2',
    theorem: 'එකම පාදයක් සහ එකම සමාන්තර රේඛා යුගලයක් අතර ඇති සමාන්තරාස්‍රයක වර්ගඵලය, එම පාදය ඇති ත්‍රිකෝණයක වර්ගඵලය මෙන් දෙගුණයකි.',
    hint: 'A, B, D ඇදලා බලන්න. අනුපාතය 2 ද?',
    source: 'PDF: I කොටස, 91 පිටුව',
    build: (c) => parallelogram(c, ({ A, B, C, D }) => { c.fillPoly([A, B, C, D], COL.blue); const tri = () => c.polyArea(A, B, C); const par = () => c.polyArea(A, B, C, D); c.info(() => `සමාන්තරාස්‍රය ABCD = ${f1(par())}`, COL.blue); c.info(() => `ත්‍රිකෝණය ABC = ${f1(tri())}`, COL.orange); c.info(() => `ABCD ÷ ABC = ${f1(par() / (tri() || 1))}`); }),
  },
  { id: 'circ-center', group: 'වෘත්ත', title: 'කේන්ද්‍රයේ කෝණය = 2 × පරිධියේ කෝණය',
    theorem: 'වෘත්තයක එකම චාපයක් මගින් කේන්ද්‍රයේ ආපාතනය කරන කෝණය, එම චාපය මගින් පරිධියේ ඕනෑම ලක්ෂ්‍යයක ආපාතනය කරන කෝණය මෙන් දෙගුණයකි.',
    hint: 'A, B, C වෘත්තය දිගේ ඇදන්න. අනුපාතය 2 ම යි.',
    source: 'PDF: III කොටස, 23 පිටුව - "ප්‍රමේයය" කොටුව',
    build: (c) => { const O = c.pt(0, 0, 'O', { fixed: true, fillColor: COL.grey, size: 4 }); const circ = c.circle(O, 5); const A = c.onCircle(circ, O, 5, 210, 'A'); const B = c.onCircle(circ, O, 5, 330, 'B'); const C = c.onCircle(circ, O, 5, 90, 'C'); c.seg(O, A, COL.red); c.seg(O, B, COL.red); c.seg(C, A, COL.blue); c.seg(C, B, COL.blue); const y = () => deg(C, A, B); const reflex = () => y() > 90; const x = () => (reflex() ? 360 - deg(O, A, B) : deg(O, A, B)); c.ang(O, A, B, 1.3, COL.red, () => `${f1(x())}°`, reflex); c.ang(C, A, B, 1.6, COL.blue, () => `${f1(y())}°`); c.info(() => `∠ACB = ${f1(y())}°`, COL.blue); c.info(() => `∠AOB = ${f1(x())}°`, COL.red); c.info(() => `∠AOB ÷ ∠ACB = ${f1(x() / (y() || 1))}`); },
  },
  { id: 'circ-same', group: 'වෘත්ත', title: 'ඒකම ඛණ්ඩයේ කෝණ',
    theorem: 'ඒකම වෘත්ත ඛණ්ඩයේ කෝණ සමාන වේ.',
    hint: 'C සහ D එකම පැත්තේ තියලා බලන්න, පසුව විරුද්ධ පැත්තට ගෙන යන්න.',
    source: 'PDF: III කොටස, 24 පිටුව - "ප්‍රමේයය" කොටුව',
    build: (c) => { const O = c.pt(0, 0, 'O', { fixed: true, fillColor: COL.grey, size: 4, name: '' }); const circ = c.circle(O, 5); const A = c.onCircle(circ, O, 5, 205, 'A'); const B = c.onCircle(circ, O, 5, 335, 'B'); const C = c.onCircle(circ, O, 5, 100, 'C'); const D = c.onCircle(circ, O, 5, 55, 'D'); c.seg(A, B); c.seg(C, A, COL.blue); c.seg(C, B, COL.blue); c.seg(D, A, COL.green); c.seg(D, B, COL.green); const c1 = () => deg(C, A, B), d1 = () => deg(D, A, B); c.ang(C, A, B, 1.6, COL.blue, () => `${f1(c1())}°`); c.ang(D, A, B, 1.6, COL.green, () => `${f1(d1())}°`); c.info(() => `∠ACB = ${f1(c1())}°`, COL.blue); c.info(() => `∠ADB = ${f1(d1())}°`, COL.green); c.info(() => side(A, B, C) === side(A, B, D) ? `C, D එකම ඛණ්ඩයේ: ∠ACB = ∠ADB` : `විරුද්ධ ඛණ්ඩ: ∠ACB + ∠ADB = ${f1(c1() + d1())}°`); },
  },
  { id: 'circ-semi', group: 'වෘත්ත', title: 'අර්ධ වෘත්තයේ කෝණය',
    theorem: 'අර්ධ වෘත්තයක කෝණය සෘජුකෝණයකි.',
    hint: 'C වෘත්තය දිගේ ඇදන්න. ∠ACB හැමවිටම 90° ද?',
    source: 'PDF: III කොටස, 25 පිටුව',
    build: (c) => { const O = c.pt(0, 0, 'O', { fixed: true, fillColor: COL.grey, size: 4 }); const circ = c.circle(O, 5); const A = c.pt(-5, 0, 'A', { fixed: true }); const B = c.pt(5, 0, 'B', { fixed: true }); const C = c.onCircle(circ, O, 5, 70, 'C'); c.seg(A, B, COL.dark); c.seg(C, A, COL.blue); c.seg(C, B, COL.blue); const y = () => deg(C, A, B); c.ang(C, A, B, 1.0, COL.red, () => `${f1(y())}°`); c.info(() => `∠ACB = ${f1(y())}°`, COL.red); c.info(() => `AB විෂ්කම්භයයි`); },
  },
  { id: 'circ-chord', group: 'වෘත්ත', title: 'කේන්ද්‍රයෙන් ජීවයට ලම්බය',
    theorem: 'වෘත්තයක කේන්ද්‍රයෙන් ජීවයකට අදින ලම්බය එම ජීවය දෙකොටස් කරයි.',
    hint: 'A, B ඇදලා බලන්න. AM = MB ද?',
    source: 'PDF: III කොටස, 26 පිටුව - "ප්‍රමේයය" කොටුව',
    build: (c) => { const O = c.pt(0, 0, 'O', { fixed: true, fillColor: COL.grey, size: 4 }); const circ = c.circle(O, 5); const A = c.onCircle(circ, O, 5, 200, 'A'); const B = c.onCircle(circ, O, 5, 340, 'B'); const M = c.dep(() => (A.X() + B.X()) / 2, () => (A.Y() + B.Y()) / 2, 'M'); c.seg(A, B, COL.blue); c.seg(O, M, COL.red, { dash: 2 }); c.seg(O, A, COL.grey); c.info(() => `AM = ${f1(dist(A, M))}`, COL.blue); c.info(() => `MB = ${f1(dist(M, B))}`, COL.blue); c.info(() => `∠OMA = ${f1(deg(M, O, A))}°  (OM ⊥ AB)`, COL.red); },
  },
  { id: 'circ-chord-converse', group: 'වෘත්ත', title: 'ජීවයේ මධ්‍ය ලක්ෂ්‍යය - අනෙක් පැත්ත',
    theorem: 'වෘත්තයක ජීවයක මධ්‍ය ලක්ෂ්‍යය හා කේන්ද්‍රය යා කරන රේඛාව එම ජීවයට ලම්බක වේ.',
    hint: 'M කියන්නේ AB යේ මධ්‍ය ලක්ෂ්‍යය නම් OM ⊥ AB වෙනවා.',
    source: 'PDF: III කොටස, 27 පිටුව - "ප්‍රමේයය" කොටුව',
    build: (c) => { const O = c.pt(0, 0, 'O', { fixed: true, fillColor: COL.grey, size: 4 }); const circ = c.circle(O, 5); const A = c.onCircle(circ, O, 5, 200, 'A'); const B = c.onCircle(circ, O, 5, 340, 'B'); const M = c.dep(() => (A.X() + B.X()) / 2, () => (A.Y() + B.Y()) / 2, 'M'); c.seg(A, B, COL.blue); c.seg(O, M, COL.red, { dash: 2 }); c.info(() => `AM = ${f1(dist(A, M))}   MB = ${f1(dist(M, B))}`, COL.blue); c.info(() => `∠OMA = ${f1(deg(M, O, A))}°`, COL.red); },
  },
  { id: 'circ-cyclic', group: 'වෘත්ත', title: 'වෘත්ත චතුරස්‍රය',
    theorem: 'වෘත්ත චතුරස්‍රයක ප්‍රතිමුඛ කෝණ යුගලයක එකතුව සෘජුකෝණ දෙකකි.',
    hint: 'A, B, C, D ඇදන්න. ∠A + ∠C සහ ∠B + ∠D බලන්න.',
    source: 'PDF: III කොටස, 27-28 පිටු - "ප්‍රමේයය" කොටුව',
    build: (c) => { const O = c.pt(0, 0, 'O', { fixed: true, fillColor: COL.grey, size: 4, name: '' }); const circ = c.circle(O, 5); const A = c.onCircle(circ, O, 5, 215, 'A'); const B = c.onCircle(circ, O, 5, 320, 'B'); const C = c.onCircle(circ, O, 5, 35, 'C'); const D = c.onCircle(circ, O, 5, 130, 'D'); c.seg(A, B); c.seg(B, C); c.seg(C, D); c.seg(D, A); const a = () => deg(A, D, B), b = () => deg(B, A, C), cc = () => deg(C, B, D), d = () => deg(D, C, A); c.ang(A, D, B, 1.0, COL.blue, () => `${f1(a())}°`); c.ang(B, A, C, 1.0, COL.green, () => `${f1(b())}°`); c.ang(C, B, D, 1.0, COL.blue, () => `${f1(cc())}°`); c.ang(D, C, A, 1.0, COL.green, () => `${f1(d())}°`); c.info(() => `∠A + ∠C = ${f1(a())}° + ${f1(cc())}° = ${f1(a() + cc())}°`, COL.blue); c.info(() => `∠B + ∠D = ${f1(b())}° + ${f1(d())}° = ${f1(b() + d())}°`, COL.green); },
  },
  { id: 'circ-cyclic-converse', group: 'වෘත්ත', title: 'වෘත්ත චතුරස්‍රය - අනෙක් පැත්ත',
    theorem: 'චතුරස්‍රයක ප්‍රතිමුඛ කෝණ යුගලයක එකතුව සෘජුකෝණ දෙකක් නම්, එම චතුරස්‍රය වෘත්ත චතුරස්‍රයකි.',
    hint: '∠A + ∠C = සෘජුකෝණ දෙකක් නම් ABCD වෘත්ත චතුරස්‍රයක්.',
    source: 'PDF: III කොටස, 28 පිටුව - "ප්‍රමේයය" කොටුව',
    build: (c) => { const O = c.pt(0, 0, 'O', { fixed: true, fillColor: COL.grey, size: 4, name: '' }); const circ = c.circle(O, 5); const A = c.onCircle(circ, O, 5, 215, 'A'); const B = c.onCircle(circ, O, 5, 320, 'B'); const C = c.onCircle(circ, O, 5, 35, 'C'); const D = c.onCircle(circ, O, 5, 130, 'D'); c.seg(A, B); c.seg(B, C); c.seg(C, D); c.seg(D, A); const a = () => deg(A, D, B), cc = () => deg(C, B, D); c.info(() => `∠A = ${f1(a())}°   ∠C = ${f1(cc())}°`, COL.blue); c.info(() => `∠A + ∠C = ${f1(a() + cc())}° = සෘජුකෝණ දෙකකි`, COL.blue); },
  },
  { id: 'circ-tangent', group: 'වෘත්ත', title: 'ස්පර්ශකය සහ අරය',
    theorem: 'වෘත්තයකට ස්පර්ශ ලක්ෂ්‍යයේ අදින ස්පර්ශකය, ස්පර්ශ ලක්ෂ්‍යයට අදින අරයට ලම්බක වේ.',
    hint: 'P වෘත්තය දිගේ ඇදන්න. කෝණය 90° ද?',
    source: 'PDF: III කොටස, 82 පිටුව - "ප්‍රමේයය" කොටුව',
    build: (c) => { const O = c.pt(0, 0, 'O', { fixed: true, fillColor: COL.grey, size: 4 }); const circ = c.circle(O, 5); const P = c.onCircle(circ, O, 5, 35, 'P'); const len = () => dist(O, P) || 1; const T1 = c.dep(() => P.X() - (4 * (P.Y() - O.Y())) / len(), () => P.Y() + (4 * (P.X() - O.X())) / len(), 'T', { size: 3 }); const T2 = c.dep(() => P.X() + (4 * (P.Y() - O.Y())) / len(), () => P.Y() - (4 * (P.X() - O.X())) / len(), '', { size: 3, visible: false }); c.seg(T2, T1, COL.purple); c.seg(O, P, COL.red); const y = () => deg(P, O, T1); c.ang(P, O, T1, 1.0, COL.red, () => `${f1(y())}°`); c.info(() => `∠OPT = ${f1(y())}°`, COL.red); c.info(() => `OP අරයයි, PT ස්පර්ශකයයි`); },
  },
  { id: 'circ-tangent-ext', group: 'වෘත්ත', title: 'බාහිර ලක්ෂ්‍යයකින් ස්පර්ශක දෙක',
    theorem: 'බාහිර ලක්ෂ්‍යයක සිට වෘත්තයකට ස්පර්ශක දෙකක් අදින ලද විට,\n(i) ස්පර්ශක දෙක දිගින් සමාන වේ.\n(ii) බාහිර ලක්ෂ්‍යය හා වෘත්තයේ කේන්ද්‍රය යා කරන රේඛාව ස්පර්ශක දෙක අතර කෝණය සමච්ඡේදනය කරයි.\n(iii) ස්පර්ශක මගින් කේන්ද්‍රයේ සමාන කෝණ ආපාතනය කරයි.',
    hint: 'P ඇදලා බලන්න. (i) PA = PB ද? (ii) ∠APO = ∠BPO ද? (iii) ∠AOP = ∠BOP ද?',
    source: 'PDF: උඹ එවපු photo එකේ වචනවලින්ම (III කොටස, 22.2)',
    build: (c) => { const O = c.pt(0, 0, 'O', { fixed: true, fillColor: COL.grey, size: 4 }); const circ = c.circle(O, 4); const P = c.pt(7, 1, 'P'); const calc = (s: 1 | -1) => { const dx = P.X() - O.X(), dy = P.Y() - O.Y(); const d2 = dx * dx + dy * dy, r = 4; const a = (r * r) / d2, b = (r * Math.sqrt(Math.max(d2 - r * r, 0))) / d2; return { x: O.X() + a * dx + s * b * dy, y: O.Y() + a * dy - s * b * dx }; }; const A = c.dep(() => calc(1).x, () => calc(1).y, 'A'); const B = c.dep(() => calc(-1).x, () => calc(-1).y, 'B'); c.seg(O, A, COL.red); c.seg(O, B, COL.red); c.seg(P, A, COL.purple); c.seg(P, B, COL.purple); c.seg(O, P, COL.grey, { dash: 2 }); c.info(() => `PA = ${f1(dist(P, A))}   PB = ${f1(dist(P, B))}  (i)`, COL.purple); c.info(() => `∠APO = ${f1(deg(P, A, O))}°   ∠BPO = ${f1(deg(P, B, O))}°  (ii)`, COL.blue); c.info(() => `∠AOP = ${f1(deg(O, A, P))}°   ∠BOP = ${f1(deg(O, B, P))}°  (iii)`, COL.teal); c.info(() => `∠OAP = ∠OBP = 90°`); },
  },
  { id: 'circ-alt-seg', group: 'වෘත්ත', title: 'ඒකාන්තර වෘත්ත ඛණ්ඩයේ කෝණය',
    theorem: 'ස්පර්ශකය හා ස්පර්ශ ලක්ෂ්‍යය හරහා අදින ජීවය අතර කෝණය අනෙක් ඒකාන්තර වෘත්ත ඛණ්ඩයේ කෝණයට සමාන වේ.',
    hint: 'C වෘත්තය දිගේ ඇදන්න. ස්පර්ශක-ජීවා කෝණය සහ ඛණ්ඩයේ කෝණය සමානද?',
    source: 'PDF: III කොටස, 22.3 - "ප්‍රමේයය" කොටුව',
    build: (c) => { const O = c.pt(0, 0, 'O', { fixed: true, fillColor: COL.grey, size: 4, name: '' }); const circ = c.circle(O, 5); const P = c.onCircle(circ, O, 5, 200, 'P'); const Q = c.onCircle(circ, O, 5, 20, 'Q'); const C = c.onCircle(circ, O, 5, 90, 'C'); const len = () => dist(O, P) || 1; const T = c.dep(() => P.X() - (4.5 * (P.Y() - O.Y())) / len(), () => P.Y() + (4.5 * (P.X() - O.X())) / len(), 'T', { size: 3 }); c.seg(P, Q, COL.blue); c.seg(P, C, COL.blue); c.seg(Q, C, COL.blue); c.seg(T, P, COL.purple); const a1 = () => deg(P, T, Q); const a2 = () => deg(C, P, Q); c.ang(P, T, Q, 1.2, COL.purple, () => `${f1(a1())}°`); c.ang(C, P, Q, 1.4, COL.green, () => `${f1(a2())}°`); c.info(() => `∠TPQ = ${f1(a1())}°`, COL.purple); c.info(() => `∠PCQ = ${f1(a2())}°`, COL.green); c.info(() => `∠TPQ = ∠PCQ`); },
  },
  { id: 'trig-basic', group: 'ත්‍රිකෝණමිතිය', title: 'ත්‍රිකෝණමිතික අනුපාත',
    theorem: 'සෘජුකෝණී ත්‍රිකෝණයක: sin θ = විරුද්ධ පැත්ත / කර්ණය, cos θ = යාබද පැත්ත / කර්ණය, tan θ = විරුද්ධ පැත්ත / යාබද පැත්ත.',
    hint: 'මේක ප්‍රමේයයක් නෙවෙයි, අර්ථ දැක්වීමක්. A හෝ B ඇදලා බලන්න.',
    source: 'PDF: I කොටස, ත්‍රිකෝණමිතිය - අර්ථ දැක්වීම',
    build: (c) => { const { board } = c; const Cc = c.pt(-3, -2, 'C', { fixed: true, fillColor: COL.grey }); const hl = board.create('line', [[-3, -2], [0, -2]], { visible: false }); const vl = board.create('line', [[-3, -2], [-3, 0]], { visible: false }); const B = board.create('glider', [2, -2, hl], { name: 'B', size: 6, fillColor: COL.blue, strokeColor: '#1e3a8a', showInfobox: false, label: { fontSize: 22, offset: [10, -20] } }); const A = board.create('glider', [-3, 2, vl], { name: 'A', size: 6, fillColor: COL.blue, strokeColor: '#1e3a8a', showInfobox: false, label: { fontSize: 22, offset: [-25, 10] } }); c.seg(Cc, B); c.seg(Cc, A); c.seg(A, B); const th = () => deg(B, A, Cc); const sin = () => dist(Cc, A) / (dist(A, B) || 1); const cos = () => dist(Cc, B) / (dist(A, B) || 1); c.ang(B, A, Cc, 1.2, COL.blue, () => `${f1(th())}°`); c.info(() => `θ = ∠B = ${f1(th())}°`, COL.blue); c.info(() => `sin θ = ${f1(sin())}   cos θ = ${f1(cos())}   tan θ = ${f1(sin() / (cos() || 1))}`); c.info(() => `sin²θ + cos²θ = ${f1(sin() * sin() + cos() * cos())}`); },
  },
];
