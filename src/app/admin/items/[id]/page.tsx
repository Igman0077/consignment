import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ItemForm } from "@/components/admin/ItemForm";
import { ItemStatus, SaleEventStatus } from "@prisma/client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.item.findUnique({ where: { id } });
  return { title: item ? `Edit ${item.title}` : "Edit Item" };
}

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;

  const [item, categories, sales] = await Promise.all([
    prisma.item.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.saleEvent.findMany({
      where: { status: { in: [SaleEventStatus.SCHEDULED, SaleEventStatus.ACTIVE] } },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, status: true },
    }),
  ]);
  if (!item || item.status === ItemStatus.REMOVED) notFound();

  let salesList = sales;
  if (item.saleEventId && !sales.some((s) => s.id === item.saleEventId)) {
    const currentSale = await prisma.saleEvent.findUnique({
      where: { id: item.saleEventId },
      select: { id: true, title: true, status: true },
    });
    if (currentSale) salesList = [...sales, currentSale];
  }

  return <ItemForm item={item} categories={categories} sales={salesList} />;
}
