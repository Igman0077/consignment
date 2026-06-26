"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { SaleEvent } from "@prisma/client";

function toDatetimeLocal(value: Date | string) {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type SaleEventFormProps = {
  sale?: SaleEvent;
};

export function SaleEventForm({ sale }: SaleEventFormProps) {
  const router = useRouter();
  const isEdit = !!sale;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const payload = {
      title: form.get("title"),
      customerMessage: form.get("customerMessage"),
      startsAt: new Date(form.get("startsAt") as string).toISOString(),
      endsAt: new Date(form.get("endsAt") as string).toISOString(),
      allowPreview: form.get("allowPreview") === "on",
    };

    const url = isEdit ? `/api/sale-events/${sale.id}` : "/api/sale-events";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not save sale");
      return;
    }

    router.push(isEdit ? `/admin/sale-events/${sale.id}` : `/admin/sale-events/${data.id}`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-bold">{isEdit ? "Edit sale" : "New scheduled sale"}</h2>
      </CardHeader>
      <CardBody>
        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Sale title"
            name="title"
            required
            defaultValue={sale?.title}
            placeholder="June Weekend Sale"
            hint="Shown to customers on the homepage"
          />

          <Textarea
            label="Message for customers (before sale starts)"
            name="customerMessage"
            rows={4}
            defaultValue={sale?.customerMessage ?? ""}
            placeholder="Our next sale opens Saturday at 9 AM! We'll have furniture, decor, and more..."
            hint="Customers see this on the homepage and shop page until the sale begins."
          />

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <input
              type="checkbox"
              name="allowPreview"
              defaultChecked={(sale as { allowPreview?: boolean } | undefined)?.allowPreview ?? false}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span>
              <span className="block font-semibold text-slate-900">Allow customer preview</span>
              <span className="mt-1 block text-sm leading-relaxed text-slate-600">
                Customers can browse photos and item details before the sale starts. Claiming and
                bidding stay disabled until the sale goes live.
              </span>
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Start date & time"
              name="startsAt"
              type="datetime-local"
              required
              defaultValue={sale ? toDatetimeLocal(sale.startsAt) : ""}
            />
            <Input
              label="End date & time"
              name="endsAt"
              type="datetime-local"
              required
              defaultValue={sale ? toDatetimeLocal(sale.endsAt) : ""}
            />
          </div>

          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Save changes" : "Create sale"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
