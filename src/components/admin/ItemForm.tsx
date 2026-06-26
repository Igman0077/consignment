"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Item, SaleMode, ItemStatus, Category } from "@prisma/client";
import { AdminNav } from "@/components/admin/AdminNav";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { HelpTip } from "@/components/ui/HelpTip";
import { normalizeSaleMode } from "@/lib/sale-mode";
import { parsePhotos } from "@/lib/utils";
import { BackLink } from "@/components/ui/BackLink";
import { Trash2 } from "lucide-react";

type ItemFormProps = {
  item?: Item;
  defaultSaleMode?: SaleMode;
  categories: Category[];
};

export function ItemForm({
  item,
  defaultSaleMode = "CLAIM",
  categories,
}: ItemFormProps) {
  const router = useRouter();
  const isEdit = !!item;
  const existingPhotos = item ? parsePhotos(item.photos) : [];

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>(existingPhotos);
  const [saleMode, setSaleMode] = useState<"CLAIM" | "AUCTION">(
    item ? normalizeSaleMode(item.saleMode) : normalizeSaleMode(defaultSaleMode)
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const newFiles = formData.getAll("photos") as File[];
    const validFiles = newFiles.filter((f) => f.size > 0);

    if (!isEdit && photos.length === 0 && validFiles.length === 0) {
      setError("Please add at least one photo");
      setLoading(false);
      return;
    }

    const uploadData = new FormData();
    validFiles.forEach((f) => uploadData.append("photos", f));

    let uploadedPaths: string[] = [];
    if (validFiles.length > 0) {
      const uploadRes = await fetch("/api/upload", { method: "POST", body: uploadData });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) {
        setError(uploadJson.error || "Photo upload failed");
        setLoading(false);
        return;
      }
      uploadedPaths = uploadJson.paths;
    }

    const allPhotos = [...photos, ...uploadedPaths];

    const quantity = Math.max(1, parseInt(formData.get("quantity") as string, 10) || 1);
    const priceValue = parseFloat(formData.get("price") as string);

    const payload = {
      title: formData.get("title"),
      description: formData.get("description"),
      price: priceValue,
      saleMode: formData.get("saleMode"),
      categoryId: formData.get("categoryId") || null,
      quantity,
      status: formData.get("status") || "AVAILABLE",
      photos: allPhotos,
      auctionDurationHours:
        saleMode === "AUCTION" && formData.get("auctionDurationHours")
          ? parseInt(formData.get("auctionDurationHours") as string, 10)
          : undefined,
      auctionClaimFallback:
        saleMode === "AUCTION" && formData.get("auctionClaimFallback") === "on",
    };

    const url = isEdit ? `/api/items/${item.id}` : "/api/items";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not save item");
      return;
    }

    router.push("/admin/items");
    router.refresh();
  }

  async function handleDelete() {
    if (!item || !confirm("Remove this item? This cannot be undone.")) return;

    await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    router.push("/admin/items");
    router.refresh();
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="container-page max-w-2xl page-stack">
      <BackLink href="/admin/items">Back to items</BackLink>

      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {isEdit ? "Edit Item" : "Add New Item"}
        </h1>
        <p className="mt-2 text-slate-600">
          Upload photos, set a price, and choose how customers can buy it.
        </p>
      </div>

      <AdminNav />

      <Card>
        <CardHeader>
          <h2 className="font-bold">Item Details</h2>
        </CardHeader>
        <CardBody>
          {error && <Alert variant="error" className="mb-4">{error}</Alert>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Title"
              name="title"
              required
              defaultValue={item?.title}
              placeholder="Vintage wooden chair"
              hint="A clear, short name customers will recognize"
            />

            <Textarea
              label="Description"
              name="description"
              rows={4}
              required
              defaultValue={item?.description ?? ""}
              placeholder="Condition, dimensions, anything helpful..."
            />

            <Select
              label="Category"
              name="categoryId"
              defaultValue={item?.categoryId ?? ""}
              required
              hint={
                categories.length === 0
                  ? "Add categories under Categories in the owner menu first"
                  : undefined
              }
            >
              <option value="" disabled>
                Select a category
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>

            <Input
              label="Quantity available"
              name="quantity"
              type="number"
              min="1"
              required
              defaultValue={item?.quantity ?? 1}
              hint="How many of this item are for sale (e.g. 3 identical mugs). Assign items to a sale from Scheduled Sales."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={saleMode === "AUCTION" ? "Reserve price ($)" : "Price ($)"}
                name="price"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={item?.price ?? ""}
                hint={
                  saleMode === "AUCTION"
                    ? "Minimum price the item must reach before it can sell"
                    : undefined
                }
              />

              <Select
                label={
                  <span className="flex items-center gap-1">
                    How to sell{" "}
                    <HelpTip text="Claim = customer taps to reserve at the listed price. Auction = customers place bids." />
                  </span>
                }
                name="saleMode"
                value={saleMode}
                onChange={(e) => setSaleMode(e.target.value as "CLAIM" | "AUCTION")}
                required
              >
                <option value="CLAIM">Claim — customer reserves at listed price</option>
                <option value="AUCTION">Auction — customers place bids</option>
              </Select>
            </div>

            {saleMode === "AUCTION" && (
              <>
                <Input
                  label="Auction duration (hours)"
                  name="auctionDurationHours"
                  type="number"
                  min="1"
                  required
                  defaultValue="48"
                  hint="How long customers can place bids after the item goes live"
                />
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    name="auctionClaimFallback"
                    defaultChecked={item?.auctionClaimFallback ?? false}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span className="text-sm leading-relaxed text-slate-700">
                    <span className="font-semibold text-slate-900">
                      Offer as claim if reserve is not met
                    </span>
                    <span className="mt-1 block text-slate-600">
                      When the auction ends below the reserve price, change this item to claim
                      at the reserve price so customers can still buy it.
                    </span>
                  </span>
                </label>
              </>
            )}

            {isEdit && (
              <Select label="Status" name="status" defaultValue={item.status}>
                <option value="AVAILABLE">Available</option>
                <option value="IN_CART">In Cart</option>
                <option value="SOLD">Sold</option>
                <option value="REMOVED">Removed</option>
              </Select>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                Photos
              </label>
              {photos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {photos.map((photo, i) => (
                    <div key={photo} className="relative h-20 w-20 overflow-hidden rounded-lg">
                      <Image src={photo} alt="" fill className="object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute right-1 top-1 rounded bg-red-600 p-0.5 text-white"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                type="file"
                name="photos"
                accept="image/*"
                multiple
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
              />
              <p className="text-sm text-slate-500">Add one or more photos (max 5MB each)</p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" size="lg" disabled={loading || categories.length === 0}>
                {loading ? "Saving..." : isEdit ? "Save Changes" : "Add Item"}
              </Button>
              {isEdit && (
                <Button type="button" variant="danger" onClick={handleDelete}>
                  Remove Item
                </Button>
              )}
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
