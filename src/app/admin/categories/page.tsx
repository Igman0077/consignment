import { requireOwner } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/admin/AdminNav";
import { CategoriesManager } from "@/components/admin/CategoriesManager";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireOwner();

  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="container-page max-w-2xl page-stack">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Categories</h1>
        <p className="mt-2 text-slate-600">
          Organize items so customers can filter the shop by category.
        </p>
      </div>

      <AdminNav />
      <CategoriesManager categories={categories} />
    </div>
  );
}
