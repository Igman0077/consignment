import { Role, SaleMode } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const CATEGORY_NAMES = [
  "Furniture",
  "Home Decor",
  "Clothing",
  "Electronics",
  "Kids",
  "Kitchen",
];

let bootstrapPromise: Promise<void> | null = null;

export async function bootstrapDatabase(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = runBootstrap().catch((err) => {
      bootstrapPromise = null;
      throw err;
    });
  }
  return bootstrapPromise;
}

async function runBootstrap() {
  const existingOwner = await prisma.user.findFirst({
    where: { role: Role.OWNER },
  });

  if (!existingOwner) {
    const password = process.env.OWNER_INITIAL_PASSWORD || "owner123";
    await prisma.user.create({
      data: {
        email: "owner@shop.com",
        passwordHash: await bcrypt.hash(password, 12),
        name: "Shop Owner",
        role: Role.OWNER,
      },
    });

    if (!process.env.OWNER_INITIAL_PASSWORD) {
      console.warn(
        "[Bootstrap] Owner created with default password. Set OWNER_INITIAL_PASSWORD on Render."
      );
    }
  }

  for (let i = 0; i < CATEGORY_NAMES.length; i++) {
    await prisma.category.upsert({
      where: { name: CATEGORY_NAMES[i] },
      update: { sortOrder: i },
      create: { name: CATEGORY_NAMES[i], sortOrder: i },
    });
  }

  await prisma.shopSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      shopName: process.env.NEXT_PUBLIC_SHOP_NAME || "My Consignment Shop",
      shopDescription:
        "Quality pre-loved items at great prices. Browse during scheduled sales — claim or bid, then check out when you're done shopping!",
      welcomeMessage:
        "Welcome! Create a free account to claim items or place bids during our live sales.",
      defaultSaleMode: SaleMode.CLAIM,
      requirePaymentOnline: true,
      pickupInstructions:
        "Items can be picked up by appointment after payment is confirmed.",
    },
  });
}
