import assert from 'node:assert/strict';
import {
  CHANNEL_DEMAND_SEEDS,
  EVM_SKU_SEEDS,
  EVM_SSD_MONTHLY_DEMAND,
  PROTOTYPE_AS_OF_DATE,
  calculateClassDrivenSafetyStock,
  calculateDemandProfile,
  calculateNetDemandMetrics,
  calculateSeasonalIndices,
  classifyAbcXyzPortfolio,
  getSimulatedLeadTimeSamples,
  getTrailingDailyUnits,
  toDailySalesPoints,
} from '../packages/core/src/index.js';

const portfolio = EVM_SKU_SEEDS.map((seed) => {
  const channels = CHANNEL_DEMAND_SEEDS.filter(({ sku }) => sku === seed.sku);
  assert.equal(channels.length, 2, `${seed.sku} must have two channel profiles`);
  const revenue = channels.reduce(
    (total, channel) =>
      total + channel.dailySales.reduce((sum, point) => sum + point.grossRevenue, 0),
    0,
  );
  const combinedByDate = new Map<string, number>();
  for (const channel of channels) {
    for (const point of channel.dailySales) {
      combinedByDate.set(point.date, (combinedByDate.get(point.date) ?? 0) + point.unitsSold);
    }
  }
  const dailySales = [...combinedByDate].map(([date, unitsSold]) => ({ date, unitsSold }));

  return {
    sku: seed.sku,
    revenue,
    dailyDemand: getTrailingDailyUnits(dailySales, 90, PROTOTYPE_AS_OF_DATE),
    dailySales,
    channels,
  };
});

const classifications = classifyAbcXyzPortfolio(portfolio);
const classificationBySku = new Map(classifications.map((item) => [item.sku, item]));

const rows = EVM_SKU_SEEDS.map((seed) => {
  const portfolioItem = portfolio.find(({ sku }) => sku === seed.sku);
  const classification = classificationBySku.get(seed.sku);
  assert.ok(portfolioItem && classification);
  const profile = calculateDemandProfile(portfolioItem.dailySales, PROTOTYPE_AS_OF_DATE);
  const channelMetrics = portfolioItem.channels.map((channel) => {
    const channelProfile = calculateDemandProfile(
      toDailySalesPoints(channel.dailySales),
      PROTOTYPE_AS_OF_DATE,
    );
    return calculateNetDemandMetrics({
      sales: channel.dailySales,
      asOfDate: PROTOTYPE_AS_OF_DATE,
      grossDrr: channelProfile.drr30,
      categoryAverageReturnRate: 0.1,
    });
  });
  const grossDrr = channelMetrics.reduce((sum, item) => sum + item.grossDrr, 0);
  const netDrr = channelMetrics.reduce((sum, item) => sum + item.netDrr, 0);
  const weightedReturnRate = grossDrr === 0 ? 0 : 1 - netDrr / grossDrr;
  const safetyStock = calculateClassDrivenSafetyStock({
    combinedClass: classification.combinedClass,
    currentSafetyStock: seed.evmSafetyStock,
    sales: portfolioItem.dailySales,
    asOfDate: PROTOTYPE_AS_OF_DATE,
    averageDailyRunRate: netDrr,
    leadTimeSamples: getSimulatedLeadTimeSamples(seed),
  });

  return {
    sku: seed.sku,
    class: classification.combinedClass,
    revenueSharePct: (classification.revenueShare * 100).toFixed(1),
    drr7: Math.round(profile.drr7),
    drr30: Math.round(profile.drr30),
    drr90: Math.round(profile.drr90),
    trend: profile.trend,
    cv: classification.demandCoefficientOfVariation?.toFixed(3) ?? 'N/A',
    grossDrr: Math.round(grossDrr),
    netDrr: Math.round(netDrr),
    returnRatePct: (weightedReturnRate * 100).toFixed(1),
    evmSafetyStock: seed.evmSafetyStock,
    recommendedSafetyStock: safetyStock.recommendedSafetyStock,
    serviceLevelPct: Math.round(safetyStock.serviceLevelTarget * 100),
  };
});

assert.equal(rows.length, EVM_SKU_SEEDS.length);
assert.ok(rows.every(({ recommendedSafetyStock }) => recommendedSafetyStock > 0));

console.log('\nInventoryIQ CHUNK-2: Demand Intelligence & Safety Stock');
console.log(`As of ${PROTOTYPE_AS_OF_DATE}; ${CHANNEL_DEMAND_SEEDS.length} SKU-channel profiles\n`);
console.table(rows);

const seasonality = calculateSeasonalIndices(EVM_SSD_MONTHLY_DEMAND, 'simulated');
console.log('\nEVM SSD monthly seasonal indices');
console.table(
  seasonality.indices.map(({ month, index, averageUnits }) => ({
    month,
    seasonalIndex: index.toFixed(2),
    averageUnits: Math.round(averageUnits),
  })),
);
console.log(
  `Strongest month: ${seasonality.strongestMonth}; weakest month: ${seasonality.weakestMonth}.`,
);
console.log(
  '\nData note: SKU identities, EVM safety stock (0), and planning fields are observed from EVM screenshots. ' +
    'Channel allocation, daily sales, returns, revenue, and monthly seasonal history are deterministic prototype simulations.',
);
console.log('\nCHUNK-2 verification completed successfully.');
