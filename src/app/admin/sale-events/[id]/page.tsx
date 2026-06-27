import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/admin/AdminNav";
import { BackLink } from "@/components/ui/BackLink";
import { SaleEventDetail } from "@/components/admin/SaleEventDetail";
import { getSaleEventStats } from "@/lib/sale-event-stats";
import { ItemStatus } from "@prisma/client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sale = await prisma.saleEvent.findUnique({ where: { id } });
  return { title: sale?.title ?? "Sale" };
}

export default async function SaleEventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;

  const [sale, otherSales, availableItems, categories] = await Promise.all([
    prisma.saleEvent.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { title: "asc" },
          include: { categoryRef: true },
        },
      },
    }),
    prisma.saleEvent.findMany({
      where: { id: { not: id }, status: { not: "ENDED" } },
      orderBy: { startsAt: "asc" },
      select: { id: true, title: true, status: true },
    }),
    prisma.item.findMany({
      where: {
        status: { notIn: [ItemStatus.REMOVED, ItemStatus.SOLD] },
        OR: [{ saleEventId: null }, { saleEventId: { not: id } }],
      },
      include: {
        categoryRef: true,
        saleEvent: { select: { id: true, title: true } },
      },
      orderBy: { title: "asc" },
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  if (!sale) notFound();

  const stats =
    sale.status === "ACTIVE" || sale.status === "ENDED"
      ? await getSaleEventStats(sale.id)
      : null;

  return (
    <div className="container-page max-w-5xl page-stack">
      <BackLink href="/admin/sale-events">All scheduled sales</BackLink>

      <AdminNav />
      <SaleEventDetail
        sale={sale}
        stats={stats}
        items={sale.items}
        otherSales={otherSales}
        availableItems={availableItems}
        categories={categories}
      />
    </div>
  );
}
