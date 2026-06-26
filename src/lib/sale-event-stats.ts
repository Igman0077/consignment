import { prisma } from "./prisma";
import { ItemStatus, OrderStatus } from "@prisma/client";

export type SaleEventStats = {
  itemCount: number;
  totalUnits: number;
  availableUnits: number;
  unitsSold: number;
  unitsInCarts: number;
  soldItemCount: number;
  inCartItemCount: number;
  availableItemCount: number;
  paidOrderCount: number;
  pendingOrderCount: number;
  paidRevenue: number;
  pendingRevenue: number;
  uniqueCustomers: number;
  bidCount: number;
};

export async function getSaleEventStats(saleEventId: string): Promise<SaleEventStats> {
  const items = await prisma.item.findMany({
    where: { saleEventId, status: { not: ItemStatus.REMOVED } },
    select: { id: true, quantity: true, quantityAvailable: true, status: true },
  });

  const itemIds = items.map((item) => item.id);

  const [bidCount, orderItems, cartItems] = await Promise.all([
    itemIds.length > 0
      ? prisma.bid.count({ where: { itemId: { in: itemIds } } })
      : Promise.resolve(0),
    itemIds.length > 0
      ? prisma.orderItem.findMany({
          where: { itemId: { in: itemIds } },
          include: { order: { select: { id: true, status: true, userId: true } } },
        })
      : Promise.resolve([]),
    itemIds.length > 0
      ? prisma.cartItem.findMany({
          where: { itemId: { in: itemIds } },
          select: { quantity: true },
        })
      : Promise.resolve([]),
  ]);

  const orders = new Map<string, (typeof orderItems)[number]["order"]>();
  for (const line of orderItems) {
    orders.set(line.order.id, line.order);
  }

  const paidOrders = [...orders.values()].filter((o) => o.status === OrderStatus.PAID);
  const pendingOrders = [...orders.values()].filter((o) => o.status === OrderStatus.PENDING);

  const paidRevenue = orderItems
    .filter((line) => line.order.status === OrderStatus.PAID)
    .reduce((sum, line) => sum + line.price * line.quantity, 0);

  const pendingRevenue = orderItems
    .filter((line) => line.order.status === OrderStatus.PENDING)
    .reduce((sum, line) => sum + line.price * line.quantity, 0);

  const unitsSold = orderItems
    .filter((line) => line.order.status === OrderStatus.PAID)
    .reduce((sum, line) => sum + line.quantity, 0);

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const availableUnits = items.reduce((sum, item) => sum + item.quantityAvailable, 0);
  const unitsInCarts = cartItems.reduce((sum, line) => sum + line.quantity, 0);

  return {
    itemCount: items.length,
    totalUnits,
    availableUnits,
    unitsSold,
    unitsInCarts,
    soldItemCount: items.filter((item) => item.status === ItemStatus.SOLD).length,
    inCartItemCount: items.filter((item) => item.status === ItemStatus.IN_CART).length,
    availableItemCount: items.filter(
      (item) => item.quantityAvailable > 0 && item.status === ItemStatus.AVAILABLE
    ).length,
    paidOrderCount: paidOrders.length,
    pendingOrderCount: pendingOrders.length,
    paidRevenue,
    pendingRevenue,
    uniqueCustomers: new Set([...orders.values()].map((order) => order.userId)).size,
    bidCount,
  };
}
