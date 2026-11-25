'use client';

import { useEffect, useMemo, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { equationTex, polyExpr, solveEquation, type MethodId, type Solution, type Step } from '@/lib/steps';
import type { GraphRequest } from '@/lib/graphRequest';

const EXAMPLES = [
  'x^2 - 2x - 3 = 0',
  '2x^2 + 7x + 3 = 0',
  'x^2 - 5x = 0',
  'x^2 - 4 = 0',
  'x^2 + 2x - 1 = 0',
  'x^2 + 2x + 5 = 0',
  '2x + 4 = 10',
];

const html = (tex: string) => katex.renderToString(tex, { throwOnError: false, displayMode: true });

export default function SolverTab({ onGraph }: { onGraph?: (r: Omit<GraphRequest, 'id'>) => void }) {
  const [input, setInput] = useState('x^2 - 2x - 3 = 0');
  const [methodId, setMethodId] = useState<MethodId>('factor');
  const [stepwise, setStepwise] = useState(false);
  const [shown, setShown] = useState(1);

  const result = useMemo(() => solveEquation(input), [input]);
  const preview = useMemo(() => equationTex(input), [input]);

  // තෝරාගත් ක්‍රමයේ විසඳුම
  const solution: Solution | null =
    result.kind === 'quadratic'
      ? (result.methods.find((m) => m.id === methodId) ?? result.methods[0]).solution
      : result.kind === 'linear'
        ? result.solution
        : null;

  const steps: Step[] = useMemo(
    () => (result.kind === 'error' || !solution ? [] : [...result.pre, ...solution.steps]),
    [result, solution]
  );

  // සමීකරණය / ක්‍රමය / mode වෙනස් වුණාම පළමු පියවරට
  useEffect(() => setShown(1), [input, methodId, stepwise]);

  const visible = stepwise ? steps.slice(0, shown) : steps;
  const finished = !stepwise || shown >= steps.length;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '4px 8px 32px' }}>
      <div style={{ maxWidth: 1000 }}>
        {/* ---------- සමීකරණය ---------- */}
        <label className="block text-sm font-semibold mb-1" htmlFor="eq-input">
          සමීකරණය
        </label>
        <input
          id="eq-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full border-2 rounded px-3 py-2 text-xl font-mono focus:outline-none focus:border-blue-600"
          spellCheck={false}
          placeholder="x^2 - 2x - 3 = 0"
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setInput(ex)}
              className="px-2 py-1 text-sm border rounded hover:bg-slate-100 font-mono"
            >
              {ex}
            </button>
          ))}
        </div>
        {preview && (
          <div className="text-3xl mt-2 overflow-x-auto" dangerouslySetInnerHTML={{ __html: html(preview) }} />
        )}

        {/* ---------- දෝෂ ---------- */}
        {result.kind === 'error' && (
          <p className="mt-4 p-3 rounded border-2 text-lg" style={{ borderColor: '#ea580c', background: '#fff7ed', color: '#9a3412' }}>
            {result.message}
          </p>
        )}

        {/* ---------- ක්‍රම තෝරන්න ---------- */}
        {result.kind === 'quadratic' && (
          <div className="flex flex-wrap gap-2 mt-4" role="tablist" aria-label="විසඳුම් ක්‍රමය">
            {result.methods.map((m) => (
              <button
                key={m.id}
                role="tab"
                aria-selected={m.id === methodId}
                onClick={() => setMethodId(m.id)}
                className={`px-4 py-2 text-lg rounded border-2 ${
                  m.id === methodId
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-slate-300 hover:bg-slate-100'
                }`}
              >
                {m.name}
                {!m.solution.ok && ' ⚠'}
              </button>
            ))}
          </div>
        )}

        {/* ---------- පියවරෙන් පියවර පාලනය ---------- */}
        {steps.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button
              onClick={() => setStepwise((v) => !v)}
              className="px-3 py-1 border rounded hover:bg-slate-100"
            >
              {stepwise ? 'සියලු පියවර එකවර පෙන්වන්න' : 'පියවරෙන් පියවර පෙන්වන්න'}
            </button>
            {stepwise && (
              <>
                <button
                  onClick={() => setShown((n) => Math.max(1, n - 1))}
                  disabled={shown <= 1}
                  className="px-3 py-1 border rounded hover:bg-slate-100 disabled:opacity-40"
                >
                  ◀ පෙර
                </button>
                <button
                  onClick={() => setShown((n) => Math.min(steps.length, n + 1))}
                  disabled={shown >= steps.length}
                  className="px-4 py-1 border-2 border-blue-600 text-blue-700 font-semibold rounded hover:bg-blue-50 disabled:opacity-40"
                >
                  ඊළඟ පියවර ▶
                </button>
                <button onClick={() => setShown(steps.length)} className="px-3 py-1 border rounded hover:bg-slate-100">
                  සියල්ල
                </button>
                <span className="text-sm text-slate-500">
                  {Math.min(shown, steps.length)} / {steps.length}
                </span>
              </>
            )}
          </div>
        )}

        {/* ---------- පියවර ---------- */}
        {visible.length > 0 && (
          <ol className="mt-4 space-y-4 list-none p-0">
            {visible.map((st, i) => (
              <li key={i} className="flex gap-3 pb-3 border-b border-slate-200">
                <span
                  className="shrink-0 flex items-center justify-center rounded-full bg-blue-600 text-white font-semibold"
                  style={{ width: 32, height: 32 }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold">{st.title}</p>
                  {st.note && <p className="text-slate-600">{st.note}</p>}
                  {st.tex.map((t, j) => (
                    <div key={j} className="text-2xl overflow-x-auto" dangerouslySetInnerHTML={{ __html: html(t) }} />
                  ))}
                </div>
              </li>
            ))}
          </ol>
        )}

        {/* ---------- ක්‍රමය අසාර්ථක නම් ---------- */}
        {solution && !solution.ok && finished && (
          <p className="mt-4 p-3 rounded border-2 text-lg" style={{ borderColor: '#ea580c', background: '#fff7ed', color: '#9a3412' }}>
            {solution.message} වෙනත් ක්‍රමයක් තෝරන්න.
          </p>
        )}

        {/* ---------- පිළිතුර ---------- */}
        {solution && solution.ok && finished && (
          <div className="mt-4 p-4 rounded border-2" style={{ borderColor: '#2563eb', background: '#eff6ff' }}>
            <p className="text-lg font-semibold mb-1">පිළිතුර</p>
            {solution.roots.length === 0 ? (
              <p className="text-xl">තාත්වික මූල නැත.</p>
            ) : (
              solution.roots.map((r) => (
                <div key={r.label} className="flex flex-wrap items-center gap-3">
                  <div className="text-3xl" dangerouslySetInnerHTML={{ __html: html(`${r.label} = ${r.tex}`) }} />
                  {!r.exact && (
                    <span className="text-xl text-slate-600">≈ {(Math.round(r.value * 100) / 100).toString()}</span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ---------- Graph එකේ බලන්න ---------- */}
        {onGraph && result.kind !== 'error' && finished && (
          <button
            onClick={() => onGraph({ expr: polyExpr(result.orig.a, result.orig.b, result.orig.c) })}
            className="mt-4 px-4 py-2 text-lg border-2 border-blue-600 text-blue-700 font-semibold rounded hover:bg-blue-50"
          >
            📈 Graph එකේ බලන්න
          </button>
        )}
      </div>
    </div>
  );
}