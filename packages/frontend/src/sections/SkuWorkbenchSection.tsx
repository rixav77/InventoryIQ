import { useState } from 'react';
import { SkuSearch } from '../components/sku-search';
import type { SearchOption } from '../components/sku-search';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  SKUS,
  TRANSFERS,
  VENDOR_COVERED_SKUS,
  vendorConcentrationForSku,
  vendorRatesForSku,
} from '../data/model';
import type { SkuModel } from '../data/model';
import {
  Badge,
  CHART_INK,
  Callout,
  Empty,
  Legend,
  Meter,
  Panel,
  Stat,
  alertTone,
  bandTone,
  riskTone,
} from '../components/ui';
import {
  formatDays,
  formatDecimalDays,
  formatInt,
  formatInr,
  formatInrCompact,
  formatPct,
  formatSigned,
  formatShortDate,
  formatUsd,
} from '../utils/format';

function toOption(model: SkuModel): SearchOption {
  return {
    id: model.sku,
    primary: model.sku,
    secondary: model.subcategory,
    badges: [
      { label: model.classification.combinedClass, tone: 'info' },
      { label: model.health.band.replace('_', ' '), tone: bandTone(model.health.band) },
    ],
    figure:
      model.surplusUnits > 0
        ? `${formatInt(model.surplusUnits)} surplus · ${formatInrCompact(model.capitalLocked)}`
        : 'no surplus',
  };
}

/**
 * Every modelled SKU, ordered by capital at risk so the ones that need attention
 * come first. The full set is always offered: a shortlist that omits the SKU you
 * are currently looking at reads as a broken search.
 */
const WORKBENCH_OPTIONS: readonly SearchOption[] = [...SKUS]
  .sort((left, right) => right.capitalLocked - left.capitalLocked)
  .map(toOption);

function Dossier({ model }: { model: SkuModel }) {
  const positions = TRANSFERS.positionsBySku.get(model.sku) ?? [];
  const transfers = TRANSFERS.recommendationsBySku.get(model.sku) ?? [];
  const rates = vendorRatesForSku(model.sku);
  const concentration = vendorConcentrationForSku(model.sku);
  const channelSeries = model.channelSeries.slice(-45).map((point) => ({
    date: point.date,
    amazon: point.amazon,
    flipkart: point.flipkart,
    returned: point.returned,
  }));
  const mslComparison = [
    { label: 'Static', value: Math.round(model.staticMsl) },
    { label: 'Dynamic', value: Math.round(model.dynamicMsl) },
  ];
  const positionsByCode = new Map(positions.map((position) => [position.warehouseCode, position]));

  return (
    <>
      <Panel
        className="col-12"
        title={`${model.sku}: verdict`}
        desc="Static Procura formula against the engine's recommendation, with the six numbers that drive it."
        actions={
          <>
            <Badge tone={bandTone(model.health.band)}>{model.health.band.replace('_', ' ')}</Badge>
            <Badge tone={riskTone(model.riskFlag)}>{model.riskFlag.replace('_', ' ')}</Badge>
          </>
        }
        foot={
          <>
            <Badge tone="info">health {model.health.score.toFixed(0)} / 100</Badge>
            <span>
              Composite of DRR stability, stock-to-MSL alignment, PO pipeline, capital efficiency and vendor
              reliability.
            </span>
          </>
        }
      >
        <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <Stat label="Static MSL" value={formatInt(model.staticMsl)} sub="Procura formula" />
          <Stat
            label="Dynamic MSL"
            value={formatInt(model.dynamicMsl)}
            sub={`${formatSigned(model.mslDelta)} units · ${model.dynamicAction.toLowerCase()}`}
          />
          <Stat
            label="On hand"
            value={formatInt(model.stock)}
            sub={`+ ${formatInt(model.openPo)} PO · ${formatInt(model.inTransit)} in transit`}
          />
          <Stat
            label="Surplus"
            value={formatInt(model.surplusUnits)}
            sub={`${formatDays(model.surplusDays)} cover · ${formatInrCompact(model.capitalLocked)}`}
          />
          <Stat
            label="Safety stock"
            value={`${formatInt(model.safetyStockCurrent)} → ${formatInt(model.safetyStockRecommended)}`}
            sub={`class ${model.classification.combinedClass} · ${formatPct(model.classification.serviceLevelTarget * 100, 0)} service`}
          />
          <Stat
            label="Weighted DRR"
            value={model.drr.weightedBaseDrr.toFixed(1)}
            sub={`${model.drr.trendPercent === null ? 'n/a' : formatPct(model.drr.trendPercent)} vs 30d · ${model.volatility.toLowerCase()}`}
          />
        </div>

        <div className="grid" style={{ marginTop: 16 }}>
          <div className="col-7">
            <div className="chart">
              <ResponsiveContainer width="100%" height={168}>
                <BarChart data={mslComparison} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 90)" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} width={56} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]} barSize={54}>
                    <Cell fill={CHART_INK.quaternary} />
                    <Cell fill={CHART_INK.primary} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="kv-label" style={{ marginTop: 6 }}>
              Minimum stock level: static formula vs engine recommendation
            </p>
          </div>
          <div className="col-5">
            <p className="rationale" style={{ marginTop: 0 }}>
              {model.rationale}
            </p>
            <p className="section-intro" style={{ marginTop: 10, marginBottom: 0 }}>
              <strong>Why it changes:</strong> static uses MSP {formatInt(model.msp)} ÷ 30 × {model.pt}d purchase
              time. The engine uses an empirical {formatDecimalDays(model.leadTimeAverage)} ±{' '}
              {formatDecimalDays(model.leadTimeStdDev)} lead time and a {model.drr.eventMultiplier.toFixed(1)}×
              event multiplier.
            </p>
          </div>
        </div>
      </Panel>

      <Panel
        className="col-7"
        title="Demand, run rate and returns"
        desc="Channel-level demand for this SKU, and the net figure the engine plans against."
        actions={
          <Legend
            items={[
              { label: 'Amazon', color: CHART_INK.primary },
              { label: 'Flipkart', color: CHART_INK.secondary },
              { label: 'Returns', color: CHART_INK.crit },
            ]}
          />
        }
      >
        <div className="kv">
          <div>
            <div className="kv-label">DRR 7d</div>
            <div className="kv-value">{model.drr.trailing7Days.toFixed(1)}</div>
          </div>
          <div>
            <div className="kv-label">DRR 14d</div>
            <div className="kv-value">{model.drr.trailing14Days.toFixed(1)}</div>
          </div>
          <div>
            <div className="kv-label">DRR 30d</div>
            <div className="kv-value">{model.drr.trailing30Days.toFixed(1)}</div>
          </div>
          <div>
            <div className="kv-label">Weighted base</div>
            <div className="kv-value">{model.drr.weightedBaseDrr.toFixed(1)}</div>
          </div>
          <div>
            <div className="kv-label">Trend</div>
            <div className="kv-value">{model.trend.toLowerCase()}</div>
          </div>
          <div>
            <div className="kv-label">Volatility</div>
            <div className="kv-value">{model.volatility.toLowerCase()}</div>
          </div>
          <div>
            <div className="kv-label">Gross → net</div>
            <div className="kv-value">
              {model.netDemand.grossDrr.toFixed(1)} → {model.netDemand.netDrr.toFixed(1)}
            </div>
          </div>
          <div>
            <div className="kv-label">Return rate 30d</div>
            <div className="kv-value">{formatPct(model.returnRate30 * 100)}</div>
          </div>
        </div>

        <div className="chart" style={{ marginTop: 14 }}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={channelSeries} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 90)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                minTickGap={30}
                axisLine={false}
                tickLine={false}
              />
              <YAxis axisLine={false} tickLine={false} width={50} />
              <Tooltip labelFormatter={(label) => formatShortDate(String(label))} />
              <Line type="monotone" dataKey="amazon" stroke={CHART_INK.primary} dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="flipkart" stroke={CHART_INK.secondary} dot={false} strokeWidth={2} />
              <Line
                type="monotone"
                dataKey="returned"
                stroke={CHART_INK.crit}
                dot={false}
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {model.returnAnomaly ? (
          <Callout tone="warn" title="Return rate above norm">
            This SKU returns at {formatPct(model.returnRate30 * 100)} against a {formatPct(9)} category average, so
            the engine flags it for review rather than planning on gross shipments.
          </Callout>
        ) : null}
      </Panel>

      <Panel
        className="col-5"
        title="Safety stock and service class"
        desc="Procura carries zero here. The engine sizes a buffer from demand and lead-time variance."
      >
        <div className="kv">
          <div>
            <div className="kv-label">Class</div>
            <div className="kv-value">{model.classification.combinedClass}</div>
          </div>
          <div>
            <div className="kv-label">Service target</div>
            <div className="kv-value">{formatPct(model.classification.serviceLevelTarget * 100, 0)}</div>
          </div>
          <div>
            <div className="kv-label">Z score</div>
            <div className="kv-value">{model.classification.zScore}</div>
          </div>
          <div>
            <div className="kv-label">σ demand</div>
            <div className="kv-value">{formatInt(model.demandStdDev)}</div>
          </div>
          <div>
            <div className="kv-label">Lead time</div>
            <div className="kv-value">{formatDecimalDays(model.leadTimeAverage)}</div>
          </div>
          <div>
            <div className="kv-label">σ lead time</div>
            <div className="kv-value">{formatDecimalDays(model.leadTimeStdDev)}</div>
          </div>
        </div>
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="row-between">
            <span className="kv-label">Safety stock now</span>
            <Meter
              value={model.safetyStockCurrent}
              max={model.safetyStockRecommended}
              tone="neutral"
              label={formatInt(model.safetyStockCurrent)}
            />
          </div>
          <div className="row-between">
            <span className="kv-label">Recommended</span>
            <Meter
              value={model.safetyStockRecommended}
              max={model.safetyStockRecommended}
              tone="ok"
              label={formatInt(model.safetyStockRecommended)}
            />
          </div>
        </div>
        <p className="section-intro" style={{ marginTop: 12, marginBottom: 0 }}>
          Revenue share {formatPct(model.classification.revenueShare * 100)} · cumulative{' '}
          {formatPct(model.classification.cumulativeRevenueShare * 100)} · demand CV{' '}
          {model.classification.demandCoefficientOfVariation === null
            ? 'n/a'
            : model.classification.demandCoefficientOfVariation.toFixed(2)}
        </p>
      </Panel>

      <Panel
        className="col-7"
        title="Capital, stock movement and MOQ"
        desc="What this SKU costs to hold, how fast it actually moves, and what the vendor's minimum order does to it."
      >
        <div className="kv">
          <div>
            <div className="kv-label">Capital locked</div>
            <div className="kv-value">{formatInr(model.capitalLocked)}</div>
          </div>
          <div>
            <div className="kv-label">Carry / year</div>
            <div className="kv-value">{formatInr(model.holdingCost)}</div>
          </div>
          <div>
            <div className="kv-label">Surplus alert</div>
            <div className="kv-value">{model.surplusAlert}</div>
          </div>
          <div>
            <div className="kv-label">Surplus units</div>
            <div className="kv-value">{formatInt(model.surplusUnits)}</div>
          </div>
          <div>
            <div className="kv-label">Adds / releases</div>
            <div className="kv-value">
              {formatInrCompact(model.mslCapitalImpact.additionalInventoryValue)} /{' '}
              {formatInrCompact(model.mslCapitalImpact.releasableInventoryValue)}
            </div>
          </div>
          <div>
            <div className="kv-label">Unit price</div>
            <div className="kv-value">{formatInr(model.price)}</div>
          </div>
        </div>

        <div className="row-between" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="kv-label">Movement</span>
            <Badge
              tone={
                model.deadStock.status === 'ACTIVE'
                  ? 'ok'
                  : model.deadStock.status === 'SLOW_MOVING'
                    ? 'watch'
                    : model.deadStock.status === 'STAGNANT'
                      ? 'warn'
                      : 'crit'
              }
            >
              {model.deadStock.status.replace('_', ' ')}
            </Badge>
          </div>
          <span className="kv-label">
            Sold 30 / 60 / 90d: {formatInt(model.deadStock.unitsSold30Days)} ·{' '}
            {formatInt(model.deadStock.unitsSold60Days)} · {formatInt(model.deadStock.unitsSold90Days)}
          </span>
        </div>
        <div className="row-between" style={{ marginTop: 8 }}>
          <span className="kv-label">Inventory value / monthly depreciation</span>
          <span className="num" style={{ fontSize: 12 }}>
            {formatInrCompact(model.deadStock.inventoryValue)} /{' '}
            {formatInrCompact(model.deadStock.estimatedMonthlyDepreciation)}
          </span>
        </div>
        <div className="row-between" style={{ marginTop: 8 }}>
          <span className="kv-label">MOQ</span>
          <span className="num" style={{ fontSize: 12 }}>
            {formatInt(model.moq)} units
            {model.moqAnalysis.isMoqTrap
              ? ` · overshoot ${formatInt(model.moqAnalysis.overshootUnits)} · ${model.moqAnalysis.monthsOfCover?.toFixed(1) ?? 'n/a'} months cover`
              : ' · below minimum stock level, no trap'}
          </span>
        </div>
        <div style={{ marginTop: 12 }}>
          <Meter
            value={model.capitalLocked}
            max={Math.max(model.capitalLocked, 1)}
            tone={alertTone(model.surplusAlert)}
            label={formatInrCompact(model.capitalLocked)}
          />
        </div>
      </Panel>

      <Panel
        className="col-5"
        title="Warehouse position and transfers"
        desc="Stock split by each location's share of demand, with the moves the optimizer proposed for this SKU."
      >
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Per-warehouse position for {model.sku}</caption>
            <thead>
              <tr>
                <th scope="col">Site</th>
                <th scope="col" className="right">
                  MSL share
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
                  <td className="right num">{formatInt(position.warehouseMinimumStockLevel)}</td>
                  <td className="right num">{formatInt(position.availableStock)}</td>
                  <td
                    className="right num"
                    style={{ color: position.deficitUnits > 0 ? CHART_INK.crit : undefined }}
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

        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {transfers.length === 0 ? (
            <Empty
              title="No transfer recommended"
              body="Every location for this SKU sits at or above its share of the minimum stock level."
            />
          ) : (
            transfers.map((transfer) => (
              <div className="row-between" key={`${transfer.fromWarehouse}-${transfer.toWarehouse}`}>
                <span className="mono" style={{ fontSize: 12 }}>
                  {transfer.fromWarehouse} → {transfer.toWarehouse}
                </span>
                <span className="num" style={{ fontSize: 12 }}>
                  {formatInt(transfer.quantity)} units · {formatInr(transfer.estimatedCost)}
                </span>
                <Badge
                  tone={transfer.risk === 'LOW' ? 'ok' : transfer.risk === 'MEDIUM' ? 'watch' : 'crit'}
                >
                  {transfer.risk}
                </Badge>
              </div>
            ))
          )}
        </div>

        <p className="section-intro" style={{ marginTop: 12, marginBottom: 0 }}>
          {positionsByCode.size} locations tracked · in-cluster ₹0.60/unit, cross-region ₹4.00/unit.
        </p>
      </Panel>

      <Panel
        className="col-12"
        title="Vendor rates for this SKU"
        desc="Only SKUs with multi-vendor purchase history can be benchmarked. The rest show an explicit gap rather than a guess."
      >
        {rates === null ? (
          <Empty
            title="No multi-vendor rate history"
            body={`Rate benchmarking needs at least two vendors on record. In the current dataset that is true only for ${VENDOR_COVERED_SKUS.join(' and ')}.`}
          />
        ) : (
          <div className="grid">
            <div className="col-7">
              <div className="table-wrap">
                <table className="table">
                  <caption className="sr-only">Vendor rate summary for {model.sku}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Vendor</th>
                      <th scope="col" className="right">
                        Latest
                      </th>
                      <th scope="col" className="right">
                        Average
                      </th>
                      <th scope="col" className="right">
                        Quantity
                      </th>
                      <th scope="col" className="right">
                        Trend
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.vendors.map((vendor) => (
                      <tr key={vendor.vendorCode}>
                        <th scope="row" style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                          {vendor.vendorName}
                        </th>
                        <td className="right num">{formatUsd(vendor.latestUnitPrice)}</td>
                        <td className="right num">{formatUsd(vendor.averageUnitPrice)}</td>
                        <td className="right num">{formatInt(vendor.totalQuantity)}</td>
                        <td className="right num">
                          {vendor.priceTrendPercent === null ? 'n/a' : formatPct(vendor.priceTrendPercent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="section-intro" style={{ marginTop: 10, marginBottom: 0 }}>
                Spread {formatPct(rates.spreadPercent)} · {formatUsd(rates.lowestUnitPrice)} to{' '}
                {formatUsd(rates.highestUnitPrice)} · best rate from{' '}
                <span className="mono">{rates.bestVendorCode}</span>
              </p>
            </div>
            <div className="col-5">
              {concentration === null ? null : (
                <>
                  <div className="row-between">
                    <span className="kv-label">Concentration</span>
                    <Badge
                      tone={
                        concentration.riskLevel === 'HIGH'
                          ? 'crit'
                          : concentration.riskLevel === 'MODERATE'
                            ? 'watch'
                            : 'ok'
                      }
                    >
                      {concentration.riskLevel}
                    </Badge>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                    {concentration.shares.map((share) => (
                      <div className="row-between" key={share.vendorCode}>
                        <span className="mono" style={{ fontSize: 11.5 }}>
                          {share.vendorCode}
                        </span>
                        <Meter
                          value={share.sharePercent}
                          max={100}
                          tone={concentration.riskLevel === 'HIGH' ? 'crit' : 'watch'}
                          label={formatPct(share.sharePercent, 0)}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="section-intro" style={{ marginTop: 10, marginBottom: 0 }}>
                    Primary source {concentration.primaryVendorCode} at{' '}
                    {formatPct(concentration.primarySharePercent)} of sourced quantity.
                  </p>
                </>
              )}
              {rates.alerts.length > 0 ? (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {rates.alerts.map((alert) => (
                    <Callout key={alert} tone="warn" title="Alert">
                      {alert}
                    </Callout>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </Panel>
    </>
  );
}

export function SkuWorkbenchSection() {
  const [selected, setSelected] = useState<string>(SKUS[0]?.sku ?? '');
  const model = SKUS.find((entry) => entry.sku === selected) ?? SKUS[0];

  return (
    <>
      <p className="section-intro">
        Search a SKU and everything the engine knows about it lands on one page: run rate, safety stock, service
        class, capital exposure, movement, per-warehouse position and transfers, and its vendor rates. The other
        sections are the same data rolled up across the catalogue.
      </p>

      <SkuSearch
        options={WORKBENCH_OPTIONS}
        selectedId={model?.sku ?? ''}
        onSelect={setSelected}
        suggestedLabel="All SKUs · highest capital at risk"
        placeholder="Search a SKU, a family or a class (try EVM-25/256GB, M.2, or AX)"
        ariaLabel="Search SKUs"
        emptyTitle="No SKU matches"
        emptyBody="Nothing in the observed catalogue matches that search. Try a size (128GB), a family (M.2, SATA3) or a class (AX)."
        hint="↑↓ to browse · ↵ to open"
      />

      {model === undefined ? null : (
        <>
          <div className="search-caption">
            <Badge tone="ok">showing</Badge>
            <span className="mono" style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500 }}>
              {model.sku}
            </span>
            <span>{model.subcategory}</span>
            <span>·</span>
            <span>class {model.classification.combinedClass}</span>
            <span>·</span>
            <span>{model.dynamicAction.toLowerCase()} MSL of {formatInt(model.dynamicMsl)}</span>
          </div>

          <div className="grid" key={model.sku}>
            <Dossier model={model} />
          </div>
        </>
      )}
    </>
  );
}
