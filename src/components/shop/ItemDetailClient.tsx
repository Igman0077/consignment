"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Item, Bid, User, SaleMode, ItemStatus, Category } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody } from "@/components/ui/Card";
import { formatCurrency, formatDate, parsePhotos } from "@/lib/utils";
import { isClaimMode, getSaleModeLabel } from "@/lib/sale-mode";
import { getMinimumBid, hasMetReserve, isAuctionActive } from "@/lib/auction";
import {
  useLiveSaleInventory,
  isItemAvailableForPurchase,
} from "@/hooks/useLiveSaleInventory";
import { BackLink } from "@/components/ui/BackLink";
import { Gavel, Hand } from "lucide-react";

type ItemWithRelations = Item & {
  categoryRef?: Category | null;
  bids: (Bid & { user: Pick<User, "name"> })[];
  claimedBy: Pick<User, "name"> | null;
};

export function ItemDetailClient({
  item: initialItem,
  saleOpen = true,
  saleEventId,
  minBidIncrement = 1,
  previewMode = false,
  saleStartsAt,
}: {
  item: ItemWithRelations;
  saleOpen?: boolean;
  saleEventId: string;
  minBidIncrement?: number;
  previewMode?: boolean;
  saleStartsAt?: Date | string;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const liveUpdates = useLiveSaleInventory(previewMode ? null : saleEventId);
  const live = liveUpdates[initialItem.id];

  const quantityAvailable = live?.quantityAvailable ?? initialItem.quantityAvailable;
  const quantity = live?.quantity ?? initialItem.quantity;
  const status = live?.status ?? initialItem.status;
  const currentBid = live?.currentBid ?? initialItem.currentBid;
  const bids =
    live?.bids.map((bid) => ({
      id: bid.id,
      amount: bid.amount,
      userId: "",
      itemId: initialItem.id,
      createdAt: new Date(),
      user: { name: bid.userName },
    })) ?? initialItem.bids;

  const item = {
    ...initialItem,
    quantityAvailable,
    quantity,
    status,
    currentBid,
    bids,
  };

  const photos = parsePhotos(item.photos);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [bidAmount, setBidAmount] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const isAvailable = !previewMode && isItemAvailableForPurchase(quantityAvailable, status, saleOpen);
  const categoryLabel = item.categoryRef?.name ?? item.category;
  const reservePrice = item.price ?? 0;
  const auctionLive =
    item.saleMode === SaleMode.AUCTION &&
    isAuctionActive({ saleMode: item.saleMode, bidEndAt: item.bidEndAt });
  const minBid = getMinimumBid({ currentBid, price: item.price }, minBidIncrement);
  const reserveMet = hasMetReserve({ price: item.price, currentBid });

  async function handleAction(action: "claim" | "add-to-cart" | "bid") {
    if (!session) {
      router.push("/login?message=Please sign in to get this item");
      return;
    }

    setLoading(true);
    setMessage(null);

    const body: Record<string, unknown> = { itemId: item.id, action };
    if (action === "bid") {
      body.amount = parseFloat(bidAmount);
    }

    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage({ type: "error", text: data.error || "Something went wrong" });
      return;
    }

    setMessage({
      type: "success",
      text:
        action === "bid"
          ? "Bid placed! We'll notify you if you're outbid."
          : "Added to your cart! View My Cart when you're ready to check out.",
    });
  }

  const statusLabel =
    status === ItemStatus.SOLD
      ? "Sold"
      : quantityAvailable <= 0
        ? "Claimed"
        : status.replace("_", " ");

  return (
    <div className="container-page page-stack">
      <BackLink href={previewMode ? `/shop/preview/${saleEventId}` : "/shop"}>
        {previewMode ? "Back to preview" : "Back to all items"}
      </BackLink>

      {previewMode && saleStartsAt && (
        <Alert variant="info">
          Preview only — claiming and bidding open when the sale starts on{" "}
          {formatDate(saleStartsAt)}.
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
            {photos[selectedPhoto] ? (
              <Image
                src={photos[selectedPhoto]}
                alt={item.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400">
                No photo
              </div>
            )}
            {!isAvailable && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
                <span className="rounded-xl bg-white px-4 py-2 text-lg font-bold text-slate-900">
                  {status === ItemStatus.SOLD ? "Sold" : "No longer available"}
                </span>
              </div>
            )}
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {photos.map((photo, i) => (
                <button
                  key={photo}
                  type="button"
                  onClick={() => setSelectedPhoto(i)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-150 sm:h-20 sm:w-20 ${
                    i === selectedPhoto
                      ? "border-brand-600 ring-2 ring-brand-200"
                      : "border-slate-200 hover:border-brand-400 hover:bg-brand-50"
                  }`}
                >
                  <Image src={photo} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <SaleModeBadge mode={item.saleMode} />
              <Badge variant={isAvailable ? "success" : "warning"}>{statusLabel}</Badge>
            </div>
            <h1 className="text-2xl font-bold leading-snug text-slate-900 sm:text-3xl">{item.title}</h1>
            {categoryLabel && (
              <p className="mt-1 text-sm font-medium uppercase tracking-wide text-slate-400">
                {categoryLabel}
              </p>
            )}
            {quantity > 1 && (
              <p className="mt-2 text-sm font-medium text-slate-600">
                {quantityAvailable} of {quantity} available
              </p>
            )}
          </div>

          {item.description && (
            <p className="leading-relaxed text-slate-600">{item.description}</p>
          )}

          <div className="rounded-2xl bg-brand-50 p-5">
            {item.saleMode === SaleMode.AUCTION ? (
              <>
                {previewMode ? (
                  <>
                    <p className="text-sm font-medium text-brand-800">Reserve price</p>
                    <p className="text-3xl font-bold text-brand-700">
                      {formatCurrency(reservePrice)}
                    </p>
                    <p className="mt-2 text-sm text-brand-700">
                      Bidding opens when the sale starts
                      {saleStartsAt ? ` on ${formatDate(saleStartsAt)}` : ""}.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-brand-800">Current bid</p>
                    <p className="text-3xl font-bold text-brand-700">
                      {currentBid != null ? formatCurrency(currentBid) : "No bids yet"}
                    </p>
                    <p className="mt-2 text-sm text-brand-800">
                      Reserve price:{" "}
                      <span className="font-semibold">{formatCurrency(reservePrice)}</span>
                    </p>
                    {currentBid != null && !reserveMet && (
                      <p className="mt-1 text-sm text-amber-700">
                        Reserve not met — item cannot sell until bidding reaches the reserve.
                      </p>
                    )}
                    {item.bidEndAt && (
                      <p className="mt-1 text-sm text-brand-600">
                        {auctionLive
                          ? `Auction ends ${formatDate(item.bidEndAt)}`
                          : `Auction ended ${formatDate(item.bidEndAt)}`}
                      </p>
                    )}
                  </>
                )}
              </>
            ) : item.price != null ? (
              <>
                <p className="text-sm font-medium text-brand-800">Price</p>
                <p className="text-3xl font-bold text-brand-700">{formatCurrency(item.price)}</p>
              </>
            ) : null}
          </div>

          {!isAvailable && saleOpen && (
            <Alert variant="warning">
              {status === ItemStatus.SOLD
                ? "This item has been sold and is no longer available."
                : "This item has been claimed and is no longer available. Someone else got it first."}
            </Alert>
          )}

          {message && (
            <Alert variant={message.type === "success" ? "success" : "error"}>{message.text}</Alert>
          )}

          {isAvailable && !previewMode && (
            <Card>
              <CardBody className="space-y-4">
                <h2 className="font-bold text-slate-900">Get this item</h2>

                {!session && (
                  <Alert variant="info">
                    <Link href="/login" className="font-semibold underline">
                      Sign in
                    </Link>{" "}
                    or{" "}
                    <Link href="/register" className="font-semibold underline">
                      create an account
                    </Link>{" "}
                    to claim or bid on items.
                  </Alert>
                )}

                {isClaimMode(item.saleMode) && (
                  <>
                    <p className="text-sm text-slate-600">
                      Tap below to claim this item at the listed price. It goes into your cart until
                      you check out.
                    </p>
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={() => handleAction("claim")}
                      disabled={loading}
                    >
                      <Hand className="h-5 w-5" />
                      Claim This Item
                    </Button>
                  </>
                )}

                {item.saleMode === SaleMode.AUCTION && auctionLive && (
                  <>
                    <p className="text-sm text-slate-600">
                      Enter an amount higher than the current bid (minimum{" "}
                      {formatCurrency(minBid)}).
                    </p>
                    <Input
                      label="Your bid"
                      type="number"
                      step="0.01"
                      min={minBid}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder={minBid.toFixed(2)}
                    />
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={() => handleAction("bid")}
                      disabled={loading || !bidAmount}
                    >
                      <Gavel className="h-5 w-5" />
                      Place Bid
                    </Button>
                  </>
                )}
              </CardBody>
            </Card>
          )}

          {!previewMode && item.saleMode === SaleMode.AUCTION && bids.length > 0 && (
            <Card>
              <CardBody>
                <h2 className="mb-3 font-bold text-slate-900">Recent bids</h2>
                <ul className="space-y-2">
                  {bids.slice(0, 5).map((bid) => (
                    <li
                      key={bid.id}
                      className="flex justify-between text-sm text-slate-600"
                    >
                      <span>{bid.user.name}</span>
                      <span className="font-semibold">{formatCurrency(bid.amount)}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function SaleModeBadge({ mode }: { mode: SaleMode }) {
  const label = getSaleModeLabel(mode);
  const Icon = mode === SaleMode.AUCTION ? Gavel : Hand;
  return (
    <Badge variant="info" className="flex items-center gap-1 normal-case">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
