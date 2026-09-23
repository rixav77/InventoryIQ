import assert from 'node:assert/strict';
import {
  PROCUREMENT_PRICE_SEEDS,
  REORDER_VENDOR_QUOTES,
  VENDOR_PERFORMANCE_SEEDS,
  VENDOR_SEED_PROVENANCE,
  analyzeVendorConcentration,
  compareVendorRates,
  rankVendors,
  suggestVendorAllocation,
} from '../packages/core/src/index.js';

const scorecards = rankVendors(VENDOR_PERFORMANCE_SEEDS);
const priceComparison = compareVendorRates('EVM-H61FHL', PROCUREMENT_PRICE_SEEDS);
const concentration = analyzeVendorConcentration(
  'EVM-H61FHL',
  PROCUREMENT_PRICE_SEEDS.filter((point) => point.sku === 'EVM-H61FHL').map((point) => ({
    vendorCode: point.vendorCode,
    quantity: point.quantity,
  })),
);
const allocationOptions = suggestVendorAllocation('EVM-H61FHL', 20_000, REORDER_VENDOR_QUOTES);

assert.ok(scorecards.length > 0);

console.log('\nInventoryIQ CHUNK-7: Vendor Intelligence & Procurement Allocation');
console.log('OTIF scorecards, cross-vendor price comparison, concentration risk, allocation\n');

console.log('Vendor scorecard (ranked)');
console.table(
  scorecards.map((card) => ({
    vendor: card.vendorName,
    otif: `${card.otifPercent.toFixed(1)}%`,
    ltReliability: `${(card.leadTimeReliability * 100).toFixed(1)}%`,
    quality: `${(card.quality * 100).toFixed(1)}%`,
    price: `${card.priceCompetitiveness.toFixed(0)}%`,
    score: card.overallScore.toFixed(1),
    tier: card.tier,
  })),
);

console.log(`\nCross-vendor price comparison — ${priceComparison.sku}`);
console.table(
  priceComparison.vendors.map((vendor) => ({
    vendor: vendor.vendorName,
    latestPrice: `$${vendor.latestUnitPrice.toFixed(2)}`,
    poDate: vendor.latestPoDate,
    totalQty: vendor.totalQuantity,
    trend: vendor.priceTrendPercent === null ? 'n/a' : `${vendor.priceTrendPercent.toFixed(1)}%`,
  })),
);
console.log(
  `Lowest $${priceComparison.lowestUnitPrice.toFixed(2)} · Highest $${priceComparison.highestUnitPrice.toFixed(2)} · ` +
    `Spread ${priceComparison.spreadPercent.toFixed(1)}% (best: ${priceComparison.bestVendorCode})`,
);
for (const alert of priceComparison.alerts) {
  console.log(`  ALERT: ${alert}`);
}

console.log(`\nVendor concentration — ${concentration.sku}`);
console.table(concentration.shares.map((share) => ({ vendor: share.vendorCode, qty: share.quantity, share: `${share.sharePercent.toFixed(1)}%` })));
console.log(`Primary ${concentration.primaryVendorCode} at ${concentration.primarySharePercent.toFixed(1)}% → ${concentration.riskLevel} risk`);

console.log('\nSmart allocation for a 20,000-unit reorder');
console.table(
  allocationOptions.map((option) => ({
    option: option.label,
    qty: option.quantity,
    avgUnitPrice: `$${option.averageUnitPrice.toFixed(2)}`,
    totalCost: `$${Math.round(option.totalCost).toLocaleString('en-US')}`,
    leadTime: option.leadTimeDays === null ? 'mixed' : `${option.leadTimeDays}d`,
    verdict: option.recommendation,
  })),
);

console.log(
  `\nData note: price history, vendor performance inputs, and reorder quotes are observed from ${VENDOR_SEED_PROVENANCE.source}. ` +
    'Scorecard weights (OTIF 0.30, price 0.25, lead-time reliability 0.20, quality 0.15, responsiveness 0.10) follow the CHUNK-7 spec. ' +
    'Recommendations are advisory only.',
);
console.log('\nCHUNK-7 verification completed successfully.');
