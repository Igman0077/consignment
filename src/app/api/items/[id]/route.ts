import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stringifyPhotos } from "@/lib/utils";
import { SaleMode, ItemStatus } from "@prisma/client";
import { z } from "zod";

const itemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  price: z.number().min(0),
  saleMode: z.nativeEnum(SaleMode),
  categoryId: z.string().min(1),
  quantity: z.number().int().min(1),
  status: z.nativeEnum(ItemStatus).optional(),
  photos: z.array(z.string()),
  auctionDurationHours: z.number().int().min(1).optional(),
  auctionClaimFallback: z.boolean().optional(),
});

async function requireOwnerSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "OWNER") return null;
  return session;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid item data" }, { status: 400 });
  }

  const data = parsed.data;
  const saleMode =
    data.saleMode === SaleMode.FIXED_PRICE ? SaleMode.CLAIM : data.saleMode;

  let categoryName: string | null = null;
  if (data.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!cat) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    categoryName = cat.name;
  } else {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }

  if (saleMode === SaleMode.AUCTION && !data.auctionDurationHours) {
    return NextResponse.json({ error: "Auction duration is required" }, { status: 400 });
  }

  const existing = await prisma.item.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const quantity = data.quantity;
  const reserved = existing.quantity - existing.quantityAvailable;
  const quantityAvailable = Math.max(0, quantity - reserved);

  let bidEndAt = existing.bidEndAt;
  let currentBid = existing.currentBid;
  if (saleMode === SaleMode.AUCTION) {
    const settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });
    const hours = data.auctionDurationHours ?? settings?.auctionDurationHours ?? 48;
    if (existing.saleMode !== SaleMode.AUCTION) {
      bidEndAt = new Date(Date.now() + hours * 60 * 60 * 1000);
      currentBid = null;
    }
  } else {
    bidEndAt = null;
    currentBid = null;
  }

  const item = await prisma.item.update({
    where: { id },
    data: {
      title: data.title.trim(),
      description: data.description.trim(),
      price: data.price,
      saleMode,
      categoryId: data.categoryId,
      category: categoryName,
      quantity,
      quantityAvailable,
      photos: stringifyPhotos(data.photos),
      status: data.status,
      bidEndAt,
      currentBid,
      auctionClaimFallback:
        saleMode === SaleMode.AUCTION ? data.auctionClaimFallback ?? false : false,
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await prisma.item.update({
    where: { id },
    data: { status: ItemStatus.REMOVED },
  });

  return NextResponse.json({ success: true });
}
