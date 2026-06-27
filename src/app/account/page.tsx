import Link from "next/link";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { OrderStatus } from "@prisma/client";

export const metadata = { title: "My Account" };

export default async function AccountPage() {
  const session = await requireAuth();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: { items: true },
      },
      cartItems: { include: { item: true } },
    },
  });

  if (!user) return null;

  return (
    <div className="container-page max-w-3xl page-stack">
      <div className="page-header">
        <h1 className="page-title">My Account</h1>
        <p className="page-description">Your info and purchase history.</p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="section-title">Your Information</h2>
        </CardHeader>
        <CardBody className="space-y-2 text-sm">
          <p>
            <span className="font-semibold text-slate-700">Name:</span> {user.name}
          </p>
          <p>
            <span className="font-semibold text-slate-700">Email:</span> {user.email}
          </p>
          {user.phone && (
            <p>
              <span className="font-semibold text-slate-700">Phone:</span> {user.phone}
            </p>
          )}
        </CardBody>
      </Card>

      <ChangePasswordForm />

      <section className="section-block">
        <div className="section-block-header flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Purchase History</h2>
          <Link href="/cart" className="link-action rounded-lg px-2 py-1 text-sm">
            View cart ({user.cartItems.length})
          </Link>
        </div>

        {user.orders.length === 0 ? (
          <CardBody className="text-center text-slate-600">
            No purchases yet.{" "}
            <Link href="/shop" className="link-action">
              Start shopping
            </Link>
          </CardBody>
        ) : (
          <div className="section-block-body space-y-4 pt-0">
            {user.orders.map((order) => (
              <Card key={order.id} interactive>
                <CardBody>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        Order — {formatDate(order.createdAt)}
                      </p>
                      <p className="text-lg font-bold text-brand-700">
                        {formatCurrency(order.total)}
                      </p>
                    </div>
                    <Badge variant={order.status === OrderStatus.PAID ? "success" : "warning"}>
                      {order.status}
                    </Badge>
                  </div>
                  <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-600">
                    {order.items.map((oi) => (
                      <li key={oi.id}>
                        {oi.title} — {formatCurrency(oi.price)}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="link-action mt-3 inline-block rounded-lg px-1 text-sm"
                  >
                    View details →
                  </Link>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
