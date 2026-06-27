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
  saleEventId: z.string().nullable().optional(),
});

async function requireOwnerSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "OWNER") {
    return null;
  }
  return session;
}

export async function POST(req: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = itemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid item data" }, { status: 400 });
  }

  const data = parsed.data;
  const saleMode =
    data.saleMode === SaleMode.FIXED_PRICE ? SaleMode.CLAIM : data.saleMode;

  if (!data.categoryId) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }

  if (saleMode === SaleMode.AUCTION && !data.auctionDurationHours) {
    return NextResponse.json({ error: "Auction duration is required" }, { status: 400 });
  }

  const settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });

  let categoryName: string | null = null;
  if (data.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!cat) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    categoryName = cat.name;
  }

  let bidEndAt: Date | undefined;
  if (saleMode === SaleMode.AUCTION) {
    const hours = data.auctionDurationHours ?? settings?.auctionDurationHours ?? 48;
    bidEndAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  const quantity = data.quantity;

  const saleEventId: string | null = data.saleEventId ?? null;
  if (saleEventId) {
    const sale = await prisma.saleEvent.findUnique({ where: { id: saleEventId } });
    if (!sale) {
      return NextResponse.json({ error: "Selected sale not found" }, { status: 400 });
    }
    if (sale.status === "ENDED") {
      return NextResponse.json({ error: "Cannot assign items to an ended sale" }, { status: 400 });
    }
  }

  const item = await prisma.item.create({
    data: {
      title: data.title.trim(),
      description: data.description.trim(),
      price: data.price,
      saleMode,
      categoryId: data.categoryId || null,
      category: categoryName,
      quantity,
      quantityAvailable: quantity,
      photos: stringifyPhotos(data.photos),
      currentBid: null,
      bidEndAt,
      saleEventId,
      auctionClaimFallback:
        saleMode === SaleMode.AUCTION ? data.auctionClaimFallback ?? false : false,
    },
  });

  return NextResponse.json(item);
}

export async function GET() {
  const items = await prisma.item.findMany({
    where: { status: { not: ItemStatus.REMOVED } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}
