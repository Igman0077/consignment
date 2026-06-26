"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type Category = { id: string; name: string };

export function AdminItemsFilter({
  categories,
  categoryId,
  query,
}: {
  categories: Category[];
  categoryId: string;
  query: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(query);

  useEffect(() => {
    setSearch(query);
  }, [query]);

  useEffect(() => {
    const trimmed = search.trim();
    if (trimmed === query.trim()) return;

    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (categoryId) params.set("category", categoryId);
      if (trimmed) params.set("q", trimmed);

      const qs = params.toString();
      router.replace(qs ? `/admin/items?${qs}` : "/admin/items");
    }, 300);

    return () => clearTimeout(timer);
  }, [search, query, categoryId, router]);

  function handleCategoryChange(value: string) {
    const params = new URLSearchParams();
    if (value) params.set("category", value);

    const trimmed = search.trim();
    if (trimmed) params.set("q", trimmed);

    const qs = params.toString();
    router.replace(qs ? `/admin/items?${qs}` : "/admin/items");
  }

  return (
    <div className="section-block">
      <div className="section-block-body space-y-4">
        <Input
          label="Search inventory"
          name="q"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or description"
          hint="Start typing or pick a category below — or view all inventory"
        />

        <Select
          label="Category"
          value={categoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
        >
          <option value="">Select a category</option>
          <option value="all">All inventory</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
