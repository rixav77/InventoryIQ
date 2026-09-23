import assert from 'node:assert/strict';
import {
  CHANNEL_DEMAND_SEEDS,
  DEMAND_DATA_PROVENANCE,
  EVM_SKU_SEEDS,
  EVM_SSD_MONTHLY_DEMAND,
  PROTOTYPE_AS_OF_DATE,
  calculateClassDrivenSafetyStock,
  calculateDemandProfile,
  calculateNetDemandMetrics,
  calculateSeasonalIndices,
  classifyAbcPortfolio,
  classifyAbcXyzPortfolio,
  classifyDemandTrend,
  classifyDemandVolatility,
  classifyXyz,
  getClassServicePolicy,
  getSimulatedLeadTimeSamples,
  toDailySalesPoints,
} from '../index.js';
import type { RevenuePortfolioItem } from '../index.js';

function assertClose(actual: number, expected: number, epsilon = 1e-9): void {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `Expected ${actual} to be within ${epsilon} of ${expected}`,
  );
}

function test(name: string, run: () => void): void {
  run();
  console.log(`PASS ${name}`);
}

const constantChannelHistory = Array.from({ length: 90 }, (_, index) => {
  const date = new Date(`${PROTOTYPE_AS_OF_DATE}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - (89 - index));
  return {
    date: date.toISOString().slice(0, 10),
    unitsSold: 100,
    unitsReturned: index >= 60 ? 10 : 5,
    grossRevenue: 10_000,
  };
});

test('demand profile calculates 7/14/30/90 DRR and predictable CV', () => {
  const profile = calculateDemandProfile(
    toDailySalesPoints(constantChannelHistory),
    PROTOTYPE_AS_OF_DATE,
  );
  assert.equal(profile.drr7, 100);
  assert.equal(profile.drr14, 100);
  assert.equal(profile.drr30, 100);
  assert.equal(profile.drr90, 100);
  assert.equal(profile.trendPercent, 0);
  assert.equal(profile.trend, 'STABLE');
  assert.equal(profile.demandCoefficientOfVariation, 0);
  assert.equal(profile.volatility, 'PREDICTABLE');
});

test('trend and volatility boundary policies are deterministic', () => {
  assert.equal(classifyDemandTrend(5), 'STABLE');
  assert.equal(classifyDemandTrend(5.01), 'RISING');
  assert.equal(classifyDemandTrend(-5.01), 'FALLING');
  assert.equal(classifyDemandVolatility(0.25), 'PREDICTABLE');
  assert.equal(classifyDemandVolatility(0.5), 'MODERATE');
  assert.equal(classifyDemandVolatility(0.5001), 'ERRATIC');
  assert.equal(classifyDemandVolatility(null), 'ERRATIC');
});

test('ABC classification honors cumulative 80 and 95 percent boundaries', () => {
  const portfolio: RevenuePortfolioItem[] = [
    { sku: 'A', revenue: 80, dailyDemand: [1] },
    { sku: 'B', revenue: 15, dailyDemand: [1] },
    { sku: 'C', revenue: 5, dailyDemand: [1] },
  ];
  const result = classifyAbcPortfolio(portfolio);
  assert.deepEqual(
    result.map(({ sku, abcClass }) => ({ sku, abcClass })),
    [
      { sku: 'A', abcClass: 'A' },
      { sku: 'B', abcClass: 'B' },
      { sku: 'C', abcClass: 'C' },
    ],
  );
});

test('ABC ties use SKU ordering and invalid portfolios are rejected', () => {
  const tied = classifyAbcPortfolio([
    { sku: 'B', revenue: 50, dailyDemand: [1] },
    { sku: 'A', revenue: 50, dailyDemand: [1] },
  ]);
  assert.deepEqual(tied.map(({ sku }) => sku), ['A', 'B']);
  assert.throws(
    () =>
      classifyAbcPortfolio([
        { sku: 'A', revenue: 1, dailyDemand: [1] },
        { sku: 'A', revenue: 2, dailyDemand: [1] },
      ]),
    /Duplicate/,
  );
  assert.throws(
    () => classifyAbcPortfolio([{ sku: 'A', revenue: 0, dailyDemand: [0] }]),
    /greater than zero/,
  );
});

test('XYZ classification includes zero-demand and threshold behavior', () => {
  assert.equal(classifyXyz(0.25), 'X');
  assert.equal(classifyXyz(0.5), 'Y');
  assert.equal(classifyXyz(0.51), 'Z');
  assert.equal(classifyXyz(null), 'Z');
});

test('service policies match every class in the CHUNK-2 specification', () => {
  assert.deepEqual(getClassServicePolicy('AX'), { serviceLevelTarget: 0.99, zScore: 2.33 });
  assert.deepEqual(getClassServicePolicy('AY'), { serviceLevelTarget: 0.97, zScore: 1.88 });
  assert.deepEqual(getClassServicePolicy('AZ'), { serviceLevelTarget: 0.95, zScore: 1.65 });
  assert.deepEqual(getClassServicePolicy('BZ'), { serviceLevelTarget: 0.95, zScore: 1.65 });
  assert.deepEqual(getClassServicePolicy('CX'), { serviceLevelTarget: 0.9, zScore: 1.28 });
  assert.deepEqual(getClassServicePolicy('CY'), { serviceLevelTarget: 0.9, zScore: 1.28 });
  assert.deepEqual(getClassServicePolicy('CZ'), { serviceLevelTarget: 0.9, zScore: 1.28 });
});

test('ABC-XYZ output combines portfolio rank, demand variability, and service policy', () => {
  const result = classifyAbcXyzPortfolio([
    { sku: 'AX-SKU', revenue: 80, dailyDemand: [10, 10, 10] },
    { sku: 'BZ-SKU', revenue: 15, dailyDemand: [0, 30, 0] },
    { sku: 'CZ-SKU', revenue: 5, dailyDemand: [0, 0, 0] },
  ]);
  assert.equal(result[0]?.combinedClass, 'AX');
  assert.equal(result[1]?.combinedClass, 'BZ');
  assert.equal(result[2]?.combinedClass, 'CZ');
});

test('class-driven safety stock replaces EVM zero with a rounded recommendation', () => {
  const seed = EVM_SKU_SEEDS[0];
  const channelSeed = CHANNEL_DEMAND_SEEDS[0];
  assert.ok(seed && channelSeed);
  const profile = calculateDemandProfile(
    toDailySalesPoints(channelSeed.dailySales),
    PROTOTYPE_AS_OF_DATE,
  );
  const recommendation = calculateClassDrivenSafetyStock({
    combinedClass: 'AX',
    currentSafetyStock: seed.evmSafetyStock,
    sales: toDailySalesPoints(channelSeed.dailySales),
    asOfDate: PROTOTYPE_AS_OF_DATE,
    averageDailyRunRate: profile.drr30,
    leadTimeSamples: getSimulatedLeadTimeSamples(seed),
  });
  assert.equal(recommendation.currentSafetyStock, 0);
  assert.ok(recommendation.recommendedSafetyStock > 0);
  assert.equal(recommendation.serviceLevelTarget, 0.99);
});

test('net demand applies 30-day return rate and flags category anomalies', () => {
  const result = calculateNetDemandMetrics({
    sales: constantChannelHistory,
    asOfDate: PROTOTYPE_AS_OF_DATE,
    grossDrr: 100,
    categoryAverageReturnRate: 0.05,
  });
  assert.equal(result.returnRate7, 0.1);
  assert.equal(result.returnRate30, 0.1);
  assert.equal(result.returnRateTrendPercent, 0);
  assert.equal(result.netDrr, 90);
  assert.equal(result.anomaly, true);
});

test('net demand handles zero sales and rejects returns above sales', () => {
  const zero = calculateNetDemandMetrics({
    sales: [{ date: PROTOTYPE_AS_OF_DATE, unitsSold: 0, unitsReturned: 0, grossRevenue: 0 }],
    asOfDate: PROTOTYPE_AS_OF_DATE,
    grossDrr: 0,
    categoryAverageReturnRate: 0,
  });
  assert.equal(zero.returnRate30, 0);
  assert.equal(zero.returnRateTrendPercent, null);
  assert.equal(zero.netDrr, 0);
  assert.throws(
    () =>
      calculateNetDemandMetrics({
        sales: [
          { date: PROTOTYPE_AS_OF_DATE, unitsSold: 1, unitsReturned: 2, grossRevenue: 1 },
        ],
        asOfDate: PROTOTYPE_AS_OF_DATE,
        grossDrr: 1,
        categoryAverageReturnRate: 0,
      }),
    /cannot exceed/,
  );
});

test('seasonality produces twelve normalized indices and identifies extremes', () => {
  const result = calculateSeasonalIndices(EVM_SSD_MONTHLY_DEMAND, 'simulated');
  assert.equal(result.indices.length, 12);
  assert.equal(result.strongestMonth, 11);
  assert.equal(result.weakestMonth, 5);
  assertClose(
    result.indices.reduce((sum, item) => sum + item.index, 0) / 12,
    1,
  );
  assert.equal(result.provenance, 'simulated');
});

test('seasonality aggregates duplicates and rejects incomplete month coverage', () => {
  const duplicateJanuary = [
    ...EVM_SSD_MONTHLY_DEMAND,
    { year: 2025, month: 1, units: 1_000 },
  ];
  const result = calculateSeasonalIndices(duplicateJanuary, 'simulated');
  assert.ok((result.indices[0]?.averageUnits ?? 0) > 85_000);
  assert.throws(
    () => calculateSeasonalIndices(EVM_SSD_MONTHLY_DEMAND.filter(({ month }) => month !== 12), 'simulated'),
    /Missing demand/,
  );
});

test('fixtures cover eight observed SKU identities across two simulated channels', () => {
  assert.equal(CHANNEL_DEMAND_SEEDS.length, EVM_SKU_SEEDS.length * 2);
  assert.equal(DEMAND_DATA_PROVENANCE, 'simulated');
  assert.deepEqual(
    new Set(CHANNEL_DEMAND_SEEDS.map(({ channel }) => channel)),
    new Set(['amazon', 'flipkart']),
  );
  assert.ok(
    CHANNEL_DEMAND_SEEDS.every(
      ({ provenance }) =>
        provenance.skuIdentity === 'observed' &&
        provenance.sales === 'simulated' &&
        provenance.returns === 'simulated' &&
        provenance.revenue === 'simulated',
    ),
  );
});

console.log(`\nCHUNK-2 demand intelligence verification passed (${CHANNEL_DEMAND_SEEDS.length} SKU-channel profiles).`);
