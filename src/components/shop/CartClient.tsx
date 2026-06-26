"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CartItem, Item } from "@prisma/client";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { formatCurrency, parsePhotos } from "@/lib/utils";
import { ShoppingBag, Trash2, CreditCard } from "lucide-react";

type CartItemWithItem = CartItem & { item: Item };

export function CartClient({
  items,
  saleOpen = true,
}: {
  items: CartItemWithItem[];
  saleOpen?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const total = items.reduce((sum, ci) => sum + ci.price * (ci.quantity ?? 1), 0);

  async function removeItem(itemId: string) {
    await fetch("/api/cart", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    router.refresh();
  }

  async function checkout() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/checkout", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Checkout failed");
      setLoading(false);
      return;
    }

    if (data.url) {
      window.location.href = data.url;
    } else {
      router.push(`/account/orders/${data.orderId}?paid=1`);
    }
  }

  if (items.length === 0) {
    return (
      <div className="container-page">
        <Card className="mx-auto max-w-lg text-center">
          <CardBody className="space-y-4 py-12">
            <ShoppingBag className="mx-auto h-12 w-12 text-slate-300" />
            <h1 className="text-2xl font-bold text-slate-900">Your cart is empty</h1>
            <p className="text-slate-600">
              Browse items and claim or add what you like. They&apos;ll show up here.
            </p>
            <Link href="/shop">
              <Button size="lg">Browse Items</Button>
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="container-page max-w-3xl page-stack">
      <div className="page-header">
        <h1 className="page-title">My Cart</h1>
        <p className="page-description">Review your items, then pay when you&apos;re done shopping.</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="space-y-4">
        {items.map((ci) => {
          const photos = parsePhotos(ci.item.photos);
          return (
            <Card key={ci.id} interactive>
              <CardBody className="flex gap-4">
                <Link
                  href={`/shop/${ci.item.id}`}
                  className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 transition-all hover:ring-brand-300"
                >
                  {photos[0] && (
                    <Image src={photos[0]} alt={ci.item.title} fill className="object-cover" />
                  )}
                </Link>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <Link href={`/shop/${ci.item.id}`} className="link-action rounded-lg px-1">
                      {ci.item.title}
                    </Link>
                    <p className="mt-1 text-lg font-bold text-brand-700">{formatCurrency(ci.price)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(ci.item.id)}
                    className="link-danger -ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove from cart
                  </button>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-slate-700">Total</span>
            <span className="text-2xl font-bold text-brand-700">{formatCurrency(total)}</span>
          </div>
        </CardHeader>
        <CardBody>
          <Button size="lg" className="w-full" onClick={checkout} disabled={loading || !saleOpen}>
            <CreditCard className="h-5 w-5" />
            {loading ? "Processing..." : "Pay Now"}
          </Button>
          <p className="mt-3 text-center text-xs text-slate-500">
            Secure payment powered by Stripe. Items are marked sold after payment.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
