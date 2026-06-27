"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Item, Category } from "@prisma/client";
import { parsePhotos } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PlusCircle } from "lucide-react";

type AvailableItem = Item & {
  categoryRef: Category | null;
  saleEvent: { id: string; title: string } | null;
};

export function SaleEventAddItemsPanel({
  saleId,
  saleStatus,
  availableItems,
}: {
  saleId: string;
  saleStatus: string;
  availableItems: AvailableItem[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canAdd = saleStatus === "SCHEDULED" || saleStatus === "ACTIVE";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableItems;
    return availableItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.categoryRef?.name.toLowerCase().includes(q)
    );
  }, [availableItems, search]);

  function toggleItem(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    const visibleIds = filtered.map((i) => i.id);
    const allSelected = visibleIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function addSelected() {
    if (selected.size === 0) {
      setError("Select at least one item to add.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch(`/api/sale-events/${saleId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-items", itemIds: [...selected] }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Could not add items");
      return;
    }

    setSelected(new Set());
    setSearch("");
    router.refresh();
  }

  if (!canAdd) return null;

  return (
    <Card>
      <CardHeader>
        <h3 className="font-bold text-slate-900">Add items from inventory</h3>
        <p className="mt-1 text-sm text-slate-600">
          Select inventory items to include in this sale. Items already in another sale will move
          here.
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <Input
              label="Search inventory"
              name="inventorySearch"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or category"
            />
          </div>
          <Link href="/admin/items/new">
            <Button variant="outline" size="sm">
              <PlusCircle className="h-4 w-4" />
              New item
            </Button>
          </Link>
        </div>

        {availableItems.length === 0 ? (
          <p className="text-sm text-slate-600">
            All inventory is already in this sale, or you have no items yet.{" "}
            <Link href="/admin/items/new" className="font-semibold text-brand-700 hover:underline">
              Add a new item
            </Link>
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-600">No items match your search.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && filtered.every((i) => selected.has(i.id))}
                  onChange={toggleAllVisible}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600"
                />
                Select all shown ({filtered.length})
              </label>
              <Button
                type="button"
                size="sm"
                disabled={loading || selected.size === 0}
                onClick={addSelected}
              >
                {loading
                  ? "Adding..."
                  : `Add ${selected.size > 0 ? selected.size : ""} to this sale`.trim()}
              </Button>
            </div>

            <ul className="max-h-96 divide-y divide-slate-200 overflow-y-auto rounded-xl border border-slate-200">
              {filtered.map((item) => {
                const photos = parsePhotos(item.photos);
                const checked = selected.has(item.id);
                const inOtherSale = item.saleEvent && item.saleEvent.id !== saleId;

                return (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleItem(item.id)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600"
                      />
                      <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                        {photos[0] ? (
                          <Image src={photos[0]} alt="" fill className="object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                            —
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-slate-900">{item.title}</span>
                        <span className="block text-sm text-slate-500">
                          {item.categoryRef?.name ?? item.category ?? "Uncategorized"}
                          {" · "}
                          Qty {item.quantityAvailable}/{item.quantity}
                          {inOtherSale && (
                            <>
                              {" · "}
                              <span className="text-amber-700">
                                In {item.saleEvent!.title} (will move)
                              </span>
                            </>
                          )}
                          {!item.saleEventId && (
                            <span className="text-slate-400"> · Not in a sale</span>
                          )}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </CardBody>
    </Card>
  );
}
