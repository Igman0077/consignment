import { requireOwner } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/admin/AdminNav";
import { Card, CardBody } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { ItemStatus, OrderStatus } from "@prisma/client";
import { Package, Users, DollarSign, ShoppingCart } from "lucide-react";

export const metadata = { title: "Owner Dashboard" };

export default async function AdminPage() {
  await requireOwner();

  const [availableItems, inCartItems, soldItems, customers, pendingOrders, paidToday, totalRevenue] =
    await Promise.all([
      prisma.item.count({ where: { status: ItemStatus.AVAILABLE } }),
      prisma.item.count({ where: { status: ItemStatus.IN_CART } }),
      prisma.item.count({ where: { status: ItemStatus.SOLD } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      prisma.order.count({
        where: {
          status: OrderStatus.PAID,
          paidAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.order.aggregate({
        where: { status: OrderStatus.PAID },
        _sum: { total: true },
      }),
    ]);

  const stats = [
    { label: "Available Items", value: availableItems, icon: Package, color: "text-green-600" },
    { label: "In Customer Carts", value: inCartItems, icon: ShoppingCart, color: "text-amber-600" },
    { label: "Sold Items", value: soldItems, icon: Package, color: "text-slate-600" },
    { label: "Customers", value: customers, icon: Users, color: "text-blue-600" },
    { label: "Pending Payments", value: pendingOrders, icon: DollarSign, color: "text-red-600" },
    { label: "Paid Today", value: paidToday, icon: DollarSign, color: "text-brand-600" },
  ];

  return (
    <div className="container-page page-stack">
      <div className="page-header">
        <h1 className="page-title">Owner Dashboard</h1>
        <p className="page-description">
          Everything you need to run your consignment shop — all in one place.
        </p>
      </div>

      <AdminNav />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} interactive>
            <CardBody className="flex items-center gap-4">
              <div className={`rounded-xl bg-slate-100 p-3 ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardBody>
          <p className="text-sm text-slate-500">Total revenue (paid orders)</p>
          <p className="text-3xl font-bold text-brand-700">
            {formatCurrency(totalRevenue._sum.total ?? 0)}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
