import type { DashboardRow } from '../data/dashboard-data';
import type { Decision } from '../types/decisions';
import { formatDelta, formatInr, formatNumber } from '../utils/format';

interface Props {
  rows: readonly DashboardRow[];
  decisions: Record<string, Decision>;
  onDecide: (sku: string, decision: Decision) => void;
}

export function RecommendationList({ rows, decisions, onDecide }: Props) {
  const pending = rows.filter((row) => row.action !== 'KEEP');

  if (pending.length === 0) {
    return <p className="empty">No MSL changes recommended today.</p>;
  }

  return (
    <div className="recommendations">
      {pending.map((row) => {
        const decision = decisions[row.sku];
        return (
          <article key={row.sku} className="recommendation">
            <div className="recommendation-main">
              <h3>
                {row.sku}{' '}
                <span className={`badge action-${row.action.toLowerCase()}`}>
                  {row.action} MSL
                </span>
              </h3>
              <p>
                Static {formatNumber(row.staticMsl)} → Dynamic {formatNumber(row.dynamicMsl)} (
                {formatDelta(row.deltaUnits)} units) · surplus capital{' '}
                {formatInr(row.surplusCapital)}
              </p>
              <p className="rationale">{row.rationale}</p>
            </div>
            <div className="recommendation-actions">
              {decision === undefined ? (
                <>
                  <button
                    type="button"
                    className="approve"
                    onClick={() => onDecide(row.sku, 'APPROVED')}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="dismiss"
                    onClick={() => onDecide(row.sku, 'DISMISSED')}
                  >
                    Dismiss
                  </button>
                </>
              ) : (
                <span className={`badge decision-${decision.toLowerCase()}`}>{decision}</span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
