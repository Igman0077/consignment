import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { requireOwner } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminItemsFilter } from "@/components/admin/AdminItemsFilter";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { formatCurrency, parsePhotos } from "@/lib/utils";
import { getSaleModeLabel } from "@/lib/sale-mode";
import { PlusCircle } from "lucide-react";
import { ItemStatus, Prisma } from "@prisma/client";

export const metadata = { title: "Manage Items" };

const statusVariant: Record<ItemStatus, "success" | "warning" | "default" | "danger"> = {
  AVAILABLE: "success",
  IN_CART: "warning",
  SOLD: "default",
  REMOVED: "danger",
};

type SearchParams = { category?: string; q?: string };

export default async function AdminItemsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireOwner();
  const params = await searchParams;

  const categoryId = params.category?.trim() || "";
  const query = params.q?.trim() || "";
  const hasFilter = categoryId.length > 0 || query.length > 0;

  const [categories, totalInventory] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.item.count(),
  ]);

  const where: Prisma.ItemWhereInput = {};

  if (categoryId && categoryId !== "all") {
    where.categoryId = categoryId;
  }

  if (query) {
    where.OR = [
      { title: { contains: query } },
      { description: { contains: query } },
    ];
  }

  const items = hasFilter
    ? await prisma.item.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          claimedBy: { select: { name: true } },
          categoryRef: { select: { name: true } },
        },
      })
    : [];

  return (
    <div className="container-page page-stack">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="page-header">
          <h1 className="page-title">Items</h1>
          <p className="page-description">
            Search or filter by category to find inventory. Assign items to sales from Scheduled Sales.
          </p>
        </div>
        <Link href="/admin/items/new">
          <Button size="lg">
            <PlusCircle className="h-5 w-5" />
            Add New Item
          </Button>
        </Link>
      </div>

      <AdminNav />

      <Suspense fallback={null}>
        <AdminItemsFilter categories={categories} categoryId={categoryId} query={query} />
      </Suspense>

      {!hasFilter ? (
        <Card>
          <CardBody className="py-10 text-center text-slate-600">
            {totalInventory === 0 ? (
              <>
                No items in inventory yet.{" "}
                <Link
                  href="/admin/items/new"
                  className="font-semibold text-brand-700 underline-offset-2 hover:underline"
                >
                  Add your first item
                </Link>
              </>
            ) : (
              <>Search, select a category, or choose all inventory above to view items.</>
            )}
          </CardBody>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center text-slate-600">
            No items match your search or category filter.
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            {items.length} item{items.length !== 1 ? "s" : ""} found
          </p>
          {items.map((item) => {
            const photos = parsePhotos(item.photos);
            return (
              <Card key={item.id} interactive>
                <CardBody className="flex flex-wrap items-center gap-4">
                  <Link
                    href={`/admin/items/${item.id}`}
                    className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200 transition-all hover:ring-brand-400"
                  >
                    {photos[0] && (
                      <Image src={photos[0]} alt="" fill className="object-cover" />
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/items/${item.id}`}
                      className="link-action rounded-lg px-1"
                    >
                      {item.title}
                    </Link>
                    <p className="text-sm text-slate-500">
                      {item.categoryRef?.name ?? item.category ?? "Uncategorized"}
                      {" · "}
                      {getSaleModeLabel(item.saleMode)}
                      {item.price != null && ` · ${formatCurrency(item.price)}`}
                      {item.claimedBy && ` · Claimed by ${item.claimedBy.name}`}
                    </p>
                  </div>
                  <Badge variant={statusVariant[item.status]}>{item.status}</Badge>
                  <Link href={`/admin/items/${item.id}`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
