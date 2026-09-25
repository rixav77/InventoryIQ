import type { ReactNode } from 'react';
import { AS_OF, SKUS, TRANSFERS, VENDORS, VENDOR_COVERED_SKUS } from '../data/model';
import { COVERAGE_TALLY, LIMITATIONS } from '../data/coverage';
import { PIPELINE_SOURCES, SCHEMA_TABLES } from '../data/pipeline';
import { Badge, Callout, Panel, Stat } from '../components/ui';
import { formatDate, formatInt } from '../utils/format';

/* ---------------------------------------------------------------- math set */

function V({ children }: { children: ReactNode }) {
  return <span className="math-v">{children}</span>;
}

function Sub({ children }: { children: ReactNode }) {
  return <span className="math-sub">{children}</span>;
}

function Pow({ children }: { children: ReactNode }) {
  return <span className="math-sup">{children}</span>;
}

function O({ children }: { children: ReactNode }) {
  return <span className="math-op">{children}</span>;
}

function Fraction({ n, d }: { n: ReactNode; d: ReactNode }) {
  return (
    <span className="math-frac">
      <span>{n}</span>
      <span>{d}</span>
    </span>
  );
}

function Root({ children }: { children: ReactNode }) {
  return (
    <span className="math-sqrt">
      <span className="math-radic">√</span>
      <span className="math-sqrt-body">{children}</span>
    </span>
  );
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="math-block">
      <span className="math-label">{label}</span>
      {children}
    </div>
  );
}

function Line({ children }: { children: ReactNode }) {
  return <div className="math-line">{children}</div>;
}

/* ------------------------------------------------------------------- data */

const ENGINES: readonly { engine: string; job: string; rule: ReactNode; where: string }[] = [
  {
    engine: 'Dynamic MSL engine',
    job: 'Derive the minimum level from measured demand instead of a hand-typed monthly plan.',
    rule: (
      <>
        <V>MSL</V>
        <O>=</O>
        <V>DRR</V>
        <Sub>weighted</Sub>
        <O>×</O>
        <V>event</V>
        <O>×</O>
        <V>LT</V>
        <Sub>avg</Sub>
        <O>+</O>
        <V>SS</V>
      </>
    ),
    where: 'SKU workbench · MSL engine',
  },
  {
    engine: 'Demand intelligence',
    job: 'Size a buffer against demand and lead-time variance, segment the catalogue, net out returns.',
    rule: (
      <>
        <V>SS</V>
        <O>=</O>
        <V>Z</V>
        <Root>
          <V>LT</V>
          <Sub>avg</Sub>
          <V>σ</V>
          <Pow>2</Pow>
          <Sub>d</Sub>
          <O>+</O>
          <V>DRR</V>
          <Pow>2</Pow>
          <V>σ</V>
          <Pow>2</Pow>
          <Sub>LT</Sub>
        </Root>
      </>
    ),
    where: 'SKU workbench · Demand',
  },
  {
    engine: 'Working capital',
    job: 'Price the surplus Procura tolerates silently, and catch dead stock and the MOQ trap.',
    rule: (
      <>
        <V>days</V>
        <O>=</O>
        <Fraction
          n={
            <>
              <V>surplus units</V>
            </>
          }
          d={
            <>
              <V>DRR</V>
              <Sub>30</Sub>
            </>
          }
        />
      </>
    ),
    where: 'SKU workbench · Working capital',
  },
  {
    engine: 'Transfer intelligence',
    job: 'Move stock from a surplus site to a deficit site instead of buying more.',
    rule: (
      <>
        <V>qty</V>
        <O>=</O>
        <span>min(</span>
        <V>source</V>
        <O>−</O>
        <V>MSL</V>
        <Sub>source</Sub>
        <O>×</O>
        <span>1.10, </span>
        <V>deficit</V>
        <O>×</O>
        <span>1.20)</span>
      </>
    ),
    where: 'SKU workbench · Transfers',
  },
  {
    engine: 'Integration layer',
    job: 'Get the data in without anyone retyping it, and land it in one schema.',
    rule: (
      <>
        <span>CSV + EasyEcom</span>
        <O>→</O>
        <span>{SCHEMA_TABLES.length} tables</span>
      </>
    ),
    where: 'Pipeline',
  },
  {
    engine: 'Dashboard and alerts',
    job: 'Make all of the above usable by a person under time pressure.',
    rule: <span>recommend-only · human approval</span>,
    where: 'This application',
  },
  {
    engine: 'Vendor intelligence',
    job: 'Benchmark vendors, catch price inflation, and allocate the next order.',
    rule: (
      <>
        <V>score</V>
        <O>=</O>
        <span>0.30</span>
        <V>OTIF</V>
        <O>+</O>
        <span>0.25</span>
        <V>price</V>
        <O>+</O>
        <span>0.20</span>
        <V>LT</V>
        <O>+</O>
        <span>0.15</span>
        <V>quality</V>
        <O>+</O>
        <span>0.10</span>
        <V>resp</V>
      </>
    ),
    where: 'SKU workbench · Vendors',
  },
];

const PRINCIPLES: readonly { title: string; body: string }[] = [
  {
    title: 'Recommend, never execute',
    body: 'Every level and every transfer is advisory. Nothing writes back to Procura, Tally or the WMS. The engine proposes and a person approves.',
  },
  {
    title: 'Provenance on every figure',
    body: 'Observed, imported and simulated data stay distinguishable, because a plan is only as trustworthy as its inputs.',
  },
  {
    title: 'Two axes, not one',
    body: 'The same data reads as a SKU dossier and as a portfolio roll-up, and the header search moves between them.',
  },
  {
    title: 'Say what is missing',
    body: 'Deferred work is listed as deferred rather than dressed up, and a SKU with no data says so instead of showing a guess.',
  },
  {
    title: 'One soft family, honest numbers',
    body: 'A single rounded sans carries headings and text; monospace carries figures so columns of numbers align; math notation carries the formulas.',
  },
  {
    title: 'Reachable by keyboard',
    body: 'Both searches are real comboboxes with arrow keys, Home/End, Escape and announced state, and focus is always visible.',
  },
];

const THRESHOLDS: readonly { term: string; body: ReactNode }[] = [
  {
    term: 'ABC on cumulative revenue',
    body: (
      <>
        A up to 80% · B up to 95% · C beyond. A is where a stockout costs the most revenue.
      </>
    ),
  },
  {
    term: 'XYZ on coefficient of variation',
    body: <>X up to 0.25 · Y up to 0.50 · Z beyond. Z is the unpredictable tail that needs the buffer.</>,
  },
  {
    term: 'Service level by class',
    body: (
      <>
        AX 99% (<V>z</V> = 2.33) · AY 97% (1.88) · AZ and B* 95% (1.65) · C* 90% (1.28).
      </>
    ),
  },
  {
    term: 'Surplus ageing bands',
    body: <>Under 30 days healthy · 30–60 watch · 60–90 warning · beyond 90 critical.</>,
  },
  {
    term: 'Transfer economics',
    body: (
      <>
        ₹0.60 per unit in-cluster and ₹4.00 cross-region. The engine only moves stock when the landed cost
        beats a fresh purchase.
      </>
    ),
  },
  {
    term: 'Vendor scorecard weights',
    body: (
      <>
        OTIF 0.30 · price 0.25 · lead-time reliability 0.20 · quality 0.15 · responsiveness 0.10.
      </>
    ),
  },
];

const OBSERVED = [
  'SKU identity and category hierarchy',
  'MSP, procurement time, MOQ, stock, open PO, in-transit',
  'Existing MSL, reorder level and action status',
  'Warehouse registry and inter-site distances',
  'Multi-vendor purchase prices and vendor performance inputs',
];

const SIMULATED = [
  '90-day sales history and lead-time samples',
  'Per-warehouse stock splits and allocated stock',
  'Procurement price, cost of capital and depreciation assumptions',
  'Health-score components and demand volatility',
];

const DEFERRED: readonly { title: string; tag: string }[] = [
  { title: 'Tally purchase-order and shipment connector', tag: '9 endpoints' },
  { title: 'Scheduled daily DRR run', tag: '06:00 IST' },
  { title: 'Channel-segmented MSL written back to the E-Com CRM tab', tag: 'channel split' },
  { title: 'Daily WhatsApp and email digest', tag: 'alerts' },
  { title: 'Spare-parts consumption model from warranty RMA rates', tag: 'limitation 11' },
  { title: 'MSP override guardrails and audit log', tag: 'limitation 12' },
];

const GLOSSARY: readonly { term: string; body: string }[] = [
  { term: 'MSL', body: 'Minimum stock level: the floor a SKU should hold before a reorder is raised.' },
  { term: 'ROL', body: 'Reorder level: max(MSL, MOQ). The line that triggers replenishment.' },
  { term: 'ROQ', body: 'Reorder quantity: open PO + in-transit + stock − reorder level.' },
  { term: 'MSP', body: 'Monthly selling plan. Typed by hand in Procura and rarely revisited.' },
  { term: 'PT', body: 'Procurement time. Assumed 30 or 60 days regardless of what vendors actually do.' },
  { term: 'DRR', body: 'Daily run rate: average units sold per day over a rolling window.' },
  { term: 'MOQ', body: 'Minimum order quantity a vendor will manufacture in one batch.' },
  { term: 'Safety stock', body: 'Buffer held against demand and lead-time variance. Was zero on every row.' },
  { term: 'RTO', body: 'Return to origin. Cash-on-delivery returns that never become net demand.' },
  { term: 'OTIF', body: 'On time, in full: the share of purchase orders a vendor delivers without a miss.' },
  { term: 'ABC / XYZ', body: 'Revenue contribution against demand predictability, used to set service levels.' },
  { term: 'Surplus days', body: 'Surplus units divided by DRR. Drives the 30/60/90-day ageing bands.' },
];

/* ---------------------------------------------------------------- section */

export function AboutSection() {
  const simulatedCount = PIPELINE_SOURCES.filter(
    (source) => source.provenance === 'simulated',
  ).length;
  const observedCount = PIPELINE_SOURCES.length - simulatedCount;

  return (
    <>
      <p className="section-intro">
        The working behind the dashboard: what InventoryIQ is, what was broken in EVM's planning, the rules the
        engine applies in place of the old assumptions, and what is still missing. Written to be read by an
        engineer or an operator, not to sell.
      </p>

      <div className="stats stagger">
        <Stat
          label="SKUs modelled"
          value={formatInt(SKUS.length)}
          sub="end to end in this build"
        />
        <Stat
          label="Limitations answered"
          value={`${COVERAGE_TALLY.addressed}/${COVERAGE_TALLY.total}`}
          sub={`${COVERAGE_TALLY.deferred} deferred by scope`}
        />
        <Stat
          label="Warehouses mapped"
          value={formatInt(TRANSFERS.warehouses.length)}
          sub="5 Mumbai cluster · North · South"
        />
        <Stat
          label="Contract tables"
          value={formatInt(SCHEMA_TABLES.length)}
          sub="one idempotent migration"
        />
      </div>

      <div className="grid">
        <Panel
          className="col-7"
          title="What InventoryIQ is"
          desc="A decision layer over systems EVM already runs, not a replacement for any of them."
        >
          <div className="prose">
            <p>
              EVM Zone already runs an enterprise suite: Procura for planning and procurement, a CRM for stock
              and orders, and Tally for the ledger. <strong>InventoryIQ does not replace any of it.</strong> It
              reads what those systems already produce, recomputes the numbers that drive replenishment, and
              puts the result in front of a person.
            </p>
            <p>
              The narrow problem it attacks is the <strong>minimum stock level</strong>. Procura derives it from
              a monthly plan a planner types by hand, multiplied by a lead time assumed to be 30 or 60 days,
              with safety stock fixed at zero. That arithmetic suits offline distribution, where demand is
              steady across a quarter. On Amazon and Flipkart it does not, because a festival flash sale can
              double the daily run rate for a week and then fall away.
            </p>
            <p>
              This build models <strong>{SKUS.length} SKUs end to end</strong> across{' '}
              {TRANSFERS.warehouses.length} warehouses: the SKUs EVM's own exports gave us enough history to
              compute. Every figure on every page comes from the same engine over that set, so the SKU view and
              the portfolio view can never disagree.
            </p>
          </div>
        </Panel>

        <Panel className="col-5" title="At a glance" desc="The scope and posture of this run.">
          <div className="defs">
            <div className="def">
              <div className="def-term">Data run</div>
              <div className="def-body">{formatDate(AS_OF)}, a fixed prototype run rather than a live feed.</div>
            </div>
            <div className="def">
              <div className="def-term">Posture</div>
              <div className="def-body">
                Recommend-only. Nothing writes back to Procura, Tally or the WMS without approval.
              </div>
            </div>
            <div className="def">
              <div className="def-term">SKUs end to end</div>
              <div className="def-body">
                {SKUS.length}. Every one of them is modelled, searchable and visible in the workbench.
              </div>
            </div>
            <div className="def">
              <div className="def-term">Warehouses</div>
              <div className="def-body">
                {TRANSFERS.warehouses.length} locations across the Mumbai cluster, North and South.
              </div>
            </div>
            <div className="def">
              <div className="def-term">Multi-vendor SKUs</div>
              <div className="def-body">
                {VENDOR_COVERED_SKUS.length} with genuine competing rate history. The rest have a single source
                and are reported as a gap.
              </div>
            </div>
            <div className="def">
              <div className="def-term">Coverage</div>
              <div className="def-body">
                {COVERAGE_TALLY.addressed} of {COVERAGE_TALLY.total} baseline limitations answered with working
                evidence; {COVERAGE_TALLY.deferred} deferred.
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid">
        <Panel
          className="col-6"
          title="The problem: assumptions where measurement belongs"
          desc="Three inputs drive the level, and one of them is guesswork."
        >
          <div className="prose">
            <p>
              Only two inputs come from the business. The monthly selling plan is typed by hand and rarely
              changes, the procurement time is a constant, and safety stock sits at zero on every row.
            </p>
          </div>
          <Block label="Procura today">
            <Line>
              <V>MSL</V>
              <O>=</O>
              <Fraction
                n={
                  <>
                    <V>MSP</V>
                  </>
                }
                d="30"
              />
              <O>×</O>
              <V>PT</V>
            </Line>
            <Line>
              <V>ROL</V>
              <O>=</O>
              <span>max(</span>
              <V>MSL</V>
              <span>, </span>
              <V>MOQ</V>
              <span>)</span>
            </Line>
            <Line>
              <V>ROQ</V>
              <O>=</O>
              <V>Open PO</V>
              <O>+</O>
              <V>In-Transit</V>
              <O>+</O>
              <V>Stock</V>
              <O>−</O>
              <V>ROL</V>
            </Line>
            <Line>
              <V>Action</V>
              <O>=</O>
              <span className="math-key">REORDER NOW</span>
            </Line>
            <Line>
              <span className="math-when">when</span>
              <O> </O>
              <span>(</span>
              <V>Stock</V>
              <O>+</O>
              <V>Open PO</V>
              <O>+</O>
              <V>In-Transit</V>
              <span>)</span>
              <O>&lt;</O>
              <V>ROL</V>
            </Line>
          </Block>
          <Callout tone="crit" title="Why it breaks on e-commerce">
            A static formula cannot anticipate a festival spike or taper after one. Under-plan and you lose the
            Buy Box and search rank; over-plan and capital sits still. Procura alerts on shortage and stays
            silent on excess, which is why the surplus stayed invisible.
          </Callout>
        </Panel>

        <Panel
          className="col-6"
          title="The fix: measure instead of assume"
          desc="Each guessed input is replaced by something computed from history."
        >
          <Block label="Weighted run rate, level and buffer">
            <Line>
              <V>DRR</V>
              <Sub>weighted</Sub>
              <O>=</O>
              <span>0.50</span>
              <V>DRR</V>
              <Sub>7</Sub>
              <O>+</O>
              <span>0.30</span>
              <V>DRR</V>
              <Sub>14</Sub>
              <O>+</O>
              <span>0.20</span>
              <V>DRR</V>
              <Sub>30</Sub>
            </Line>
            <Line>
              <V>MSL</V>
              <O>=</O>
              <span>⌈</span>
              <V>DRR</V>
              <Sub>weighted</Sub>
              <O>×</O>
              <V>event</V>
              <O>×</O>
              <V>LT</V>
              <Sub>avg</Sub>
              <span>⌉</span>
              <O>+</O>
              <V>SS</V>
            </Line>
            <Line>
              <V>SS</V>
              <O>=</O>
              <V>Z</V>
              <Root>
                <V>LT</V>
                <Sub>avg</Sub>
                <V>σ</V>
                <Pow>2</Pow>
                <Sub>d</Sub>
                <O>+</O>
                <V>DRR</V>
                <Pow>2</Pow>
                <V>σ</V>
                <Pow>2</Pow>
                <Sub>LT</Sub>
              </Root>
            </Line>
            <Line>
              <V>DRR</V>
              <Sub>net</Sub>
              <O>=</O>
              <V>DRR</V>
              <Sub>gross</Sub>
              <O>×</O>
              <span>(1 − </span>
              <V>RTO</V>
              <span>)</span>
            </Line>
          </Block>
          <Block label="Downstream rules">
            <Line>
              <V>surplus days</V>
              <O>=</O>
              <Fraction
                n={
                  <>
                    <V>surplus units</V>
                  </>
                }
                d={
                  <>
                    <V>DRR</V>
                    <Sub>30</Sub>
                  </>
                }
              />
            </Line>
            <Line>
              <V>transfer qty</V>
              <O>=</O>
              <span>min(</span>
              <V>source</V>
              <O>−</O>
              <V>MSL</V>
              <Sub>source</Sub>
              <O>×</O>
              <span>1.10, </span>
              <V>deficit</V>
              <O>×</O>
              <span>1.20)</span>
            </Line>
            <Line>
              <V>vendor score</V>
              <O>=</O>
              <span>0.30</span>
              <V>OTIF</V>
              <O>+</O>
              <span>0.25</span>
              <V>price</V>
              <O>+</O>
              <span>0.20</span>
              <V>LT</V>
            </Line>
            <Line>
              <O>+</O>
              <span>0.15</span>
              <V>quality</V>
              <O>+</O>
              <span>0.10</span>
              <V>responsiveness</V>
            </Line>
          </Block>
        </Panel>
      </div>

      <Panel
        className="col-12"
        title="The seven engines"
        desc="Each row is a shipped, verified module in the shared core, not a proposal."
      >
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Each engine, its job, the rule it applies and where to see it</caption>
            <thead>
              <tr>
                <th scope="col">Engine</th>
                <th scope="col">Job</th>
                <th scope="col">Rule applied</th>
                <th scope="col">Where to see it</th>
              </tr>
            </thead>
            <tbody>
              {ENGINES.map((row) => (
                <tr key={row.engine}>
                  <th scope="row" style={{ whiteSpace: 'normal', minWidth: 170 }}>
                    {row.engine}
                  </th>
                  <td style={{ whiteSpace: 'normal', minWidth: 230 }}>{row.job}</td>
                  <td className="math" style={{ whiteSpace: 'normal', minWidth: 220 }}>
                    {row.rule}
                  </td>
                  <td style={{ whiteSpace: 'normal' }}>{row.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        className="col-12"
        title="Thresholds the engine sets for itself"
        desc="The dials behind every verdict, so no recommendation is a black box."
      >
        <div className="defs">
          {THRESHOLDS.map((row) => (
            <div className="def" key={row.term}>
              <div className="def-term">{row.term}</div>
              <div className="def-body">{row.body}</div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid">
        <Panel className="col-6" title="How data reaches the engine" desc="The path a number takes before it can be acted on.">
          <div className="steps">
            {[
              {
                title: 'Procura export',
                body: 'The MSL planning grid: MSP, procurement time, MOQ, stock, open POs and in-transit, per SKU.',
              },
              {
                title: 'CRM stock summary',
                body: 'Per-warehouse holdings across the locations, which is what makes regional imbalance visible.',
              },
              {
                title: 'EasyEcom orders',
                body: 'Marketplace orders, shipments, cancellations and returns, normalised to daily channel sales.',
              },
              {
                title: 'Normalise',
                body: `Parsed and validated into ${SCHEMA_TABLES.length} tables. Pending and cancelled rows are dropped, not counted as demand.`,
              },
              {
                title: 'Compute',
                body: 'The seven engines run on the same set, so the SKU view and the portfolio view cannot disagree.',
              },
              {
                title: 'Approve',
                body: 'A person reviews each recommendation. Only then would it reach EVM systems, which is V1 work.',
              },
            ].map((step, index) => (
              <div className="step" key={step.title}>
                <span className="step-num">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <div className="step-title">{step.title}</div>
                  <div className="step-body">{step.body}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="col-6" title="Design principles" desc="The rules this interface was built to.">
          <div className="principles">
            {PRINCIPLES.map((principle) => (
              <div className="principle" key={principle.title}>
                <span className="principle-mark" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 10.5 8 14.5 16 5.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <div className="principle-title">{principle.title}</div>
                  <div className="principle-body">{principle.body}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid">
        <Panel
          className="col-7"
          title="What is observed, what is modelled"
          desc="Stated plainly, because it decides how far a number can be trusted."
        >
          <div className="defs">
            <div className="def">
              <div className="def-term">
                Observed <Badge tone="ok">{observedCount} sources</Badge>
              </div>
              <div className="def-body">
                <ul className="callout-list" style={{ marginTop: 0 }}>
                  {OBSERVED.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="def">
              <div className="def-term">
                Simulated <Badge tone="watch">{simulatedCount} sources</Badge>
              </div>
              <div className="def-body">
                <ul className="callout-list" style={{ marginTop: 0 }}>
                  {SIMULATED.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="def">
              <div className="def-term">
                Not modelled <Badge tone="neutral">never guessed</Badge>
              </div>
              <div className="def-body">
                Spare-parts demand and the MSP audit trail have no source data in scope, so they are reported as
                deferred rather than estimated. A SKU without multi-vendor history shows an explicit gap.
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="col-5" title="What comes next" desc="Deferred by scope, not forgotten.">
          <div className="defs">
            {DEFERRED.map((item) => (
              <div className="def" key={item.title}>
                <div className="def-term">{item.title}</div>
                <div className="def-body">
                  <Badge tone="neutral">{item.tag}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="col-12" title="Glossary" desc="The vocabulary the planning team already uses.">
        <div className="glossary">
          {GLOSSARY.map((entry) => (
            <div key={entry.term}>
              <div className="glossary-term">{entry.term}</div>
              <div className="glossary-body">{entry.body}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Callout tone="info" title={`Run of ${formatDate(AS_OF)} · recommend-only`}>
        {LIMITATIONS.length} baseline limitations tracked, {COVERAGE_TALLY.addressed} answered with working
        evidence, {COVERAGE_TALLY.deferred} deferred. Vendor scorecards cover{' '}
        {formatInt(VENDORS.scorecards.length)} vendors; transfer intelligence covers{' '}
        {formatInt(TRANSFERS.allRecommendations.length)} recommended moves across{' '}
        {formatInt(TRANSFERS.warehouses.length)} locations.
      </Callout>
    </>
  );
}
