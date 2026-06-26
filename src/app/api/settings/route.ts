import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SaleMode } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  shopName: z.string().min(1),
  shopDescription: z.string().optional(),
  welcomeMessage: z.string().optional(),
  defaultSaleMode: z.nativeEnum(SaleMode),
  requirePaymentOnline: z.boolean(),
  minBidIncrement: z.number().min(0.01),
  auctionDurationHours: z.number().min(1),
  cartHoldMinutes: z.number().min(5).max(10080),
  ownerNotificationEmail: z.union([z.string().email(), z.literal("")]).optional(),
  pickupInstructions: z.string().optional(),
});

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  }

  const data = parsed.data;
  const defaultSaleMode =
    data.defaultSaleMode === SaleMode.FIXED_PRICE ? SaleMode.CLAIM : data.defaultSaleMode;

  const settings = await prisma.shopSettings.upsert({
    where: { id: 1 },
    update: {
      shopName: data.shopName.trim(),
      shopDescription: data.shopDescription?.trim() || null,
      welcomeMessage: data.welcomeMessage?.trim() || null,
      defaultSaleMode,
      requirePaymentOnline: data.requirePaymentOnline,
      minBidIncrement: data.minBidIncrement,
      auctionDurationHours: data.auctionDurationHours,
      cartHoldMinutes: data.cartHoldMinutes,
      ownerNotificationEmail: data.ownerNotificationEmail?.trim() || null,
      pickupInstructions: data.pickupInstructions?.trim() || null,
    },
    create: {
      shopName: data.shopName.trim(),
      shopDescription: data.shopDescription?.trim() || null,
      welcomeMessage: data.welcomeMessage?.trim() || null,
      defaultSaleMode,
      requirePaymentOnline: data.requirePaymentOnline,
      minBidIncrement: data.minBidIncrement,
      auctionDurationHours: data.auctionDurationHours,
      cartHoldMinutes: data.cartHoldMinutes,
      ownerNotificationEmail: data.ownerNotificationEmail?.trim() || null,
      pickupInstructions: data.pickupInstructions?.trim() || null,
    },
  });

  return NextResponse.json(settings);
}

export async function GET() {
  const settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });
  return NextResponse.json(settings);
}
