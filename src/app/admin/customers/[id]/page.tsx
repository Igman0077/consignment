import Link from "next/link";
import { BackLink } from "@/components/ui/BackLink";
import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/admin/AdminNav";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { formatCurrency, formatDate, formatDateOnly, toDateKey } from "@/lib/utils";
import { OrderStatus } from "@prisma/client";
import { ChevronRight, ShoppingCart } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  return { title: user ? `${user.name} — Customer` : "Customer" };
}

type PurchaseDay = {
  dateKey: string;
  label: string;
  orderCount: number;
  itemCount: number;
  total: number;
  hasPaid: boolean;
  hasPending: boolean;
};

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOwner();
  const { id } = await params;

  const customer = await prisma.user.findUnique({
    where: { id, role: "CUSTOMER" },
    include: {
      orders: {
        include: { items: true },
        orderBy: { createdAt: "desc" },
      },
      cartItems: { include: { item: true } },
    },
  });

  if (!customer) notFound();

  const purchaseDays = new Map<string, PurchaseDay>();

  for (const order of customer.orders) {
    const referenceDate = order.paidAt ?? order.createdAt;
    const dateKey = toDateKey(referenceDate);

    const existing = purchaseDays.get(dateKey) ?? {
      dateKey,
      label: formatDateOnly(referenceDate),
      orderCount: 0,
      itemCount: 0,
      total: 0,
      hasPaid: false,
      hasPending: false,
    };

    existing.orderCount += 1;
    existing.itemCount += order.items.length;
    existing.total += order.total;
    if (order.status === OrderStatus.PAID) existing.hasPaid = true;
    if (order.status === OrderStatus.PENDING) existing.hasPending = true;

    purchaseDays.set(dateKey, existing);
  }

  const sortedDays = [...purchaseDays.values()].sort((a, b) =>
    b.dateKey.localeCompare(a.dateKey)
  );

  const totalSpent = customer.orders
    .filter((o) => o.status === OrderStatus.PAID)
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="container-page page-stack">
      <BackLink href="/admin/customers">All customers</BackLink>

      <div className="page-header">
        <h1 className="page-title">{customer.name}</h1>
        <p className="page-description">Customer profile and purchase history</p>
      </div>

      <AdminNav />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody className="space-y-3">
            <h2 className="section-title">Contact information</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-semibold text-slate-700">Email</dt>
                <dd className="text-slate-600">{customer.email}</dd>
              </div>
              {customer.phone && (
                <div>
                  <dt className="font-semibold text-slate-700">Phone</dt>
                  <dd className="text-slate-600">{customer.phone}</dd>
                </div>
              )}
              <div>
                <dt className="font-semibold text-slate-700">Member since</dt>
                <dd className="text-slate-600">{formatDate(customer.createdAt)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-700">Total spent (paid)</dt>
                <dd className="text-lg font-bold text-brand-700">{formatCurrency(totalSpent)}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <h2 className="section-title flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Current cart
            </h2>
            {customer.cartItems.length === 0 ? (
              <p className="text-sm text-slate-600">Nothing in cart right now.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {customer.cartItems.map((ci) => (
                  <li
                    key={ci.id}
                    className="flex justify-between border-b border-slate-100 pb-2 last:border-0"
                  >
                    <span className="text-slate-800">{ci.item.title}</span>
                    <span className="font-semibold text-slate-700">
                      {formatCurrency(ci.price)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="section-title text-xl">Purchase dates</h2>
          <p className="page-description">
            Tap a date to see every item this customer bought that day.
          </p>
        </div>

        {sortedDays.length === 0 ? (
          <Card>
            <CardBody className="text-center text-slate-600">No purchases yet.</CardBody>
          </Card>
        ) : (
          <div className="space-y-2">
            {sortedDays.map((day) => (
              <Link
                key={day.dateKey}
                href={`/admin/customers/${customer.id}/date/${day.dateKey}`}
                className="panel-interactive flex flex-wrap items-center justify-between gap-3 p-5"
              >
                <div>
                  <p className="font-bold text-slate-900">{day.label}</p>
                  <p className="text-sm text-slate-600">
                    {day.itemCount} item{day.itemCount !== 1 ? "s" : ""}
                    {day.orderCount > 1 && ` · ${day.orderCount} orders`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-brand-700">{formatCurrency(day.total)}</p>
                    <div className="mt-1 flex flex-wrap justify-end gap-1">
                      {day.hasPaid && <Badge variant="success">Paid</Badge>}
                      {day.hasPending && <Badge variant="warning">Pending</Badge>}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
