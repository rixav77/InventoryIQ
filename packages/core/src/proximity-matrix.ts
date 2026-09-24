import { EVM_WAREHOUSES, WAREHOUSE_PROXIMITY_KM } from './data/seed-warehouses.js';

export type WarehouseRegion = 'MUMBAI_CLUSTER' | 'NORTH' | 'SOUTH';
export type TransferSpeed = 'SAME_DAY' | 'ROAD_2_3_DAYS' | 'ROAD_3_4_DAYS';

export interface Warehouse {
  code: string;
  name: string;
  city: string;
  region: WarehouseRegion;
  isEcommerce: boolean;
  isFba: boolean;
}

export interface WarehouseProximity {
  fromCode: string;
  toCode: string;
  distanceKm: number;
  roadDays: number;
  airDays: number;
}

export interface TransferCostEstimate {
  costPerUnit: number;
  totalCost: number;
}

export const SAME_DAY_COST_PER_UNIT = 0.6;
export const CROSS_REGION_COST_PER_UNIT = 4;

const ROAD_DAYS_BY_SPEED: Readonly<Record<TransferSpeed, number>> = {
  SAME_DAY: 0,
  ROAD_2_3_DAYS: 3,
  ROAD_3_4_DAYS: 4,
};

const AIR_DAYS_BY_SPEED: Readonly<Record<TransferSpeed, number>> = {
  SAME_DAY: 0,
  ROAD_2_3_DAYS: 1,
  ROAD_3_4_DAYS: 1,
};

const WAREHOUSES_BY_CODE = new Map(
  EVM_WAREHOUSES.map((warehouse) => [warehouse.code, warehouse]),
);

function proximityKey(first: string, second: string): string {
  return [first, second].sort().join('|');
}

export function listWarehouses(): readonly Warehouse[] {
  return EVM_WAREHOUSES;
}

export function getWarehouse(code: string): Warehouse {
  const warehouse = WAREHOUSES_BY_CODE.get(code);
  if (warehouse === undefined) {
    throw new Error(`Unknown warehouse code: ${code}`);
  }
  return warehouse;
}

export function classifyTransferSpeed(fromCode: string, toCode: string): TransferSpeed {
  const from = getWarehouse(fromCode);
  const to = getWarehouse(toCode);
  if (from.code === to.code) {
    return 'SAME_DAY';
  }
  if (from.region === 'MUMBAI_CLUSTER' && to.region === 'MUMBAI_CLUSTER') {
    return 'SAME_DAY';
  }
  if (from.region !== 'MUMBAI_CLUSTER' && to.region !== 'MUMBAI_CLUSTER') {
    return 'ROAD_3_4_DAYS';
  }
  return 'ROAD_2_3_DAYS';
}

export function getProximity(fromCode: string, toCode: string): WarehouseProximity {
  getWarehouse(fromCode);
  getWarehouse(toCode);
  const distanceKm = WAREHOUSE_PROXIMITY_KM.get(proximityKey(fromCode, toCode));
  if (distanceKm === undefined) {
    throw new Error(`No proximity data for ${fromCode} <-> ${toCode}`);
  }
  const speed = classifyTransferSpeed(fromCode, toCode);

  return {
    fromCode,
    toCode,
    distanceKm,
    roadDays: ROAD_DAYS_BY_SPEED[speed],
    airDays: AIR_DAYS_BY_SPEED[speed],
  };
}

export function calculateTransferCost(
  fromCode: string,
  toCode: string,
  quantity: number,
): TransferCostEstimate {
  getWarehouse(fromCode);
  getWarehouse(toCode);
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new Error('quantity must be a non-negative integer.');
  }
  const costPerUnit =
    classifyTransferSpeed(fromCode, toCode) === 'SAME_DAY'
      ? SAME_DAY_COST_PER_UNIT
      : CROSS_REGION_COST_PER_UNIT;

  return { costPerUnit, totalCost: costPerUnit * quantity };
}
