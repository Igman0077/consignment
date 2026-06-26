import Link from "next/link";
import { SaleEvent, SaleEventStatus } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { SaleEventStats } from "@/lib/sale-event-stats";
import { SaleEventStatsPanel } from "@/components/admin/SaleEventStatsPanel";
import { SaleEventItemsPanel } from "@/components/admin/SaleEventItemsPanel";
import { Item, Category } from "@prisma/client";
import { Eye } from "lucide-react";

const statusVariant: Record<SaleEventStatus, "success" | "warning" | "default" | "info"> = {
  ACTIVE: "success",
  SCHEDULED: "info",
  ENDED: "default",
};

export function SaleEventDetail({
  sale,
  stats,
  items,
  otherSales,
}: {
  sale: SaleEvent;
  stats: SaleEventStats | null;
  items: (Item & { categoryRef: Category | null })[];
  otherSales: Pick<SaleEvent, "id" | "title" | "status">[];
}) {
  return (
    <div className="page-stack">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{sale.title}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {formatDate(sale.startsAt)} — {formatDate(sale.endsAt)}
              </p>
            </div>
            <Badge variant={statusVariant[sale.status]}>{sale.status}</Badge>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {sale.customerMessage && (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Customer message</p>
              <p className="mt-1 whitespace-pre-wrap">{sale.customerMessage}</p>
            </div>
          )}
          {sale.status === SaleEventStatus.SCHEDULED && (
            <div className="rounded-xl border border-slate-200 p-4 text-sm">
              <p className="font-semibold text-slate-900">Customer preview</p>
              <p className="mt-1 text-slate-600">
                {(sale as { allowPreview?: boolean }).allowPreview
                  ? "Customers can browse item photos and details before this sale starts."
                  : "Preview is off — customers only see item photos once the sale is live."}
              </p>
              {(sale as { allowPreview?: boolean }).allowPreview && (
                <Link
                  href={`/shop/preview/${sale.id}`}
                  className="mt-3 inline-block"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                    View customer preview
                  </Button>
                </Link>
              )}
            </div>
          )}
          <Link href={`/admin/sale-events/${sale.id}/edit`}>
            <Button variant="outline" size="sm">
              Edit sale details
            </Button>
          </Link>
        </CardBody>
      </Card>

      {stats && <SaleEventStatsPanel stats={stats} status={sale.status} />}

      <SaleEventItemsPanel
        saleId={sale.id}
        saleStatus={sale.status}
        items={items}
        otherSales={otherSales}
      />
    </div>
  );
}
