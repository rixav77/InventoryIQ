import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { calculateRollingAverage, calculateRollingDrr } from '@inventoryiq/core';
import type { MslChangeAction } from '@inventoryiq/core';
import { SKUS } from '../data/model';
import { Badge, CHART_INK, Empty, Legend, Panel, Stat, riskTone } from '../components/ui';
import {
  formatDecimalDays,
  formatInt,
  formatPct,
  formatShortDate,
  formatSigned,
} from '../utils/format';

const FILTERS: readonly { id: MslChangeAction | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'INCREASE', label: 'Increase' },
  { id: 'DECREASE', label: 'Decrease' },
  { id: 'KEEP', label: 'No change' },
];

export function MslSection() {
  const [filter, setFilter] = useState<MslChangeAction | 'ALL'>('ALL');
  const [selected, setSelected] = useState<string>(SKUS[0]?.sku ?? '');

  const rows = useMemo(
    () => (filter === 'ALL' ? SKUS : SKUS.filter((model) => model.dynamicAction === filter)),
    [filter],
  );
  const model = SKUS.find((entry) => entry.sku === selected);

  const drrSeries = useMemo(() => {
    if (model === undefined) {
      return [];
    }
    return model.sales.slice(-30).map((point) => ({
      date: point.date,
      d7: Number(calculateRollingAverage(model.sales, 7, point.date).toFixed(1)),
      d14: Number(calculateRollingAverage(model.sales, 14, point.date).toFixed(1)),
      d30: Number(calculateRollingAverage(model.sales, 30, point.date).toFixed(1)),
      weighted: Number(
        calculateRollingDrr(model.sales, {
          asOfDate: point.date,
          eventMultiplier: model.eventMultiplier,
        }).weightedBaseDrr.toFixed(1),
      ),
    }));
  }, [model]);

  const unitSeries = useMemo(
    () =>
      model === undefined
        ? []
        : model.sales.slice(-45).map((point) => ({ date: point.date, units: point.unitsSold })),
    [model],
  );

  return (
    <>
      <p className="section-intro">
        The core pain point: Procura derives MSL from a manually typed monthly plan divided by 30, then
        multiplies by a fixed 30-day procurement time. The engine replaces that with a time-decayed rolling
        daily run rate and an empirical lead time, then reports exactly where the two disagree.
      </p>

      <div className="stats stagger">
        <Stat
          label="SKUs needing an MSL increase"
          value={formatInt(SKUS.filter((entry) => entry.dynamicAction === 'INCREASE').length)}
          sub="static level under-covers current demand"
        />
        <Stat
          label="SKUs needing an MSL decrease"
          value={formatInt(SKUS.filter((entry) => entry.dynamicAction === 'DECREASE').length)}
          sub="static level over-covers, capital sitting idle"
        />
        <Stat
          label="Total MSL variance"
          value={formatSigned(SKUS.reduce((sum, entry) => sum + Math.abs(entry.mslDelta), 0))}
          sub="absolute units of disagreement"
        />
        <Stat
          label="Stockout risk"
          value={formatInt(SKUS.filter((entry) => entry.riskFlag === 'STOCKOUT_RISK').length)}
          sub="net stock position below zero"
        />
      </div>

      <Panel
        title="Static vs recommended minimum stock level"
        desc="Select a row to inspect its run-rate decomposition, lead-time evidence and the engine's own rationale."
        actions={
          <div className="filters" style={{ marginBottom: 0 }}>
            <span className="filter-label">Action</span>
            {FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                className="chip-btn"
                aria-pressed={filter === option.id}
                onClick={() => setFilter(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        }
      >
        {rows.length === 0 ? (
          <Empty
            title="No SKUs in this band"
            body="Every observed SKU falls outside the selected action. Switch back to All to see the full set."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">
                Minimum stock level comparison between the static Procura formula and the dynamic engine
              </caption>
              <thead>
                <tr>
                  <th scope="col">SKU</th>
                  <th scope="col" className="right">
                    Static MSL
                  </th>
                  <th scope="col" className="right">
                    Dynamic MSL
                  </th>
                  <th scope="col" className="right">
                    Δ units
                  </th>
                  <th scope="col" className="right">
                    Reorder level
                  </th>
                  <th scope="col" className="right">
                    Net position
                  </th>
                  <th scope="col">Action</th>
                  <th scope="col">Risk</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const reorderLevel = row.dynamicReorderLevel;
                  const netPosition = row.stock + row.openPo + row.inTransit - reorderLevel;
                  return (
                    <tr
                      key={row.sku}
                      className={`clickable${row.sku === selected ? ' selected' : ''}`}
                      onClick={() => setSelected(row.sku)}
                    >
                      <th scope="row" className="sku">
                        {row.sku}
                      </th>
                      <td className="right num">{formatInt(row.staticMsl)}</td>
                      <td className="right num">{formatInt(row.dynamicMsl)}</td>
                      <td
                        className="right num"
                        style={{
                          color:
                            row.mslDelta > 0
                              ? CHART_INK.crit
                              : row.mslDelta < 0
                                ? CHART_INK.ok
                                : undefined,
                        }}
                      >
                        {formatSigned(row.mslDelta)}
                      </td>
                      <td className="right num">{formatInt(reorderLevel)}</td>
                      <td className="right num">{formatSigned(netPosition)}</td>
                      <td>
                        <Badge
                          tone={
                            row.dynamicAction === 'INCREASE'
                              ? 'crit'
                              : row.dynamicAction === 'DECREASE'
                                ? 'watch'
                                : 'ok'
                          }
                        >
                          {row.dynamicAction}
                        </Badge>
                      </td>
                      <td>
                        <Badge tone={riskTone(row.riskFlag)}>{row.riskFlag.replace('_', ' ')}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {model === undefined ? null : (
        <div className="grid">
          <Panel
            className="col-7"
            title={`Run-rate decomposition: ${model.sku}`}
            desc="Trailing averages per day over the last 30 days of the run, with the weighted base the engine actually consumes."
            actions={
              <Legend
                items={[
                  { label: 'Weighted', color: CHART_INK.primary },
                  { label: '7-day', color: CHART_INK.secondary },
                  { label: '14-day', color: CHART_INK.tertiary },
                  { label: '30-day', color: CHART_INK.quaternary },
                ]}
              />
            }
          >
            <div className="chart">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={drrSeries} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 90)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    minTickGap={28}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis axisLine={false} tickLine={false} width={52} />
                  <Tooltip labelFormatter={(label) => formatShortDate(String(label))} />
                  <Line type="monotone" dataKey="d30" stroke={CHART_INK.quaternary} dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="d14" stroke={CHART_INK.tertiary} dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="d7" stroke={CHART_INK.secondary} dot={false} strokeWidth={1.5} />
                  <Line type="monotone" dataKey="weighted" stroke={CHART_INK.primary} dot={false} strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <div className="col-5 stack">
            <Panel title="Lead time and cover" desc="Quoted procurement time against what the sample actually shows.">
              <div className="kv">
                <div>
                  <div className="kv-label">Quoted PT</div>
                  <div className="kv-value">{model.pt}d</div>
                </div>
                <div>
                  <div className="kv-label">Actual lead time</div>
                  <div className="kv-value">{formatDecimalDays(model.leadTimeAverage)}</div>
                </div>
                <div>
                  <div className="kv-label">σ lead time</div>
                  <div className="kv-value">{formatDecimalDays(model.leadTimeStdDev)}</div>
                </div>
                <div>
                  <div className="kv-label">Weighted DRR</div>
                  <div className="kv-value">{model.drr.weightedBaseDrr.toFixed(1)}/day</div>
                </div>
                <div>
                  <div className="kv-label">Trend vs 30d</div>
                  <div className="kv-value">
                    {model.drr.trendPercent === null ? 'n/a' : formatPct(model.drr.trendPercent)}
                  </div>
                </div>
                <div>
                  <div className="kv-label">Event multiplier</div>
                  <div className="kv-value">{model.drr.eventMultiplier.toFixed(1)}×</div>
                </div>
              </div>
              <p className="rationale">{model.rationale}</p>
            </Panel>

            <Panel title="Daily units" desc="Last 45 days of the run feeding the rolling windows.">
              <div className="chart">
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={unitSeries} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 90)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      minTickGap={40}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis axisLine={false} tickLine={false} width={52} />
                    <Tooltip labelFormatter={(label) => formatShortDate(String(label))} />
                    <Line
                      type="monotone"
                      dataKey="units"
                      stroke={CHART_INK.secondary}
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
