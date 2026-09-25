import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AbcClass, XyzClass } from '@inventoryiq/core';
import { CATEGORY_AVERAGE_RETURN_RATE, PORTFOLIO, SEASONALITY, SKUS } from '../data/model';
import { Badge, CHART_INK, Callout, Panel, Stat } from '../components/ui';
import { formatDecimalDays, formatInt, formatPct, monthName } from '../utils/format';

const ABC_ROWS: readonly AbcClass[] = ['A', 'B', 'C'];
const XYZ_COLS: readonly XyzClass[] = ['X', 'Y', 'Z'];

function matrixCell(abc: AbcClass, xyz: XyzClass) {
  const combined = `${abc}${xyz}`;
  const members = SKUS.filter((model) => model.classification.combinedClass === combined);
  return {
    combined,
    count: members.length,
    share: members.reduce((sum, model) => sum + model.classification.revenueShare, 0) * 100,
    service: members[0]?.classification.serviceLevelTarget ?? null,
  };
}

export function DemandSection() {
  const peakReturn = Math.max(...SKUS.map((model) => model.returnRate30));
  const seasonality = SEASONALITY.indices.map((entry) => ({
    month: monthName(entry.month),
    index: Number(entry.index.toFixed(2)),
  }));
  const strongest = monthName(SEASONALITY.strongestMonth);
  const weakest = monthName(SEASONALITY.weakestMonth);

  return (
    <>
      <p className="section-intro">
        Procura carries safety stock of zero on every row and plans against gross shipments. This layer adds
        statistical safety stock sized by demand and lead-time variance, segments the catalogue so service
        levels differ by consequence, models the festival calendar, and nets out returns.
      </p>

      <div className="stats stagger">
        <Stat
          label="Safety stock, before → after"
          value={`0 → ${formatInt(PORTFOLIO.safetyStockAfter)}`}
          sub="units of buffer, sized per service class"
        />
        <Stat
          label="Class AX SKUs"
          value={formatInt(SKUS.filter((model) => model.classification.combinedClass === 'AX').length)}
          sub="99% service level, z = 2.33"
        />
        <Stat
          label="Peak return rate"
          value={formatPct(peakReturn * 100)}
          sub={`vs ${formatPct(CATEGORY_AVERAGE_RETURN_RATE * 100)} category norm`}
        />
        <Stat
          label="Return-rate anomalies"
          value={formatInt(SKUS.filter((model) => model.returnAnomaly).length)}
          sub="above 1.5× the category norm"
        />
      </div>

      <div className="grid">
        <Panel
          className="col-5"
          title="ABC × XYZ segmentation"
          desc="Revenue contribution against demand predictability. Each cell shows SKUs, revenue share and the service level the engine assigns."
          foot={
            <>
              <Badge tone="info">A ≤ 80% cumulative revenue</Badge>
              <Badge tone="info">X ≤ 0.25 CV</Badge>
            </>
          }
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto repeat(3, minmax(0, 1fr))',
              gap: 6,
            }}
          >
            <span />
            {XYZ_COLS.map((xyz) => (
              <span key={xyz} className="filter-label" style={{ textAlign: 'center' }}>
                {xyz}
              </span>
            ))}
            {ABC_ROWS.map((abc) => (
              <div key={abc} style={{ display: 'contents' }}>
                <span className="filter-label" style={{ alignSelf: 'center' }}>
                  {abc}
                </span>
                {XYZ_COLS.map((xyz) => {
                  const cell = matrixCell(abc, xyz);
                  return (
                    <div
                      key={cell.combined}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        padding: '10px',
                        background: cell.count > 0 ? 'var(--secondary)' : 'transparent',
                      }}
                    >
                      <div
                        className="display"
                        style={{ fontSize: 22, lineHeight: 1, opacity: cell.count > 0 ? 1 : 0.35 }}
                      >
                        {cell.count}
                      </div>
                      <div className="kv-label" style={{ marginTop: 4 }}>
                        {cell.count > 0 ? `${cell.share.toFixed(1)}% rev` : 'empty'}
                      </div>
                      {cell.service !== null ? (
                        <div className="kv-label" style={{ marginTop: 2 }}>
                          {formatPct(cell.service * 100, 0)} svc
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          className="col-7"
          title="Safety stock per SKU"
          desc="Z × √(LT·σ²_demand + DRR²·σ²_lead-time), with Z taken from the SKU's ABC/XYZ class."
        >
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Recommended safety stock by SKU and service class</caption>
              <thead>
                <tr>
                  <th scope="col">SKU</th>
                  <th scope="col">Class</th>
                  <th scope="col" className="right">
                    SS now
                  </th>
                  <th scope="col" className="right">
                    SS recommended
                  </th>
                  <th scope="col" className="right">
                    σ demand
                  </th>
                  <th scope="col" className="right">
                    Lead time
                  </th>
                  <th scope="col" className="right">
                    Target
                  </th>
                </tr>
              </thead>
              <tbody>
                {SKUS.map((model) => (
                  <tr key={model.sku}>
                    <th scope="row" className="sku">
                      {model.sku}
                    </th>
                    <td>
                      <Badge tone={model.classification.abcClass === 'A' ? 'info' : 'neutral'}>
                        {model.classification.combinedClass}
                      </Badge>
                    </td>
                    <td className="right num">{formatInt(model.safetyStockCurrent)}</td>
                    <td className="right num">{formatInt(model.safetyStockRecommended)}</td>
                    <td className="right num">{formatInt(model.demandStdDev)}</td>
                    <td className="right num">{formatDecimalDays(model.leadTimeAverage)}</td>
                    <td className="right num">
                      {formatPct(model.classification.serviceLevelTarget * 100, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          className="col-7"
          title="Seasonal demand index"
          desc="Monthly SSD demand indexed to the two-year average. Festival quarter (Oct–Nov) is where e-commerce MSL needs its buffer."
          foot={<Badge tone="neutral">simulated monthly demand</Badge>}
        >
          <div className="chart">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={seasonality} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 90)" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} width={46} />
                <Tooltip />
                <Bar dataKey="index" radius={[3, 3, 0, 0]}>
                  {seasonality.map((entry) => (
                    <Cell
                      key={entry.month}
                      fill={
                        entry.month === strongest
                          ? CHART_INK.crit
                          : entry.month === weakest
                            ? CHART_INK.faint
                            : CHART_INK.secondary
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="section-intro" style={{ marginTop: 10, marginBottom: 0 }}>
            Strongest month <span className="mono">{strongest}</span> · weakest month{' '}
            <span className="mono">{weakest}</span>.
          </p>
        </Panel>

        <Panel
          className="col-5"
          title="Net demand after returns"
          desc="Net DRR = gross DRR × (1 − return rate). Planning on gross shipments structurally over-procures."
        >
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Gross and net daily run rate with return rates</caption>
              <thead>
                <tr>
                  <th scope="col">SKU</th>
                  <th scope="col" className="right">
                    Gross
                  </th>
                  <th scope="col" className="right">
                    Returns
                  </th>
                  <th scope="col" className="right">
                    Net
                  </th>
                  <th scope="col">Flag</th>
                </tr>
              </thead>
              <tbody>
                {[...SKUS]
                  .sort((a, b) => b.returnRate30 - a.returnRate30)
                  .map((model) => (
                    <tr key={model.sku}>
                      <th scope="row" className="sku">
                        {model.sku}
                      </th>
                      <td className="right num">{model.netDemand.grossDrr.toFixed(1)}</td>
                      <td className="right num">{formatPct(model.returnRate30 * 100)}</td>
                      <td className="right num">{model.netDemand.netDrr.toFixed(1)}</td>
                      <td>
                        {model.returnAnomaly ? (
                          <Badge tone="warn">anomaly</Badge>
                        ) : (
                          <Badge tone="neutral">normal</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Callout tone="info" title="Why segmentation changes the answer">
        An AX SKU at 99% service carries a z of 2.33, roughly 40% more buffer than a CZ SKU at 90%. Applying
        one flat service level across the catalogue is what makes planners either starve fast movers or bury
        slow movers.
      </Callout>
    </>
  );
}
