"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OrderStatus } from "@prisma/client";
import { Select } from "@/components/ui/Select";

const labels: Record<OrderStatus, string> = {
  PENDING: "Pending — not paid yet",
  PAID: "Paid — complete",
  CANCELLED: "Cancelled",
};

export function OrderStatusSelect({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleChange(newStatus: OrderStatus) {
    const previous = status;
    setStatus(newStatus);
    setLoading(true);
    setError("");

    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    setLoading(false);

    if (!res.ok) {
      setStatus(previous);
      setError("Could not update status");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-1">
      <Select
        label="Order status"
        value={status}
        disabled={loading}
        onChange={(e) => handleChange(e.target.value as OrderStatus)}
        className="min-w-[12rem]"
      >
        {Object.entries(labels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
