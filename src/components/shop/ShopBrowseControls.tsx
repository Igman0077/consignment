"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

type Category = { id: string; name: string };

const PER_PAGE_OPTIONS = [12, 24, 48];

export function ShopBrowseControls({
  categories,
  total,
  page,
  perPage,
  categoryId,
}: {
  categories: Category[];
  total: number;
  page: number;
  perPage: number;
  categoryId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === "all" || v === "") params.delete(k);
      else params.set(k, v);
    });
    if (!updates.page) params.set("page", "1");
    router.push(`/shop?${params.toString()}`);
  }

  return (
    <div className="section-block">
      <div className="section-block-body space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Category"
            value={categoryId}
            onChange={(e) => updateParams({ category: e.target.value, page: "1" })}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Select
            label="Items per page"
            value={String(perPage)}
            onChange={(e) => updateParams({ perPage: e.target.value, page: "1" })}
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} items
              </option>
            ))}
          </Select>
        </div>

        <p className="text-sm text-slate-600">
          Showing {total === 0 ? 0 : (page - 1) * perPage + 1}–
          {Math.min(page * perPage, total)} of {total} item{total !== 1 ? "s" : ""}
        </p>

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
            >
              Previous
            </Button>
            <span className="px-2 text-sm font-medium text-slate-700">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
