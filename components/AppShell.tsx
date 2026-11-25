'use client';

import { useState, type CSSProperties } from 'react';
import GraphTab from '@/components/GraphTab';
import SolverTab from '@/components/SolverTab';
import SimulTab from '@/components/SimulTab';
import GeometryTab from '@/components/GeometryTab';
import DataTab from '@/components/DataTab';
import type { GraphRequest } from '@/lib/graphRequest';

const TABS = [
  { id: 'graph', label: '📈 Graph' },
  { id: 'solver', label: '🧮 වර්ගජ සමීකරණ' },
  { id: 'simul', label: '🔗 සමගාමී සමීකරණ' },
  { id: 'geometry', label: '📐 ජ්‍යාමිතිය' },
  { id: 'data', label: '📊 දත්ත' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export default function AppShell() {
  const [tab, setTab] = useState<TabId>('graph');
  const [graphReq, setGraphReq] = useState<GraphRequest | null>(null);

  // Solver tabs වලින් equation Graph tab එකට යවලා ඒ tab එකට මාරු වෙනවා
  const openGraph = (r: Omit<GraphRequest, 'id'>) => {
    setGraphReq({ id: Date.now(), ...r });
    setTab('graph');
  };

  // ටැබ් දෙකම mount කරලා තියලා, සක්‍රීය නොවන එක පමණක් හංගනවා (Graph එකේ zoom/pan/table රැකෙන්න)
  const pane = (id: TabId): CSSProperties => ({
    position: 'absolute',
    inset: 0,
    visibility: tab === id ? 'visible' : 'hidden',
    pointerEvents: tab === id ? 'auto' : 'none',
  });

  return (
    <main
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 12,
        overflow: 'hidden',
        boxSizing: 'border-box',
        background: '#fff',
        color: '#0f172a',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Maths Studio</h1>
        <nav role="tablist" aria-label="කොටස්" style={{ display: 'flex', gap: 6 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1 text-lg rounded border-2 ${
                tab === t.id
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-slate-300 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <div style={pane('graph')}>
          <GraphTab request={graphReq} />
        </div>
        <div style={pane('solver')}>
          <SolverTab onGraph={openGraph} />
        </div>
        <div style={pane('simul')}>
          <SimulTab onGraph={openGraph} />
        </div>
        <div style={pane('geometry')}>
          <GeometryTab />
        </div>
        <div style={pane('data')}>
          <DataTab />
        </div>
      </div>
    </main>
  );
}