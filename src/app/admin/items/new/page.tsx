import { requireOwner, getShopSettings } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ItemForm } from "@/components/admin/ItemForm";

export const metadata = { title: "Add Item" };

export default async function NewItemPage() {
  await requireOwner();
  const [settings, categories] = await Promise.all([
    getShopSettings(),
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <ItemForm
      defaultSaleMode={settings.defaultSaleMode}
      categories={categories}
    />
  );
}
