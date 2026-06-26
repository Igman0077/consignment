"use client";

import { useEffect, useState } from "react";
import { ItemLiveUpdate } from "@/lib/live-inventory";

export function useLiveSaleInventory(saleEventId: string | null | undefined) {
  const [updates, setUpdates] = useState<Record<string, ItemLiveUpdate>>({});

  useEffect(() => {
    if (!saleEventId) return;

    const source = new EventSource(`/api/live/sale?saleId=${encodeURIComponent(saleEventId)}`);

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { type: string } & Partial<ItemLiveUpdate>;
        if (data.type === "item" && data.itemId) {
          setUpdates((prev) => ({
            ...prev,
            [data.itemId!]: data as ItemLiveUpdate,
          }));
        }
      } catch {
        // Ignore malformed events
      }
    };

    return () => {
      source.close();
    };
  }, [saleEventId]);

  return updates;
}

export function getLiveItemUpdate(
  updates: Record<string, ItemLiveUpdate>,
  itemId: string
): ItemLiveUpdate | undefined {
  return updates[itemId];
}

export function isItemAvailableForPurchase(
  quantityAvailable: number,
  status: string,
  saleOpen: boolean
) {
  return (
    saleOpen &&
    quantityAvailable > 0 &&
    status !== "SOLD" &&
    status !== "REMOVED"
  );
}
