import { COVERAGE_TALLY, LIMITATIONS } from '../data/coverage';
import { AS_OF, PORTFOLIO, SKUS, TRANSFERS, VENDORS } from '../data/model';
import { Badge, Callout, Meter, Panel, Stat, alertTone, bandTone } from '../components/ui';
import {
  formatDate,
  formatInt,
  formatInrCompact,
  formatPct,
  formatSigned,
  formatUsdCompact,
} from '../utils/format';

export function OverviewSection() {
  const sortedByCapital = [...SKUS].sort((a, b) => b.capitalLocked - a.capitalLocked);
  const topSurplus = sortedByCapital.filter((model) => model.surplusUnits > 0).slice(0, 6);
  const maxCapital = topSurplus[0]?.capitalLocked ?? 1;

  return (
    <>
      <p className="section-intro">
        One screen for the whole problem set. Every figure below is computed by the shared engine on the
        same run as the recommendation log, so this overview cannot disagree with the SKU detail behind it.
      </p>

      <div className="stats cols-3 stagger">
        <Stat
          label="Capital in inventory"
          value={formatInrCompact(PORTFOLIO.capitalInInventory)}
          sub={
            <>
              across <span className="num">{formatInt(PORTFOLIO.skuCount)}</span> observed SKUs
            </>
          }
        />
        <Stat
          label="Capital trapped in surplus"
          value={formatInrCompact(PORTFOLIO.capitalInSurplus)}
          sub={
            <>
              <span className="num">{formatInt(PORTFOLIO.surplusUnitsTotal)}</span> surplus units
            </>
          }
        />
        <Stat
          label="Stockout risk"
          value={formatInt(PORTFOLIO.stockoutRisk)}
          sub="SKUs below a zero-safety-stock line"
        />
        <Stat
          label="MSL variance vs static"
          value={formatSigned(PORTFOLIO.mslVarianceUnits)}
          sub={
            <>
              <span className="num">{PORTFOLIO.mslIncrease}</span> up ·{' '}
              <span className="num">{PORTFOLIO.mslDecrease}</span> down
            </>
          }
        />
        <Stat
          label="Rebalancing moves"
          value={formatInt(PORTFOLIO.transferCount)}
          sub={
            <>
              <span className="num">{formatInt(PORTFOLIO.transferUnits)}</span> units between warehouses
            </>
          }
        />
        <Stat
          label="Avoidable procurement"
          value={formatUsdCompact(VENDORS.savingsVsDearest)}
          sub="per 20,000-unit reorder at current spread"
        />
      </div>

      <div className="grid">
        <Panel
          className="col-7"
          title="Where the money is stuck"
          desc="Surplus is measured above each SKU's reorder level at its own DRR, then valued at average procurement price."
          foot={
            <>
              <Badge tone="watch">surplus</Badge>
              <span>
                Thresholds: healthy under 30 days of cover, watch 30–60, warning 60–90, critical beyond 90.
              </span>
            </>
          }
        >
          {topSurplus.length === 0 ? (
            <Callout tone="ok" title="No surplus above threshold">
              Every SKU in the sample sits below its reorder level.
            </Callout>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <caption className="sr-only">SKUs ranked by trapped capital</caption>
                <thead>
                  <tr>
                    <th scope="col">SKU</th>
                    <th scope="col" className="right">
                      Surplus units
                    </th>
                    <th scope="col" className="right">
                      Days of cover
                    </th>
                    <th scope="col">Alert</th>
                    <th scope="col">Capital locked</th>
                  </tr>
                </thead>
                <tbody>
                  {topSurplus.map((model) => (
                    <tr key={model.sku}>
                      <th scope="row" className="sku">
                        {model.sku}
                        <span className="sub">{model.subcategory}</span>
                      </th>
                      <td className="right num">{formatInt(model.surplusUnits)}</td>
                      <td className="right num">
                        {model.surplusDays === null ? 'n/a' : formatInt(model.surplusDays)}
                      </td>
                      <td>
                        <Badge tone={alertTone(model.surplusAlert)}>{model.surplusAlert}</Badge>
                      </td>
                      <td>
                        <Meter
                          value={model.capitalLocked}
                          max={maxCapital}
                          tone={alertTone(model.surplusAlert)}
                          label={formatInrCompact(model.capitalLocked)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="col-5 stack">
          <Panel title="Portfolio posture" desc="Composite inventory health across the observed SKUs.">
            <div className="kv">
              <div>
                <div className="kv-label">Health score</div>
                <div className="kv-value">{PORTFOLIO.healthAverage.toFixed(1)} / 100</div>
              </div>
              <div>
                <div className="kv-label">Balanced</div>
                <div className="kv-value">{PORTFOLIO.balanced}</div>
              </div>
              <div>
                <div className="kv-label">Capital surplus</div>
                <div className="kv-value">{PORTFOLIO.capitalSurplus}</div>
              </div>
              <div>
                <div className="kv-label">Holding cost / yr</div>
                <div className="kv-value">{formatInrCompact(PORTFOLIO.annualHoldingCost)}</div>
              </div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(['HEALTHY', 'NEEDS_ATTENTION', 'AT_RISK', 'CRITICAL'] as const).map((band) => (
                <div className="row-between" key={band}>
                  <Badge tone={bandTone(band)}>{band.replace('_', ' ')}</Badge>
                  <Meter
                    value={PORTFOLIO.bandCounts[band]}
                    max={PORTFOLIO.skuCount}
                    tone={bandTone(band)}
                    label={String(PORTFOLIO.bandCounts[band])}
                  />
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Baseline coverage"
            desc="Limitations from the 22 Sep Procura review, and whether the engine answers them today."
          >
            <div className="stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <Stat label="Addressed" value={COVERAGE_TALLY.addressed} />
              <Stat label="Partial" value={COVERAGE_TALLY.partial} />
              <Stat label="Deferred" value={COVERAGE_TALLY.deferred} />
            </div>
            <p className="section-intro" style={{ marginTop: 12, marginBottom: 0 }}>
              {LIMITATIONS.length} limitations tracked. The two deferred items are low-harm and explicitly
              out of prototype scope.
            </p>
          </Panel>
        </div>
      </div>

      <Callout tone="info" title={`Run of ${formatDate(AS_OF)} · recommend-only`}>
        Engine output is advisory. Nothing here writes back to Procura, Tally or the WMS: MSL changes and
        transfers move through the approval queue first. Planning fields are observed from the live system;
        demand and lead-time history are deterministic simulations of the same shape until the EasyEcom and
        Tally connectors land. Warehouse registry: {TRANSFERS.warehouses.length} locations. Return-rate
        handling uses a {formatPct(9)} category norm.
      </Callout>

    </>
  );
}
