// GeometryTab.tsx
// LAYOUT: වම් පැත්ත = demo list | දකුණු පැත්ත = උඩින්ම definition (ප්‍රමේයය), යටින් board
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import '../app/jsxgraph.css';
import { DEMOS, makeCtx } from '@/lib/geometryDemos';

let JXGMod: any = null;

export default function GeometryTab() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [demoId, setDemoId] = useState(DEMOS[0].id);
  const [resetKey, setResetKey] = useState(0);
  const demo = DEMOS.find((d) => d.id === demoId) ?? DEMOS[0];

  const groups = useMemo(() => {
    const m = new Map<string, typeof DEMOS>();
    DEMOS.forEach((d) => m.set(d.group, [...(m.get(d.group) ?? []), d]));
    return Array.from(m.entries());
  }, []);

  useEffect(() => {
    let board: any;
    let cancelled = false;
    (async () => {
      if (!JXGMod) JXGMod = (await import('jsxgraph')).default;
      if (cancelled || !boxRef.current) return;
      board = JXGMod.JSXGraph.initBoard(boxRef.current, {
        boundingbox: [-10, 8, 10, -8],
        keepAspectRatio: true, axis: false, grid: false,
        showCopyright: false, showNavigation: false,
        pan: { enabled: false }, zoom: { wheel: false },
      });
      demo.build(makeCtx(board));
      board.update();
    })();
    return () => {
      cancelled = true;
      if (board && JXGMod) { try { JXGMod.JSXGraph.freeBoard(board); } catch {} }
    };
  }, [demoId, resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: 'grid', gap: 12, height: '100%', minHeight: 0, gridTemplateColumns: '320px minmax(0, 1fr)' }}>
      {/* වම් පැත්ත: demo list + කරලා බලමු + reset */}
      <aside style={{ overflowY: 'auto', minHeight: 0, paddingRight: 4 }} className="space-y-4">
        {groups.map(([group, items]) => (
          <div key={group}>
            <p className="text-sm font-semibold text-slate-500 mb-1">{group}</p>
            <div className="flex flex-col gap-1">
              {items.map((d) => (
                <button key={d.id} onClick={() => setDemoId(d.id)} aria-pressed={d.id === demoId}
                  className={`text-left px-3 py-2 rounded border-2 text-lg ${d.id === demoId ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 hover:bg-slate-100'}`}>
                  {d.title}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="p-3 rounded border-2" style={{ borderColor: '#ea580c', background: '#fff7ed' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: '#9a3412' }}>කරලා බලමු (මේක exam එකට ලියන්න එපා)</p>
          <p className="text-lg">{demo.hint}</p>
        </div>
        <button onClick={() => setResetKey((k) => k + 1)} className="px-4 py-2 text-lg border rounded hover:bg-slate-100">↺ මුල් තැනට</button>
      </aside>

      {/* දකුණු පැත්ත: උඩින්ම definition, යටින් board */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, minWidth: 0 }}>
        <div className="p-3 rounded border-2 shrink-0" style={{ borderColor: '#2563eb', background: '#eff6ff' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <p className="text-sm font-semibold text-blue-800">ප්‍රමේයය</p>
            <p className="text-lg font-semibold text-slate-800">{demo.title}</p>
          </div>
          <p className="text-xl mt-1" style={{ whiteSpace: 'pre-line' }}>{demo.theorem}</p>
          {demo.source && <p className="text-sm text-slate-500 mt-2">📖 {demo.source}</p>}
        </div>
        <div ref={boxRef} className="jxgbox border rounded" style={{ width: '100%', flex: 1, minHeight: 300 }} />
      </main>
    </div>
  );
}
