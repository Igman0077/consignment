import { prisma } from "./prisma";
import { ItemStatus, OrderStatus, SaleEventStatus } from "@prisma/client";
import { formatDate } from "./utils";
import { processExpiredAuctions } from "./auction-expiry";
import { processExpiredCartHolds } from "./cart-expiry";
import { sendSaleSummaryEmail } from "./emails/sale-summary";

export type SaleEventListing = {
  id: string;
  title: string;
  customerMessage: string | null;
  startsAt: Date;
  endsAt: Date;
  status: SaleEventStatus;
  allowPreview: boolean;
};

export function toSaleEventListing(
  sale: {
    id: string;
    title: string;
    customerMessage: string | null;
    startsAt: Date;
    endsAt: Date;
    status: SaleEventStatus;
    allowPreview?: boolean;
  }
): SaleEventListing {
  return { ...sale, allowPreview: sale.allowPreview ?? false };
}

export type ShopSaleStatus = {
  isBrowseable: boolean;
  phase: "active" | "upcoming" | "none" | "ended";
  message: string;
  activeSale: Awaited<ReturnType<typeof getActiveSale>> | null;
  upcomingSale: Awaited<ReturnType<typeof getUpcomingSale>> | null;
};

export async function processSaleEvents() {
  const now = new Date();

  const expired = await prisma.saleEvent.findMany({
    where: { status: SaleEventStatus.ACTIVE, endsAt: { lt: now } },
  });

  for (const sale of expired) {
    await sendSaleSummaryEmail(sale.id);
    await expireSaleEvent(sale.id);
    await prisma.saleEvent.update({
      where: { id: sale.id },
      data: { status: SaleEventStatus.ENDED },
    });
  }

  const hasActive = await prisma.saleEvent.findFirst({
    where: { status: SaleEventStatus.ACTIVE },
  });

  if (!hasActive) {
    const next = await prisma.saleEvent.findFirst({
      where: {
        status: SaleEventStatus.SCHEDULED,
        startsAt: { lte: now },
        endsAt: { gt: now },
      },
      orderBy: { startsAt: "asc" },
    });

    if (next) {
      await prisma.saleEvent.update({
        where: { id: next.id },
        data: { status: SaleEventStatus.ACTIVE },
      });
    }
  }

  await processExpiredAuctions();
  await processExpiredCartHolds();
}

export async function expireSaleEvent(saleEventId: string) {
  const itemIds = (
    await prisma.item.findMany({
      where: { saleEventId, status: ItemStatus.IN_CART },
      select: { id: true },
    })
  ).map((i) => i.id);

  await prisma.$transaction([
    prisma.cartItem.deleteMany({
      where: { item: { saleEventId } },
    }),
    prisma.item.updateMany({
      where: { saleEventId, status: ItemStatus.IN_CART },
      data: { status: ItemStatus.AVAILABLE, claimedById: null },
    }),
    prisma.order.updateMany({
      where: {
        status: OrderStatus.PENDING,
        items: { some: { item: { saleEventId } } },
      },
      data: { status: OrderStatus.CANCELLED },
    }),
    ...(itemIds.length > 0
      ? [prisma.bid.deleteMany({ where: { itemId: { in: itemIds } } })]
      : []),
  ]);

  const saleItems = await prisma.item.findMany({
    where: { saleEventId, status: { not: ItemStatus.SOLD } },
    select: { id: true, quantity: true },
  });

  for (const item of saleItems) {
    await prisma.item.update({
      where: { id: item.id },
      data: { quantityAvailable: item.quantity, status: ItemStatus.AVAILABLE, claimedById: null },
    });
  }
}

export async function getActiveSale() {
  await processSaleEvents();
  return prisma.saleEvent.findFirst({
    where: { status: SaleEventStatus.ACTIVE },
    orderBy: { startsAt: "asc" },
  });
}

export async function getUpcomingSale() {
  await processSaleEvents();
  const now = new Date();
  return prisma.saleEvent.findFirst({
    where: {
      status: SaleEventStatus.SCHEDULED,
      startsAt: { gt: now },
    },
    orderBy: { startsAt: "asc" },
  });
}

export async function getUpcomingSales(limit = 5) {
  await processSaleEvents();
  const now = new Date();
  return prisma.saleEvent.findMany({
    where: {
      status: SaleEventStatus.SCHEDULED,
      startsAt: { gt: now },
    },
    orderBy: { startsAt: "asc" },
    take: limit,
  });
}

/** Upcoming scheduled sale the owner has opened for customer preview. */
export async function getPreviewableSale(saleEventId: string) {
  await processSaleEvents();
  const now = new Date();

  const sale = await prisma.saleEvent.findUnique({ where: { id: saleEventId } });
  if (
    !sale ||
    !(sale as { allowPreview?: boolean }).allowPreview ||
    sale.status !== SaleEventStatus.SCHEDULED ||
    sale.startsAt <= now
  ) {
    return null;
  }

  return sale;
}

export async function getShopSaleStatus(): Promise<ShopSaleStatus> {
  const activeSale = await getActiveSale();
  if (activeSale) {
    return {
      isBrowseable: true,
      phase: "active",
      message: `Sale open now — ends ${formatDate(activeSale.endsAt)}`,
      activeSale,
      upcomingSale: null,
    };
  }

  const upcomingSale = await getUpcomingSale();
  if (upcomingSale) {
    const msg =
      upcomingSale.customerMessage?.trim() ||
      `Our next sale starts ${formatDate(upcomingSale.startsAt)}. Check back then to browse items!`;
    return {
      isBrowseable: false,
      phase: "upcoming",
      message: msg,
      activeSale: null,
      upcomingSale,
    };
  }

  return {
    isBrowseable: false,
    phase: "none",
    message: "No sale is scheduled right now. Check back soon!",
    activeSale: null,
    upcomingSale: null,
  };
}

/** @deprecated Use getShopSaleStatus */
export async function getSaleWindowForShop() {
  const status = await getShopSaleStatus();
  return {
    settings: null,
    status: {
      isBrowseable: status.isBrowseable,
      phase:
        status.phase === "active"
          ? ("open" as const)
          : status.phase === "upcoming"
            ? ("scheduled" as const)
            : status.phase === "ended"
              ? ("ended" as const)
              : ("unscheduled" as const),
      message: status.message,
      startsAt: status.activeSale?.startsAt ?? status.upcomingSale?.startsAt ?? null,
      endsAt: status.activeSale?.endsAt ?? status.upcomingSale?.endsAt ?? null,
    },
  };
}
