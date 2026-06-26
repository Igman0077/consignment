"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Trash2 } from "lucide-react";

type CategoryRow = {
  id: string;
  name: string;
  sortOrder: number;
  _count: { items: number };
};

export function CategoriesManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not add category");
      return;
    }

    setName("");
    router.refresh();
  }

  async function handleDelete(id: string, categoryName: string, itemCount: number) {
    if (itemCount > 0) {
      setError(`"${categoryName}" has ${itemCount} item(s). Reassign them before deleting.`);
      return;
    }
    if (!confirm(`Delete category "${categoryName}"?`)) return;

    setError("");
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Could not delete category");
      return;
    }

    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-bold">Item categories</h2>
        <p className="mt-1 text-sm text-slate-600">
          Categories appear when you add items and when customers browse the shop.
        </p>
      </CardHeader>
      <CardBody className="space-y-5">
        {error && <Alert variant="error">{error}</Alert>}

        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <Input
              label="New category"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Furniture, Clothing, Decor..."
            />
          </div>
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? "Adding..." : "Add Category"}
          </Button>
        </form>

        {categories.length === 0 ? (
          <p className="text-sm text-slate-600">
            No categories yet. Add one above, then choose it when adding items.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200">
            {categories.map((cat) => (
              <li
                key={cat.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-slate-900">{cat.name}</p>
                  <p className="text-sm text-slate-500">
                    {cat._count.items} item{cat._count.items !== 1 ? "s" : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(cat.id, cat.name, cat._count.items)}
                  aria-label={`Delete ${cat.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
