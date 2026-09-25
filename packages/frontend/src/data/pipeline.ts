/*
 * Pipeline visibility.
 *
 * The ingestion parsers are imported straight from the integrations workspace so
 * this section exercises the real code path instead of describing it. Only the
 * self-contained CSV and EasyEcom modules are pulled in; the migration registry
 * reads from disk with node:fs and therefore stays server-side, so the schema
 * below mirrors that migration file.
 */

import {
  parseHundiaStockExport,
  parseProcuraMslExport,
} from '../../../integrations/src/csv-parser';
import { aggregateEasyEcomSales } from '../../../integrations/src/easyecom';
import type { EasyEcomOrder } from '../../../integrations/src/easyecom';

const PROCURA_SAMPLE = [
  'SKU,Monthly Selling Plan,Procurement Time,Minimum Order Quantity,Stock,Open PO,In-Transit,MSL,ROL',
  '"EVM-25/128GB","75,000",30,1,"73,586",0,0,"75,000","75,000"',
  'EVM-25/256GB,"1,00,000",30,0,"1,64,347","67,500",0,"1,00,000","1,00,000"',
  'EVM-25/512GB,"25,000",30,1,"31,207",0,0,"25,000","25,000"',
  'EVM-25/1TB,"6,000",30,0,"10,704",0,0,"6,000","6,000"',
  'EVM-M2/256GB,"5,000",30,0,"19,753",0,0,"5,000","5,000"',
].join('\n');

const HUNDIA_SAMPLE = [
  'SKU,Warehouse,Current,Allocated,Available',
  'P0109-B,Bhiwandi,"7,390",5,"7,385"',
  'P0109-B,Delhi,0,0,0',
  'EVM-25/128GB,Bhiwandi,"73,000",0,"73,000"',
  'EVM-25/128GB,Delhi,586,0,586',
].join('\n');

const EASYECOM_SAMPLE: readonly EasyEcomOrder[] = [
  { orderId: 'AMZ-9001', sku: 'EVM-25/128GB', channel: 'amazon', quantity: 620, orderDate: '2026-09-20', status: 'DELIVERED' },
  { orderId: 'AMZ-9002', sku: 'EVM-25/128GB', channel: 'amazon', quantity: 540, orderDate: '2026-09-21', status: 'DELIVERED' },
  { orderId: 'AMZ-9003', sku: 'EVM-25/128GB', channel: 'amazon', quantity: 410, orderDate: '2026-09-21', status: 'SHIPPED' },
  { orderId: 'FK-4410', sku: 'EVM-25/128GB', channel: 'flipkart', quantity: 380, orderDate: '2026-09-20', status: 'SHIPPED' },
  { orderId: 'FK-4411', sku: 'EVM-25/128GB', channel: 'flipkart', quantity: 295, orderDate: '2026-09-21', status: 'DELIVERED' },
  { orderId: 'AMZ-9004', sku: 'EVM-25/128GB', channel: 'amazon', quantity: 130, orderDate: '2026-09-21', status: 'PENDING' },
  { orderId: 'FK-4412', sku: 'EVM-25/128GB', channel: 'flipkart', quantity: 60, orderDate: '2026-09-21', status: 'CANCELLED' },
];

const EASYECOM_RETURNS = [
  { orderId: 'AMZ-9001', sku: 'EVM-25/128GB', channel: 'amazon' as const, quantity: 48, returnDate: '2026-09-20' },
  { orderId: 'FK-4410', sku: 'EVM-25/128GB', channel: 'flipkart' as const, quantity: 41, returnDate: '2026-09-20' },
];

export interface PipelineSource {
  name: string;
  origin: string;
  cadence: string;
  status: 'WIRED' | 'PLANNED';
  provenance: 'observed' | 'imported' | 'simulated';
  detail: string;
}

export const PIPELINE_SOURCES: readonly PipelineSource[] = [
  {
    name: 'Procura MSL planning grid',
    origin: 'Procura (.NET) export',
    cadence: 'nightly CSV',
    status: 'WIRED',
    provenance: 'observed',
    detail: 'MSP, PT, MOQ, stock, open PO, in-transit, existing MSL/ROL per SKU.',
  },
  {
    name: 'Hundia stock summary',
    origin: 'CRM warehouse stock',
    cadence: 'hourly CSV',
    status: 'WIRED',
    provenance: 'observed',
    detail: 'Per-warehouse current, allocated and available units across the 6 locations.',
  },
  {
    name: 'EasyEcom marketplace orders',
    origin: 'EasyEcom API / export',
    cadence: 'daily API',
    status: 'WIRED',
    provenance: 'simulated',
    detail: 'Order, shipment, cancellation and RTO rows normalised to daily channel sales.',
  },
  {
    name: 'Tally purchase orders & shipments',
    origin: 'Tally ERP (9 endpoints)',
    cadence: 'V1 connector',
    status: 'PLANNED',
    provenance: 'observed',
    detail: 'Landed cost, currency, ETD/ETA and customs status for lead-time actuals.',
  },
];

export interface SchemaTable {
  name: string;
  purpose: string;
  engine: string;
}

export const SCHEMA_TABLES: readonly SchemaTable[] = [
  { name: 'sku_master', purpose: 'Catalogue and category hierarchy', engine: 'Integration layer' },
  { name: 'daily_sales', purpose: 'Per-channel daily units sold and returned', engine: 'Integration layer' },
  { name: 'warehouses', purpose: '7-location registry with cluster and e-com flags', engine: 'Transfer intelligence' },
  { name: 'warehouse_proximity', purpose: 'Distance, road/air transit days, cost per unit', engine: 'Transfer intelligence' },
  { name: 'warehouse_stock', purpose: 'Per-warehouse current / allocated / available', engine: 'Transfer intelligence' },
  { name: 'transfer_recommendations', purpose: 'Surplus-to-deficit moves with approval state', engine: 'Transfer intelligence' },
  { name: 'purchase_orders', purpose: 'PO pipeline, currency, expected dates', engine: 'Integration layer' },
  { name: 'shipments', purpose: 'AWB/BL, ETD/ETA, customs status', engine: 'Integration layer' },
  { name: 'vendor_performance', purpose: 'OTIF, lead-time variance, quality scores', engine: 'Vendor intelligence' },
  { name: 'procurement_prices', purpose: 'Multi-vendor rate history per SKU', engine: 'Vendor intelligence' },
  { name: 'vendor_concentration', purpose: 'Single-source exposure per SKU', engine: 'Vendor intelligence' },
];

export const PIPELINE_RUN = {
  procuraRows: parseProcuraMslExport(PROCURA_SAMPLE),
  hundiaRows: parseHundiaStockExport(HUNDIA_SAMPLE),
  easyEcomDaily: aggregateEasyEcomSales(EASYECOM_SAMPLE, EASYECOM_RETURNS),
  ignoredEasyEcomRows: EASYECOM_SAMPLE.filter(
    (order) => order.status !== 'DELIVERED' && order.status !== 'SHIPPED',
  ).length,
};
