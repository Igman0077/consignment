import { Item, SaleMode } from "@prisma/client";

export function getReservePrice(item: Pick<Item, "price">) {
  return item.price ?? 0;
}

export function hasMetReserve(item: Pick<Item, "price" | "currentBid">) {
  const reserve = getReservePrice(item);
  return (item.currentBid ?? 0) >= reserve;
}

export function isAuctionActive(item: Pick<Item, "saleMode" | "bidEndAt">) {
  return (
    item.saleMode === SaleMode.AUCTION &&
    item.bidEndAt != null &&
    item.bidEndAt.getTime() > Date.now()
  );
}

export function getMinimumBid(
  item: Pick<Item, "currentBid" | "price">,
  increment: number
) {
  if (item.currentBid != null) {
    return item.currentBid + increment;
  }
  return Math.max(increment, 1);
}
