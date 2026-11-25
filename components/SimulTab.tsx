'use client';

import { useEffect, useMemo, useState } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { equationTex, type Step } from '@/lib/steps';
import { lineExpr, solveSimultaneous, type SimulMethodId } from '@/lib/simul';
import type { GraphRequest } from '@/lib/graphRequest';



const html = (tex: string) => katex.renderToString(tex, { throwOnError: false, displayMode: true });

export default function SimulTab({ onGraph }: { onGraph?: (r: Omit<GraphRequest, 'id'>) => void }) {
  const [eq1, setEq1] = useState('2x + y = 7');
  const [eq2, setEq2] = useState('x - y = 2');
  const [methodId, setMethodId] = useState<SimulMethodId>('elim');
  const [stepwise, setStepwise] = useState(false);
  const [shown, setShown] = useState(1);

  const result = useMemo(() => solveSimultaneous(eq1, eq2), [eq1, eq2]);
  const pre1 = useMemo(() => equationTex(eq1), [eq1]);
  const pre2 = useMemo(() => equationTex(eq2), [eq2]);

  const solution =
    result.kind === 'ok' ? (result.methods.find((m) => m.id === methodId) ?? result.methods[0]).solution : null;

  const steps: Step[] = useMemo(
    () => (result.kind === 'ok' && solution ? [...result.pre, ...solution.steps] : []),
    [result, solution]
  );

  useEffect(() => setShown(1), [eq1, eq2, methodId, stepwise]);

  // Graph tab එකට යවන රේඛා දෙක (y = ...)
  const lines = useMemo(
    () => (result.kind === 'ok' ? [lineExpr(result.eqs[0]), lineExpr(result.eqs[1])] : null),
    [result]
  );

  const visible = stepwise ? steps.slice(0, shown) : steps;
  const finished = !stepwise || shown >= steps.length;

  const warn = { borderColor: '#ea580c', background: '#fff7ed', color: '#9a3412' } as const;

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '4px 8px 32px' }}>
      <div style={{ maxWidth: 1000 }}>
        {/* ---------- සමීකරණ දෙක ---------- */}
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {[
            { label: 'සමීකරණය (1)', value: eq1, set: setEq1, pre: pre1, color: '#2563eb' },
            { label: 'සමීකරණය (2)', value: eq2, set: setEq2, pre: pre2, color: '#ea580c' },
          ].map((f) => (
            <div key={f.label}>
              <label className="block text-sm font-semibold mb-1">{f.label}</label>
              <input
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                className="w-full border-2 rounded px-3 py-2 text-xl font-mono focus:outline-none"
                style={{ borderColor: f.color }}
                spellCheck={false}
                placeholder="2x + y = 7"
              />
              {f.pre && (
                <div
                  className="text-3xl mt-1 overflow-x-auto"
                  style={{ color: f.color }}
                  dangerouslySetInnerHTML={{ __html: html(f.pre) }}
                />
              )}
            </div>
          ))}
        </div>
        

        {/* ---------- දෝෂ ---------- */}
        {result.kind === 'error' && (
          <p className="mt-4 p-3 rounded border-2 text-lg" style={warn}>
            {result.message}
          </p>
        )}

        {/* ---------- ක්‍රම ---------- */}
        {result.kind === 'ok' && (
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
              </button>
            ))}
          </div>
        )}

        {/* ---------- පියවරෙන් පියවර පාලනය ---------- */}
        {steps.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button onClick={() => setStepwise((v) => !v)} className="px-3 py-1 border rounded hover:bg-slate-100">
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

        {/* ---------- විසඳුමක් නැත / අනන්ත ---------- */}
        {solution && solution.status !== 'unique' && finished && (
          <p className="mt-4 p-3 rounded border-2 text-lg" style={warn}>
            {solution.message}
          </p>
        )}

        {/* ---------- පිළිතුර ---------- */}
        {solution && solution.status === 'unique' && solution.answer && finished && (
          <div className="mt-4 p-4 rounded border-2" style={{ borderColor: '#2563eb', background: '#eff6ff' }}>
            <p className="text-lg font-semibold mb-1">පිළිතුර</p>
            <div
              className="text-3xl"
              dangerouslySetInnerHTML={{
                __html: html(`x = ${solution.answer.xTex},\\qquad y = ${solution.answer.yTex}`),
              }}
            />
          </div>
        )}

        {/* ---------- Graph එකේ බලන්න ---------- */}
        {onGraph && result.kind === 'ok' && finished && lines && (
          lines[0] !== null && lines[1] !== null ? (
            <button
              onClick={() => onGraph({ expr: lines[0] as string, expr2: lines[1] as string })}
              className="mt-4 px-4 py-2 text-lg border-2 border-blue-600 text-blue-700 font-semibold rounded hover:bg-blue-50"
            >
              📈 Graph එකේ බලන්න
            </button>
          ) : (
            <p className="mt-4 text-slate-600">x = c වගේ සිරස් රේඛා Graph tab එකේ පෙන්විය නොහැක.</p>
          )
        )}
      </div>
    </div>
  );
}