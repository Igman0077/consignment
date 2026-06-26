import {
  PrismaClient,
  Role,
  SaleMode,
  ItemStatus,
  OrderStatus,
  SaleEventStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAILS = [
  "sarah.m@example.com",
  "mike.j@example.com",
  "lisa.k@example.com",
];

const CATEGORY_NAMES = [
  "Furniture",
  "Home Decor",
  "Clothing",
  "Electronics",
  "Kids",
  "Kitchen",
];

function photos(...urls: string[]) {
  return JSON.stringify(urls);
}

function saleEndFromStart(start: Date, days: number) {
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  end.setHours(23, 59, 59, 999);
  return end;
}

async function clearDemoData() {
  const demoUsers = await prisma.user.findMany({
    where: { email: { in: DEMO_EMAILS } },
    select: { id: true },
  });
  const demoUserIds = demoUsers.map((u) => u.id);

  const demoItems = await prisma.item.findMany({
    where: { category: "Demo" },
    select: { id: true },
  });
  const demoItemIds = demoItems.map((i) => i.id);

  if (demoItemIds.length > 0) {
    await prisma.bid.deleteMany({ where: { itemId: { in: demoItemIds } } });
    await prisma.cartItem.deleteMany({ where: { itemId: { in: demoItemIds } } });
    await prisma.orderItem.deleteMany({ where: { itemId: { in: demoItemIds } } });
    await prisma.item.deleteMany({ where: { id: { in: demoItemIds } } });
  }

  if (demoUserIds.length > 0) {
    await prisma.order.deleteMany({ where: { userId: { in: demoUserIds } } });
    await prisma.cartItem.deleteMany({ where: { userId: { in: demoUserIds } } });
    await prisma.bid.deleteMany({ where: { userId: { in: demoUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: demoUserIds } } });
  }
}

async function main() {
  const isProductionSeed = process.env.SEED_MODE === "production";
  const ownerPlainPassword = process.env.OWNER_INITIAL_PASSWORD || "owner123";
  const ownerPassword = await bcrypt.hash(ownerPlainPassword, 12);
  const demoPassword = await bcrypt.hash("demo123", 12);

  await prisma.user.upsert({
    where: { email: "owner@shop.com" },
    update: {},
    create: {
      email: "owner@shop.com",
      passwordHash: ownerPassword,
      name: "Shop Owner",
      role: Role.OWNER,
    },
  });

  for (let i = 0; i < CATEGORY_NAMES.length; i++) {
    await prisma.category.upsert({
      where: { name: CATEGORY_NAMES[i] },
      update: { sortOrder: i },
      create: { name: CATEGORY_NAMES[i], sortOrder: i },
    });
  }

  await prisma.category.upsert({
    where: { name: "Demo" },
    update: {},
    create: { name: "Demo", sortOrder: 99 },
  });

  const categories = await prisma.category.findMany();
  const cat = Object.fromEntries(categories.map((c) => [c.name, c.id]));

  await prisma.shopSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      shopName: "Sunrise Consignment",
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

  if (isProductionSeed) {
    console.log("");
    console.log("Production seed complete!");
    console.log("");
    console.log(`Owner login: owner@shop.com / ${ownerPlainPassword}`);
    if (!process.env.OWNER_INITIAL_PASSWORD) {
      console.log("");
      console.log("WARNING: Set OWNER_INITIAL_PASSWORD before seeding in production.");
    }
    console.log("");
    return;
  }

  await clearDemoData();

  const activeSale = await prisma.saleEvent.create({
    data: {
      title: "June Weekend Sale",
      customerMessage:
        "Our big June sale is live now! Furniture, decor, clothing, and kitchen items — all at great prices.",
      startsAt: new Date(),
      endsAt: saleEndFromStart(new Date(), 7),
      status: SaleEventStatus.ACTIVE,
    },
  });

  const upcomingStart = new Date();
  upcomingStart.setDate(upcomingStart.getDate() + 14);
  await prisma.saleEvent.create({
    data: {
      title: "July Consignment Sale",
      customerMessage:
        "Mark your calendar! Our July sale opens in two weeks with fresh inventory. Create an account now so you're ready to shop.",
      startsAt: upcomingStart,
      endsAt: saleEndFromStart(upcomingStart, 5),
      status: SaleEventStatus.SCHEDULED,
    },
  });

  await prisma.item.updateMany({
    where: { saleMode: SaleMode.FIXED_PRICE },
    data: { saleMode: SaleMode.CLAIM },
  });
  await prisma.shopSettings.updateMany({
    where: { defaultSaleMode: SaleMode.FIXED_PRICE },
    data: { defaultSaleMode: SaleMode.CLAIM },
  });

  const sarah = await prisma.user.create({
    data: {
      email: "sarah.m@example.com",
      passwordHash: demoPassword,
      name: "Sarah Mitchell",
      phone: "(555) 234-8891",
      role: Role.CUSTOMER,
    },
  });

  const mike = await prisma.user.create({
    data: {
      email: "mike.j@example.com",
      passwordHash: demoPassword,
      name: "Mike Johnson",
      phone: "(555) 876-4420",
      role: Role.CUSTOMER,
    },
  });

  const lisa = await prisma.user.create({
    data: {
      email: "lisa.k@example.com",
      passwordHash: demoPassword,
      name: "Lisa Kim",
      phone: "(555) 412-9933",
      role: Role.CUSTOMER,
    },
  });

  await prisma.item.createMany({
    data: [
      {
        title: "Vintage Wooden Rocking Chair",
        description:
          "Solid oak rocking chair in great condition. Comfortable seat cushion included. Pickup recommended — a bit heavy!",
        category: "Demo",
        categoryId: cat.Furniture,
        price: 85,
        saleMode: SaleMode.CLAIM,
        status: ItemStatus.AVAILABLE,
        quantity: 1,
        quantityAvailable: 1,
        photos: photos(
          "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&q=80"
        ),
      },
      {
        title: "Ceramic Table Lamp",
        description:
          "Neutral cream ceramic base with linen shade. Works perfectly. Great for a bedside table or living room.",
        category: "Demo",
        categoryId: cat["Home Decor"],
        price: 32,
        quantity: 1,
        quantityAvailable: 1,
        saleMode: SaleMode.CLAIM,
        status: ItemStatus.AVAILABLE,
        photos: photos(
          "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&q=80"
        ),
      },
      {
        title: "Leather Crossbody Purse",
        description:
          "Genuine brown leather, multiple pockets inside. Gently used — no stains or tears.",
        category: "Demo",
        categoryId: cat.Clothing,
        price: 45,
        quantity: 1,
        quantityAvailable: 1,
        saleMode: SaleMode.CLAIM,
        status: ItemStatus.AVAILABLE,
        photos: photos(
          "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80"
        ),
      },
      {
        title: "Set of 4 Dining Chairs",
        description:
          "Upholstered dining chairs with wooden legs. Neutral gray fabric. From a smoke-free home.",
        category: "Demo",
        categoryId: cat.Furniture,
        price: 120,
        quantity: 1,
        quantityAvailable: 1,
        saleMode: SaleMode.CLAIM,
        status: ItemStatus.AVAILABLE,
        photos: photos(
          "https://images.unsplash.com/photo-1503602642458-232111445657?w=800&q=80"
        ),
      },
      {
        title: "Kids Bicycle (24 inch)",
        description:
          "Blue mountain bike for ages 8–12. Recently tuned up, tires in good shape. Helmet not included.",
        category: "Demo",
        categoryId: cat.Kids,
        price: 75,
        quantity: 1,
        quantityAvailable: 1,
        saleMode: SaleMode.CLAIM,
        status: ItemStatus.AVAILABLE,
        photos: photos(
          "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&q=80"
        ),
      },
      {
        title: "Coffee Mug Set (3 available)",
        description:
          "Classic stand mixer with dough hook and whisk attachments. Powerful motor, works like new.",
        category: "Demo",
        categoryId: cat.Kitchen,
        price: 12,
        quantity: 3,
        quantityAvailable: 3,
        saleMode: SaleMode.CLAIM,
        status: ItemStatus.AVAILABLE,
        photos: photos(
          "https://images.unsplash.com/photo-1594385204086-4f025778f5df?w=800&q=80"
        ),
      },
    ],
  });

  const mirror = await prisma.item.create({
    data: {
      title: "Antique Brass Wall Mirror",
      description:
        "Ornate brass frame, about 28 inches tall. Beautiful statement piece for an entryway or bedroom.",
      category: "Demo",
      categoryId: cat["Home Decor"],
      price: 40,
      quantity: 1,
      quantityAvailable: 1,
      saleMode: SaleMode.AUCTION,
      status: ItemStatus.AVAILABLE,
      currentBid: 58,
      bidEndAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      photos: photos(
        "https://images.unsplash.com/photo-1618220179428-22790b461013?w=800&q=80"
      ),
    },
  });

  await prisma.bid.createMany({
    data: [
      { itemId: mirror.id, userId: sarah.id, amount: 45 },
      { itemId: mirror.id, userId: mike.id, amount: 52 },
      { itemId: mirror.id, userId: sarah.id, amount: 58 },
    ],
  });

  const mixer = await prisma.item.create({
    data: {
      title: "Kitchen Stand Mixer (Reserved Demo)",
      description:
        "This item is in Lisa's cart to show how reserved items look in the owner dashboard.",
      category: "Demo",
      categoryId: cat.Kitchen,
      price: 65,
      quantity: 1,
      quantityAvailable: 0,
      saleMode: SaleMode.CLAIM,
      status: ItemStatus.IN_CART,
      claimedById: lisa.id,
      photos: photos(
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80"
      ),
    },
  });

  await prisma.cartItem.create({
    data: {
      userId: lisa.id,
      itemId: mixer.id,
      price: 65,
      quantity: 1,
    },
  });

  const coat = await prisma.item.create({
    data: {
      title: "Wool Winter Coat (Women's M)",
      description:
        "Warm charcoal wool coat, women's medium. Worn one season — like new condition.",
      category: "Demo",
      categoryId: cat.Clothing,
      price: 38,
      quantity: 1,
      quantityAvailable: 0,
      saleMode: SaleMode.CLAIM,
      status: ItemStatus.SOLD,
      soldAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      claimedById: mike.id,
      photos: photos(
        "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&q=80"
      ),
    },
  });

  await prisma.order.create({
    data: {
      userId: mike.id,
      total: 38,
      status: OrderStatus.PAID,
      paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      items: {
        create: {
          itemId: coat.id,
          price: 38,
          title: coat.title,
          quantity: 1,
        },
      },
    },
  });

  const pendingLamp = await prisma.item.create({
    data: {
      title: "Pending Payment Demo — Desk Lamp",
      description: "Shows an unpaid order in Sales & Payments.",
      category: "Demo",
      categoryId: cat["Home Decor"],
      price: 22,
      quantity: 1,
      quantityAvailable: 0,
      saleMode: SaleMode.CLAIM,
      status: ItemStatus.IN_CART,
      claimedById: sarah.id,
      photos: photos(
        "https://images.unsplash.com/photo-1524484487471-2af268eb59c4?w=800&q=80"
      ),
    },
  });

  await prisma.cartItem.create({
    data: { userId: sarah.id, itemId: pendingLamp.id, price: 22, quantity: 1 },
  });

  await prisma.order.create({
    data: {
      userId: sarah.id,
      total: 22,
      status: OrderStatus.PENDING,
      items: {
        create: {
          itemId: pendingLamp.id,
          price: 22,
          title: pendingLamp.title,
          quantity: 1,
        },
      },
    },
  });

  console.log("");
  console.log("Seed complete!");
  console.log("");
  console.log("Owner login:  owner@shop.com / owner123");
  console.log("");
  console.log("Demo customers (password for all: demo123):");
  console.log("  sarah.m@example.com  — Sarah Mitchell");
  console.log("  mike.j@example.com   — Mike Johnson");
  console.log("  lisa.k@example.com   — Lisa Kim");
  console.log("");
  console.log("Categories:", CATEGORY_NAMES.join(", "));
  console.log("Active demo sale: June Weekend Sale (7 days)");
  console.log("Upcoming: July Consignment Sale (in 14 days)");
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
