import Link from "next/link";
import { requireOwner } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/admin/AdminNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";
import { PlusCircle } from "lucide-react";
import { SaleEventStatus } from "@prisma/client";

export const metadata = { title: "Scheduled Sales" };

const statusVariant: Record<SaleEventStatus, "success" | "warning" | "default" | "info"> = {
  ACTIVE: "success",
  SCHEDULED: "info",
  ENDED: "default",
};

export default async function SaleEventsPage() {
  await requireOwner();

  const sales = await prisma.saleEvent.findMany({
    orderBy: { startsAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="container-page page-stack">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="page-header">
          <h1 className="page-title">Scheduled Sales</h1>
          <p className="page-description">
            Create sale dates, add inventory to each sale, and customers only see items when a sale is live.
          </p>
        </div>
        <Link href="/admin/sale-events/new">
          <Button size="lg">
            <PlusCircle className="h-5 w-5" />
            Schedule new sale
          </Button>
        </Link>
      </div>

      <AdminNav />

      {sales.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center text-slate-600">
            No sales scheduled yet.{" "}
            <Link href="/admin/sale-events/new" className="font-semibold text-brand-700 hover:underline">
              Create your first sale
            </Link>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {sales.map((sale) => (
            <Card key={sale.id} interactive>
              <CardBody className="flex flex-wrap items-center gap-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/sale-events/${sale.id}`} className="link-action rounded-lg px-1">
                    {sale.title}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {formatDate(sale.startsAt)} — {formatDate(sale.endsAt)}
                    {" · "}
                    {sale._count.items} item{sale._count.items !== 1 ? "s" : ""}
                  </p>
                </div>
                <Badge variant={statusVariant[sale.status]}>{sale.status}</Badge>
                {sale.status === SaleEventStatus.SCHEDULED &&
                  (sale as { allowPreview?: boolean }).allowPreview && (
                  <Badge variant="info">Preview on</Badge>
                )}
                <Link href={`/admin/sale-events/${sale.id}`}>
                  <Button variant="outline" size="sm">
                    Manage
                  </Button>
                </Link>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
