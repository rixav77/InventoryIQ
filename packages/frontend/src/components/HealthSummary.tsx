import type { PortfolioSummary } from '../data/dashboard-data';
import { formatInr } from '../utils/format';

interface Props {
  summary: PortfolioSummary;
}

export function HealthSummary({ summary }: Props) {
  return (
    <section className="summary-cards">
      <article className="card card-healthy">
        <span className="card-label">Healthy</span>
        <span className="card-value">{summary.healthy}</span>
      </article>
      <article className="card card-watch">
        <span className="card-label">Watch</span>
        <span className="card-value">{summary.watch}</span>
      </article>
      <article className="card card-critical">
        <span className="card-label">Critical</span>
        <span className="card-value">{summary.critical}</span>
      </article>
      <article className="card">
        <span className="card-label">Capital in inventory</span>
        <span className="card-value">{formatInr(summary.capitalInInventory)}</span>
      </article>
      <article className="card">
        <span className="card-label">Capital in surplus</span>
        <span className="card-value">{formatInr(summary.capitalInSurplus)}</span>
      </article>
      <article className="card">
        <span className="card-label">Pending actions</span>
        <span className="card-value">{summary.pendingActions}</span>
      </article>
    </section>
  );
}
