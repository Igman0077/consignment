import { prisma } from "@/lib/prisma";
import { ItemStatus } from "@prisma/client";
import { getShopSaleStatus } from "@/lib/sale-events";
import { getShopSettings } from "@/lib/session";
import { notFound } from "next/navigation";
import { ItemDetailClient } from "@/components/shop/ItemDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.item.findUnique({ where: { id } });
  return { title: item?.title || "Item" };
}

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const saleStatus = await getShopSaleStatus();
  const settings = await getShopSettings();

  if (!saleStatus.isBrowseable || !saleStatus.activeSale) notFound();

  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      bids: {
        orderBy: { amount: "desc" },
        take: 10,
        include: { user: { select: { name: true } } },
      },
      claimedBy: { select: { name: true } },
    },
  });

  if (
    !item ||
    item.status === ItemStatus.REMOVED ||
    item.saleEventId !== saleStatus.activeSale.id
  ) {
    notFound();
  }

  return (
    <ItemDetailClient
      item={item}
      saleOpen={saleStatus.isBrowseable}
      saleEventId={saleStatus.activeSale.id}
      minBidIncrement={settings.minBidIncrement}
    />
  );
}
