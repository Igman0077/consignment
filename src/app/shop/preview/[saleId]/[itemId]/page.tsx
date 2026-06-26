import { prisma } from "@/lib/prisma";
import { ItemStatus } from "@prisma/client";
import { getPreviewableSale } from "@/lib/sale-events";
import { getShopSettings } from "@/lib/session";
import { notFound } from "next/navigation";
import { ItemDetailClient } from "@/components/shop/ItemDetailClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ saleId: string; itemId: string }>;
}) {
  const { itemId } = await params;
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  return { title: item ? `${item.title} — Preview` : "Item preview" };
}

export default async function SalePreviewItemPage({
  params,
}: {
  params: Promise<{ saleId: string; itemId: string }>;
}) {
  const { saleId, itemId } = await params;
  const sale = await getPreviewableSale(saleId);
  if (!sale) notFound();

  const settings = await getShopSettings();

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      categoryRef: true,
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
    item.saleEventId !== saleId
  ) {
    notFound();
  }

  return (
    <ItemDetailClient
      item={item}
      saleOpen={false}
      saleEventId={saleId}
      minBidIncrement={settings.minBidIncrement}
      previewMode
      saleStartsAt={sale.startsAt}
    />
  );
}
