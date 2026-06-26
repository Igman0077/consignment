import { requireOwner } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/admin/AdminNav";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import { SalesPeriodFilter } from "@/components/admin/SalesPeriodFilter";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { orderInPeriod, resolveSalesPeriod } from "@/lib/sales-period";
import { OrderStatus } from "@prisma/client";
import Link from "next/link";

export const metadata = { title: "Sales & Payments" };

function statusBadgeVariant(status: OrderStatus) {
  if (status === OrderStatus.PAID) return "success" as const;
  if (status === OrderStatus.CANCELLED) return "danger" as const;
  return "warning" as const;
}

export default async function AdminSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; period?: string }>;
}) {
  await requireOwner();
  const { date, period: periodParam } = await searchParams;
  const range = resolveSalesPeriod(periodParam, date);

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      items: true,
    },
  });

  const filteredOrders = orders.filter((o) => orderInPeriod(o, range));
  const paidOrders = filteredOrders.filter((o) => o.status === OrderStatus.PAID);
  const unpaidOrders = filteredOrders.filter((o) => o.status === OrderStatus.PENDING);
  const paidTotal = paidOrders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="container-page page-stack">
      <div className="page-header">
        <h1 className="page-title">Sales & Payments</h1>
        <p className="page-description">
          Filter by day, week, or month. Change any order status manually.
        </p>
      </div>

      <AdminNav />

      <Card>
        <CardBody>
          <SalesPeriodFilter
              period={range.period}
              inputValue={range.inputValue}
              periodLabel={range.label}
              paidCount={paidOrders.length}
              unpaidCount={unpaidOrders.length}
              paidTotal={paidTotal}
          />
        </CardBody>
      </Card>

      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <Card>
            <CardBody className="text-center text-slate-600">
              {orders.length === 0
                ? "No orders yet."
                : `No sales found for ${range.label}. Try a different ${range.period}.`}
            </CardBody>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id} interactive>
              <CardBody className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/admin/customers/${order.user.id}`}
                      className="link-action rounded-lg px-1 text-lg font-bold"
                    >
                      {order.user.name}
                    </Link>
                    <p className="text-sm text-slate-500">
                      {order.user.email}
                      {order.user.phone && ` · ${order.user.phone}`}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Ordered {formatDate(order.createdAt)}
                    </p>
                    {order.paidAt && (
                      <p className="text-sm text-slate-600">Paid {formatDate(order.paidAt)}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-brand-700">
                      {formatCurrency(order.total)}
                    </p>
                    <Badge variant={statusBadgeVariant(order.status)}>{order.status}</Badge>
                  </div>
                </div>

                <ul className="space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-600">
                  {order.items.map((oi) => (
                    <li key={oi.id} className="flex justify-between">
                      <span>{oi.title}</span>
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(oi.price)}
                      </span>
                    </li>
                  ))}
                </ul>

                <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
