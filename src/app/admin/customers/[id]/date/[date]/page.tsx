import Link from "next/link";
import { BackLink } from "@/components/ui/BackLink";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/admin/AdminNav";
import { OrderStatusSelect } from "@/components/admin/OrderStatusSelect";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import {
  formatCurrency,
  formatDate,
  formatDateOnly,
  parseDateKey,
  toDateKey,
} from "@/lib/utils";
import { OrderStatus } from "@prisma/client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; date: string }>;
}) {
  const { id, date } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  const label = formatDateOnly(parseDateKey(date));
  return { title: user ? `${user.name} — ${label}` : "Purchase date" };
}

export default async function AdminCustomerDatePage({
  params,
}: {
  params: Promise<{ id: string; date: string }>;
}) {
  await requireOwner();
  const { id, date: dateKey } = await params;

  const customer = await prisma.user.findUnique({
    where: { id, role: "CUSTOMER" },
    select: { id: true, name: true, email: true, phone: true },
  });

  if (!customer) notFound();

  const dayStart = parseDateKey(dateKey);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  const orders = await prisma.order.findMany({
    where: { userId: customer.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  const ordersOnDay = orders.filter((order) => {
    const ref = order.paidAt ?? order.createdAt;
    const key = toDateKey(ref);
    return key === dateKey;
  });

  if (ordersOnDay.length === 0) notFound();

  const dayTotal = ordersOnDay.reduce((sum, o) => sum + o.total, 0);
  const allItems = ordersOnDay.flatMap((o) =>
    o.items.map((item) => ({ ...item, orderId: o.id, orderStatus: o.status }))
  );

  return (
    <div className="container-page page-stack">
      <BackLink href={`/admin/customers/${customer.id}`}>
        Back to {customer.name}
      </BackLink>

      <div className="page-header">
        <h1 className="page-title">{formatDateOnly(dayStart)}</h1>
        <p className="page-description">
          Purchases by {customer.name} on this date
        </p>
      </div>

      <AdminNav />

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-700">Day total</p>
            <p className="text-2xl font-bold text-brand-700">{formatCurrency(dayTotal)}</p>
          </div>
          <div className="text-sm text-slate-600">
            <p>{allItems.length} item{allItems.length !== 1 ? "s" : ""}</p>
            <p>{ordersOnDay.length} order{ordersOnDay.length !== 1 ? "s" : ""}</p>
          </div>
        </CardBody>
      </Card>

      <div className="space-y-4">
        {ordersOnDay.map((order) => (
          <Card key={order.id} interactive>
            <CardBody className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <p className="text-sm text-slate-500">Order placed</p>
                  <p className="font-semibold text-slate-900">{formatDate(order.createdAt)}</p>
                  {order.paidAt && (
                    <p className="mt-1 text-sm text-slate-600">
                      Paid {formatDate(order.paidAt)}
                    </p>
                  )}
                </div>
                <div className="space-y-2 text-right">
                  <p className="text-xl font-bold text-brand-700">
                    {formatCurrency(order.total)}
                  </p>
                  <Badge
                    variant={
                      order.status === OrderStatus.PAID
                        ? "success"
                        : order.status === OrderStatus.CANCELLED
                          ? "danger"
                          : "warning"
                    }
                  >
                    {order.status}
                  </Badge>
                </div>
              </div>

              <ul className="space-y-2">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm"
                  >
                    <span className="font-medium text-slate-900">{item.title}</span>
                    <span className="font-bold text-slate-800">{formatCurrency(item.price)}</span>
                  </li>
                ))}
              </ul>

              <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardBody>
          <h2 className="section-title mb-3">All items on this date</h2>
          <ul className="divide-y divide-slate-100">
            {allItems.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <span className="font-medium text-slate-900">{item.title}</span>
                <span className="font-bold text-brand-700">{formatCurrency(item.price)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 font-bold text-slate-900">
            <span>Total for {formatDateOnly(dayStart)}</span>
            <span className="text-brand-700">{formatCurrency(dayTotal)}</span>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
