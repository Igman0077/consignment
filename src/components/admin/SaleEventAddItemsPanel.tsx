"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Item, Category } from "@prisma/client";
import { formatCurrency, parsePhotos } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PlusCircle, X } from "lucide-react";

type AvailableItem = Item & {
  categoryRef: Category | null;
  saleEvent: { id: string; title: string } | null;
};

type FilterTab = "unassigned" | "other-sale";

function matchesSearch(item: AvailableItem, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = [
    item.title,
    item.description ?? "",
    item.categoryRef?.name ?? item.category ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return terms.every((term) => haystack.includes(term));
}

function matchesTab(item: AvailableItem, tab: FilterTab): boolean {
  if (tab === "unassigned") return !item.saleEventId;
  return Boolean(item.saleEventId);
}

export function SaleEventAddItemsPanel({
  saleId,
  saleStatus,
  saleTitle,
  availableItems,
  categories,
}: {
  saleId: string;
  saleStatus: string;
  saleTitle: string;
  availableItems: AvailableItem[];
  categories: Pick<Category, "id" | "name">[];
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<FilterTab>("unassigned");
  const [categoryId, setCategoryId] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const canAdd = saleStatus === "SCHEDULED" || saleStatus === "ACTIVE";

  const counts = useMemo(() => {
    const unassigned = availableItems.filter((i) => !i.saleEventId).length;
    const inOther = availableItems.filter((i) => i.saleEventId).length;
    return { unassigned, inOther };
  }, [availableItems]);

  const filtered = useMemo(() => {
    return availableItems.filter((item) => {
      if (!matchesTab(item, tab)) return false;
      if (categoryId !== "all" && item.categoryId !== categoryId) return false;
      return matchesSearch(item, search);
    });
  }, [availableItems, tab, categoryId, search]);

  const tabButtons: { id: FilterTab; label: string; count: number; hint: string }[] = [
    {
      id: "unassigned",
      label: "Not in a sale",
      count: counts.unassigned,
      hint: "Ready to add — not assigned anywhere yet",
    },
    {
      id: "other-sale",
      label: "In another sale",
      count: counts.inOther,
      hint: "Will move from their current sale to this one",
    },
  ];

  async function addItems(itemIds: string[]) {
    if (itemIds.length === 0) return;

    setLoading(true);
    setAddingId(itemIds.length === 1 ? itemIds[0] : null);
    setError("");
    setSuccess("");

    const res = await fetch(`/api/sale-events/${saleId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-items", itemIds }),
    });

    setLoading(false);
    setAddingId(null);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Could not add items");
      return;
    }

    const data = await res.json();
    const added = data.added ?? itemIds.length;
    setSuccess(
      added === 1 ? "1 item added to this sale." : `${added} items added to this sale.`
    );
    setSelected(new Set());
    router.refresh();
  }

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
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }

  function addAllUnassigned() {
    const ids = availableItems.filter((i) => !i.saleEventId).map((i) => i.id);
    if (ids.length === 0) return;
    void addItems(ids);
  }

  if (!canAdd) return null;

  const activeTab = tabButtons.find((t) => t.id === tab)!;

  return (
    <Card className="border-2 border-brand-200 shadow-sm">
      <CardHeader className="bg-brand-50/50">
        <h3 className="text-lg font-bold text-slate-900">Add inventory to {saleTitle}</h3>
        <p className="mt-1 text-sm text-slate-600">
          Browse items below and add them with one click, or select several and add in bulk.
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        {/* Stats */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">{counts.unassigned} not in a sale</Badge>
          <Badge variant="warning">{counts.inOther} in another sale</Badge>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabButtons.map(({ id, label, count }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setSelected(new Set());
              }}
              className={`rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all ${
                tab === id
                  ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50"
              }`}
            >
              {label}
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  tab === id ? "bg-white/20" : "bg-slate-100 text-slate-600"
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-500">{activeTab.hint}</p>

        {/* Search + filters */}
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="relative">
            <Input
              ref={searchRef}
              label="Search"
              name="inventorySearch"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to filter — title, description, or category"
              autoComplete="off"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  searchRef.current?.focus();
                }}
                className="absolute right-3 top-[2.55rem] rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Link href="/admin/items/new" className="sm:pb-1">
            <Button variant="outline" className="w-full sm:w-auto">
              <PlusCircle className="h-4 w-4" />
              New item
            </Button>
          </Link>
        </div>

        {categories.length > 0 && (
          <Select
            label="Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
        )}

        {/* Quick actions */}
        {tab === "unassigned" && counts.unassigned > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={addAllUnassigned}
          >
            Add all {counts.unassigned} unassigned items to this sale
          </Button>
        )}

        {availableItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-10 text-center">
            <p className="text-slate-600">Every item is already in this sale.</p>
            <Link
              href="/admin/items/new"
              className="mt-2 inline-block font-semibold text-brand-700 hover:underline"
            >
              Create new inventory
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-slate-600">
            <p>No items match your filters.</p>
            <button
              type="button"
              className="mt-2 font-semibold text-brand-700 hover:underline"
              onClick={() => {
                setSearch("");
                setCategoryId("all");
                setTab("unassigned");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={
                    filtered.length > 0 && filtered.every((i) => selected.has(i.id))
                  }
                  onChange={toggleAllVisible}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600"
                />
                Select all {filtered.length} shown
              </label>
              {selected.size > 0 && (
                <Button
                  type="button"
                  size="sm"
                  disabled={loading}
                  onClick={() => addItems([...selected])}
                >
                  {loading ? "Adding..." : `Add ${selected.size} selected`}
                </Button>
              )}
            </div>

            <ul className="grid gap-3 sm:grid-cols-2">
              {filtered.map((item) => {
                const photos = parsePhotos(item.photos);
                const checked = selected.has(item.id);
                const busy = loading && (addingId === item.id || selected.has(item.id));
                const inOtherSale = Boolean(item.saleEventId);

                return (
                  <li
                    key={item.id}
                    className={`flex flex-col rounded-xl border-2 bg-white transition-all ${
                      checked ? "border-brand-400 ring-2 ring-brand-100" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start gap-3 p-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleItem(item.id)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600"
                        aria-label={`Select ${item.title}`}
                      />
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                        {photos[0] ? (
                          <Image src={photos[0]} alt="" fill className="object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                            No photo
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-snug text-slate-900">{item.title}</p>
                        <p className="mt-0.5 text-sm font-medium text-brand-700">
                          {item.price != null ? formatCurrency(item.price) : "No price"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.categoryRef?.name ?? item.category ?? "Uncategorized"}
                          {" · "}Qty {item.quantityAvailable}/{item.quantity}
                        </p>
                        {inOtherSale ? (
                          <Badge variant="warning" className="mt-2 normal-case">
                            In {item.saleEvent!.title}
                          </Badge>
                        ) : (
                          <Badge variant="success" className="mt-2 normal-case">
                            Not in a sale
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="border-t border-slate-100 px-3 py-2">
                      <Button
                        type="button"
                        size="sm"
                        className="w-full"
                        disabled={loading}
                        onClick={() => addItems([item.id])}
                      >
                        {busy ? "Adding..." : inOtherSale ? "Move to this sale" : "Add to this sale"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <p className="text-center text-sm text-slate-500">
              Showing {filtered.length} item{filtered.length !== 1 ? "s" : ""}
            </p>
          </>
        )}
      </CardBody>
    </Card>
  );
}
