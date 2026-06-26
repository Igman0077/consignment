import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";

export const metadata = { title: "How It Works" };

export default function HowItWorksPage() {
  return (
    <div className="container-page max-w-3xl page-stack">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">How It Works</h1>
        <p className="mt-2 text-lg text-slate-600">
          Everything you need to know — written in plain English.
        </p>
      </div>

      <Card>
        <CardBody className="space-y-5">
          <GuideSection
            number="1"
            title="Create your account"
            items={[
              "Click Create Account and enter your name, email, and password.",
              "Your account lets the shop owner know who bought what.",
              "You can view your purchase history anytime under My Account.",
            ]}
          />
          <GuideSection
            number="2"
            title="Browse the shop"
            items={[
              "Click Browse Items to see everything available.",
              "Each item has photos, a description, and a price (or current bid).",
              "Look for badges: Claim or Auction.",
            ]}
          />
          <GuideSection
            number="3"
            title="Get an item"
            items={[
              "Claim — Tap Claim to reserve the item at the listed price. It goes in your cart.",
              "Auction — Enter your bid. You must bid higher than the current bid.",
            ]}
          />
          <GuideSection
            number="4"
            title="Check out and pay"
            items={[
              "Open My Cart when you're finished shopping.",
              "Review your items and total, then click Pay Now.",
              "After payment, items are marked sold and removed from inventory.",
            ]}
          />
          <GuideSection
            number="5"
            title="Pickup"
            items={[
              "The shop owner will contact you about pickup after payment.",
              "Check My Account for your order status and history.",
            ]}
          />
        </CardBody>
      </Card>

      <div className="flex justify-center gap-3">
        <Link href="/register">
          <Button size="lg">Create Account</Button>
        </Link>
        <Link href="/shop">
          <Button size="lg" variant="outline">
            Browse Items
          </Button>
        </Link>
      </div>
    </div>
  );
}

function GuideSection({
  number,
  title,
  items,
}: {
  number: string;
  title: string;
  items: string[];
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
        {number}
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-slate-600">
              <span className="text-brand-500">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
