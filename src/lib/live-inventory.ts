import { ItemStatus } from "@prisma/client";

export type LiveBid = {
  id: string;
  amount: number;
  userName: string;
};

export type ItemLiveUpdate = {
  type: "item";
  itemId: string;
  quantityAvailable: number;
  quantity: number;
  status: ItemStatus;
  currentBid: number | null;
  bids: LiveBid[];
};

type SaleListener = (update: ItemLiveUpdate) => void;

class LiveInventoryHub {
  private saleListeners = new Map<string, Set<SaleListener>>();

  subscribe(saleEventId: string, listener: SaleListener) {
    if (!this.saleListeners.has(saleEventId)) {
      this.saleListeners.set(saleEventId, new Set());
    }
    this.saleListeners.get(saleEventId)!.add(listener);

    return () => {
      this.saleListeners.get(saleEventId)?.delete(listener);
    };
  }

  publish(saleEventId: string, update: ItemLiveUpdate) {
    const listeners = this.saleListeners.get(saleEventId);
    if (!listeners) return;
    for (const listener of listeners) {
      listener(update);
    }
  }
}

const globalForLive = globalThis as unknown as { liveInventoryHub?: LiveInventoryHub };

export const liveInventoryHub =
  globalForLive.liveInventoryHub ?? new LiveInventoryHub();

if (process.env.NODE_ENV !== "production") {
  globalForLive.liveInventoryHub = liveInventoryHub;
}
