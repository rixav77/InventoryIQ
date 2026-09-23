import assert from 'node:assert/strict';
import {
  PROCUREMENT_PRICE_SEEDS,
  REORDER_VENDOR_QUOTES,
  VENDOR_PERFORMANCE_SEEDS,
  VENDOR_SCORE_WEIGHTS,
  analyzeVendorConcentration,
  calculateLeadTimeReliability,
  calculateOtifPercent,
  classifyVendorTier,
  compareVendorRates,
  rankVendors,
  scoreVendor,
  suggestVendorAllocation,
} from '../index.js';

function assertClose(actual: number, expected: number, epsilon = 1e-9): void {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
}

function test(name: string, run: () => void): void {
  run();
  console.log(`PASS ${name}`);
}

test('vendor score weights sum to 1', () => {
  const sum =
    VENDOR_SCORE_WEIGHTS.otif +
    VENDOR_SCORE_WEIGHTS.priceCompetitiveness +
    VENDOR_SCORE_WEIGHTS.leadTimeReliability +
    VENDOR_SCORE_WEIGHTS.quality +
    VENDOR_SCORE_WEIGHTS.responsiveness;
  assertClose(sum, 1);
});

test('OTIF, lead-time reliability, and tiers follow the spec definitions', () => {
  assertClose(calculateOtifPercent(38, 40), 95);
  assertClose(calculateLeadTimeReliability(28, 3), 1 - 3 / 28);
  assert.equal(calculateLeadTimeReliability(10, 50), 0);
  assert.equal(classifyVendorTier(85), 'PREFERRED');
  assert.equal(classifyVendorTier(70), 'ACCEPTABLE');
  assert.equal(classifyVendorTier(69.999), 'NEEDS_IMPROVEMENT');
  assert.throws(() => calculateOtifPercent(50, 40), /cannot exceed/);
});

test('scorecard classifies best and worst vendors', () => {
  const best = scoreVendor(VENDOR_PERFORMANCE_SEEDS[0]!);
  assert.equal(best.vendorCode, 'GLOBAL-CONN');
  assert.equal(best.tier, 'PREFERRED');
  const worst = scoreVendor(VENDOR_PERFORMANCE_SEEDS[4]!);
  assert.equal(worst.vendorCode, 'CEHK');
  assert.equal(worst.tier, 'NEEDS_IMPROVEMENT');
});

test('ranked vendors order by overall score', () => {
  const ranked = rankVendors(VENDOR_PERFORMANCE_SEEDS);
  assert.equal(ranked[0]?.vendorCode, 'GLOBAL-CONN');
  assert.equal(ranked[ranked.length - 1]?.vendorCode, 'CEHK');
  for (let index = 1; index < ranked.length; index += 1) {
    assert.ok((ranked[index - 1]?.overallScore ?? 0) >= (ranked[index]?.overallScore ?? 0));
  }
});

test('cross-vendor rate comparison surfaces spread and price inflation', () => {
  const comparison = compareVendorRates('EVM-H61FHL', PROCUREMENT_PRICE_SEEDS);
  assertClose(comparison.lowestUnitPrice, 11.99);
  assertClose(comparison.highestUnitPrice, 13.3);
  assertClose(comparison.spreadPercent, ((13.3 - 11.99) / 11.99) * 100);
  assert.equal(comparison.bestVendorCode, 'HK-NANO');
  assert.ok(comparison.alerts.some((alert) => alert.includes('disparity')));
  assert.ok(comparison.alerts.some((alert) => alert.includes('Price increase')));
  const yinghu = comparison.vendors.find((vendor) => vendor.vendorCode === 'YINGHU');
  assert.ok(yinghu);
  assertClose(yinghu.priceTrendPercent ?? 0, ((13.3 - 12.25) / 12.25) * 100);
});

test('rate comparison rejects unknown SKUs and bad prices', () => {
  assert.throws(() => compareVendorRates('MISSING', PROCUREMENT_PRICE_SEEDS), /No procurement price points/);
  assert.throws(
    () =>
      compareVendorRates('X', [
        { sku: 'X', vendorCode: 'V', vendorName: 'V', poDate: '2026-01-01', unitPrice: -1, quantity: 1 },
      ]),
    /unitPrice/,
  );
});

test('vendor concentration flags the primary vendor share', () => {
  const allocations = PROCUREMENT_PRICE_SEEDS.filter((point) => point.sku === 'EVM-H61FHL').map(
    (point) => ({ vendorCode: point.vendorCode, quantity: point.quantity }),
  );
  const analysis = analyzeVendorConcentration('EVM-H61FHL', allocations);
  assert.equal(analysis.totalQuantity, 42_900);
  assert.equal(analysis.primaryVendorCode, 'YINGHU');
  assertClose(analysis.primarySharePercent, (31_000 / 42_900) * 100);
  assert.equal(analysis.riskLevel, 'MODERATE');
});

test('concentration risk bands cover high, moderate, and low', () => {
  assert.equal(
    analyzeVendorConcentration('S', [{ vendorCode: 'A', quantity: 90 }, { vendorCode: 'B', quantity: 10 }]).riskLevel,
    'HIGH',
  );
  assert.equal(
    analyzeVendorConcentration('S', [{ vendorCode: 'A', quantity: 70 }, { vendorCode: 'B', quantity: 30 }]).riskLevel,
    'MODERATE',
  );
  assert.equal(
    analyzeVendorConcentration('S', [{ vendorCode: 'A', quantity: 50 }, { vendorCode: 'B', quantity: 50 }]).riskLevel,
    'LOW',
  );
});

test('allocation suggestions recommend the cheapest quote and offer a split', () => {
  const options = suggestVendorAllocation('EVM-H61FHL', 20_000, REORDER_VENDOR_QUOTES);
  assert.equal(options[0]?.vendorCode, 'GLOBAL-CONN');
  assert.equal(options[0]?.recommendation, 'RECOMMENDED');
  assert.equal(options[0]?.totalCost, 12.8 * 20_000);
  assert.ok(options.some((option) => option.recommendation === 'RISK_MITIGATION'));
});

test('validation rejects malformed vendor inputs', () => {
  assert.throws(
    () => scoreVendor({ ...VENDOR_PERFORMANCE_SEEDS[0]!, qualityScore: 1.5 }),
    /qualityScore/,
  );
  assert.throws(() => analyzeVendorConcentration('S', []), /No allocations/);
  assert.throws(() => suggestVendorAllocation('S', 0, REORDER_VENDOR_QUOTES), /quantity/);
});

console.log('\nCHUNK-7 vendor intelligence verification passed.');
