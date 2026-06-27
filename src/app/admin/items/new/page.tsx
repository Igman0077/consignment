import { requireOwner, getShopSettings } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ItemForm } from "@/components/admin/ItemForm";
import { SaleEventStatus } from "@prisma/client";

export const metadata = { title: "Add Item" };

export default async function NewItemPage() {
  await requireOwner();
  const [settings, categories, sales] = await Promise.all([
    getShopSettings(),
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.saleEvent.findMany({
      where: { status: { in: [SaleEventStatus.SCHEDULED, SaleEventStatus.ACTIVE] } },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, status: true },
    }),
  ]);

  return (
    <ItemForm
      defaultSaleMode={settings.defaultSaleMode}
      categories={categories}
      sales={sales}
    />
  );
}
