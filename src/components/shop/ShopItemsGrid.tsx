"use client";

import { Item, Category } from "@prisma/client";
import { ItemCard } from "@/components/shop/ItemCard";
import { useLiveSaleInventory } from "@/hooks/useLiveSaleInventory";

type ShopItem = Item & { categoryRef?: Category | null };

export function ShopItemsGrid({
  items,
  saleEventId,
}: {
  items: ShopItem[];
  saleEventId: string;
}) {
  const liveUpdates = useLiveSaleInventory(saleEventId);

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const live = liveUpdates[item.id];
        const merged: ShopItem = live
          ? {
              ...item,
              quantityAvailable: live.quantityAvailable,
              quantity: live.quantity,
              status: live.status,
              currentBid: live.currentBid,
            }
          : item;

        return <ItemCard key={item.id} item={merged} />;
      })}
    </div>
  );
}
