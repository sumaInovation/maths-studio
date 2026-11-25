'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { compile, parse, OperatorNode, ConstantNode } from 'mathjs';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import '../app/jsxgraph.css';
import type { GraphRequest } from '@/lib/graphRequest';

type Params = { a: number; b: number; c: number };

const PRESETS = [
  { label: 'Quadratic', expr: 'a*x^2 + b*x + c' },
  { label: 'Linear', expr: 'a*x + b' },
  { label: 'Cubic', expr: 'a*x^3 + b*x^2 + c*x' },
  { label: 'Sin', expr: 'a*sin(b*x) + c' },
];

const fmt = (n: number) => (Math.round(n * 100) / 100).toString();

// "y = 2x² + 3" වගේ ඕනම විදියක් mathjs වලට තේරෙන විදියට හදනවා
function normalize(input: string) {
  return input
    .replace(/^\s*y\s*=/i, '')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-');
}

// 2*x -> 2x වගේ multiplication ලකුණ සඟවන්න (implicit multiplication)
function implicitify(node: any): any {
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

// "+ -2x" -> "- 2x" , "+ -3" -> "- 3"
function fixSigns(node: any): any {
  const n = node.map(fixSigns);
  if (n.type === 'OperatorNode' && n.fn === 'add' && n.args.length === 2) {
    const [l, r0] = n.args;
    const r = r0.type === 'ParenthesisNode' ? r0.content : r0;
    const sub = (right: any) => new OperatorNode('-', 'subtract', [l, right]);
    if (r.type === 'ConstantNode' && r.value < 0) return sub(new ConstantNode(-r.value));
    if (r.type === 'OperatorNode' && r.fn === 'unaryMinus') return sub(r.args[0]);
    if (r.type === 'OperatorNode' && r.fn === 'multiply' && r.args.length === 2) {
      const c = r.args[0];
      if (c.type === 'ConstantNode' && c.value < 0) {
        return sub(c.value === -1 ? r.args[1] : new OperatorNode('*', 'multiply', [new ConstantNode(-c.value), r.args[1]], r.implicit));
      }
      if (c.type === 'OperatorNode' && c.fn === 'unaryMinus' && c.args[0].type === 'ConstantNode') {
        const v = c.args[0].value;
        return sub(v === 1 ? r.args[1] : new OperatorNode('*', 'multiply', [new ConstantNode(v), r.args[1]], r.implicit));
      }
    }
  }
  return n;
}

// School format එකෙන් render කරනවා: 2*x^2+3  ->  y = 2x² + 3
function toSchoolTex(input: string) {
  try {
    const tree: any = implicitify(fixSigns(parse(normalize(input))));
    return katex.renderToString('y = ' + tree.toTex({ implicit: 'hide' }), {
      throwOnError: false,
      displayMode: false,
    });
  } catch {
    return '';
  }
}

// ---------- Table of values helpers ----------
const mf = (n: number) => (Number.isFinite(n) ? fmt(n).replace('-', '−') : '—');

const unwrap = (n: any): any => (n.type === 'ParenthesisNode' ? unwrap(n.content) : n);

function negate(node: any): any {
  const n = unwrap(node);
  if (n.type === 'ConstantNode') return new ConstantNode(-n.value);
  if (n.type === 'OperatorNode' && n.fn === 'unaryMinus') return n.args[0];
  if (n.type === 'OperatorNode' && n.fn === 'multiply' && n.args[0].type === 'ConstantNode') {
    return new OperatorNode('*', 'multiply', [new ConstantNode(-n.args[0].value), n.args[1]], n.implicit);
  }
  return new OperatorNode('-', 'unaryMinus', [n]);
}

// 1*x^2 -> x^2 , -1*x -> -x
function tidy(node: any): any {
  const n = node.map(tidy);
  if (n.type === 'OperatorNode' && n.fn === 'multiply' && n.args.length === 2 && n.args[0].type === 'ConstantNode') {
    if (n.args[0].value === 1) return n.args[1];
    if (n.args[0].value === -1) return negate(n.args[1]);
  }
  return n;
}

// x^2 - 2x - 3  ->  [x^2, -2x, -3]
function splitTerms(node: any): any[] {
  const n = unwrap(node);
  if (n.type === 'OperatorNode') {
    if (n.fn === 'add') return n.args.flatMap(splitTerms);
    if (n.fn === 'subtract') return [...splitTerms(n.args[0]), ...splitTerms(n.args[1]).map(negate)];
    if (n.fn === 'unaryMinus') return splitTerms(n.args[0]).map(negate);
    if (n.fn === 'unaryPlus') return splitTerms(n.args[0]);
  }
  return [n];
}

const isZeroTerm = (n: any) =>
  (n.type === 'ConstantNode' && n.value === 0) ||
  (n.type === 'OperatorNode' && n.fn === 'multiply' && n.args[0].type === 'ConstantNode' && n.args[0].value === 0);

function buildTermRows(expr: string, params: Params) {
  try {
    let tree: any = parse(normalize(expr)).transform((n: any) =>
      n.type === 'SymbolNode' && Object.prototype.hasOwnProperty.call(params, n.name)
        ? new ConstantNode(Math.round((params as any)[n.name] * 100) / 100)
        : n
    );
    tree = tidy(tree);
    return splitTerms(tree)
      .filter((t) => !isZeroTerm(t))
      .map((t) => {
        const tex = implicitify(t).toTex({ implicit: 'hide' });
        return {
          html: katex.renderToString(tex, { throwOnError: false }),
          code: t.compile(),
        };
      });
  } catch {
    return [];
  }
}

const safeEval = (code: any, x: number) => {
  try {
    const v = code.evaluate({ x });
    return typeof v === 'number' ? v : NaN;
  } catch {
    return NaN;
  }
};

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i));

// ---------- Graph දෙකක ඡේදන ලක්ෂ්‍ය (simultaneous equations) ----------
function findIntersections(f: (x: number) => number, g: (x: number) => number): [number, number][] {
  const d = (x: number) => f(x) - g(x);
  const lo = -50, hi = 50, N = 5000, step = (hi - lo) / N;
  const out: [number, number][] = [];
  const add = (x: number) => {
    const y = f(x);
    if (!Number.isFinite(y) || out.length >= 30) return;
    if (out.some((p) => Math.abs(p[0] - x) < 1e-4)) return;
    out.push([x, y]);
  };

  const xsArr: number[] = [], ds: number[] = [];
  for (let i = 0; i <= N; i++) {
    const x = lo + i * step;
    xsArr.push(x);
    ds.push(d(x));
  }

  // 1) sign change -> bisection
  for (let i = 0; i < N; i++) {
    const d0 = ds[i], d1 = ds[i + 1];
    if (!Number.isFinite(d0) || !Number.isFinite(d1)) continue;
    if (d0 === 0) { add(xsArr[i]); continue; }
    if (d0 * d1 < 0) {
      let a = xsArr[i], b = xsArr[i + 1], da = d0;
      for (let k = 0; k < 60; k++) {
        const m = (a + b) / 2, dm = d(m);
        if (dm === 0) { a = b = m; break; }
        if (da * dm < 0) b = m;
        else { a = m; da = dm; }
      }
      const x = (a + b) / 2;
      // asymptote වගේ බොරු ඡේදන ඉවත් කරනවා
      if (Math.abs(d(x)) < 1e-6 * (1 + Math.abs(f(x)))) add(x);
    }
  }

  // 2) ස්පර්ශ වෙන තැන් (tangent): |d| හි local minimum එක ~0 නම්
  for (let i = 1; i < N; i++) {
    const a0 = Math.abs(ds[i - 1]), a1 = Math.abs(ds[i]), a2 = Math.abs(ds[i + 1]);
    if (![a0, a1, a2].every(Number.isFinite)) continue;
    if (a1 <= a0 && a1 <= a2 && a1 < 1e-3) {
      let a = xsArr[i - 1], b = xsArr[i + 1];
      for (let k = 0; k < 80; k++) {
        const m1 = a + (b - a) / 3, m2 = b - (b - a) / 3;
        if (Math.abs(d(m1)) < Math.abs(d(m2))) b = m2;
        else a = m1;
      }
      const x = (a + b) / 2;
      if (Math.abs(d(x)) < 1e-7 && !out.some((p) => Math.abs(p[0] - x) < 1e-3)) add(x);
    }
  }
  return out.sort((p, q) => p[0] - q[0]);
}

export default function GraphTab({ request }: { request?: GraphRequest | null }) {
  const [expr, setExpr] = useState('a*x^2 + b*x + c');
  const [params, setParams] = useState<Params>({ a: 1, b: -2, c: -3 });
  const [showPanel, setShowPanel] = useState(true);
  const [showTable, setShowTable] = useState(true);
  const [showGraph, setShowGraph] = useState(true); // graph window එක මුළුමනින්ම
  const savedBoxRef = useRef<number[] | null>(null);
  const [showPts, setShowPts] = useState(true);
  const [showCurve, setShowCurve] = useState(true);
  const showCurveRef = useRef(true);
  // Graph 2 (සමගාමී සමීකරණ සඳහා)
  const [showSecond, setShowSecond] = useState(false);
  const [expr2, setExpr2] = useState('x + 1');
  const showSecondRef = useRef(false);
  const gRef = useRef<(x: number) => number>(() => NaN);
  const pts2Ref = useRef<[number, number][]>([]);
  const interRef = useRef<[number, number][]>([]);
  const [xs, setXs] = useState<string[]>(range(-5, 5));
  const ptsRef = useRef<[number, number][]>([]);

  // Solver tab එකකින් ආපු equation එක(ල) සක්‍රීය කරනවා
  useEffect(() => {
    if (!request) return;
    setExpr(request.expr);
    if (request.expr2 !== undefined) {
      setExpr2(request.expr2);
      setShowSecond(true);
    } else {
      setShowSecond(false);
    }
    setShowCurve(true);
    setShowGraph(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id]);

  const boxRef = useRef<HTMLDivElement>(null);
  const fRef = useRef<(x: number) => number>(() => NaN);
  const syncRef = useRef<() => void>(() => {});
  const infoRef = useRef<any>({});
  const boardRef = useRef<any>(null);
  const resetRef = useRef<() => void>(() => {});

  const texHtml = useMemo(() => toSchoolTex(expr), [expr]);

  // Table: x අගයන් (type කරපු ඒවා number බවට)
  const cols = useMemo(
    () =>
      xs.map((str) => {
        try {
          const v = compile(str).evaluate();
          return typeof v === 'number' ? v : NaN;
        } catch {
          return NaN;
        }
      }),
    [xs]
  );
  const termRows = useMemo(() => buildTermRows(expr, params), [expr, params]);
  const termRows2 = useMemo(() => (showSecond ? buildTermRows(expr2, params) : []), [expr2, params, showSecond]);

  // Graph 2: function + ඡේදන ලක්ෂ්‍ය
  const tex2Html = useMemo(() => toSchoolTex(expr2), [expr2]);
  const { g, error2 } = useMemo(() => {
    if (!showSecond) return { g: (_x: number) => NaN, error2: '' };
    try {
      const code = compile(normalize(expr2));
      const fn = (x: number) => {
        try {
          const v = code.evaluate({ x, ...params });
          return typeof v === 'number' ? v : NaN;
        } catch {
          return NaN;
        }
      };
      return { g: fn, error2: '' };
    } catch {
      return { g: (_x: number) => NaN, error2: 'Expression එක වැරදියි' };
    }
  }, [expr2, params, showSecond]);

  // Compile expression + analyse (quadratic roots / vertex)
  const { f, error, quad } = useMemo(() => {
    try {
      const code = compile(normalize(expr));
      const fn = (x: number) => {
        try {
          const v = code.evaluate({ x, ...params });
          return typeof v === 'number' ? v : NaN;
        } catch {
          return NaN;
        }
      };
      // Detect quadratic by sampling: f(x) = A x^2 + B x + C
      const f0 = fn(0), f1 = fn(1), fm1 = fn(-1);
      const A = (f1 + fm1) / 2 - f0;
      const B = (f1 - fm1) / 2;
      const C = f0;
      const isQuad =
        [A, B, C].every(Number.isFinite) &&
        Math.abs(A) > 1e-9 &&
        [2, -3, 5].every((t) => Math.abs(fn(t) - (A * t * t + B * t + C)) < 1e-6);
      let q: any = null;
      if (isQuad) {
        const D = B * B - 4 * A * C;
        const vx = -B / (2 * A);
        q = {
          A, B, C, D, vx, vy: fn(vx),
          roots: D < 0 ? [] : D === 0 ? [vx] : [(-B - Math.sqrt(D)) / (2 * A), (-B + Math.sqrt(D)) / (2 * A)],
        };
      }
      return { f: fn, error: '', quad: q };
    } catch (e: any) {
      return { f: () => NaN, error: 'Expression එක වැරදියි', quad: null };
    }
  }, [expr, params]);

  // ඡේදන ලක්ෂ්‍ය (f සහ g දෙකම හැදුවට පස්සේ)
  const inters = useMemo(() => (showSecond ? findIntersections(f, g) : []), [f, g, showSecond]);

  // Keep refs in sync, then redraw
  useEffect(() => {
    fRef.current = f;
    infoRef.current = quad;
    showCurveRef.current = showCurve;
    showSecondRef.current = showSecond;
    gRef.current = g;
    pts2Ref.current =
      showSecond && showPts
        ? cols.map((x) => [x, g(x)] as [number, number]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
        : [];
    interRef.current = showSecond && showCurve ? inters : [];
    ptsRef.current = showPts
      ? cols.map((x) => [x, f(x)] as [number, number]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
      : [];
    syncRef.current();
  }, [f, quad, cols, showPts, showCurve, g, inters, showSecond]);

  // Create the board once (client-only)
  useEffect(() => {
    let board: any;
    let ro: ResizeObserver | undefined;
    let cancelled = false;
    (async () => {
      const JXG = (await import('jsxgraph')).default;
      if (cancelled || !boxRef.current) return;

      board = JXG.JSXGraph.initBoard(boxRef.current, {
        boundingbox: [-8, 6, 8, -6],
        keepAspectRatio: true, // graph sheet එකේ වගේ හතරැස් කොටු
        axis: false,
        grid: false,
        showCopyright: false,
        showNavigation: false, // අපේම zoom buttons පාවිච්චි කරනවා
        resize: { enabled: false }, // අපේම ResizeObserver එක පාවිච්චි කරනවා
        pan: { enabled: false }, // අපේම drag/pan logic එක පාවිච්චි කරනවා
        zoom: { wheel: true, needShift: false, factorX: 1.15, factorY: 1.15, min: 0.4, max: 25 },
      });
      boardRef.current = board;

      // ---- Graph sheet grid: 0.1 (ලා), 0.5 (මධ්‍යම), 1 (තද) ----
      const xAxis = board.create('axis', [[0, 0], [1, 0]], {
        strokeColor: '#111827', strokeWidth: 2.5, ticks: { visible: false },
        name: 'x', withLabel: true,
        label: { position: 'rt', offset: [-22, 18], fontSize: 22, strokeColor: '#111827' },
      });
      const yAxis = board.create('axis', [[0, 0], [0, 1]], {
        strokeColor: '#111827', strokeWidth: 2.5, ticks: { visible: false },
        name: 'y', withLabel: true,
        label: { position: 'top', offset: [16, -22], fontSize: 22, strokeColor: '#111827' },
      });

      // ---- Graph sheet grid: 0.1 (ලා), 0.5 (මධ්‍යම), 1 (තද) ----
      // සියලුම layers වල ticksDistance = 1; minorTicks වලින් 0.5 / 0.1 රේඛා හදනවා
      const gridLayer = (axis: any, minor: number, color: string, width: number, labels: boolean) =>
        board.create('ticks', [axis, 1], {
          majorHeight: -1, // board එක පුරාම දිගු රේඛා (grid)
          minorHeight: -1,
          minorTicks: minor, // 1 ක් අතර minor රේඛා ගණන (9 => 0.1, 1 => 0.5)
          strokeColor: color,
          strokeWidth: width,
          drawLabels: labels,
          drawZero: false,
          label: { fontSize: 16, strokeColor: '#111827' },
        });

      const fine = [gridLayer(xAxis, 9, '#fca5a5', 0.6, false), gridLayer(yAxis, 9, '#fca5a5', 0.6, false)];
      const mid = [gridLayer(xAxis, 1, '#f87171', 1, false), gridLayer(yAxis, 1, '#f87171', 1, false)];
      gridLayer(xAxis, 0, '#dc2626', 1.4, true);
      gridLayer(yAxis, 0, '#dc2626', 1.4, true);

      // Zoom out කරද්දී 0.1 / 0.5 රේඛා ඝන වෙන එක වළක්වනවා
      let fineOn = true, midOn = true;
      const adjustGrid = () => {
        try {
          const unit = board.unitX || 50; // pixels per 1 unit
          const wantFine = unit >= 30;
          const wantMid = unit >= 18;
          if (wantFine !== fineOn) {
            fineOn = wantFine;
            fine.forEach((t: any) => t.setAttribute({ visible: wantFine }));
          }
          if (wantMid !== midOn) {
            midOn = wantMid;
            mid.forEach((t: any) => t.setAttribute({ visible: wantMid }));
          }
        } catch {}
      };
      board.on('update', adjustGrid);
      adjustGrid();
      // Default view: 1 unit = 40px, origin මැදට
      resetRef.current = () => {
        const u = 40;
        const hw = board.canvasWidth / (2 * u);
        const hh = board.canvasHeight / (2 * u);
        board.setBoundingBox([-hw, hh, hw, -hh], true);
      };
      resetRef.current();

      // Layout එක ස්ථාවර වුණාට පස්සේ container ප්‍රමාණයට ගැලපෙන්න ආයෙත් default view එක දානවා
      const el = boxRef.current;
      let settle = 0;
      ro = new ResizeObserver(() => {
        if (!boardRef.current || !el || !el.clientWidth || !el.clientHeight) return; // hide කළාම ප්‍රමාණය 0
        try { board.resizeContainer(el.clientWidth, el.clientHeight, true); } catch {}
        if (settle++ < 3) resetRef.current();
      });
      ro.observe(el);

      const curve = board.create('functiongraph', [(x: number) => fRef.current(x)], {
        strokeWidth: 4,
        strokeColor: '#2563eb',
      });
      const curve2 = board.create('functiongraph', [(x: number) => gRef.current(x)], {
        strokeWidth: 4,
        strokeColor: '#ea580c',
        visible: false,
      });

      const common = { fixed: true, size: 6, label: { fontSize: 18, offset: [8, -26] } };
      const vertex = board.create('point', [0, 0], { ...common, name: '', color: '#dc2626' });
      const r1 = board.create('point', [0, 0], { ...common, name: '', color: '#16a34a' });
      const r2 = board.create('point', [0, 0], { ...common, name: '', color: '#16a34a' });

      const plotted: any[] = [];
      const plotted2: any[] = [];
      const interObjs: any[] = [];
      const syncPoints = (list: any[], data: [number, number][], attrs: any, labelled: boolean) => {
        while (list.length > data.length) board.removeObject(list.pop());
        data.forEach((pt, i) => {
          const name = `(${fmt(pt[0])}, ${fmt(pt[1])})`;
          if (list[i]) {
            list[i].moveTo(pt);
            if (labelled) list[i].setName(name);
          } else {
            list.push(
              board.create('point', [pt[0], pt[1]], {
                fixed: true, showInfobox: false, ...attrs,
                ...(labelled ? { name, withLabel: true } : { name: '', withLabel: false }),
              })
            );
          }
        });
      };
      syncRef.current = () => {
        const q = infoRef.current;
        if (q) {
          vertex.moveTo([q.vx, q.vy]);
          vertex.setName(`Vertex (${fmt(q.vx)}, ${fmt(q.vy)})`);
          vertex.setAttribute({ visible: showCurveRef.current });
          [r1, r2].forEach((p, i) => {
            const r = q.roots[i];
            if (r === undefined) p.setAttribute({ visible: false });
            else {
              p.moveTo([r, 0]);
              p.setName(`(${fmt(r)}, 0)`);
              p.setAttribute({ visible: showCurveRef.current });
            }
          });
        } else {
          [vertex, r1, r2].forEach((p) => p.setAttribute({ visible: false }));
        }

        curve.setAttribute({ visible: showCurveRef.current });
        curve2.setAttribute({ visible: showCurveRef.current && showSecondRef.current });

        // Table එකේ points graph එකේ mark කරනවා
        const pts = ptsRef.current;
        while (plotted.length > pts.length) board.removeObject(plotted.pop());
        pts.forEach((pt, i) => {
          if (plotted[i]) plotted[i].moveTo(pt);
          else
            plotted.push(
              board.create('point', [pt[0], pt[1]], {
                fixed: true, size: 4, withLabel: false, showInfobox: false,
                fillColor: '#7c3aed', strokeColor: '#7c3aed',
              })
            );
        });
        // Graph 2 table points + ඡේදන ලක්ෂ්‍ය
        syncPoints(plotted2, pts2Ref.current, { size: 4, fillColor: '#ea580c', strokeColor: '#ea580c' }, false);
        syncPoints(
          interObjs,
          interRef.current,
          { size: 7, fillColor: '#facc15', strokeColor: '#111827', label: { fontSize: 18, offset: [8, -26] } },
          true
        );
        board.update();
      };
      syncRef.current();
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      boardRef.current = null;
      resetRef.current = () => {};
      syncRef.current = () => {};
      if (board) import('jsxgraph').then((m) => m.default.JSXGraph.freeBoard(board));
    };
  }, []);

  // Pan: dx, dy = ප්‍රස්තාරය ඇදෙන පික්සල් ගණන (dx>0 දකුණට, dy>0 පහළට)
  const pan = (dx: number, dy: number) => {
    const b = boardRef.current;
    if (!b || !boxRef.current?.clientWidth) return;
    try {
      const [x1, y1, x2, y2] = b.getBoundingBox();
      const ux = b.canvasWidth / (x2 - x1);
      const uy = b.canvasHeight / (y1 - y2);
      b.setBoundingBox([x1 - dx / ux, y1 + dy / uy, x2 - dx / ux, y2 + dy / uy], true);
    } catch {}
  };

  // Mouse / touch drag වලින් pan
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    let drag = false, lx = 0, ly = 0;
    el.style.touchAction = 'none';
    el.style.cursor = 'grab';
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      drag = true; lx = e.clientX; ly = e.clientY;
      try { el.setPointerCapture(e.pointerId); } catch {}
      el.style.cursor = 'grabbing';
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      pan(e.clientX - lx, e.clientY - ly);
      lx = e.clientX; ly = e.clientY;
    };
    const up = (e: PointerEvent) => {
      drag = false;
      el.style.cursor = 'grab';
      try { el.releasePointerCapture(e.pointerId); } catch {}
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, []);

  // Keyboard arrows වලින් pan
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA'].includes(t.tagName)) return;
      const m: Record<string, [number, number]> = {
        ArrowUp: [0, 120], ArrowDown: [0, -120], ArrowLeft: [120, 0], ArrowRight: [-120, 0],
      };
      const d = m[e.key];
      if (d) {
        e.preventDefault();
        pan(d[0], d[1]);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Graph window එක ආයෙත් පෙන්නද්දී: ප්‍රමාණය fit කරලා කලින් view එකම දානවා
  useEffect(() => {
    if (!showGraph) return;
    const id = setTimeout(() => {
      const el = boxRef.current;
      const b = boardRef.current;
      if (!el || !b || !el.clientWidth || !el.clientHeight) return;
      try { b.resizeContainer(el.clientWidth, el.clientHeight, true); } catch {}
      if (savedBoxRef.current) {
        try { b.setBoundingBox(savedBoxRef.current, true); } catch {}
      }
    }, 80);
    return () => clearTimeout(id);
  }, [showGraph]);

  // Panel හංගද්දී/පෙන්නද්දී board එක ආයෙත් fit කරනවා
  useEffect(() => {
    const id = setTimeout(() => {
      const el = boxRef.current;
      const b = boardRef.current;
      if (!el || !b) return;
      try { b.resizeContainer(el.clientWidth, el.clientHeight, true); } catch {}
      resetRef.current();
    }, 60);
    return () => clearTimeout(id);
  }, [showPanel]);

  // එක් equation එකකට table එකක් (තමන්ගේම පාටින්)
  const renderEqTable = (
    rows: { html: string; code: any }[],
    fn: (x: number) => number,
    yLabel: string,
    tex: string,
    color: string,
    border: string,
    tint: string
  ) => {
    const cell = { border: `1px solid ${border}` } as const;
    const big = !showGraph;
    return (
      <div style={{ marginBottom: 14, overflowX: 'auto' }}>
        <div className={big ? 'text-3xl mb-1' : 'text-2xl mb-1'} style={{ color }} dangerouslySetInnerHTML={{ __html: tex }} />
        <table className={`border-collapse text-center ${big ? 'text-3xl' : 'text-xl'}`} style={{ color }}>
          <tbody>
            <tr>
              <th className="px-4 py-1 italic font-serif font-normal" style={{ ...cell, background: tint }}>
                x
              </th>
              {xs.map((str, i) => (
                <td key={i} className="p-0" style={{ ...cell, background: '#fefce8' }}>
                  <input
                    value={str}
                    onChange={(e) => setXs(xs.map((v, j) => (j === i ? e.target.value : v)))}
                    className={`${big ? 'w-24' : 'w-16'} py-1 text-center bg-transparent outline-none focus:bg-yellow-100`}
                    spellCheck={false}
                  />
                </td>
              ))}
            </tr>
            {rows.map((r, ri) => (
              <tr key={ri}>
                <th
                  className="px-4 py-1 font-normal"
                  style={{ ...cell, background: tint }}
                  dangerouslySetInnerHTML={{ __html: r.html }}
                />
                {cols.map((x, i) => (
                  <td key={i} className="px-2 py-1" style={cell}>
                    {Number.isFinite(x) ? mf(safeEval(r.code, x)) : ''}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th className="px-4 py-1 italic font-serif font-normal" style={{ ...cell, background: tint }}>
                {yLabel}
              </th>
              {cols.map((x, i) => (
                <td key={i} className="px-2 py-1 font-semibold" style={cell}>
                  {Number.isFinite(x) ? mf(fn(x)) : ''}
                </td>
              ))}
            </tr>
            <tr>
              <th className="px-4 py-1 italic font-serif font-normal whitespace-nowrap" style={{ ...cell, background: tint }}>
                (x, {yLabel})
              </th>
              {cols.map((x, i) => (
                <td key={i} className="px-2 py-1 whitespace-nowrap" style={cell}>
                  {Number.isFinite(x) && Number.isFinite(fn(x)) ? `(${mf(x)}, ${mf(fn(x))})` : ''}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'grid',
        gap: 12,
        height: '100%',
        minHeight: 0,
        gridTemplateColumns: showPanel ? '300px minmax(0, 1fr)' : 'minmax(0, 1fr)',
      }}
    >
      {showPanel && (
      <aside className="space-y-4 pr-1" style={{ overflowY: 'auto', minHeight: 0 }}>
        <div>
          <label className="block text-sm font-semibold mb-1">y = f(x)</label>
          <input
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            className="w-full border rounded px-3 py-2 text-lg font-mono"
            spellCheck={false}
          />
          <div
            className="mt-2 text-2xl overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: texHtml }}
          />
          {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
          <div className="flex flex-wrap gap-2 mt-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setExpr(p.expr)}
                className="px-2 py-1 text-sm border rounded hover:bg-slate-100"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t pt-3">
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" checked={showSecond} onChange={(e) => setShowSecond(e.target.checked)} />
            Graph 2 (සමගාමී සමීකරණ)
          </label>
          {showSecond && (
            <>
              <input
                value={expr2}
                onChange={(e) => setExpr2(e.target.value)}
                className="w-full border-2 rounded px-3 py-2 text-lg font-mono mt-2"
                style={{ borderColor: '#ea580c' }}
                spellCheck={false}
              />
              <div
                className="mt-2 text-2xl overflow-x-auto"
                style={{ color: '#c2410c' }}
                dangerouslySetInnerHTML={{ __html: tex2Html }}
              />
              {error2 && <p className="text-red-600 text-sm mt-1">{error2}</p>}
            </>
          )}
        </div>

        {(['a', 'b', 'c'] as const).map((k) => (
          <div key={k}>
            <label className="flex justify-between text-sm font-semibold">
              <span>{k}</span>
              <span className="font-mono">{params[k]}</span>
            </label>
            <input
              type="range"
              min={-10}
              max={10}
              step={0.1}
              value={params[k]}
              onChange={(e) => setParams({ ...params, [k]: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        ))}

        {showSecond && showCurve && (
          <div className="border-2 rounded p-3 text-lg space-y-1" style={{ borderColor: '#ea580c', background: '#fff7ed' }}>
            <p className="font-semibold">ඡේදන ලක්ෂ්‍ය (Intersection)</p>
            {inters.length ? (
              inters.map((pt, i) => (
                <p key={i}>
                  x = <b>{mf(pt[0])}</b>, y = <b>{mf(pt[1])}</b>
                </p>
              ))
            ) : (
              <p>ඡේදන ලක්ෂ්‍ය නැහැ</p>
            )}
          </div>
        )}

        {quad && showCurve && (
          <div className="border rounded p-3 text-lg space-y-1 bg-slate-50">
            <p>
              Vertex: <b>({fmt(quad.vx)}, {fmt(quad.vy)})</b>
            </p>
            <p>
              Roots:{' '}
              <b>{quad.roots.length ? quad.roots.map(fmt).join(', ') : 'නැහැ (D < 0)'}</b>
            </p>
            <p className="text-sm text-slate-500">Discriminant D = {fmt(quad.D)}</p>
          </div>
        )}
      </aside>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          {showGraph && (
            <>
          <button
            onClick={() => boardRef.current?.zoomIn()}
            className="px-4 py-2 text-xl border rounded hover:bg-slate-100"
          >
            🔍＋
          </button>
          <button
            onClick={() => boardRef.current?.zoomOut()}
            className="px-4 py-2 text-xl border rounded hover:bg-slate-100"
          >
            🔍－
          </button>
          <button
            onClick={() => resetRef.current()}
            className="px-4 py-2 text-lg border rounded hover:bg-slate-100"
          >
            Reset
          </button>
          {([['◀', 120, 0], ['▲', 0, 120], ['▼', 0, -120], ['▶', -120, 0]] as const).map(([label, dx, dy]) => (
            <button
              key={label}
              onClick={() => pan(dx, dy)}
              className="px-4 py-2 text-xl border rounded hover:bg-slate-100"
            >
              {label}
            </button>
          ))}
            </>
          )}
          <button
            onClick={() => setShowPanel((v) => !v)}
            className="px-4 py-2 text-lg border rounded hover:bg-slate-100"
          >
            {showPanel ? '◀ Panel හංගන්න' : '▶ Panel පෙන්නන්න'}
          </button>
          <button
            onClick={() => {
              if (showGraph) {
                savedBoxRef.current = boardRef.current?.getBoundingBox() ?? null;
                setShowTable(true); // graph හංගද්දී table එක පෙනෙන්න ඕන
              }
              setShowGraph((v) => !v);
            }}
            className="px-4 py-2 text-lg border rounded hover:bg-slate-100"
          >
            {showGraph ? '🖼 Graph window හංගන්න' : '🖼 Graph window පෙන්වන්න'}
          </button>
          {showGraph && (
          <button
              onClick={() => {
                if (showCurve) setShowPts(true); // curve හංගද්දී points පෙනෙන්න ඕන
                setShowCurve((v) => !v);
              }}
              className="px-4 py-2 text-lg border rounded hover:bg-slate-100"
            >
              {showCurve ? '👁 Curve හංගන්න' : '👁 Curve පෙන්වන්න'}
            </button>
            )}
          <button
            onClick={() => setShowTable((v) => !v)}
            className="px-4 py-2 text-lg border rounded hover:bg-slate-100"
          >
            {showTable ? '📋 Table හංගන්න' : '📋 Table'}
          </button>
          {showGraph && (
            <span className="self-center text-sm text-slate-500">
              Wheel = zoom, drag / arrow keys = pan
            </span>
          )}
        </div>
        <div
          ref={boxRef}
          className="jxgbox border rounded"
          style={{ width: '100%', flex: '1 1 0', minHeight: 200, display: showGraph ? 'block' : 'none' }}
        />

        {showTable && (
          <div
            style={
              showGraph
                ? { flexShrink: 0, maxHeight: '45%', overflow: 'auto', marginTop: 8 }
                : { flex: '1 1 0', minHeight: 0, overflow: 'auto', marginTop: 8 }
            }
          >
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <button
                className="px-3 py-1 border rounded hover:bg-slate-100"
                onClick={() => {
                  const nums = cols.filter(Number.isFinite);
                  setXs([...xs, String(nums.length ? Math.max(...nums) + 1 : 0)]);
                }}
              >
                ＋ Column
              </button>
              <button
                className="px-3 py-1 border rounded hover:bg-slate-100"
                onClick={() => setXs(xs.slice(0, -1))}
              >
                － Column
              </button>
              <button className="px-3 py-1 border rounded hover:bg-slate-100" onClick={() => setXs(range(-5, 5))}>
                x: −5 … 5
              </button>
              <button className="px-3 py-1 border rounded hover:bg-slate-100" onClick={() => setXs(range(-2, 4))}>
                x: −2 … 4
              </button>
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={showPts} onChange={(e) => setShowPts(e.target.checked)} />
                Graph එකේ points mark කරන්න
              </label>
            </div>

            {renderEqTable(termRows, f, 'y', texHtml, '#1d4ed8', '#2563eb', '#eff6ff')}
            {showSecond && renderEqTable(termRows2, g, 'y₂', tex2Html, '#c2410c', '#ea580c', '#fff7ed')}
          </div>
        )}
      </div>
    </div>
  );
}