import { prisma } from "./prisma";
import { ItemStatus, OrderStatus } from "@prisma/client";
import { broadcastItemUpdate } from "./broadcast-item-update";
import { sendCustomerInvoiceEmail } from "./emails/customer-invoice";

async function refreshItemStatusAfterOrder(itemId: string) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return;

  const cartCount = await prisma.cartItem.count({ where: { itemId } });

  if (item.quantityAvailable <= 0 && cartCount === 0) {
    await prisma.item.update({
      where: { id: itemId },
      data: { status: ItemStatus.SOLD, soldAt: new Date(), claimedById: null },
    });
  } else {
    await prisma.item.update({
      where: { id: itemId },
      data: { status: ItemStatus.AVAILABLE, claimedById: null },
    });
  }
}

export async function completeOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || order.status === OrderStatus.PAID) return;

  const itemIds = [...new Set(order.items.map((oi) => oi.itemId))];

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PAID, paidAt: new Date() },
    }),
    prisma.cartItem.deleteMany({
      where: { itemId: { in: itemIds }, userId: order.userId },
    }),
  ]);

  for (const itemId of itemIds) {
    await refreshItemStatusAfterOrder(itemId);
    await broadcastItemUpdate(itemId);
  }

  void sendCustomerInvoiceEmail(orderId);
}

export async function markOrderPaid(orderId: string) {
  await completeOrder(orderId);
}

export async function setOrderStatus(orderId: string, status: OrderStatus) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) throw new Error("Order not found");

  const itemIds = order.items.map((oi) => oi.itemId);
  const wasPaid = order.status === OrderStatus.PAID;

  if (status === OrderStatus.PAID) {
    await completeOrder(orderId);
    return;
  }

  if (status === OrderStatus.CANCELLED) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED, paidAt: null },
    });

    if (!wasPaid) {
      await prisma.cartItem.deleteMany({
        where: { itemId: { in: itemIds }, userId: order.userId },
      });
    }

    for (const oi of order.items) {
      await prisma.item.update({
        where: { id: oi.itemId },
        data: {
          quantityAvailable: { increment: oi.quantity },
          status: ItemStatus.AVAILABLE,
          claimedById: null,
          soldAt: null,
        },
      });
      await broadcastItemUpdate(oi.itemId);
    }
    return;
  }

  if (status === OrderStatus.PENDING) {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.PENDING, paidAt: null },
      });

      if (wasPaid) {
        for (const oi of order.items) {
          await tx.item.update({
            where: { id: oi.itemId },
            data: {
              quantityAvailable: { decrement: oi.quantity },
              status: ItemStatus.IN_CART,
              soldAt: null,
            },
          });
        }
      }
    });
  }
}
