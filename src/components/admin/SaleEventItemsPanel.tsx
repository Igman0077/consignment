"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Item, SaleEvent, Category, ItemStatus, SaleEventStatus } from "@prisma/client";
import { parsePhotos } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ArrowRightLeft, Trash2 } from "lucide-react";

type SaleItem = Item & { categoryRef: Category | null };
type OtherSale = Pick<SaleEvent, "id" | "title" | "status">;

export function SaleEventItemsPanel({
  saleId,
  saleStatus,
  items,
  otherSales,
}: {
  saleId: string;
  saleStatus: SaleEventStatus;
  items: SaleItem[];
  otherSales: OtherSale[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});

  async function removeItem(itemId: string, title: string) {
    if (!confirm(`Remove "${title}" from this sale? It stays in inventory but won't appear here.`)) {
      return;
    }
    setLoadingId(itemId);
    setError("");

    const res = await fetch(`/api/sale-events/${saleId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove-items", itemIds: [itemId] }),
    });

    setLoadingId(null);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Could not remove item");
      return;
    }

    router.refresh();
  }

  async function moveItem(itemId: string, title: string) {
    const targetSaleId = moveTargets[itemId];
    if (!targetSaleId) {
      setError("Choose a sale to move this item to.");
      return;
    }

    const target = otherSales.find((s) => s.id === targetSaleId);
    if (!target) return;

    if (
      !confirm(
        `Move "${title}" to ${target.title}? It will no longer appear in this sale.`
      )
    ) {
      return;
    }

    setLoadingId(itemId);
    setError("");

    const res = await fetch(`/api/sale-events/${saleId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "move-items",
        itemIds: [itemId],
        targetSaleId,
      }),
    });

    setLoadingId(null);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Could not move item");
      return;
    }

    setMoveTargets((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    router.refresh();
  }

  function canManageItem(item: SaleItem) {
    return item.status !== ItemStatus.SOLD && item.status !== ItemStatus.REMOVED;
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="font-bold text-slate-900">Items in this sale ({items.length})</h3>
        <p className="mt-1 text-sm text-slate-600">
          Remove items from this sale or move them to another scheduled or active sale.
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        {items.length === 0 ? (
          <p className="text-sm text-slate-600">No items in this sale yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200">
            {items.map((item) => {
              const manageable = canManageItem(item);
              const busy = loadingId === item.id;
              const photos = parsePhotos(item.photos);

              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Link
                      href={`/admin/items/${item.id}`}
                      className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200 transition-all hover:ring-brand-400"
                    >
                      {photos[0] ? (
                        <Image src={photos[0]} alt="" fill className="object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                          No photo
                        </span>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/items/${item.id}`}
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        {item.title}
                      </Link>
                      <p className="text-sm text-slate-500">
                        {item.categoryRef?.name ?? item.category ?? "Uncategorized"}
                        {" · "}Qty {item.quantityAvailable}/{item.quantity}
                      </p>
                      <Badge
                        variant={item.status === ItemStatus.SOLD ? "default" : "success"}
                        className="mt-1"
                      >
                        {item.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>

                  {manageable ? (
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[280px]">
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-[160px] flex-1">
                          <Select
                            label="Move to sale"
                            value={moveTargets[item.id] ?? ""}
                            onChange={(e) =>
                              setMoveTargets((prev) => ({
                                ...prev,
                                [item.id]: e.target.value,
                              }))
                            }
                            disabled={busy || otherSales.length === 0}
                          >
                            <option value="">
                              {otherSales.length === 0
                                ? "No other sales"
                                : "Select a sale"}
                            </option>
                            {otherSales.map((sale) => (
                              <option key={sale.id} value={sale.id}>
                                {sale.title} ({sale.status.toLowerCase()})
                              </option>
                            ))}
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy || !moveTargets[item.id]}
                          onClick={() => moveItem(item.id, item.title)}
                          className="shrink-0 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100"
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                          Move
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => removeItem(item.id, item.title)}
                        className="w-full sm:w-auto hover:border-red-500 hover:bg-red-50 hover:text-red-700 active:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove from sale
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      {item.status === ItemStatus.SOLD
                        ? "Sold — cannot move or remove"
                        : "Unavailable"}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {saleStatus === "ENDED" && items.length > 0 && (
          <p className="text-sm text-slate-500">
            This sale has ended. You can still remove or move unsold items to other sales.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
