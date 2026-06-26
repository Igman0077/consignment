import { SaleEventStatus } from "@prisma/client";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { SaleEventStats } from "@/lib/sale-event-stats";
import {
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  Gavel,
  CheckCircle,
  Clock,
} from "lucide-react";

export function SaleEventStatsPanel({
  stats,
  status,
}: {
  stats: SaleEventStats;
  status: SaleEventStatus;
}) {
  const heading = status === "ACTIVE" ? "Sale progress" : "Sale results";

  const statCards = [
    {
      label: "Paid revenue",
      value: formatCurrency(stats.paidRevenue),
      icon: DollarSign,
      color: "text-brand-600",
    },
    {
      label: "Awaiting payment",
      value: formatCurrency(stats.pendingRevenue),
      icon: Clock,
      color: "text-amber-600",
    },
    {
      label: "Units sold",
      value: `${stats.unitsSold} / ${stats.totalUnits}`,
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      label: "In customer carts",
      value: stats.unitsInCarts,
      icon: ShoppingCart,
      color: "text-amber-600",
    },
    {
      label: "Still available",
      value: stats.availableUnits,
      icon: Package,
      color: "text-slate-600",
    },
    {
      label: "Paid orders",
      value: stats.paidOrderCount,
      icon: DollarSign,
      color: "text-brand-700",
    },
    {
      label: "Pending orders",
      value: stats.pendingOrderCount,
      icon: Clock,
      color: "text-amber-700",
    },
    {
      label: "Customers",
      value: stats.uniqueCustomers,
      icon: Users,
      color: "text-blue-600",
    },
    {
      label: "Auction bids",
      value: stats.bidCount,
      icon: Gavel,
      color: "text-purple-600",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <h3 className="font-bold text-slate-900">{heading}</h3>
        <p className="mt-1 text-sm text-slate-600">
          {stats.itemCount} item{stats.itemCount !== 1 ? "s" : ""} in this sale
          {stats.totalUnits !== stats.itemCount &&
            ` · ${stats.totalUnits} total unit${stats.totalUnits !== 1 ? "s" : ""}`}
        </p>
      </CardHeader>
      <CardBody>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4"
            >
              <div className={`rounded-lg bg-white p-2.5 shadow-sm ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
