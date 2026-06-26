import { prisma } from "@/lib/prisma";
import { ItemStatus } from "@prisma/client";
import { getPreviewableSale } from "@/lib/sale-events";
import { formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { ItemCard } from "@/components/shop/ItemCard";
import { BackLink } from "@/components/ui/BackLink";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  const { saleId } = await params;
  const sale = await getPreviewableSale(saleId);
  return {
    title: sale ? `${sale.title} — Preview` : "Sale preview",
    description: sale
      ? `Preview items for ${sale.title} before the sale opens on ${formatDate(sale.startsAt)}.`
      : undefined,
  };
}

export default async function SalePreviewPage({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  const { saleId } = await params;
  const sale = await getPreviewableSale(saleId);
  if (!sale) notFound();

  const items = await prisma.item.findMany({
    where: {
      saleEventId: saleId,
      status: { not: ItemStatus.REMOVED },
    },
    include: { categoryRef: true },
    orderBy: { title: "asc" },
  });

  return (
    <div className="container-page page-stack">
      <BackLink href="/">Back to home</BackLink>

      <div className="page-header">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Sale preview</p>
        <h1 className="page-title">{sale.title}</h1>
        <p className="page-description">
          Browse what will be available when the sale opens on {formatDate(sale.startsAt)}. You
          cannot claim or bid until then.
        </p>
      </div>

      {sale.customerMessage && (
        <Alert variant="info">{sale.customerMessage}</Alert>
      )}

      {items.length === 0 ? (
        <Alert variant="info">
          Items are still being added to this sale. Check back soon for a preview.
        </Alert>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              itemHref={`/shop/preview/${saleId}/${item.id}`}
              previewMode
            />
          ))}
        </div>
      )}
    </div>
  );
}
