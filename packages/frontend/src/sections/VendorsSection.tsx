import { useState } from 'react';
import { PROCUREMENT_PRICE_SEEDS } from '@inventoryiq/core';
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
import { SkuSearch } from '../components/sku-search';
import type { SearchOption } from '../components/sku-search';
import {
  VENDORS,
  VENDOR_COVERED_SKUS,
  describeSku,
  vendorConcentrationForSku,
  vendorRatesForSku,
} from '../data/model';
import { Badge, CHART_INK, Callout, Empty, Meter, Panel, Stat } from '../components/ui';
import { formatInt, formatPct, formatShortDate, formatUsd, formatUsdCompact } from '../utils/format';

/** The SKU the reorder-quote seeds belong to. */
const ALLOCATION_SKU = 'EVM-H61FHL';

function tierTone(tier: string): 'ok' | 'watch' | 'crit' {
  if (tier === 'PREFERRED') {
    return 'ok';
  }
  return tier === 'ACCEPTABLE' ? 'watch' : 'crit';
}

const VENDOR_OPTIONS: readonly SearchOption[] = VENDOR_COVERED_SKUS.map((sku) => {
  const rates = vendorRatesForSku(sku);
  const vendors = rates?.vendors.length ?? 0;
  return {
    id: sku,
    primary: sku,
    secondary: describeSku(sku),
    badges: [
      { label: `${vendors} vendor${vendors === 1 ? '' : 's'}`, tone: 'info' as const },
      ...(rates !== null && rates.alerts.length > 0
        ? [{ label: `${rates.alerts.length} alert`, tone: 'warn' as const }]
        : []),
    ],
    figure:
      rates === null
        ? 'no rate history'
        : `spread ${formatPct(rates.spreadPercent)} · ${formatUsd(rates.lowestUnitPrice)}–${formatUsd(rates.highestUnitPrice)}`,
  };
});

export function VendorsSection() {
  const [selected, setSelected] = useState<string>(
    VENDOR_COVERED_SKUS.includes(ALLOCATION_SKU) ? ALLOCATION_SKU : (VENDOR_COVERED_SKUS[0] ?? ''),
  );

  const rates = vendorRatesForSku(selected);
  const concentration = vendorConcentrationForSku(selected);
  const priceHistory = PROCUREMENT_PRICE_SEEDS.filter((point) => point.sku === selected)
    .sort((a, b) => a.poDate.localeCompare(b.poDate))
    .map((point) => ({
      label: `${point.vendorCode} · ${formatShortDate(point.poDate)}`,
      price: point.unitPrice,
    }));
  const maxScore = Math.max(...VENDORS.scorecards.map((card) => card.overallScore));

  return (
    <>
      <p className="section-intro">
        EVM buys the same component from several suppliers with no rate benchmark in the PO form. Rate comparison
        only means something where a SKU has more than one vendor on record, so the search here is limited to the{' '}
        {VENDOR_COVERED_SKUS.length} SKUs that do. Everything else in the catalogue has a single source and is
        listed as a gap rather than a guess.
      </p>

      <div className="stats stagger">
        <Stat
          label="Cross-vendor spread"
          value={rates === null ? 'n/a' : formatPct(rates.spreadPercent)}
          sub={
            rates === null
              ? 'no rate history'
              : `${formatUsd(rates.lowestUnitPrice)} → ${formatUsd(rates.highestUnitPrice)} on ${selected}`
          }
        />
        <Stat
          label="Vendors on record"
          value={formatInt(rates?.vendors.length ?? 0)}
          sub={`from ${formatInt(priceHistory.length)} purchase orders`}
        />
        <Stat
          label="Price alerts"
          value={formatInt(rates?.alerts.length ?? 0)}
          sub="spread and inflation triggers"
        />
        <Stat
          label="Best rate from"
          value={rates?.bestVendorCode ?? 'n/a'}
          sub="lowest unit price on record"
        />
      </div>

      <SkuSearch
        options={VENDOR_OPTIONS}
        selectedId={selected}
        onSelect={setSelected}
        suggestedLabel="SKUs with vendor rate history"
        placeholder={`Search ${VENDOR_COVERED_SKUS.length} SKUs with multi-vendor history`}
        ariaLabel="Search SKUs with vendor rate history"
        emptyTitle="No SKU with rate history matches"
        emptyBody="Rate benchmarking needs at least two vendors on record for the same SKU, which is why only these SKUs are listed."
        hint="↑↓ to browse · ↵ to open"
      />

      <div className="search-caption">
        <Badge tone="ok">showing</Badge>
        <span className="mono" style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: 500 }}>
          {selected}
        </span>
        <span>{describeSku(selected)}</span>
        <span>·</span>
        <span>
          {rates === null
            ? 'no vendor rate history'
            : `${rates.vendors.length} vendors · ${formatInt(priceHistory.length)} purchase orders`}
        </span>
      </div>

      <div className="grid" key={selected}>
        <Panel
          className="col-7"
          title={`Rate history: ${selected}`}
          desc="Unit price per purchase order, in placement order. The jump on the right is what the alert catches."
        >
          {priceHistory.length === 0 ? (
            <Empty title="No purchase orders" body="This SKU has no rate history to chart." />
          ) : (
            <div className="chart">
              <ResponsiveContainer width="100%" height={216}>
                <BarChart data={priceHistory} layout="vertical" margin={{ top: 4, right: 20, bottom: 0, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 90)" horizontal={false} />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value: number) => `$${value}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={118}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip formatter={(value) => formatUsd(Number(value))} />
                  <Bar dataKey="price" radius={[0, 3, 3, 0]} barSize={18}>
                    {priceHistory.map((point) => (
                      <Cell
                        key={point.label}
                        fill={
                          rates !== null && point.price === rates.lowestUnitPrice
                            ? CHART_INK.ok
                            : rates !== null && point.price === rates.highestUnitPrice
                              ? CHART_INK.crit
                              : CHART_INK.secondary
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {rates !== null && rates.alerts.length > 0 ? (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rates.alerts.map((alert) => (
                <Callout key={alert} tone="warn" title="Price alert">
                  {alert}
                </Callout>
              ))}
            </div>
          ) : null}
        </Panel>

        <Panel className="col-5" title="Vendor rates and concentration" desc="Latest, average and share per vendor.">
          {rates === null ? (
            <Empty title="No rates" body="No vendor rate history for this SKU." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <caption className="sr-only">Vendor rate summary for {selected}</caption>
                <thead>
                  <tr>
                    <th scope="col">Vendor</th>
                    <th scope="col" className="right">
                      Latest
                    </th>
                    <th scope="col" className="right">
                      Qty
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
                      <td className="right num">{formatInt(vendor.totalQuantity)}</td>
                      <td className="right num">
                        {vendor.priceTrendPercent === null ? 'n/a' : formatPct(vendor.priceTrendPercent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {concentration === null ? null : (
            <div style={{ marginTop: 14 }}>
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
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="Vendor scorecard: all vendors"
        desc="Scored on delivery rather than SKU, so this view stays portfolio-wide: OTIF 30% · price competitiveness 25% · lead-time reliability 20% · quality 15% · responsiveness 10%."
        foot={<Badge tone="neutral">observed performance inputs</Badge>}
      >
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Vendor scorecard ranked by weighted overall score</caption>
            <thead>
              <tr>
                <th scope="col">Vendor</th>
                <th scope="col" className="right">
                  OTIF
                </th>
                <th scope="col" className="right">
                  Lead time
                </th>
                <th scope="col" className="right">
                  Quality
                </th>
                <th scope="col" className="right">
                  Price
                </th>
                <th scope="col">Score</th>
                <th scope="col">Tier</th>
              </tr>
            </thead>
            <tbody>
              {VENDORS.scorecards.map((card) => (
                <tr key={card.vendorCode}>
                  <th scope="row" style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                    {card.vendorName}
                  </th>
                  <td className="right num">{formatPct(card.otifPercent)}</td>
                  <td className="right num">{formatPct(card.leadTimeReliability * 100, 0)}</td>
                  <td className="right num">{formatPct(card.quality * 100)}</td>
                  <td className="right num">{card.priceCompetitiveness.toFixed(0)}</td>
                  <td>
                    <Meter
                      value={card.overallScore}
                      max={maxScore}
                      tone={tierTone(card.tier)}
                      label={card.overallScore.toFixed(1)}
                    />
                  </td>
                  <td>
                    <Badge tone={tierTone(card.tier)}>{card.tier.replace('_', ' ')}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title={`Reorder allocation: ${ALLOCATION_SKU}, ${formatInt(VENDORS.reorderQuantity)} units`}
        desc={`Live vendor quotes exist only for ${ALLOCATION_SKU} in this run. Quotes ranked by landed cost, with an explicit risk-mitigation split so a single vendor cannot stall the line.`}
      >
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Vendor allocation options for the next reorder</caption>
            <thead>
              <tr>
                <th scope="col">Option</th>
                <th scope="col" className="right">
                  Quantity
                </th>
                <th scope="col" className="right">
                  Unit price
                </th>
                <th scope="col" className="right">
                  Total cost
                </th>
                <th scope="col" className="right">
                  Lead time
                </th>
                <th scope="col">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {VENDORS.allocation.map((option) => (
                <tr key={option.label}>
                  <th scope="row" style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                    {option.label}
                  </th>
                  <td className="right num">{formatInt(option.quantity)}</td>
                  <td className="right num">{formatUsd(option.averageUnitPrice)}</td>
                  <td className="right num">{formatUsd(option.totalCost, 0)}</td>
                  <td className="right num">
                    {option.leadTimeDays === null ? 'mixed' : `${option.leadTimeDays}d`}
                  </td>
                  <td>
                    <Badge
                      tone={
                        option.recommendation === 'RECOMMENDED'
                          ? 'ok'
                          : option.recommendation === 'RISK_MITIGATION'
                            ? 'info'
                            : 'neutral'
                      }
                    >
                      {option.recommendation.replace('_', ' ')}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="section-intro" style={{ marginTop: 12, marginBottom: 0 }}>
          Choosing the recommended single vendor saves{' '}
          <span className="mono">{formatUsdCompact(VENDORS.savingsVsDearest)}</span> against the dearest quote. The
          split option costs a further <span className="mono">{formatUsdCompact(VENDORS.savingsVsSplit)}</span> but
          removes single-source exposure.
        </p>
      </Panel>
    </>
  );
}
