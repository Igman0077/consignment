import Image from "next/image";
import Link from "next/link";
import { Item, SaleMode, ItemStatus, Category } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, parsePhotos } from "@/lib/utils";
import { getSaleModeLabel } from "@/lib/sale-mode";
import { Gavel, Hand } from "lucide-react";

const statusVariant: Record<ItemStatus, "success" | "warning" | "default" | "danger"> = {
  AVAILABLE: "success",
  IN_CART: "warning",
  SOLD: "default",
  REMOVED: "danger",
};

function modeIcon(mode: SaleMode) {
  return mode === SaleMode.AUCTION ? (
    <Gavel className="h-3 w-3" />
  ) : (
    <Hand className="h-3 w-3" />
  );
}

function getDisplayStatus(item: Item) {
  if (item.status === ItemStatus.SOLD) return { label: "Sold", variant: statusVariant.SOLD };
  if (item.quantityAvailable <= 0) {
    return { label: "Claimed", variant: statusVariant.IN_CART };
  }
  return { label: item.status.replace("_", " "), variant: statusVariant[item.status] };
}

export function ItemCard({
  item,
  itemHref,
  previewMode = false,
}: {
  item: Item & { categoryRef?: Category | null };
  itemHref?: string;
  previewMode?: boolean;
}) {
  const photos = parsePhotos(item.photos);
  const categoryLabel = item.categoryRef?.name ?? item.category;
  const displayPrice =
    item.saleMode === "AUCTION"
      ? item.currentBid
      : item.price;
  const isAvailable =
    !previewMode &&
    item.quantityAvailable > 0 &&
    item.status !== ItemStatus.SOLD &&
    item.status !== ItemStatus.REMOVED;
  const { label: statusLabel, variant: statusVariantKey } = previewMode
    ? { label: "Preview", variant: "info" as const }
    : getDisplayStatus(item);

  return (
    <Link
      href={itemHref ?? `/shop/${item.id}`}
      className={`group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-150 hover:border-brand-300 hover:bg-brand-50/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
        !isAvailable ? "opacity-90" : ""
      }`}
    >
      <div className="relative aspect-square bg-slate-100">
        {photos[0] ? (
          <Image
            src={photos[0]}
            alt={item.title}
            fill
            className={`object-cover transition group-hover:scale-105 ${!isAvailable ? "grayscale-[30%]" : ""}`}
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <PackagePlaceholder />
          </div>
        )}
        {!isAvailable && !previewMode && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40">
            <span className="rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-slate-900">
              {statusLabel}
            </span>
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge variant="info" className="flex items-center gap-1 normal-case">
            {modeIcon(item.saleMode)}
            {getSaleModeLabel(item.saleMode)}
          </Badge>
        </div>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug text-slate-900 group-hover:text-brand-700">
            {item.title}
          </h3>
          <Badge variant={statusVariantKey}>{statusLabel}</Badge>
        </div>
        {categoryLabel && categoryLabel !== "Demo" && (
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {categoryLabel}
          </p>
        )}
        {item.saleMode === "AUCTION" ? (
          <p className="text-lg font-bold text-brand-700">
            {previewMode ? (
              <>Reserve: {formatCurrency(item.price ?? 0)}</>
            ) : displayPrice != null ? (
              <>Current: {formatCurrency(displayPrice)}</>
            ) : (
              <>Reserve: {formatCurrency(item.price ?? 0)}</>
            )}
            {item.quantity > 1 && isAvailable && (
              <span className="ml-2 text-sm font-medium text-slate-500">
                ({item.quantityAvailable} left)
              </span>
            )}
          </p>
        ) : displayPrice != null ? (
          <p className="text-lg font-bold text-brand-700">
            {formatCurrency(displayPrice)}
            {item.quantity > 1 && isAvailable && (
              <span className="ml-2 text-sm font-medium text-slate-500">
                ({item.quantityAvailable} left)
              </span>
            )}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

function PackagePlaceholder() {
  return (
    <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}
