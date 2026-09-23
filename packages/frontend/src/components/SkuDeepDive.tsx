import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardRow } from '../data/dashboard-data';
import { formatDelta, formatInr, formatNumber } from '../utils/format';

interface Props {
  row: DashboardRow | undefined;
}

export function SkuDeepDive({ row }: Props) {
  if (row === undefined) {
    return <p className="empty">Select a SKU to inspect its demand and MSL recommendation.</p>;
  }

  const chartData = row.sales
    .slice(-30)
    .map((point) => ({ date: point.date.slice(5), units: point.units }));
  const mslData = [
    { name: 'Static', value: Math.round(row.staticMsl) },
    { name: 'Dynamic', value: Math.round(row.dynamicMsl) },
  ];

  return (
    <div className="deep-dive">
      <div className="deep-dive-header">
        <h3>{row.sku}</h3>
        <span className={`badge band-${row.band.toLowerCase()}`}>{row.band}</span>
      </div>
      <p className="subtitle">{row.subcategory}</p>

      <dl className="facts">
        <div>
          <dt>Current stock</dt>
          <dd>{formatNumber(row.currentStock)}</dd>
        </div>
        <div>
          <dt>Open PO / in-transit</dt>
          <dd>
            {formatNumber(row.openPurchaseOrders)} / {formatNumber(row.inTransitStock)}
          </dd>
        </div>
        <div>
          <dt>Static MSL</dt>
          <dd>{formatNumber(row.staticMsl)}</dd>
        </div>
        <div>
          <dt>Dynamic MSL</dt>
          <dd>{formatNumber(row.dynamicMsl)}</dd>
        </div>
        <div>
          <dt>Change</dt>
          <dd>{formatDelta(row.deltaUnits)}</dd>
        </div>
        <div>
          <dt>Weighted DRR (30d)</dt>
          <dd>{row.drr30.toFixed(1)} / day</dd>
        </div>
        <div>
          <dt>Safety stock</dt>
          <dd>{Math.ceil(row.safetyStock)}</dd>
        </div>
        <div>
          <dt>Surplus capital</dt>
          <dd>{formatInr(row.surplusCapital)}</dd>
        </div>
      </dl>

      <div className="chart-block">
        <h4>Daily units (last 30 days)</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="units" stroke="#2563eb" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-block">
        <h4>Static vs dynamic MSL</h4>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={mslData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="rationale">{row.rationale}</p>
    </div>
  );
}
