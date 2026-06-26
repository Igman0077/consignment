import Link from "next/link";
import { requireOwner } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/admin/AdminNav";
import { Card, CardBody } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { OrderStatus } from "@prisma/client";
import { ChevronRight } from "lucide-react";

export const metadata = { title: "Customers" };

export default async function AdminCustomersPage() {
  await requireOwner();

  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    include: {
      orders: {
        include: { items: true },
        orderBy: { createdAt: "desc" },
      },
      cartItems: { include: { item: true } },
    },
  });

  return (
    <div className="container-page page-stack">
      <div className="page-header">
        <h1 className="page-title">Customers</h1>
        <p className="page-description">
          Tap a customer to see their purchase dates, items, and order details.
        </p>
      </div>

      <AdminNav />

      {customers.length === 0 ? (
        <Card>
          <CardBody className="text-center text-slate-600">No customers yet.</CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => {
            const totalSpent = customer.orders
              .filter((o) => o.status === OrderStatus.PAID)
              .reduce((s, o) => s + o.total, 0);

            const purchaseDates = new Set(
              customer.orders.map((o) => {
                const d = o.paidAt ?? o.createdAt;
                return d.toISOString().split("T")[0];
              })
            );

            return (
              <Link
                key={customer.id}
                href={`/admin/customers/${customer.id}`}
                className="panel-interactive block p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-slate-900">{customer.name}</p>
                    <p className="text-sm text-slate-600">{customer.email}</p>
                    {customer.phone && (
                      <p className="text-sm text-slate-600">{customer.phone}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      Joined {formatDate(customer.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm">
                      <p>
                        <strong>{customer.orders.length}</strong> orders
                      </p>
                      <p>
                        <strong>{purchaseDates.size}</strong> purchase date
                        {purchaseDates.size !== 1 ? "s" : ""}
                      </p>
                      <p className="font-bold text-brand-700">{formatCurrency(totalSpent)} spent</p>
                      {customer.cartItems.length > 0 && (
                        <p className="text-amber-600">
                          {customer.cartItems.length} in cart now
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
