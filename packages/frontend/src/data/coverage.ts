/*
 * Coverage map: every limitation identified in the 22 Sep baseline, and the
 * shipped evidence that answers it. Statuses are honest: two low-harm items
 * remain deferred rather than claimed.
 */

import { SIMULATED_MOQ_TRAP } from '@inventoryiq/core';
import { MOQ_ANCHOR, PORTFOLIO, SKUS, TRANSFERS, VENDORS } from './model';
import {
  formatDecimalDays,
  formatInrCompact,
  formatInt,
  formatPct,
  formatUsd,
  formatUsdCompact,
} from '../utils/format';

export type Harm = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
export type CoverageStatus = 'ADDRESSED' | 'PARTIAL' | 'DEFERRED';

export interface Limitation {
  n: number;
  problem: string;
  harm: Harm;
  solution: string;
  engine: string;
  status: CoverageStatus;
  evidence: string;
}

const averageLeadTime =
  SKUS.reduce((sum, model) => sum + model.leadTimeAverage, 0) / SKUS.length;
const averageLeadTimeSpread =
  SKUS.reduce((sum, model) => sum + model.leadTimeStdDev, 0) / SKUS.length;
const axModels = SKUS.filter((model) => model.classification.combinedClass === 'AX');
const axRevenueShare =
  axModels.reduce((sum, model) => sum + model.classification.revenueShare, 0) * 100;
const anomalousReturns = SKUS.filter((model) => model.returnAnomaly).length;
const worstReturnRate = Math.max(...SKUS.map((model) => model.returnRate30));
const anchor = TRANSFERS.anchorRecommendations[0];

export const LIMITATIONS: readonly Limitation[] = [
  {
    n: 1,
    problem: 'Static MSL formula in a hyper-volatile e-commerce environment',
    harm: 'CRITICAL',
    solution: 'Dynamic MSL engine: 7/14/30-day weighted DRR with event multipliers',
    engine: 'Dynamic MSL engine',
    status: 'ADDRESSED',
    evidence: `${PORTFOLIO.mslIncrease} SKU MSL increases · ${PORTFOLIO.mslDecrease} decreases · ${formatInt(PORTFOLIO.mslVarianceUnits)} units of variance vs static`,
  },
  {
    n: 2,
    problem: 'Safety stock hardcoded to zero on every SKU in the catalogue',
    harm: 'CRITICAL',
    solution: 'Class-driven statistical safety stock over demand and lead-time variance',
    engine: 'Demand intelligence',
    status: 'ADDRESSED',
    evidence: `0 → ${formatInt(PORTFOLIO.safetyStockAfter)} units of protection across ${SKUS.length} SKUs`,
  },
  {
    n: 3,
    problem: 'Unmonitored surplus inventory and trapped working capital',
    harm: 'CRITICAL',
    solution: 'Surplus alerting (30/60/90d), capital-at-risk and holding-cost scoring',
    engine: 'Working capital',
    status: 'ADDRESSED',
    evidence: `${formatInrCompact(PORTFOLIO.capitalInSurplus)} locked in surplus · ${formatInrCompact(PORTFOLIO.annualHoldingCost)} carry cost`,
  },
  {
    n: 4,
    problem: 'Single unified e-commerce MSL with no channel segregation',
    harm: 'HIGH',
    solution: 'Channel-split demand modelling (Amazon, Flipkart, D2C) feeding an e-com MSL',
    engine: 'Dynamic MSL · Integration layer',
    status: 'ADDRESSED',
    evidence: `Amazon and Flipkart demand modelled separately per SKU; ${anomalousReturns} return-rate anomalies flagged`,
  },
  {
    n: 5,
    problem: 'Static 30/60-day lead-time assumption vs unmonitored vendor overdues',
    harm: 'HIGH',
    solution: 'Empirical lead time mean and standard deviation replace the quoted PT',
    engine: 'Demand intelligence · Vendor intelligence',
    status: 'ADDRESSED',
    evidence: `Quoted 30d vs actual ${formatDecimalDays(averageLeadTime)} ± ${formatDecimalDays(averageLeadTimeSpread)} across the sample`,
  },
  {
    n: 6,
    problem: 'Multi-vendor price disparities and unchecked supplier inflation',
    harm: 'HIGH',
    solution: 'Cross-vendor rate cards, inflation alerts and allocation suggestions',
    engine: 'Vendor intelligence',
    status: 'ADDRESSED',
    evidence: `${formatUsd(VENDORS.priceComparison.lowestUnitPrice)}–${formatUsd(VENDORS.priceComparison.highestUnitPrice)} spread ` +
      `(${formatPct(VENDORS.priceComparison.spreadPercent)}) · ${formatUsdCompact(VENDORS.savingsVsDearest)} avoidable on a ${formatInt(VENDORS.reorderQuantity)}-unit reorder`,
  },
  {
    n: 7,
    problem: 'Warehouse-agnostic central planning vs regional stock imbalance',
    harm: 'MODERATE',
    solution: 'Proximity-aware surplus-to-deficit transfer recommendations',
    engine: 'Transfer intelligence',
    status: 'ADDRESSED',
    evidence: anchor === undefined
      ? `${PORTFOLIO.transferCount} transfer recommendations across ${TRANSFERS.warehouses.length} warehouses`
      : `${TRANSFERS.warehouses.length} warehouses · ${PORTFOLIO.transferCount} moves · anchor ${anchor.fromWarehouse}→${anchor.toWarehouse} ${formatInt(anchor.quantity)} units`,
  },
  {
    n: 8,
    problem: 'E-commerce return / RTO rate ignored in net demand planning',
    harm: 'MODERATE',
    solution: 'Net DRR = gross DRR × (1 − return rate), with anomaly detection',
    engine: 'Demand intelligence',
    status: 'ADDRESSED',
    evidence: `Return rate modelled per SKU (peak ${formatPct(worstReturnRate * 100)}) · ${anomalousReturns} SKUs above 1.5× category norm`,
  },
  {
    n: 9,
    problem: 'No ABC/XYZ segmentation: every SKU sits in one flat table',
    harm: 'MODERATE',
    solution: 'ABC × XYZ matrix with differentiated service levels and safety stock',
    engine: 'Demand intelligence',
    status: 'ADDRESSED',
    evidence: `${axModels.length} AX SKUs carry ${formatPct(axRevenueShare)} of portfolio revenue at 99% service level`,
  },
  {
    n: 10,
    problem: 'Vendor MOQ trap causing involuntary multi-month capital lock-up',
    harm: 'MODERATE',
    solution: 'MOQ impact analyzer: overshoot units, capital trapped, months of cover',
    engine: 'Working capital',
    status: 'ADDRESSED',
    evidence: `Anchor MSL ${formatInt(SIMULATED_MOQ_TRAP.minimumStockLevel)} vs MOQ ${formatInt(SIMULATED_MOQ_TRAP.minimumOrderQuantity)} → ${formatInrCompact(MOQ_ANCHOR.capitalTrapped)} trapped for ${MOQ_ANCHOR.monthsOfCover?.toFixed(0) ?? 'n/a'} months`,
  },
  {
    n: 11,
    problem: 'Co-mingled finished goods and spare parts in replenishment planning',
    harm: 'LOW',
    solution: 'Segregated spare-parts consumption model from warranty RMA rates',
    engine: 'Deferred to V1',
    status: 'DEFERRED',
    evidence: `Not modelled: ${formatInt(MOQ_ANCHOR.overshootUnits)} unit anchor is the only spares-adjacent case in scope`,
  },
  {
    n: 12,
    problem: 'Unverified manual MSP entry without rationale or audit trail',
    harm: 'LOW',
    solution: 'Bounded MSP validation with ±30% DRR guardrails and audit logging',
    engine: 'Deferred to V1',
    status: 'DEFERRED',
    evidence: `Manual override guard and audit log not yet built; ${SKUS.length} SKUs still consume MSP as an observed input`,
  },
];

export const COVERAGE_TALLY = {
  addressed: LIMITATIONS.filter((item) => item.status === 'ADDRESSED').length,
  partial: LIMITATIONS.filter((item) => item.status === 'PARTIAL').length,
  deferred: LIMITATIONS.filter((item) => item.status === 'DEFERRED').length,
  total: LIMITATIONS.length,
} as const;
