import { ItemStatus, OrderStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { broadcastItemUpdate } from "./broadcast-item-update";
import { setOrderStatus } from "./orders";

export async function getCartHoldMinutes(): Promise<number> {
  const settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });
  const minutes = settings?.cartHoldMinutes ?? 60;
  return Math.min(10080, Math.max(5, minutes));
}

export async function processExpiredCartHolds() {
  const holdMinutes = await getCartHoldMinutes();
  const cutoff = new Date(Date.now() - holdMinutes * 60 * 1000);

  const staleOrders = await prisma.order.findMany({
    where: { status: OrderStatus.PENDING, createdAt: { lt: cutoff } },
    select: { id: true },
  });

  for (const order of staleOrders) {
    try {
      await setOrderStatus(order.id, OrderStatus.CANCELLED);
    } catch (err) {
      console.error("[Cart expiry] Failed to cancel stale order:", order.id, err);
    }
  }

  const staleCartItems = await prisma.cartItem.findMany({
    where: { createdAt: { lt: cutoff } },
    include: { item: true },
  });

  for (const cartItem of staleCartItems) {
    const pendingOrder = await prisma.order.findFirst({
      where: {
        userId: cartItem.userId,
        status: OrderStatus.PENDING,
        items: { some: { itemId: cartItem.itemId } },
      },
    });

    if (pendingOrder) continue;

    const restoreQty = cartItem.quantity;
    const item = cartItem.item;

    await prisma.$transaction([
      prisma.cartItem.delete({ where: { id: cartItem.id } }),
      prisma.item.update({
        where: { id: cartItem.itemId },
        data: {
          quantityAvailable: item.quantityAvailable + restoreQty,
          status: ItemStatus.AVAILABLE,
          claimedById: null,
        },
      }),
    ]);

    await broadcastItemUpdate(cartItem.itemId);
  }
}
