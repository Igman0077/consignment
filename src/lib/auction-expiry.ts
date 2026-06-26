import { prisma } from "./prisma";
import { ItemStatus, SaleMode } from "@prisma/client";
import { hasMetReserve } from "./auction";
import { broadcastItemUpdate } from "./broadcast-item-update";

export async function processExpiredAuctions() {
  const now = new Date();

  const expired = await prisma.item.findMany({
    where: {
      saleMode: SaleMode.AUCTION,
      bidEndAt: { lte: now },
      status: { in: [ItemStatus.AVAILABLE, ItemStatus.IN_CART] },
      quantityAvailable: { gt: 0 },
    },
  });

  for (const item of expired) {
    const reserve = item.price ?? 0;

    if (hasMetReserve(item)) {
      await prisma.item.update({
        where: { id: item.id },
        data: {
          saleMode: SaleMode.CLAIM,
          price: item.currentBid ?? reserve,
          currentBid: null,
          bidEndAt: null,
        },
      });
    } else if (item.auctionClaimFallback) {
      await prisma.$transaction([
        prisma.bid.deleteMany({ where: { itemId: item.id } }),
        prisma.item.update({
          where: { id: item.id },
          data: {
            saleMode: SaleMode.CLAIM,
            price: reserve,
            currentBid: null,
            bidEndAt: null,
          },
        }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.bid.deleteMany({ where: { itemId: item.id } }),
        prisma.item.update({
          where: { id: item.id },
          data: {
            currentBid: null,
            bidEndAt: null,
          },
        }),
      ]);
    }

    await broadcastItemUpdate(item.id);
  }
}
