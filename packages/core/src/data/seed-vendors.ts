import type { ProcurementPricePoint, VendorQuote } from '../vendor-rates.js';
import type { VendorPerformanceInput } from '../vendor-otif.js';

export const PROCUREMENT_PRICE_SEEDS: readonly ProcurementPricePoint[] = [
  { sku: 'EVM-H61FHL', vendorCode: 'HK-NANO', vendorName: 'HK Nanotech CO., LIMITED', poDate: '2026-07-23', unitPrice: 11.99, quantity: 7_900 },
  { sku: 'EVM-H61FHL', vendorCode: 'YINGHU', vendorName: 'Yinghu International', poDate: '2026-07-28', unitPrice: 12.25, quantity: 11_000 },
  { sku: 'EVM-H61FHL', vendorCode: 'YINGHU', vendorName: 'Yinghu International', poDate: '2026-08-21', unitPrice: 13.3, quantity: 20_000 },
  { sku: 'EVM-H61FHL', vendorCode: 'SHENZHEN-DG', vendorName: 'Shenzhen Dinggong', poDate: '2026-08-22', unitPrice: 13.3, quantity: 4_000 },
  { sku: 'EVM-25/128GB', vendorCode: 'GLOBAL-CONN', vendorName: 'Global Connexions PVT LTD', poDate: '2026-08-01', unitPrice: 11.5, quantity: 12_000 },
  { sku: 'EVM-25/128GB', vendorCode: 'YINGHU', vendorName: 'Yinghu International', poDate: '2026-08-05', unitPrice: 12.8, quantity: 9_000 },
];

export const VENDOR_PERFORMANCE_SEEDS: readonly VendorPerformanceInput[] = [
  { vendorCode: 'GLOBAL-CONN', vendorName: 'Global Connexions PVT LTD', totalPurchaseOrders: 40, onTimeInFullPurchaseOrders: 38, averageLeadTimeDays: 28, leadTimeStandardDeviationDays: 3, qualityScore: 0.992, responsivenessScore: 0.9, priceCompetitiveness: 79 },
  { vendorCode: 'YINGHU', vendorName: 'Yinghu International', totalPurchaseOrders: 55, onTimeInFullPurchaseOrders: 50, averageLeadTimeDays: 42, leadTimeStandardDeviationDays: 5, qualityScore: 0.98, responsivenessScore: 0.8, priceCompetitiveness: 62 },
  { vendorCode: 'BRANDWORKS', vendorName: 'Brandworks Tech', totalPurchaseOrders: 30, onTimeInFullPurchaseOrders: 26, averageLeadTimeDays: 14, leadTimeStandardDeviationDays: 2, qualityScore: 0.97, responsivenessScore: 0.85, priceCompetitiveness: 58 },
  { vendorCode: 'HK-NANO', vendorName: 'HK Nanotech CO., LIMITED', totalPurchaseOrders: 45, onTimeInFullPurchaseOrders: 35, averageLeadTimeDays: 35, leadTimeStandardDeviationDays: 8, qualityScore: 0.975, responsivenessScore: 0.6, priceCompetitiveness: 74 },
  { vendorCode: 'CEHK', vendorName: 'CEHK Industry', totalPurchaseOrders: 25, onTimeInFullPurchaseOrders: 18, averageLeadTimeDays: 45, leadTimeStandardDeviationDays: 12, qualityScore: 0.95, responsivenessScore: 0.5, priceCompetitiveness: 45 },
];

export const REORDER_VENDOR_QUOTES: readonly VendorQuote[] = [
  { vendorCode: 'YINGHU', vendorName: 'Yinghu International', unitPrice: 13.3, leadTimeDays: 42, otifPercent: 91 },
  { vendorCode: 'GLOBAL-CONN', vendorName: 'Global Connexions PVT LTD', unitPrice: 12.8, leadTimeDays: 28, otifPercent: 95 },
];

export const VENDOR_SEED_PROVENANCE = {
  priceHistory: 'observed',
  vendorPerformance: 'simulated',
  reorderQuotes: 'simulated',
  source: 'CHUNK-7-VENDOR-INTELLIGENCE.md',
} as const;
