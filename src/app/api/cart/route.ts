import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShopSaleStatus } from "@/lib/sale-events";
import { broadcastItemUpdate } from "@/lib/broadcast-item-update";
import { getMinimumBid, isAuctionActive } from "@/lib/auction";
import { ItemStatus, SaleMode } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await getShopSaleStatus();

  const cartItems = await prisma.cartItem.findMany({
    where: { userId: session.user.id },
    include: { item: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items: cartItems });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Please sign in first" }, { status: 401 });
  }

  const saleStatus = await getShopSaleStatus();
  if (!saleStatus.isBrowseable || !saleStatus.activeSale) {
    return NextResponse.json(
      { error: "The sale is not open right now. Items cannot be claimed or bid on." },
      { status: 403 }
    );
  }

  const { itemId, action, amount } = await req.json();

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (
    !item ||
    item.status === ItemStatus.REMOVED ||
    item.status === ItemStatus.SOLD ||
    item.quantityAvailable < 1 ||
    item.saleEventId !== saleStatus.activeSale.id
  ) {
    return NextResponse.json({ error: "This item is no longer available" }, { status: 400 });
  }

  const settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });

  if (action === "bid") {
    if (item.saleMode !== SaleMode.AUCTION) {
      return NextResponse.json({ error: "This item is not an auction" }, { status: 400 });
    }

    if (!isAuctionActive(item)) {
      return NextResponse.json({ error: "This auction has ended" }, { status: 400 });
    }

    const increment = settings?.minBidIncrement ?? 1;
    const minBid = getMinimumBid(item, increment);
    if (!amount || amount < minBid) {
      return NextResponse.json(
        { error: `Bid must be at least $${minBid.toFixed(2)}` },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.bid.create({
        data: { amount, itemId, userId: session.user.id },
      }),
      prisma.item.update({
        where: { id: itemId },
        data: { currentBid: amount },
      }),
    ]);

    await broadcastItemUpdate(itemId);

    return NextResponse.json({ success: true });
  }

  const price =
    item.saleMode === SaleMode.AUCTION
      ? item.currentBid ?? 0
      : item.price ?? 0;

  if (item.saleMode === SaleMode.AUCTION) {
    return NextResponse.json(
      { error: "Auction items must be won through bidding before checkout" },
      { status: 400 }
    );
  }

  if (price <= 0) {
    return NextResponse.json({ error: "Item has no price set" }, { status: 400 });
  }

  const existingCart = await prisma.cartItem.findUnique({
    where: { userId_itemId: { userId: session.user.id, itemId } },
  });
  if (existingCart) {
    return NextResponse.json({ error: "This item is already in your cart" }, { status: 400 });
  }

  const newQtyAvailable = item.quantityAvailable - 1;

  await prisma.$transaction([
    prisma.cartItem.create({
      data: {
        userId: session.user.id,
        itemId,
        price,
        quantity: 1,
      },
    }),
    prisma.item.update({
      where: { id: itemId },
      data: {
        quantityAvailable: newQtyAvailable,
        ...(newQtyAvailable === 0
          ? { status: ItemStatus.IN_CART, claimedById: session.user.id }
          : { status: ItemStatus.AVAILABLE }),
      },
    }),
  ]);

  await broadcastItemUpdate(itemId);

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await req.json();

  const cartItem = await prisma.cartItem.findUnique({
    where: { userId_itemId: { userId: session.user.id, itemId } },
  });

  if (!cartItem) {
    return NextResponse.json({ error: "Item not in your cart" }, { status: 404 });
  }

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  const restoreQty = cartItem.quantity;

  await prisma.$transaction([
    prisma.cartItem.delete({ where: { id: cartItem.id } }),
    prisma.item.update({
      where: { id: itemId },
      data: {
        quantityAvailable: (item?.quantityAvailable ?? 0) + restoreQty,
        status: ItemStatus.AVAILABLE,
        claimedById: null,
      },
    }),
  ]);

  await broadcastItemUpdate(itemId);

  return NextResponse.json({ success: true });
}
