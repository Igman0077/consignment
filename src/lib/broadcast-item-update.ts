import { prisma } from "./prisma";
import { liveInventoryHub, ItemLiveUpdate } from "./live-inventory";

export async function broadcastItemUpdate(itemId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      bids: {
        orderBy: { amount: "desc" },
        take: 5,
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!item?.saleEventId) return;

  const update: ItemLiveUpdate = {
    type: "item",
    itemId: item.id,
    quantityAvailable: item.quantityAvailable,
    quantity: item.quantity,
    status: item.status,
    currentBid: item.currentBid,
    bids: item.bids.map((bid) => ({
      id: bid.id,
      amount: bid.amount,
      userName: bid.user.name,
    })),
  };

  liveInventoryHub.publish(item.saleEventId, update);
}

export async function broadcastItemUpdates(itemIds: string[]) {
  const uniqueIds = [...new Set(itemIds)];
  await Promise.all(uniqueIds.map((id) => broadcastItemUpdate(id)));
}
