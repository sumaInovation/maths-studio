'use client';

import { useEffect, useMemo, useState } from 'react';
import { computeStats, fmt, groupRaw, monotoneCurve, niceStep, niceWidth, parseNumbers, percentile, type FullRow, type Stats } from '@/lib/stats';

type Row = { lo: string; hi: string; f: string };
type ChartId = 'hist' | 'poly' | 'ogive';

const SAMPLE_ROWS: Row[] = [
  { lo: '40', hi: '45', f: '3' },
  { lo: '45', hi: '50', f: '7' },
  { lo: '50', hi: '55', f: '12' },
  { lo: '55', hi: '60', f: '15' },
  { lo: '60', hi: '65', f: '8' },
  { lo: '65', hi: '70', f: '5' },
];
const SAMPLE_RAW = '52 47 61 58 45 55 63 49 57 60 54 66 51 59 48 56 62 53 58 64 50 57 55 46 61 59 52 56 68 54';
const num = (s: string) => (s.trim() === '' ? NaN : Number(s));
const toRows = (rs: { lo: number; hi: number; f: number }[]): Row[] => rs.map((r) => ({ lo: String(r.lo), hi: String(r.hi), f: String(r.f) }));

const W = 900, H = 520, ML = 80, MR = 30, MT = 30, MB = 80;

function Axes({ xMin, xMax, yMax, ticksX, yStep, xLabel, yLabel }: { xMin: number; xMax: number; yMax: number; ticksX: number[]; yStep: number; xLabel: string; yLabel: string }) {
  const sx = (x: number) => ML + ((x - xMin) / (xMax - xMin)) * (W - ML - MR);
  const sy = (y: number) => H - MB - (y / yMax) * (H - MT - MB);
  const ys: number[] = [];
  for (let y = 0; y <= yMax + 1e-9; y += yStep) ys.push(Math.round(y * 1e6) / 1e6);
  const skip = Math.ceil(ticksX.length / 14);
  return (
    <g>
      {ys.map((y) => (
        <g key={'y' + y}>
          <line x1={ML} x2={W - MR} y1={sy(y)} y2={sy(y)} stroke='#fca5a5' strokeWidth={y === 0 ? 0 : 1} />
          <text x={ML - 10} y={sy(y) + 6} textAnchor='end' fontSize={18} fill='#111827'>{fmt(y)}</text>
        </g>
      ))}
      {ticksX.map((x, i) => (
        <g key={'x' + x}>
          <line x1={sx(x)} x2={sx(x)} y1={MT} y2={H - MB} stroke='#fca5a5' strokeWidth={1} />
          {i % skip === 0 && (<text x={sx(x)} y={H - MB + 26} textAnchor='middle' fontSize={18} fill='#111827'>{fmt(x)}</text>)}
        </g>
      ))}
      <line x1={ML} x2={W - MR} y1={sy(0)} y2={sy(0)} stroke='#111827' strokeWidth={2.5} />
      <line x1={ML} x2={ML} y1={MT} y2={sy(0)} stroke='#111827' strokeWidth={2.5} />
      <text x={(ML + W - MR) / 2} y={H - 16} textAnchor='middle' fontSize={20} fill='#111827'>{xLabel}</text>
      <text transform={`translate(22 ${(MT + H - MB) / 2}) rotate(-90)`} textAnchor='middle' fontSize={20} fill='#111827'>{yLabel}</text>
    </g>
  );
}

function Histogram({ st, polygon }: { st: Stats; polygon: boolean }) {
  const rows = st.rows;
  const w0 = rows[0].hi - rows[0].lo, wN = rows[rows.length - 1].hi - rows[rows.length - 1].lo;
  const xMin = polygon ? rows[0].lo - w0 : rows[0].lo;
  const xMax = polygon ? rows[rows.length - 1].hi + wN : rows[rows.length - 1].hi;
  const val = (r: FullRow) => (st.equalWidth || polygon ? r.f : r.f / (r.hi - r.lo));
  const maxV = Math.max(...rows.map(val), 1);
  const yStep = niceStep(maxV);
  const yMax = Math.ceil(maxV / yStep - 1e-9) * yStep;
  const sx = (x: number) => ML + ((x - xMin) / (xMax - xMin)) * (W - ML - MR);
  const sy = (y: number) => H - MB - (y / yMax) * (H - MT - MB);
  const ticks = Array.from(new Set(rows.flatMap((r) => [r.lo, r.hi]))).sort((a, b) => a - b);
  const pts: [number, number][] = [[rows[0].lo - w0 / 2, 0], ...rows.map((r) => [r.mid, r.f] as [number, number]), [rows[rows.length - 1].hi + wN / 2, 0]];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role='img' aria-label={polygon ? 'freq polygon' : 'histogram'} style={{ width: '100%', height: 'auto', display: 'block', background: '#fff' }}>
      <Axes xMin={xMin} xMax={xMax} yMax={yMax} ticksX={polygon ? [...ticks, ...[xMin, xMax].filter((v) => !ticks.includes(v))].sort((a, b) => a - b) : ticks} yStep={yStep} xLabel='class interval' yLabel={st.equalWidth || polygon ? 'frequency' : 'frequency density'} />
      {rows.map((r, i) => (
        <g key={i}>
          <rect x={sx(r.lo)} y={sy(val(r))} width={sx(r.hi) - sx(r.lo)} height={sy(0) - sy(val(r))} fill={polygon ? 'none' : '#93c5fd'} fillOpacity={0.6} stroke='#1d4ed8' strokeWidth={polygon ? 1 : 2.5} strokeDasharray={polygon ? '5 4' : undefined} />
          {!polygon && (<text x={(sx(r.lo) + sx(r.hi)) / 2} y={sy(val(r)) - 8} textAnchor='middle' fontSize={18} fill='#1e3a8a'>{fmt(val(r))}</text>)}
        </g>
      ))}
      {polygon && (<g><polyline points={pts.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ')} fill='none' stroke='#ea580c' strokeWidth={4} />{pts.map(([x, y], i) => (<circle key={i} cx={sx(x)} cy={sy(y)} r={6} fill='#ea580c' stroke='#7c2d12' strokeWidth={2} />))}</g>)}
    </svg>
  );
}

function Ogive({ st, smooth, guides }: { st: Stats; smooth: boolean; guides: boolean }) {
  const rows = st.rows;
  const xMin = rows[0].lo, xMax = rows[rows.length - 1].hi;
  const yStep = niceStep(st.n);
  const yMax = Math.ceil(st.n / yStep - 1e-9) * yStep;
  const sx = (x: number) => ML + ((x - xMin) / (xMax - xMin)) * (W - ML - MR);
  const sy = (y: number) => H - MB - (y / yMax) * (H - MT - MB);
  const xs = [rows[0].lo, ...rows.map((r) => r.hi)];
  const ys = [0, ...rows.map((r) => r.cf)];
  const line = smooth ? monotoneCurve(xs, ys) : xs.map((x, i) => [x, ys[i]] as [number, number]);
  const marks = [{ label: 'Q1', y: st.n / 4, x: st.q1, color: '#7c3aed' }, { label: 'Median', y: st.n / 2, x: st.median, color: '#dc2626' }, { label: 'Q3', y: (3 * st.n) / 4, x: st.q3, color: '#16a34a' }];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role='img' aria-label='ogive' style={{ width: '100%', height: 'auto', display: 'block', background: '#fff' }}>
      <Axes xMin={xMin} xMax={xMax} yMax={yMax} ticksX={xs} yStep={yStep} xLabel='upper class limit' yLabel='cumulative frequency' />
      <polyline points={line.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ')} fill='none' stroke='#2563eb' strokeWidth={4} />
      {xs.map((x, i) => (<circle key={i} cx={sx(x)} cy={sy(ys[i])} r={6} fill='#2563eb' stroke='#1e3a8a' strokeWidth={2} />))}
      {guides && marks.map((m, mi) => (<g key={m.label}><line x1={ML} x2={sx(m.x)} y1={sy(m.y)} y2={sy(m.y)} stroke={m.color} strokeWidth={2.5} strokeDasharray='8 6' /><line x1={sx(m.x)} x2={sx(m.x)} y1={sy(m.y)} y2={sy(0)} stroke={m.color} strokeWidth={2.5} strokeDasharray='8 6' /><circle cx={sx(m.x)} cy={sy(m.y)} r={7} fill={m.color} /><rect x={sx(m.x) + 8} y={sy(0) - 34 - mi * 28} width={m.label.length * 11 + 78} height={26} fill='#fff' fillOpacity={0.9} /><text x={sx(m.x) + 12} y={sy(0) - 14 - mi * 28} fontSize={19} fontWeight={700} fill={m.color}>{m.label} = {fmt(m.x)}</text></g>))}
    </svg>
  );
}

export default function DataTab() {
  const [rows, setRows] = useState<Row[]>(SAMPLE_ROWS);
  const [raw, setRaw] = useState('');
  const [classes, setClasses] = useState('6');
  const [chart, setChart] = useState<ChartId>('hist');
  const [smooth, setSmooth] = useState(true);
  const [guides, setGuides] = useState(true);
  const [showTable, setShowTable] = useState(true);
  const [showChart, setShowChart] = useState(true);
  const [showSummary, setShowSummary] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [showRaw, setShowRaw] = useState(true);
  const [chartOpen, setChartOpen] = useState(false);
  const parsed = useMemo(() => rows.map((r) => ({ lo: num(r.lo), hi: num(r.hi), f: num(r.f) })), [rows]);
  const st = useMemo(() => computeStats(parsed), [parsed]);
  const rawNums = useMemo(() => parseNumbers(raw), [raw]);
  const rawInfo = useMemo(() => { if (!rawNums.length) return null; const min = Math.min(...rawNums), max = Math.max(...rawNums); const k = Math.max(1, Math.round(Number(classes) || 1)); return { n: rawNums.length, min, max, range: max - min, k, width: niceWidth((max - min) / k) }; }, [rawNums, classes]);
  const issues = useMemo(() => { const out: string[] = []; rows.forEach((r, i) => { const lo = num(r.lo), hi = num(r.hi), f = num(r.f); if (![lo, hi, f].every(Number.isFinite)) out.push(`Row ${i + 1}: empty / wrong value.`); else if (hi <= lo) out.push(`Row ${i + 1}: hi must be > lo.`); else if (f < 0) out.push(`Row ${i + 1}: f cannot be negative.`); if (i > 0 && Number.isFinite(lo) && Number.isFinite(num(rows[i - 1].hi)) && lo !== num(rows[i - 1].hi)) out.push(`Row ${i + 1}: classes not continuous.`); }); return out; }, [rows]);
  const setCell = (i: number, key: keyof Row, v: string) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: v } : r)));
  const addRow = () => setRows((rs) => { const last = rs[rs.length - 1]; const hi = last ? num(last.hi) : 0; const w = last ? num(last.hi) - num(last.lo) : 5; const lo = Number.isFinite(hi) ? hi : 0; return [...rs, { lo: String(lo), hi: String(lo + (Number.isFinite(w) && w > 0 ? w : 5)), f: '0' }]; });
  const med = useMemo(() => { if (!st || !st.medianClass) return null; const r = st.rows.find((x) => x.lo === st.medianClass!.lo && x.hi === st.medianClass!.hi)!; const F = r.cf - r.f; return { L: r.lo, F, f: r.f, w: r.hi - r.lo, half: st.n / 2 }; }, [st]);
  const btn = 'px-3 py-1 border rounded hover:bg-slate-100';
  const cell = { border: '1px solid #475569' } as const;
  const zoomIn = () => setZoom((z) => Math.min(2.5, Math.round((z + 0.25) * 100) / 100));
  const zoomOut = () => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100));
  const zoomReset = () => setZoom(1);
  const openFullscreen = () => { setZoom(0.75); setChartOpen(true); };
  const closeFullscreen = () => { setChartOpen(false); setZoom(1); };
  const gridCols = showTable && showChart ? 'minmax(300px, 360px) minmax(0, 1fr)' : 'minmax(0, 1fr)';
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '4px 8px 32px' }}>
      <div className='flex flex-wrap items-center gap-2 mb-3 p-2 rounded border-2' style={{ position: 'sticky', top: 0, zIndex: 50, borderColor: '#cbd5e1', background: '#f8fafc', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        <span className='font-semibold text-sm text-slate-700 mr-1'>Show / Hide:</span>
        <button onClick={() => setShowTable((v) => !v)} className={`px-3 py-1.5 text-sm rounded border-2 font-semibold ${showTable ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-600'}`}>{showTable ? 'Table ON' : 'Table OFF'}</button>
        <button onClick={() => setShowChart((v) => !v)} className={`px-3 py-1.5 text-sm rounded border-2 font-semibold ${showChart ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-600'}`}>{showChart ? 'Chart ON' : 'Chart OFF'}</button>
        <button onClick={() => setShowSummary((v) => !v)} className={`px-3 py-1.5 text-sm rounded border-2 font-semibold ${showSummary ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-600'}`}>{showSummary ? 'Summary ON' : 'Summary OFF'}</button>
        <span className='mx-1 text-slate-300'>|</span>
        <span className='font-semibold text-sm text-slate-700'>Chart Zoom:</span>
        <button onClick={zoomOut} disabled={!showChart || zoom <= 0.5} className='px-3 py-1.5 text-sm border-2 rounded font-bold disabled:opacity-40 hover:bg-slate-100'>-</button>
        <span className='px-2 py-1 text-sm font-mono font-bold bg-white border rounded min-w-[56px] text-center'>{Math.round(zoom * 100)}%</span>
        <button onClick={zoomIn} disabled={!showChart || zoom >= 2.5} className='px-3 py-1.5 text-sm border-2 rounded font-bold disabled:opacity-40 hover:bg-slate-100'>+</button>
        <button onClick={zoomReset} disabled={!showChart} className='px-3 py-1.5 text-sm border rounded hover:bg-slate-100 disabled:opacity-40'>Reset</button>
        <button onClick={() => setShowRaw((v) => !v)} className={`px-3 py-1.5 text-sm rounded border-2 font-semibold ${showRaw ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-600'}`}>{showRaw ? 'Raw Data ON' : 'Raw Data OFF'}</button>
        <button onClick={() => openFullscreen()} disabled={!st} className='px-3 py-1.5 text-sm border-2 border-blue-600 text-blue-700 font-semibold rounded hover:bg-blue-50 disabled:opacity-40'>⛶ Chart Fullscreen</button>
        <button onClick={() => { setShowTable(true); setShowChart(true); setShowSummary(true); setShowRaw(true); setZoom(1); }} className='px-3 py-1.5 text-sm border rounded hover:bg-slate-100'>Show All</button>
      </div>
      <div className='grid gap-4' style={{ gridTemplateColumns: gridCols, alignItems: 'start' }}>
        <aside className='space-y-4'>
          {showRaw && (<div className='p-3 rounded border-2' style={{ borderColor: '#cbd5e1' }}>
            <p className='font-semibold mb-1'>Raw data to table</p>
            <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={4} placeholder='52 47 61 58 ...' className='w-full border rounded px-2 py-1 font-mono' spellCheck={false} />
            <div className='flex flex-wrap items-center gap-2 mt-2'><label className='text-sm'>Classes</label><input value={classes} onChange={(e) => setClasses(e.target.value)} className='w-16 border rounded px-2 py-1 text-center' inputMode='numeric' /><button className={btn} onClick={() => setRaw(SAMPLE_RAW)}>Example</button></div>
            {rawInfo && (<p className='text-sm text-slate-600 mt-2'>n = {rawInfo.n}. Range = {fmt(rawInfo.max)} - {fmt(rawInfo.min)} = <b>{fmt(rawInfo.range)}</b>. Width <b>{fmt(rawInfo.width)}</b></p>)}
            <button className='mt-2 px-3 py-1 border-2 border-blue-600 text-blue-700 font-semibold rounded hover:bg-blue-50 disabled:opacity-40' disabled={!rawNums.length} onClick={() => setRows(toRows(groupRaw(rawNums, Number(classes) || 1)))}>Build Table</button>
          </div>)}
          {!showRaw && (<button onClick={() => setShowRaw(true)} className='px-3 py-1.5 text-sm border rounded hover:bg-slate-100'>+ Show Raw Data box</button>)}
          {st && showSummary && (<div className='p-3 rounded border-2 space-y-2' style={{ borderColor: '#2563eb', background: '#eff6ff' }}><p className='font-semibold text-blue-800'>Summary</p><p>n = <b>{st.n}</b></p><p>Mean = {fmt(st.sumFx)} / {st.n} = <b>{fmt(st.mean)}</b></p>{st.modal && (<p>Modal class = <b>{fmt(st.modal.lo)} - {fmt(st.modal.hi)}</b> (f = {st.modal.f})</p>)}{med && (<p>Median class = <b>{fmt(med.L)} - {fmt(med.L + med.w)}</b><br />Median = {fmt(med.L)} + ({fmt(med.half)} - {fmt(med.F)}) / {fmt(med.f)} x {fmt(med.w)} = <b>{fmt(st.median)}</b></p>)}<p>Q1 = <b>{fmt(st.q1)}</b><br />Q3 = <b>{fmt(st.q3)}</b><br />IQR = Q3 - Q1 = <b>{fmt(st.iqr)}</b></p></div>)}
        </aside>
        <section style={{ display: 'grid', gridTemplateColumns: (showTable && showChart) ? 'minmax(360px, 0.85fr) minmax(0, 1.35fr)' : 'minmax(0, 1fr)', gap: 16, alignItems: 'start', minWidth: 0 }}>
          {showTable && (<div className='overflow-x-auto'><table className='border-collapse text-center text-lg'><thead><tr style={{ background: '#eff6ff' }}><th style={cell} className='px-3 py-1'>Class</th><th style={cell} className='px-3 py-1'>f</th><th style={cell} className='px-3 py-1'>x</th><th style={cell} className='px-3 py-1'>fx</th><th style={cell} className='px-3 py-1'>cf</th><th className='px-1' /></tr></thead><tbody>{rows.map((r, i) => { const full = st?.rows.find((x) => x.lo === num(r.lo) && x.hi === num(r.hi)); const inp = 'w-16 py-1 text-center bg-transparent outline-none focus:bg-yellow-100'; return (<tr key={i}><td style={{ ...cell, background: '#fefce8' }} className='px-2'><input value={r.lo} onChange={(e) => setCell(i, 'lo', e.target.value)} className={inp} inputMode='decimal' /><span> - </span><input value={r.hi} onChange={(e) => setCell(i, 'hi', e.target.value)} className={inp} inputMode='decimal' /></td><td style={{ ...cell, background: '#fefce8' }} className='p-0'><input value={r.f} onChange={(e) => setCell(i, 'f', e.target.value)} className={inp} inputMode='numeric' /></td><td style={cell} className='px-3 py-1'>{full ? fmt(full.mid) : ''}</td><td style={cell} className='px-3 py-1'>{full ? fmt(full.fx) : ''}</td><td style={cell} className='px-3 py-1'>{full ? fmt(full.cf) : ''}</td><td className='px-1'><button onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className='text-slate-500 hover:text-red-600 px-2'>x</button></td></tr>); })}{st && (<tr style={{ background: '#f1f5f9', fontWeight: 600 }}><td style={cell} className='px-3 py-1'>Total</td><td style={cell} className='px-3 py-1'>{st.n}</td><td style={cell} /><td style={cell} className='px-3 py-1'>{fmt(st.sumFx)}</td><td style={cell} /><td /></tr>)}</tbody></table><div className='flex flex-wrap gap-2 mt-2'><button className={btn} onClick={addRow}>+ Add class</button><button className={btn} onClick={() => setRows(SAMPLE_ROWS)}>Example table</button></div>{issues.length > 0 && (<ul className='mt-2 text-sm list-disc pl-5' style={{ color: '#9a3412' }}>{issues.map((m, i) => <li key={i}>{m}</li>)}</ul>)}</div>)}
          {st ? (showChart ? (<div><div className='flex flex-wrap items-center gap-2 mb-2'>{([['hist', 'Histogram'], ['poly', 'Polygon'], ['ogive', 'Ogive']] as [ChartId, string][]).map(([id, label]) => (<button key={id} onClick={() => setChart(id)} className={`px-4 py-2 text-lg rounded border-2 ${chart === id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 hover:bg-slate-100'}`}>{label}</button>))}{chart === 'ogive' && (<><label className='flex items-center gap-1 text-sm ml-2'><input type='checkbox' checked={smooth} onChange={(e) => setSmooth(e.target.checked)} /> Smooth</label><label className='flex items-center gap-1 text-sm'><input type='checkbox' checked={guides} onChange={(e) => setGuides(e.target.checked)} /> Show Q1, Median, Q3</label></>)}</div>{!st.equalWidth && chart !== 'ogive' && (<p className='text-sm mb-1' style={{ color: '#9a3412' }}>Unequal width: height = f / width.</p>)}<div className='flex justify-end mb-1'><button onClick={() => openFullscreen()} className='px-3 py-1 text-sm border-2 border-blue-600 text-blue-700 font-semibold rounded hover:bg-blue-50'>⛶ View Chart in Fullscreen</button></div><div style={{ overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff' }}><div style={{ width: `${zoom * 100}%`, margin: '0 auto' }}>{chart === 'hist' && <Histogram st={st} polygon={false} />}{chart === 'poly' && <Histogram st={st} polygon />}{chart === 'ogive' && <Ogive st={st} smooth={smooth} guides={guides} />}</div></div><p className='text-xs text-slate-500 mt-1'>Zoom: {Math.round(zoom * 100)}% - Zoom Out = whole graph visible.</p></div>) : (<p className='p-3 rounded border-2 text-slate-600' style={{ borderColor: '#cbd5e1', background: '#f8fafc' }}>Chart hidden. Click Chart ON above.</p>)) : (<p className='p-3 rounded border-2 text-lg' style={{ borderColor: '#ea580c', background: '#fff7ed', color: '#9a3412' }}>Enter valid classes and frequencies.</p>)}
          {!showTable && !showChart && (<p className='p-3 rounded border-2 text-slate-600' style={{ borderColor: '#cbd5e1', background: '#f8fafc' }}>Table and Chart both hidden. Click Show All.</p>)}
        </section>
      </div>

      {chartOpen && st && (
        <div onClick={() => closeFullscreen()} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', padding: 12 }} role='dialog' aria-modal='true' aria-label='Chart fullscreen'>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className='flex flex-wrap items-center gap-2 p-3 border-b'>
              <span className='font-bold text-lg mr-1'>Chart - Fullscreen</span>
              {([['hist', 'Histogram'], ['poly', 'Polygon'], ['ogive', 'Ogive']] as [ChartId, string][]).map(([id, label]) => (<button key={id} onClick={() => setChart(id)} className={`px-3 py-1.5 text-sm rounded border-2 ${chart === id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'}`}>{label}</button>))}
              {chart === 'ogive' && (<><label className='flex items-center gap-1 text-sm'><input type='checkbox' checked={smooth} onChange={(e) => setSmooth(e.target.checked)} /> Smooth</label><label className='flex items-center gap-1 text-sm'><input type='checkbox' checked={guides} onChange={(e) => setGuides(e.target.checked)} /> Q1 / Median / Q3</label></>)}
              <span className='mx-1 text-slate-300'>|</span>
              <button onClick={zoomOut} disabled={zoom <= 0.5} className='px-3 py-1.5 text-sm border-2 rounded font-bold disabled:opacity-40'>-</button>
              <span className='px-2 py-1 text-sm font-mono font-bold border rounded'>{Math.round(zoom * 100)}%</span>
              <button onClick={zoomIn} disabled={zoom >= 2.5} className='px-3 py-1.5 text-sm border-2 rounded font-bold disabled:opacity-40'>+</button>
              <button onClick={() => setZoom(0.75)} className='px-3 py-1.5 text-sm border rounded'>Reset to 75%</button>
              <button onClick={() => closeFullscreen()} className='ml-auto px-4 py-1.5 text-sm bg-red-600 text-white font-bold rounded hover:bg-red-700'>X Close (Esc)</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 16, background: '#fff' }}>
              <div style={{ width: `${zoom * 100}%`, margin: '0 auto' }}>
                {chart === 'hist' && <Histogram st={st} polygon={false} />}
                {chart === 'poly' && <Histogram st={st} polygon />}
                {chart === 'ogive' && <Ogive st={st} smooth={smooth} guides={guides} />}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
