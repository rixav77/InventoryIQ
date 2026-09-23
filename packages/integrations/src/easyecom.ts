export type EasyEcomChannel = 'amazon' | 'flipkart' | 'd2c';
export type EasyEcomOrderStatus =
  | 'DELIVERED'
  | 'SHIPPED'
  | 'PENDING'
  | 'CANCELLED'
  | 'RETURNED';

export interface EasyEcomOrder {
  orderId: string;
  sku: string;
  channel: EasyEcomChannel;
  quantity: number;
  orderDate: string;
  status: EasyEcomOrderStatus;
}

export interface EasyEcomReturn {
  orderId: string;
  sku: string;
  channel: EasyEcomChannel;
  quantity: number;
  returnDate: string;
}

export interface DailyChannelSalesPoint {
  date: string;
  sku: string;
  channel: EasyEcomChannel;
  unitsSold: number;
  unitsReturned: number;
}

const SALE_STATUSES: readonly EasyEcomOrderStatus[] = ['DELIVERED', 'SHIPPED'];

function isIsoDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateEasyEcomOrders(orders: readonly EasyEcomOrder[]): readonly string[] {
  const issues: string[] = [];
  const seenOrderIds = new Set<string>();

  orders.forEach((order, index) => {
    if (order.orderId.trim() === '') {
      issues.push(`order[${index}] has an empty orderId.`);
    } else if (seenOrderIds.has(order.orderId)) {
      issues.push(`duplicate orderId ${order.orderId}.`);
    } else {
      seenOrderIds.add(order.orderId);
    }
    if (order.sku.trim() === '') {
      issues.push(`order[${index}] has an empty sku.`);
    }
    if (!Number.isInteger(order.quantity) || order.quantity < 0) {
      issues.push(`order[${index}] has an invalid quantity.`);
    }
    if (!isIsoDate(order.orderDate)) {
      issues.push(`order[${index}] has an invalid orderDate.`);
    }
  });

  return issues;
}

export function aggregateEasyEcomSales(
  orders: readonly EasyEcomOrder[],
  returns: readonly EasyEcomReturn[] = [],
): readonly DailyChannelSalesPoint[] {
  const issues = validateEasyEcomOrders(orders);
  if (issues.length > 0) {
    throw new Error(`Invalid EasyEcom orders: ${issues[0]}`);
  }

  const buckets = new Map<string, DailyChannelSalesPoint>();
  const keyOf = (date: string, sku: string, channel: EasyEcomChannel): string =>
    `${date}|${sku}|${channel}`;
  const bucketFor = (
    date: string,
    sku: string,
    channel: EasyEcomChannel,
  ): DailyChannelSalesPoint => {
    const key = keyOf(date, sku, channel);
    const existing = buckets.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const created: DailyChannelSalesPoint = { date, sku, channel, unitsSold: 0, unitsReturned: 0 };
    buckets.set(key, created);
    return created;
  };

  for (const order of orders) {
    if (!SALE_STATUSES.includes(order.status)) {
      continue;
    }
    bucketFor(order.orderDate, order.sku, order.channel).unitsSold += order.quantity;
  }

  for (const returned of returns) {
    if (!Number.isInteger(returned.quantity) || returned.quantity < 0) {
      throw new Error(`Invalid EasyEcom return quantity for order ${returned.orderId}.`);
    }
    bucketFor(returned.returnDate, returned.sku, returned.channel).unitsReturned +=
      returned.quantity;
  }

  return [...buckets.values()].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.sku.localeCompare(b.sku) ||
      a.channel.localeCompare(b.channel),
  );
}
