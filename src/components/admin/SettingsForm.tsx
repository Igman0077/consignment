"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SaleMode } from "@prisma/client";
import { normalizeSaleMode } from "@/lib/sale-mode";
import { AdminNav } from "@/components/admin/AdminNav";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { HelpTip } from "@/components/ui/HelpTip";

type Settings = {
  shopName: string;
  shopDescription: string | null;
  welcomeMessage: string | null;
  defaultSaleMode: SaleMode;
  requirePaymentOnline: boolean;
  minBidIncrement: number;
  auctionDurationHours: number;
  cartHoldMinutes: number;
  ownerNotificationEmail: string | null;
  pickupInstructions: string | null;
};

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const form = new FormData(e.currentTarget);
    const payload = {
      shopName: form.get("shopName"),
      shopDescription: form.get("shopDescription"),
      welcomeMessage: form.get("welcomeMessage"),
      defaultSaleMode: form.get("defaultSaleMode"),
      requirePaymentOnline: form.get("requirePaymentOnline") === "true",
      minBidIncrement: parseFloat(form.get("minBidIncrement") as string),
      auctionDurationHours: parseInt(form.get("auctionDurationHours") as string),
      cartHoldMinutes: parseInt(form.get("cartHoldMinutes") as string),
      ownerNotificationEmail: (form.get("ownerNotificationEmail") as string) || "",
      pickupInstructions: form.get("pickupInstructions"),
    };

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Could not save settings");
      return;
    }

    setSuccess(true);
    router.refresh();
  }

  return (
    <div className="container-page max-w-2xl page-stack">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Shop Settings</h1>
        <p className="mt-2 text-slate-600">
          Control how your shop looks and how purchasing works. Schedule individual sales under{" "}
          <strong>Scheduled Sales</strong> in the owner menu.
        </p>
      </div>

      <AdminNav />

      <Card>
        <CardHeader>
          <h2 className="font-bold">Your shop</h2>
        </CardHeader>
        <CardBody>
          {error && <Alert variant="error" className="mb-4">{error}</Alert>}
          {success && (
            <Alert variant="success" className="mb-4">
              Settings saved!
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Shop name"
              name="shopName"
              required
              defaultValue={settings.shopName}
            />
            <Textarea
              label="Shop description"
              name="shopDescription"
              rows={3}
              defaultValue={settings.shopDescription ?? ""}
              hint="Shown on the homepage"
            />
            <Textarea
              label="Welcome message"
              name="welcomeMessage"
              rows={2}
              defaultValue={settings.welcomeMessage ?? ""}
              hint="A friendly note for new visitors"
            />
            <Textarea
              label="Pickup instructions"
              name="pickupInstructions"
              rows={2}
              defaultValue={settings.pickupInstructions ?? ""}
              hint="Included in customer receipt emails after payment"
            />

            <Input
              label="Owner notification email"
              name="ownerNotificationEmail"
              type="email"
              defaultValue={settings.ownerNotificationEmail ?? ""}
              hint="Sale summary emails are sent here when a sale ends. Leave blank to use the owner account email."
            />

            <hr className="border-slate-200" />

            <h3 className="font-bold text-slate-900">Selling rules</h3>

            <Select
              label={
                <span className="flex items-center gap-1">
                  Default sale mode for new items{" "}
                  <HelpTip text="When you add a new item, this is pre-selected. You can change it per item." />
                </span>
              }
              name="defaultSaleMode"
              defaultValue={normalizeSaleMode(settings.defaultSaleMode)}
            >
              <option value="CLAIM">Claim</option>
              <option value="AUCTION">Auction</option>
            </Select>

            <Select
              label="Require online payment"
              name="requirePaymentOnline"
              defaultValue={settings.requirePaymentOnline ? "true" : "false"}
            >
              <option value="true">Yes — customers pay online at checkout</option>
              <option value="false">No — mark orders paid manually (no Stripe needed)</option>
            </Select>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Minimum bid increase ($)"
                name="minBidIncrement"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={settings.minBidIncrement}
              />
              <Input
                label="Default auction length (hours)"
                name="auctionDurationHours"
                type="number"
                min="1"
                defaultValue={settings.auctionDurationHours}
              />
            </div>

            <Input
              label="Cart hold time (minutes)"
              name="cartHoldMinutes"
              type="number"
              min="5"
              max="10080"
              required
              defaultValue={settings.cartHoldMinutes}
              hint="Unpaid cart items and checkout orders are released back to the sale after this many minutes (default 60). Maximum 7 days."
            />

            <Button type="submit" size="lg" disabled={loading}>
              {loading ? "Saving..." : "Save Settings"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
