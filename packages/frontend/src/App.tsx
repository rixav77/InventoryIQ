import { useMemo, useState } from 'react';
import { DASHBOARD_ROWS, PORTFOLIO_SUMMARY } from './data/dashboard-data';
import { HealthSummary } from './components/HealthSummary';
import { RecommendationList } from './components/RecommendationList';
import { SkuDeepDive } from './components/SkuDeepDive';
import { SkuTable } from './components/SkuTable';
import type { Decision } from './types/decisions';

export function App() {
  const [selectedSku, setSelectedSku] = useState<string>(DASHBOARD_ROWS[0]?.sku ?? '');
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  const selectedRow = useMemo(
    () => DASHBOARD_ROWS.find((row) => row.sku === selectedSku),
    [selectedSku],
  );

  const handleDecision = (sku: string, decision: Decision): void => {
    setDecisions((current) => ({ ...current, [sku]: decision }));
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>InventoryIQ — E-Commerce MSL Dashboard</h1>
        <p className="subtitle">
          Dynamic MSL vs static MSL · deterministic prototype data · recommend-only (no write-back)
        </p>
      </header>

      <HealthSummary summary={PORTFOLIO_SUMMARY} />

      <main className="layout">
        <section className="panel">
          <h2>MSL health overview</h2>
          <SkuTable rows={DASHBOARD_ROWS} selectedSku={selectedSku} onSelect={setSelectedSku} />
        </section>

        <section className="panel">
          <h2>SKU deep dive</h2>
          <SkuDeepDive row={selectedRow} />
        </section>
      </main>

      <section className="panel">
        <h2>Recommendations ({PORTFOLIO_SUMMARY.pendingActions})</h2>
        <RecommendationList rows={DASHBOARD_ROWS} decisions={decisions} onDecide={handleDecision} />
      </section>
    </div>
  );
}
