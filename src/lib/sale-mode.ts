import { SaleMode } from "@prisma/client";

/** Claim and legacy FIXED_PRICE are the same for customers. */
export function isClaimMode(mode: SaleMode) {
  return mode === SaleMode.CLAIM || mode === SaleMode.FIXED_PRICE;
}

export function getSaleModeLabel(mode: SaleMode): string {
  if (isClaimMode(mode)) return "Claim";
  if (mode === SaleMode.AUCTION) return "Auction";
  return "Claim";
}

export function normalizeSaleMode(mode: SaleMode): "CLAIM" | "AUCTION" {
  return mode === SaleMode.AUCTION ? "AUCTION" : "CLAIM";
}
