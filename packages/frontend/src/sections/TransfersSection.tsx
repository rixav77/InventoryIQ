import { useState } from 'react';
import { SkuSearch } from '../components/sku-search';
import type { SearchOption } from '../components/sku-search';
import { TRANSFERS, TRANSFER_COVERAGE, describeSku } from '../data/model';
import type { TransferRecommendation } from '@inventoryiq/core';
import { Badge, Callout, Empty, Panel, Stat } from '../components/ui';
import { formatInt, formatInr } from '../utils/format';

const NODE_POS: Readonly<Record<string, { x: number; y: number }>> = {
  ECOM: { x: 148, y: 54 },
  VASAI: { x: 66, y: 92 },
  DEPOT: { x: 176, y: 118 },
  BHIWANDI: { x: 100, y: 166 },
  FACTORY: { x: 54, y: 212 },
  DELHI: { x: 330, y: 62 },
  CHENNAI: { x: 306, y: 234 },
};

function arcPath(from: string, to: string): string {
  const a = NODE_POS[from];
  const b = NODE_POS[to];
  if (a === undefined || b === undefined) {
    return '';
  }
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const bend = Math.min(46, length * 0.22);
  return `M ${a.x} ${a.y} Q ${(a.x + b.x) / 2 + normalX * bend} ${(a.y + b.y) / 2 + normalY * bend} ${b.x} ${b.y}`;
}

function riskTone(risk: TransferRecommendation['risk']): 'ok' | 'watch' | 'crit' {
  if (risk === 'LOW') {
    return 'ok';
  }
  return risk === 'MEDIUM' ? 'watch' : 'crit';
}

/** SKUs the engine holds stock positions for, richest move first. */
const TRANSFER_SUMMARY = TRANSFER_COVERAGE.map((sku) => {
  const moves = TRANSFERS.recommendationsBySku.get(sku) ?? [];
  return {
    sku,
    moves,
    units: moves.reduce((sum, rec) => sum + rec.quantity, 0),
    cost: moves.reduce((sum, rec) => sum + rec.estimatedCost, 0),
  };
});

function toOption(entry: (typeof TRANSFER_SUMMARY)[number]): SearchOption {
  return {
    id: entry.sku,
    primary: entry.sku,
    secondary: describeSku(entry.sku),
    badges: [
      entry.moves.length === 0
        ? { label: 'balanced', tone: 'ok' as const }
        : { label: `${entry.moves.length} move${entry.moves.length === 1 ? '' : 's'}`, tone: 'info' as const },
    ],
    figure:
      entry.moves.length === 0
        ? 'no moves needed'
        : `${formatInt(entry.units)} units · ${formatInr(entry.cost)}`,
  };
}

const TRANSFER_OPTIONS: readonly SearchOption[] = TRANSFER_SUMMARY.map(toOption);
const TRANSFER_SUGGESTIONS: readonly SearchOption[] = [...TRANSFER_SUMMARY]
  .sort((left, right) => right.units - left.units)
  .map(toOption);

const DEFAULT_SKU = 'P0109-B';

export function TransfersSection() {
  const [selected, setSelected] = useState<string>(
    TRANSFER_SUMMARY.some((entry) => entry.sku === DEFAULT_SKU) ? DEFAULT_SKU : (TRANSFER_COVERAGE[0] ?? ''),
  );

  const entry = TRANSFER_SUMMARY.find((row) => row.sku === selected) ?? TRANSFER_SUMMARY[0];
  const positions = TRANSFERS.positionsBySku.get(entry?.sku ?? '') ?? [];
  const positionsByCode = new Map(positions.map((position) => [position.warehouseCode, position]));
  const topMove = entry?.moves[0];
  const totalUnits = entry?.units ?? 0;

  return (
    <>
      <p className="section-intro">
        Procura shows one aggregated stock number, so a SKU can look healthy nationally while a region starves.
        The engine splits stock by each location's demand share, then moves surplus toward the deficit using a
        10% source buffer and a cap of 1.2× the deficit. Search a SKU to see its own network. Suggestions are
        limited to the {TRANSFER_COVERAGE.length} SKUs the engine actually holds positions for.
      </p>

      <div className="stats stagger">
        <Stat
          label="SKUs with positions"
          value={formatInt(TRANSFER_COVERAGE.length)}
          sub={`of ${TRANSFERS.warehouses.length} locations tracked`}
        />
        <Stat
          label="Moves recommended"
          value={formatInt(TRANSFERS.allRecommendations.length)}
          sub="across every SKU"
        />
        <Stat
          label="Units rebalanced"
          value={formatInt(TRANSFERS.allRecommendations.reduce((sum, rec) => sum + rec.quantity, 0))}
          sub="surplus to deficit"
        />
        <Stat
          label="Landed transfer cost"
          value={formatInr(TRANSFERS.allRecommendations.reduce((sum, rec) => sum + rec.estimatedCost, 0))}
          sub="₹0.60 in-cluster · ₹4.00 cross-region per unit"
        />
      </div>

      <SkuSearch
        options={TRANSFER_OPTIONS}
        suggested={TRANSFER_SUGGESTIONS}
        selectedId={entry?.sku ?? ''}
        onSelect={setSelected}
        suggestedLabel="SKUs with transfer data"
        placeholder={`Search ${TRANSFER_COVERAGE.length} SKUs with warehouse positions (try P0109-B)`}
        ariaLabel="Search SKUs with transfer data"
        emptyTitle="No SKU with transfer data matches"
        emptyBody="Only SKUs that appear in the warehouse stock export can be rebalanced. Clear the search to see them all."
        hint="↑↓ to browse · ↵ to open"
      />

      {entry === undefined ? null : (
        <>
          <div className="search-caption">
            <Badge tone="ok">showing</Badge>
            <span className="mono" style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500 }}>
              {entry.sku}
            </span>
            <span>{describeSku(entry.sku)}</span>
            <span>·</span>
            <span>
              {entry.moves.length === 0
                ? 'stock aligned with demand share'
                : `${entry.moves.length} move${entry.moves.length === 1 ? '' : 's'} · ${formatInt(totalUnits)} units · ${formatInr(entry.cost)}`}
            </span>
          </div>

          <div className="grid" key={entry.sku}>
            <Panel
              className="col-7"
              title={`Warehouse network: ${entry.sku}`}
              desc="Solid arcs are same-day Mumbai cluster moves, dashed arcs are cross-region road. Node labels show available units for this SKU."
              foot={
                <>
                  <Badge tone="crit">deficit</Badge>
                  <Badge tone="neutral">surplus source</Badge>
                  <span>Arc labels show the recommended quantity.</span>
                </>
              }
            >
              <svg
                className="network"
                viewBox="0 0 400 268"
                role="img"
                aria-label={`Warehouse surplus and deficit network for ${entry.sku}`}
              >
                {entry.moves.map((rec) => (
                  <path
                    key={`${rec.fromWarehouse}-${rec.toWarehouse}`}
                    className={`net-arc${rec.transitSpeed === 'SAME_DAY' ? '' : ' dashed'}`}
                    d={arcPath(rec.fromWarehouse, rec.toWarehouse)}
                  />
                ))}

                {TRANSFERS.warehouses.map((warehouse) => {
                  const pos = NODE_POS[warehouse.code];
                  if (pos === undefined) {
                    return null;
                  }
                  const position = positionsByCode.get(warehouse.code);
                  const isHub = (position?.surplusUnits ?? 0) > 0;
                  return (
                    <g key={warehouse.code}>
                      <circle
                        className={`net-node-circle${isHub ? ' hub' : ''}`}
                        cx={pos.x}
                        cy={pos.y}
                        r={isHub ? 17 : 12}
                        style={
                          (position?.deficitUnits ?? 0) > 0
                            ? { stroke: 'oklch(0.53 0.2 27)', strokeWidth: 2.5 }
                            : undefined
                        }
                      />
                      <text className="net-node-label" x={pos.x} y={pos.y + (isHub ? 29 : 22)} textAnchor="middle">
                        {warehouse.code}
                      </text>
                      <text
                        className="net-node-meta"
                        x={pos.x}
                        y={pos.y + (isHub ? 40 : 33)}
                        textAnchor="middle"
                      >
                        {formatInt(position?.availableStock ?? 0)}
                      </text>
                    </g>
                  );
                })}

                {entry.moves.map((rec) => {
                  const from = NODE_POS[rec.fromWarehouse];
                  const to = NODE_POS[rec.toWarehouse];
                  if (from === undefined || to === undefined) {
                    return null;
                  }
                  return (
                    <text
                      key={`label-${rec.toWarehouse}`}
                      className="net-node-meta"
                      x={(from.x + to.x) / 2}
                      y={(from.y + to.y) / 2 - 4}
                      textAnchor="middle"
                    >
                      {formatInt(rec.quantity)}
                    </text>
                  );
                })}
              </svg>
            </Panel>

            <div className="col-5 stack">
              <Panel title="Primary move" desc="The largest move the optimizer produced for this SKU.">
                {topMove === undefined ? (
                  <Callout tone="ok" title="No transfer required">
                    Every location for {entry.sku} sits at or above its share of the minimum stock level.
                  </Callout>
                ) : (
                  <>
                    <div className="kv">
                      <div>
                        <div className="kv-label">Route</div>
                        <div className="kv-value">
                          {topMove.fromWarehouse} → {topMove.toWarehouse}
                        </div>
                      </div>
                      <div>
                        <div className="kv-label">Quantity</div>
                        <div className="kv-value">{formatInt(topMove.quantity)} units</div>
                      </div>
                      <div>
                        <div className="kv-label">Transit</div>
                        <div className="kv-value">
                          {topMove.transitSpeed.replace(/_/g, ' ').toLowerCase()}
                        </div>
                      </div>
                      <div>
                        <div className="kv-label">Distance</div>
                        <div className="kv-value">{formatInt(topMove.distanceKm)} km</div>
                      </div>
                      <div>
                        <div className="kv-label">Cost per unit</div>
                        <div className="kv-value">{formatInr(topMove.estimatedCostPerUnit)}</div>
                      </div>
                      <div>
                        <div className="kv-label">Total cost</div>
                        <div className="kv-value">{formatInr(topMove.estimatedCost)}</div>
                      </div>
                    </div>
                    <p className="rationale">{topMove.reason}</p>
                  </>
                )}
              </Panel>

              <Panel title="Warehouse split" desc="Demand share against available units for this SKU.">
                <div className="table-wrap">
                  <table className="table">
                    <caption className="sr-only">Per-warehouse position for {entry.sku}</caption>
                    <thead>
                      <tr>
                        <th scope="col">Site</th>
                        <th scope="col" className="right">
                          Share
                        </th>
                        <th scope="col" className="right">
                          MSL
                        </th>
                        <th scope="col" className="right">
                          Available
                        </th>
                        <th scope="col" className="right">
                          Position
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((position) => (
                        <tr key={position.warehouseCode}>
                          <th scope="row" className="sku">
                            {position.warehouseCode}
                          </th>
                          <td className="right num">{(position.demandShare * 100).toFixed(0)}%</td>
                          <td className="right num">{formatInt(position.warehouseMinimumStockLevel)}</td>
                          <td className="right num">{formatInt(position.availableStock)}</td>
                          <td
                            className="right num"
                            style={{ color: position.deficitUnits > 0 ? 'oklch(0.53 0.2 27)' : undefined }}
                          >
                            {position.deficitUnits > 0
                              ? `-${formatInt(position.deficitUnits)}`
                              : `+${formatInt(position.surplusUnits)}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>

            <Panel
              className="col-12"
              title={`All moves for ${entry.sku}`}
              desc="Every recommendation the optimizer produced for this SKU, not just the portfolio headline."
              foot={
                <>
                  <Badge tone="info">{entry.moves.length} moves</Badge>
                  <span>
                    Sourcing from the e-commerce warehouse is excluded by rule; each move keeps a 10% buffer at the
                    source.
                  </span>
                </>
              }
            >
              {entry.moves.length === 0 ? (
                <Empty
                  title="No transfers for this SKU"
                  body="Stock is already aligned with each location's share of demand, so the optimizer has nothing to move."
                />
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <caption className="sr-only">Transfer recommendations for {entry.sku}</caption>
                    <thead>
                      <tr>
                        <th scope="col">Route</th>
                        <th scope="col" className="right">
                          Quantity
                        </th>
                        <th scope="col">Transit</th>
                        <th scope="col" className="right">
                          Distance
                        </th>
                        <th scope="col" className="right">
                          Cost / unit
                        </th>
                        <th scope="col" className="right">
                          Total
                        </th>
                        <th scope="col">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.moves.map((rec) => (
                        <tr key={`${rec.fromWarehouse}-${rec.toWarehouse}`}>
                          <th scope="row" className="mono" style={{ fontWeight: 500 }}>
                            {rec.fromWarehouse} → {rec.toWarehouse}
                          </th>
                          <td className="right num">{formatInt(rec.quantity)}</td>
                          <td>{rec.transitSpeed.replace(/_/g, ' ').toLowerCase()}</td>
                          <td className="right num">{formatInt(rec.distanceKm)} km</td>
                          <td className="right num">{formatInr(rec.estimatedCostPerUnit)}</td>
                          <td className="right num">{formatInr(rec.estimatedCost)}</td>
                          <td>
                            <Badge tone={riskTone(rec.risk)}>{rec.risk}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        </>
      )}

      <Panel
        title="Priority moves across the catalogue"
        desc="The eight largest moves anywhere in the network, for cross-SKU triage. Each SKU's own view above is exhaustive."
      >
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Highest-quantity transfer recommendations across all SKUs</caption>
            <thead>
              <tr>
                <th scope="col">SKU</th>
                <th scope="col">Route</th>
                <th scope="col" className="right">
                  Quantity
                </th>
                <th scope="col">Transit</th>
                <th scope="col" className="right">
                  Distance
                </th>
                <th scope="col" className="right">
                  Total
                </th>
                <th scope="col">Risk</th>
              </tr>
            </thead>
            <tbody>
              {TRANSFERS.recommendations.map((rec) => (
                <tr key={`top-${rec.sku}-${rec.fromWarehouse}-${rec.toWarehouse}`}>
                  <th scope="row" className="sku">
                    {rec.sku}
                  </th>
                  <td className="mono">
                    {rec.fromWarehouse} → {rec.toWarehouse}
                  </td>
                  <td className="right num">{formatInt(rec.quantity)}</td>
                  <td>{rec.transitSpeed.replace(/_/g, ' ').toLowerCase()}</td>
                  <td className="right num">{formatInt(rec.distanceKm)} km</td>
                  <td className="right num">{formatInr(rec.estimatedCost)}</td>
                  <td>
                    <Badge tone={riskTone(rec.risk)}>{rec.risk}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
