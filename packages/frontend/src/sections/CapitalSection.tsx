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
import { SIMULATED_MOQ_TRAP } from '@inventoryiq/core';
import { MOQ_ANCHOR, PORTFOLIO, SKUS } from '../data/model';
import { Badge, CHART_INK, Callout, Empty, Meter, Panel, Stat, alertTone } from '../components/ui';
import { formatInr, formatInrCompact, formatInt, formatPct } from '../utils/format';

export function CapitalSection() {
  const traps = SKUS.filter((model) => model.moqAnalysis.isMoqTrap);
  const sortedSurplus = [...SKUS].sort((a, b) => b.capitalLocked - a.capitalLocked);
  const sortedDead = [...SKUS].sort((a, b) => b.deadStock.inventoryValue - a.deadStock.inventoryValue);
  const stages = [
    { label: 'Active', value: PORTFOLIO.activeValue, tone: 'ok' },
    { label: 'Slow moving', value: PORTFOLIO.slowMovingValue, tone: 'watch' },
    { label: 'Stagnant', value: PORTFOLIO.stagnantValue, tone: 'warn' },
    { label: 'Dead stock', value: PORTFOLIO.deadStockValue, tone: 'crit' },
  ] as const;

  return (
    <>
      <p className="section-intro">
        Procura raises an alert when stock is deficient and stays silent when it is excessive. That silence is
        where working capital goes. This layer prices the surplus, ages it, separates dead stock from slow
        movers and exposes the MOQ trap.
      </p>

      <div className="stats stagger">
        <Stat
          label="Capital trapped in surplus"
          value={formatInrCompact(PORTFOLIO.capitalInSurplus)}
          sub={
            <>
              <span className="num">{formatInt(PORTFOLIO.surplusUnitsTotal)}</span> units above reorder level
            </>
          }
        />
        <Stat
          label="Carrying cost per year"
          value={formatInrCompact(PORTFOLIO.annualHoldingCost)}
          sub="at 12% cost of capital on surplus value"
        />
        <Stat
          label="Dead + stagnant value"
          value={formatInrCompact(PORTFOLIO.deadStockValue + PORTFOLIO.stagnantValue)}
          sub="90 days with no sales activity"
        />
        <Stat
          label="Releasable on MSL decrease"
          value={formatInrCompact(PORTFOLIO.releaseableCapital)}
          sub="where the engine recommends a lower level"
        />
      </div>

      <div className="grid">
        <Panel
          className="col-5"
          title="Stock movement aging"
          desc="Inventory value split by sales activity over 90 days. Anything past 30 days is capital that is not earning."
        >
          <div className="chart">
            <ResponsiveContainer width="100%" height={190}>
              <BarChart
                data={stages.map((stage) => ({ label: stage.label, value: Math.round(stage.value) }))}
                margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.88 0.01 90)" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={54}
                  tickFormatter={(value: number) => `${Math.round(value / 1e5)}L`}
                />
                <Tooltip formatter={(value) => formatInr(Number(value))} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {stages.map((stage) => (
                    <Cell
                      key={stage.label}
                      fill={
                        stage.tone === 'ok'
                          ? CHART_INK.ok
                          : stage.tone === 'watch'
                            ? CHART_INK.watch
                            : stage.tone === 'warn'
                              ? CHART_INK.warn
                              : CHART_INK.crit
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="kv" style={{ marginTop: 14 }}>
            {stages.map((stage) => (
              <div key={stage.label}>
                <div className="kv-label">{stage.label}</div>
                <div className="kv-value">{formatInrCompact(stage.value)}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          className="col-7"
          title="Surplus ledger"
          desc="Ranked by capital locked. Days of cover uses the SKU's own trailing DRR, so a fast mover can be overstocked at a lower unit count."
        >
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Surplus inventory and capital at risk by SKU</caption>
              <thead>
                <tr>
                  <th scope="col">SKU</th>
                  <th scope="col" className="right">
                    Stock
                  </th>
                  <th scope="col" className="right">
                    Surplus units
                  </th>
                  <th scope="col" className="right">
                    Days cover
                  </th>
                  <th scope="col">Alert</th>
                  <th scope="col">Capital + carry</th>
                </tr>
              </thead>
              <tbody>
                {sortedSurplus.map((model) => (
                  <tr key={model.sku}>
                    <th scope="row" className="sku">
                      {model.sku}
                    </th>
                    <td className="right num">{formatInt(model.stock)}</td>
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
                        max={sortedSurplus[0]?.capitalLocked ?? 1}
                        tone={alertTone(model.surplusAlert)}
                        label={formatInrCompact(model.capitalLocked)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="section-intro" style={{ marginTop: 10, marginBottom: 0 }}>
            Annual carry on the surplus above is{' '}
            <span className="mono">{formatInrCompact(PORTFOLIO.annualHoldingCost)}</span>.
          </p>
        </Panel>

        <Panel
          className="col-7"
          title="Dead and slow-moving stock"
          desc="Classified purely on sales activity: sales in 30 days means active, 60 means slow moving, 90 means stagnant, none means dead."
        >
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Stock movement classification and depreciation exposure</caption>
              <thead>
                <tr>
                  <th scope="col">SKU</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="right">
                    30d
                  </th>
                  <th scope="col" className="right">
                    60d
                  </th>
                  <th scope="col" className="right">
                    90d
                  </th>
                  <th scope="col">Value</th>
                  <th scope="col" className="right">
                    Depreciation / mo
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedDead.map((model) => (
                  <tr key={model.sku}>
                    <th scope="row" className="sku">
                      {model.sku}
                    </th>
                    <td>
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
                    </td>
                    <td className="right num">{formatInt(model.deadStock.unitsSold30Days)}</td>
                    <td className="right num">{formatInt(model.deadStock.unitsSold60Days)}</td>
                    <td className="right num">{formatInt(model.deadStock.unitsSold90Days)}</td>
                    <td className="num">{formatInrCompact(model.deadStock.inventoryValue)}</td>
                    <td className="right num">
                      {formatInrCompact(model.deadStock.estimatedMonthlyDepreciation)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="col-5 stack">
          <Panel
            title="MOQ trap"
            desc="When the vendor's minimum order exceeds the MSL, the order overshoots into months of cover."
          >
            <Callout tone="watch" title={`Anchor: MSL ${formatInt(SIMULATED_MOQ_TRAP.minimumStockLevel)} vs MOQ ${formatInt(SIMULATED_MOQ_TRAP.minimumOrderQuantity)}`}>
              Ordering the minimum locks {formatInr(MOQ_ANCHOR.capitalTrapped)} of capital for{' '}
              {MOQ_ANCHOR.monthsOfCover?.toFixed(0) ?? 'n/a'} months of cover ({formatInt(MOQ_ANCHOR.overshootUnits)}{' '}
              units overshoot).
            </Callout>
            <div className="kv" style={{ marginTop: 14 }}>
              <div>
                <div className="kv-label">Overshoot units</div>
                <div className="kv-value">{formatInt(MOQ_ANCHOR.overshootUnits)}</div>
              </div>
              <div>
                <div className="kv-label">Days of cover</div>
                <div className="kv-value">
                  {MOQ_ANCHOR.daysOfCover === null ? 'n/a' : formatInt(MOQ_ANCHOR.daysOfCover)}
                </div>
              </div>
              <div>
                <div className="kv-label">Capital trapped</div>
                <div className="kv-value">{formatInr(MOQ_ANCHOR.capitalTrapped)}</div>
              </div>
              <div>
                <div className="kv-label">Traps in sample</div>
                <div className="kv-value">{traps.length}</div>
              </div>
            </div>
          </Panel>

          <Panel
            title="MOQ exposure across the sample"
            desc="No observed SKU in this run trips the trap: their MOQ is zero or one against a large MSL."
          >
            {traps.length === 0 ? (
              <Empty
                title="No MOQ traps this run"
                body={`All ${SKUS.length} modelled SKUs order below their minimum stock level. The trap analyzer stays armed for any SKU as its export lands.`}
              />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <caption className="sr-only">SKUs where MOQ overshoots the minimum stock level</caption>
                  <thead>
                    <tr>
                      <th scope="col">SKU</th>
                      <th scope="col" className="right">
                        Overshoot
                      </th>
                      <th scope="col" className="right">
                        Months cover
                      </th>
                      <th scope="col">Capital</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traps.map((model) => (
                      <tr key={model.sku}>
                        <th scope="row" className="sku">
                          {model.sku}
                        </th>
                        <td className="right num">{formatInt(model.moqAnalysis.overshootUnits)}</td>
                        <td className="right num">
                          {model.moqAnalysis.monthsOfCover?.toFixed(1) ?? 'n/a'}
                        </td>
                        <td className="num">{formatInrCompact(model.moqAnalysis.capitalTrapped)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="What this releases" desc="If the engine's lower levels were adopted.">
            <div className="stats" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <Stat
                label="Releasable value"
                value={formatInrCompact(PORTFOLIO.releaseableCapital)}
                sub="from MSL decreases"
              />
              <Stat
                label="Carry avoided"
                value={formatInrCompact(PORTFOLIO.annualHoldingCost * 0.12)}
                sub={formatPct(12, 0) + ' of surplus value'}
              />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
