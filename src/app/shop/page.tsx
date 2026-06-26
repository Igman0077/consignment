import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ShopItemsGrid } from "@/components/shop/ShopItemsGrid";
import { ShopBrowseControls } from "@/components/shop/ShopBrowseControls";
import { UpcomingSales } from "@/components/shop/UpcomingSales";
import { Alert } from "@/components/ui/Alert";
import { ItemStatus } from "@prisma/client";
import { getShopSaleStatus, getUpcomingSales, toSaleEventListing } from "@/lib/sale-events";

export const metadata = { title: "Browse Items" };

const PER_PAGE_OPTIONS = [12, 24, 48];

type SearchParams = { category?: string; page?: string; perPage?: string };

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const saleStatus = await getShopSaleStatus();
  const upcomingSales = await getUpcomingSales(5);

  const perPage = PER_PAGE_OPTIONS.includes(Number(params.perPage))
    ? Number(params.perPage)
    : 12;
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const categoryId = params.category || "all";

  if (!saleStatus.isBrowseable || !saleStatus.activeSale) {
    const hasPreview = upcomingSales.some(
      (sale) => (sale as { allowPreview?: boolean }).allowPreview
    );

    return (
      <div className="container-page page-stack">
        <div className="page-header">
          <h1 className="page-title">Browse Items</h1>
          <p className="page-description">
            {hasPreview
              ? "Items are only available to purchase during an active sale. Upcoming sales with preview enabled let you browse photos early."
              : "Items are only visible during an active sale. No photos are shown until a sale begins."}
          </p>
        </div>
        <UpcomingSales
          sales={upcomingSales.map(toSaleEventListing)}
          activeSale={saleStatus.activeSale ? toSaleEventListing(saleStatus.activeSale) : null}
          upcomingSale={
            saleStatus.upcomingSale ? toSaleEventListing(saleStatus.upcomingSale) : null
          }
        />
      </div>
    );
  }

  const activeSaleId = saleStatus.activeSale.id;

  const categories = await prisma.category.findMany({
    where: {
      items: {
        some: {
          saleEventId: activeSaleId,
          quantityAvailable: { gt: 0 },
          status: { notIn: [ItemStatus.REMOVED, ItemStatus.SOLD] },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const where = {
    saleEventId: activeSaleId,
    quantityAvailable: { gt: 0 },
    status: { notIn: [ItemStatus.REMOVED, ItemStatus.SOLD] as ItemStatus[] },
    ...(categoryId !== "all" && { categoryId }),
  };

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.item.count({ where }),
  ]);

  return (
    <div className="container-page page-stack">
      <div className="page-header">
        <h1 className="page-title">{saleStatus.activeSale.title}</h1>
        <p className="page-description">
          {saleStatus.message || "Tap any item to see photos and claim or bid."}
        </p>
      </div>

      <Suspense fallback={null}>
        <ShopBrowseControls
          categories={categories}
          total={total}
          page={page}
          perPage={perPage}
          categoryId={categoryId}
        />
      </Suspense>

      {items.length === 0 ? (
        <Alert variant="info">
          No items in this sale right now. The owner may still be adding inventory.
        </Alert>
      ) : (
        <ShopItemsGrid items={items} saleEventId={activeSaleId} />
      )}

      {total > perPage && (
        <Suspense fallback={null}>
          <ShopBrowseControls
            categories={categories}
            total={total}
            page={page}
            perPage={perPage}
            categoryId={categoryId}
          />
        </Suspense>
      )}
    </div>
  );
}
