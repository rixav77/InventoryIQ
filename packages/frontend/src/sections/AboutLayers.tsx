import { useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { PORTFOLIO, SKUS, TRANSFERS } from '../data/model';
import { LIMITATIONS } from '../data/coverage';
import type { Harm, Limitation } from '../data/coverage';
import { PIPELINE_SOURCES, SCHEMA_TABLES } from '../data/pipeline';
import { Badge, Callout } from '../components/ui';
import type { Tone } from '../components/ui';
import { Block, Fraction, Line, O, Pow, Root, Sub, V } from '../components/math';
import { formatInrCompact, formatInt } from '../utils/format';

/* ------------------------------------------------------------------- types */

interface Layer {
  kind?: 'layer';
  id: string;
  /** Tab label, kept short so the row stays one line. */
  label: string;
  /** Full name, shown as the panel heading. */
  name: string;
  headline: string;
  /** The problem this layer exists to remove. */
  problem: string;
  /** Baseline limitations this layer closes, by ledger number. */
  answers: readonly number[];
  consumes: readonly { term: string; body: string }[];
  produces: readonly { term: string; body: string }[];
  rule: ReactNode;
  ruleNote: string;
  solution: string;
  /** Figures that belong to this layer rather than to a ledger entry. */
  proof: readonly string[];
  where: string;
}

/*
 * The two framing tabs that sit ahead of the layers. They carry the before and
 * after of the core arithmetic, which is shared context rather than any single
 * layer's job, so they present as free-form sections instead of layer stages.
 */
interface Frame {
  kind: 'frame';
  id: string;
  label: string;
  name: string;
  headline: string;
  sections: readonly { label: string; body: ReactNode }[];
}

type Tab = Layer | Frame;

const LIMITATION_BY_N = new Map(LIMITATIONS.map((item) => [item.n, item]));

function harmTone(harm: Harm): Tone {
  if (harm === 'CRITICAL') return 'crit';
  if (harm === 'HIGH') return 'warn';
  if (harm === 'MODERATE') return 'watch';
  return 'neutral';
}

/* ------------------------------------------------------------------- data */

const simulatedCount = PIPELINE_SOURCES.filter((source) => source.provenance === 'simulated').length;
const observedCount = PIPELINE_SOURCES.length - simulatedCount;

/*
 * Ordered the way the layers depend on each other: data arrives, demand is
 * measured, the level is set, the excess is priced, stock that already exists
 * is moved, the supply side is benchmarked, and the result is surfaced.
 */
const LAYERS: readonly Layer[] = [
  {
    id: 'integration',
    label: 'Integration',
    name: 'Integration layer',
    headline: 'Gets the data in without anyone retyping it, and keeps its provenance.',
    problem:
      'The inputs live in three separate systems. Procura holds planning and procurement, the CRM holds stock and orders, and Tally holds the ledger. Nothing joins them, so figures are copied between tools by hand, and a number cannot be traced back to the system that produced it.',
    answers: [],
    consumes: [
      {
        term: 'Procura planning grid',
        body: 'MSP, procurement time, MOQ, stock on hand, open purchase orders and in-transit, per SKU.',
      },
      {
        term: 'CRM stock summary',
        body: 'Per-warehouse holdings across the six locations, which is what makes regional imbalance visible.',
      },
      {
        term: 'EasyEcom orders',
        body: 'Marketplace orders, shipments, cancellations and returns, normalised to a daily channel series.',
      },
    ],
    produces: [
      {
        term: 'Validated rows',
        body: 'Parsed and checked against the expected shape. Pending and cancelled orders are dropped rather than counted as demand.',
      },
      {
        term: 'One schema',
        body: `${SCHEMA_TABLES.length} tables from a single idempotent migration, so every layer below reads the same shape.`,
      },
      {
        term: 'Provenance',
        body: 'Observed and simulated inputs stay distinguishable on every figure, because a plan is only as trustworthy as its inputs.',
      },
    ],
    rule: (
      <Line>
        <span>CSV + EasyEcom</span>
        <O>→</O>
        <span>{SCHEMA_TABLES.length} tables</span>
      </Line>
    ),
    ruleNote: 'One path in, one schema, and no manual re-entry between them.',
    solution:
      'Exports are ingested on the path they already take, validated at the boundary, and landed in a single schema that every engine above reads.',
    proof: [
      `${PIPELINE_SOURCES.length} sources parsed in-process into ${SCHEMA_TABLES.length} tables, with no live API call and no database connection in this build.`,
      `${observedCount} observed sources and ${simulatedCount} simulated, kept distinguishable rather than blended.`,
      'The Tally purchase-order and shipment connector, and the scheduled daily run, are V1 work rather than claims in this build.',
    ],
    where: 'Integration layer',
  },
  {
    id: 'demand',
    label: 'Demand',
    name: 'Demand intelligence',
    headline: 'Sizes the buffer and grades every SKU, so the same shortage does not cost the same everywhere.',
    problem:
      'Safety stock was hardcoded to zero on every row of the catalogue, so nothing absorbed a bad week. Every SKU also sat in one flat table under one assumed service level, even though a small set carries most of the revenue. Lead time was taken as a quoted constant rather than a measurement, and marketplace returns, which never become net demand, were left in the figure.',
    answers: [2, 5, 8, 9],
    consumes: [
      {
        term: 'Demand history',
        body: 'The daily series per SKU, reduced to a mean and a coefficient of variation.',
      },
      {
        term: 'Lead-time samples',
        body: 'Actual receipt dates, giving a real mean and a real spread instead of the quoted procurement time.',
      },
      {
        term: 'Revenue share',
        body: 'What each SKU contributes to cumulative revenue, which ranks it A, B or C.',
      },
      {
        term: 'Return rate',
        body: 'Cancellations and return-to-origin units as a share of gross sales.',
      },
    ],
    produces: [
      {
        term: 'ABC by revenue, XYZ by variation',
        body: 'Revenue contribution against predictability. High revenue and wildly unpredictable is a different problem from high revenue and steady, and the two are no longer planned alike.',
      },
      {
        term: 'A service level per class',
        body: 'From 99% on the AX core down to 90% on the C tail, which is where the z figure in the buffer comes from.',
      },
      {
        term: 'Safety stock',
        body: 'Sized against demand variance and lead-time variance separately, so a slow vendor is buffered for its own unreliability.',
      },
      {
        term: 'Net run rate',
        body: 'Gross run rate less the return share, with SKUs above 1.5x the category norm flagged rather than silently averaged away.',
      },
    ],
    rule: (
      <>
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
      </>
    ),
    ruleNote: 'The two variance terms stay separate, so the buffer answers the question the business actually has.',
    solution:
      'The buffer is computed per class from measured variance, so a shortage on the revenue core is treated differently from a shortage on the tail, and returns reduce demand instead of inflating it.',
    proof: [],
    where: 'SKU workbench · Demand',
  },
  {
    id: 'msl',
    label: 'Dynamic MSL',
    name: 'Dynamic MSL engine',
    headline: 'Replaces the typed monthly plan and the assumed lead time with a measured run rate.',
    problem:
      'The level that decides when to buy comes from three inputs, and one of them is handwriting. Procura divides a monthly plan a planner types by hand by 30, multiplies it by a procurement time assumed to be 30 or 60 days, and adds nothing for variance. Offline demand is steady enough that this holds. On the marketplaces it does not: a festival week can double the daily run rate and then fall away, so one static number is wrong in both directions inside the same quarter.',
    answers: [1, 4],
    consumes: [
      {
        term: '90-day channel sales',
        body: 'Daily units per SKU, split by marketplace and net of cancellations.',
      },
      {
        term: 'Sale-event calendar',
        body: 'The windows where a marketplace runs a festival or a flash sale.',
      },
      {
        term: 'Measured lead time',
        body: 'Actual receipts per SKU, rather than the quoted procurement time.',
      },
      {
        term: 'The static inputs',
        body: 'MSP, PT, MOQ and the existing level, read so the two figures can be compared directly.',
      },
    ],
    produces: [
      {
        term: 'Weighted run rate',
        body: 'Half the 7-day rate, 30% of the 14-day and 20% of the 30-day. Recent demand leads without letting a single day move the level.',
      },
      {
        term: 'Event multiplier',
        body: 'Applied inside an active window and decayed after it, so the level tapers instead of staying spiked.',
      },
      {
        term: 'A verdict, not just a number',
        body: 'The dynamic level against the static one gives INCREASE, DECREASE or HOLD, which is what makes the change reviewable.',
      },
    ],
    rule: (
      <>
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
      </>
    ),
    ruleNote: 'Every term except the event multiplier is measured from history. Nothing is typed in.',
    solution:
      'The level is recomputed from what the SKUs actually sold, and the channel split stops one blended number from averaging a fast marketplace against a slow one.',
    proof: [],
    where: 'SKU workbench · MSL engine',
  },
  {
    id: 'capital',
    label: 'Working capital',
    name: 'Working capital',
    headline: 'Prices the surplus Procura tolerates silently, and the minimum order that buys it.',
    problem:
      'Procura alerts on shortage and stays silent on excess. Nothing in the daily workflow answers how much capital is sitting in stock that will not sell on schedule, or how long it will sit there. The minimum order quantity compounds it: an MOQ above the level forces a purchase that overshoots demand and locks capital for months, and no report called that out.',
    answers: [3, 10],
    consumes: [
      {
        term: 'Stock on hand',
        body: 'Per SKU with its unit price, so surplus converts into money rather than units.',
      },
      {
        term: 'Surplus units',
        body: 'Holdings above the level, which is the quantity that actually has to be worked off.',
      },
      {
        term: 'Holding cost',
        body: 'The annual carrying rate applied to the capital sitting in stock.',
      },
      {
        term: 'MOQ',
        body: 'The vendor minimum, checked against the level it would overshoot.',
      },
    ],
    produces: [
      {
        term: 'Surplus days',
        body: 'Surplus units divided by the 30-day run rate, which is the figure a planner can act on.',
      },
      {
        term: 'An ageing band',
        body: 'Under 30 days healthy, 30 to 60 watch, 60 to 90 warning, beyond 90 critical.',
      },
      {
        term: 'Dead and slow stock',
        body: 'Inventory sorted into dead, stagnant, slow-moving and active by how it has actually been moving, valued in rupees.',
      },
      {
        term: 'The MOQ trap',
        body: 'Overshoot units, capital trapped and months of cover that a forced order would create.',
      },
    ],
    rule: (
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
    ),
    ruleNote: 'A unit count means little on its own. Days of cover is what decides whether to release or wait.',
    solution:
      'Surplus is priced, aged and banded so the excess becomes a number with a deadline on it, and a minimum order is checked against the demand it commits the business to before it is raised.',
    proof: [],
    where: 'SKU workbench · Working capital',
  },
  {
    id: 'transfers',
    label: 'Transfers',
    name: 'Transfer intelligence',
    headline: 'Moves stock that already exists instead of buying the same unit twice.',
    problem:
      'Planning runs against one central number, so a SKU can be short at one site while another sits on the same part. The WMS will execute a move once someone asks for it, but nothing proposes the move, and nothing checks whether moving it is cheaper than ordering it.',
    answers: [7],
    consumes: [
      {
        term: 'Per-warehouse positions',
        body: 'Stock at each site, which is what makes the imbalance visible at all.',
      },
      {
        term: 'Inter-site distances',
        body: `The cluster map across the ${TRANSFERS.warehouses.length} locations, so the nearest eligible source is preferred.`,
      },
      {
        term: 'Route economics',
        body: 'Landed cost per unit by route, which is the figure a transfer has to beat.',
      },
    ],
    produces: [
      {
        term: 'Surplus at the source',
        body: 'Holdings above the level plus a 10% floor, so a move never strips the donor site.',
      },
      {
        term: 'Deficit at the destination',
        body: 'The shortfall against 120% of cover, so the destination lands above its own floor.',
      },
      {
        term: 'Ranked moves',
        body: 'Quantity, route, cost and days of cover recovered, with the recommendation naming the anchor pair.',
      },
    ],
    rule: (
      <Line>
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
      </Line>
    ),
    ruleNote: 'Both sides carry a margin, so a transfer cannot create the shortage it was sent to fix.',
    solution:
      'The engine proposes the move, its quantity, its route and its landed cost, and only when that cost beats a fresh purchase. Rebalancing uses stock EVM has already paid for.',
    proof: [],
    where: 'SKU workbench · Transfers',
  },
  {
    id: 'vendors',
    label: 'Vendors',
    name: 'Vendor intelligence',
    headline: 'Benchmarks the supply side, where the same part arrives at several prices.',
    problem:
      'The same component is bought from more than one vendor, and the rate difference was never set against order history, so a dearer source could keep winning on habit. Quoted lead times were also never compared against what vendors actually delivered, which is the input the old level trusted most.',
    answers: [6],
    consumes: [
      {
        term: 'Vendor rate cards',
        body: 'Unit price per vendor per SKU, in the quoted currency and delivery terms.',
      },
      {
        term: 'Order history',
        body: 'What was ordered, from whom, at what price and in what quantity.',
      },
      {
        term: 'Delivery records',
        body: 'On-time and in-full outcomes, and actual receipts against the quoted date.',
      },
    ],
    produces: [
      {
        term: 'Weighted scorecard',
        body: 'OTIF 0.30, price 0.25, lead-time reliability 0.20, quality 0.15, responsiveness 0.10.',
      },
      {
        term: 'Price spread',
        body: 'The gap between the cheapest and dearest source on the same part, priced on a real reorder quantity rather than a single unit.',
      },
      {
        term: 'Allocation',
        body: 'Which vendor the next order should go to, and what staying with the dearest one costs.',
      },
      {
        term: 'Concentration risk',
        body: 'Where a single source carries a part that matters, reported as a gap rather than assumed away.',
      },
    ],
    rule: (
      <Line>
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
      </Line>
    ),
    ruleNote:
      'Delivery performance outweighs everything except on-time-in-full and price, so a cheap vendor that misses dates does not win on price alone.',
    solution:
      'Rates are compared across vendors for the same part, and the recommendation names the source, the saving and the quality inputs behind it.',
    proof: [],
    where: 'SKU workbench · Vendors',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    name: 'Dashboard and alerts',
    headline: 'Makes all of it usable by a person who has a few minutes, not an afternoon.',
    problem:
      'A recomputed level is worth nothing if it reaches nobody in time. The outputs also come in different shapes: one is a level to raise, another a transfer to approve, another a vendor to switch. Without a surface that ranks them and shows the working, the job falls back to whoever remembers to look.',
    answers: [],
    consumes: [
      {
        term: 'Every layer output',
        body: 'Levels, buffers, surplus, moves and vendor allocation, all from the same engine run.',
      },
      {
        term: 'Health components',
        body: 'Run-rate stability, stock-to-level alignment, purchase pipeline, capital efficiency and vendor quality.',
      },
      {
        term: 'Reviewer attention',
        body: 'The scarcest input. What a person should look at first, rather than everything at once.',
      },
    ],
    produces: [
      {
        term: 'One dossier per SKU',
        body: 'Everything the engine knows about a single SKU on one page, reachable by search.',
      },
      {
        term: 'A portfolio roll-up',
        body: 'The same figures aggregated across the catalogue, so the SKU view and the portfolio view cannot disagree.',
      },
      {
        term: 'Risk flags',
        body: 'Stockout risk, capital surplus or balanced, each with the reason attached.',
      },
      {
        term: 'An approval step',
        body: 'Recommendations are advisory and land next to the number that justifies them.',
      },
    ],
    rule: (
      <Line>
        <span>recommend-only · human approval</span>
      </Line>
    ),
    ruleNote: 'Nothing in this build writes back to Procura, Tally or the WMS.',
    solution:
      'Every recommendation is advisory and sits beside the evidence for it. The SKU view and the portfolio view read one computation, so a figure quoted in a meeting can be reproduced on either.',
    proof: [
      `${formatInt(SKUS.length)} SKUs modelled end to end and searchable in the workbench, each with its own dossier.`,
      `${formatInt(PORTFOLIO.stockoutRisk)} SKUs flagged at stockout risk and ${formatInt(PORTFOLIO.capitalSurplus)} carrying capital surplus in this run.`,
      `Average health score ${formatInt(PORTFOLIO.healthAverage)} across the modelled set, with ${formatInrCompact(PORTFOLIO.releaseableCapital)} releasable if the recommended levels were adopted.`,
      'Daily WhatsApp and email digests are V1 work rather than claims in this build.',
    ],
    where: 'This application',
  },
];

/* ------------------------------------------------------------------ frames */

const FRAME: Frame = {
  kind: 'frame',
  id: 'frame',
  label: 'Before and after',
  name: 'The assumption, and what replaces it',
  headline: 'Three inputs drive the level in Procura, and one of them is guesswork. Each is replaced by something the business already measures.',
  sections: [
    {
      label: 'What Procura computes',
      body: (
        <>
          <p className="layer-text">
            Only two inputs come from the business. The monthly selling plan is typed by hand and rarely
            changes, the procurement time is a constant, and safety stock sits at zero on every row. Everything
            downstream inherits those three choices, so an assumption made months ago decides what is bought
            today.
          </p>
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
          <p className="layer-note">
            The monthly plan is the only term that reflects demand, and it is the one term no system measures.
          </p>
        </>
      ),
    },
    {
      label: 'Why it breaks on e-commerce',
      body: (
        <Callout tone="crit" title="A static formula cannot follow a volatile channel">
          It cannot anticipate a festival spike or taper after one. Under-plan and the SKU loses the Buy Box and
          its search rank; over-plan and the capital sits still. Procura alerts on shortage and stays silent on
          excess, which is why the surplus went unnoticed. The flaw is not the arithmetic, it is that all three
          inputs are assumptions where the business already holds the measurements.
        </Callout>
      ),
    },
    {
      label: 'The replacement arithmetic',
      body: (
        <>
          <p className="layer-text">
            The monthly plan gives way to a weighted run rate, the assumed procurement time to the mean of what
            vendors actually took, and the hardcoded zero to a buffer sized from measured variance. Nothing in
            the chain is typed in by hand, so the level moves when demand moves.
          </p>
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
        </>
      ),
    },
    {
      label: 'Downstream rules',
      body: (
        <>
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
          <p className="layer-note">
            Each of these rules belongs to one of the layers that follow. The tabs after this one take them in
            turn and show the problem each one removes, how it is broken down and what it produced in this run.
          </p>
        </>
      ),
    },
  ],
};

/* ------------------------------------------------------------------- tabs */

const TABS: readonly Tab[] = [FRAME, ...LAYERS];

/* --------------------------------------------------------------- component */

function Stage({ index, label, children }: { index: number; label: string; children: ReactNode }) {
  return (
    <div className="layer-stage">
      <div className="layer-rail">
        <span className="layer-rail-num">{String(index + 1).padStart(2, '0')}</span>
        <span className="layer-rail-label">{label}</span>
      </div>
      <div className="layer-body">{children}</div>
    </div>
  );
}

function DefinitionList({ rows }: { rows: readonly { term: string; body: string }[] }) {
  return (
    <div className="defs">
      {rows.map((row) => (
        <div className="def" key={row.term}>
          <div className="def-term">{row.term}</div>
          <div className="def-body">{row.body}</div>
        </div>
      ))}
    </div>
  );
}

function LayerStages({ layer, issues }: { layer: Layer; issues: readonly Limitation[] }) {
  return (
    <>
      <Stage index={0} label="The problem">
        <p className="layer-text">{layer.problem}</p>
        {issues.length > 0 ? (
          <ul className="layer-issues">
            {issues.map((item) => (
              <li key={item.n}>
                <span className="layer-issues-n">#{item.n}</span>
                <span className="layer-issues-text">{item.problem}</span>
                <Badge tone={harmTone(item.harm)}>{item.harm}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </Stage>

      <Stage index={1} label="How it is broken down">
        <div className="layer-split">
          <div>
            <div className="layer-split-label">Consumes</div>
            <DefinitionList rows={layer.consumes} />
          </div>
          <div>
            <div className="layer-split-label">Produces</div>
            <DefinitionList rows={layer.produces} />
          </div>
        </div>
        <Block label="The rule">{layer.rule}</Block>
        <p className="layer-note">{layer.ruleNote}</p>
      </Stage>

      <Stage index={2} label="How we solve it">
        <p className="layer-text">{layer.solution}</p>
        {issues.length > 0 ? (
          <div className="layer-outcomes">
            {issues.map((item) => (
              <div className="layer-outcome" key={item.n}>
                <div className="layer-outcome-head">
                  <span className="layer-issues-n">#{item.n}</span>
                  <span className="layer-outcome-solution">{item.solution}</span>
                  <Badge tone={item.status === 'ADDRESSED' ? 'ok' : 'neutral'}>{item.status}</Badge>
                </div>
                <div className="layer-outcome-evidence">{item.evidence}</div>
              </div>
            ))}
          </div>
        ) : null}
        {layer.proof.length > 0 ? (
          <ul className="layer-proof">
            {layer.proof.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        <div className="layer-where">
          <span className="layer-where-label">Where to see it</span>
          <span className="layer-where-value">{layer.where}</span>
        </div>
      </Stage>
    </>
  );
}

function LayerTabs({ tabs }: { tabs: readonly Tab[] }) {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const baseId = useId();

  const focusTab = (index: number) => {
    setActive(index);
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const elements = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    if (elements === undefined) return;
    const tabButtons = Array.from(elements);
    // Drive from the focused tab rather than the selected one, so the two
    // cannot drift apart if focus arrived some other way.
    const focused = tabButtons.indexOf(document.activeElement as HTMLButtonElement);
    const from = focused === -1 ? active : focused;
    const last = tabButtons.length - 1;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusTab(from === last ? 0 : from + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusTab(from === 0 ? last : from - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusTab(last);
    }
  };

  const current = tabs[active];
  if (current === undefined) return null;

  // Only layers carry a limitations-ledger mapping; the framing tabs are
  // context for the whole engine and have nothing to prove against it.
  const issues: readonly Limitation[] =
    current.kind === 'frame'
      ? []
      : current.answers
          .map((n) => LIMITATION_BY_N.get(n))
          .filter((item): item is Limitation => item !== undefined);

  const tabId = (id: string) => `${baseId}-tab-${id}`;
  const panelId = (id: string) => `${baseId}-panel-${id}`;

  return (
    <>
      <div
        className="layer-tabs"
        role="tablist"
        aria-label="How the engine works"
        ref={listRef}
        onKeyDown={onKeyDown}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={tabId(tab.id)}
            className="layer-tab"
            aria-selected={index === active}
            aria-controls={panelId(tab.id)}
            tabIndex={index === active ? 0 : -1}
            onClick={() => setActive(index)}
          >
            <span className="layer-tab-num">{String(index + 1).padStart(2, '0')}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="layer-panel"
        role="tabpanel"
        id={panelId(current.id)}
        aria-labelledby={tabId(current.id)}
        tabIndex={0}
      >
        <div className="layer-head">
          <h3 className="layer-name">{current.name}</h3>
          <p className="layer-headline">{current.headline}</p>
        </div>

        {current.kind === 'frame' ? (
          current.sections.map((section, index) => (
            <Stage key={section.label} index={index} label={section.label}>
              {section.body}
            </Stage>
          ))
        ) : (
          <LayerStages layer={current} issues={issues} />
        )}
      </div>
    </>
  );
}

export function AboutLayers() {
  return <LayerTabs tabs={TABS} />;
}
