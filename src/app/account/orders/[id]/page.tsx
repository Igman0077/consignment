import { notFound } from "next/navigation";
import { BackLink } from "@/components/ui/BackLink";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getShopSettings } from "@/lib/session";
import { OrderStatus } from "@prisma/client";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;
  const { paid } = await searchParams;
  const settings = await getShopSettings();

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, user: true },
  });

  if (!order) notFound();
  if (order.userId !== session.user.id && session.user.role !== "OWNER") notFound();

  return (
    <div className="container-page max-w-2xl page-stack">
      <BackLink href="/account">Back to account</BackLink>

      {paid === "1" && order.status === OrderStatus.PAID && (
        <Alert variant="success">
          Payment successful! Your items are marked as sold. The shop owner will be in touch about
          pickup.
        </Alert>
      )}

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Order Details</h1>
        <p className="mt-1 text-slate-600">{formatDate(order.createdAt)}</p>
      </div>

      <Card>
        <CardBody className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Status</span>
            <Badge variant={order.status === OrderStatus.PAID ? "success" : "warning"}>
              {order.status}
            </Badge>
          </div>
          {order.paidAt && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Paid on</span>
              <span>{formatDate(order.paidAt)}</span>
            </div>
          )}
          <ul className="space-y-2 border-t border-slate-100 pt-4">
            {order.items.map((oi) => (
              <li key={oi.id} className="flex justify-between">
                <span>{oi.title}</span>
                <span className="font-semibold">{formatCurrency(oi.price)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between border-t border-slate-100 pt-4 text-lg font-bold">
            <span>Total</span>
            <span className="text-brand-700">{formatCurrency(order.total)}</span>
          </div>
        </CardBody>
      </Card>

      {settings.pickupInstructions && (
        <Alert variant="info">
          <strong>Pickup:</strong> {settings.pickupInstructions}
        </Alert>
      )}
    </div>
  );
}
