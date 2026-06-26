import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { WelcomeBanner } from "@/components/shop/WelcomeBanner";
import { UpcomingSales } from "@/components/shop/UpcomingSales";
import { getShopSettings } from "@/lib/session";
import { getShopSaleStatus, getUpcomingSales, toSaleEventListing } from "@/lib/sale-events";

export default async function HomePage() {
  const settings = await getShopSettings();
  const saleStatus = await getShopSaleStatus();
  const upcomingSales = await getUpcomingSales(5);

  const welcomeMessage =
    settings.welcomeMessage ||
    "Create a free account to claim items or place bids. Add items to your cart and pay when you are finished shopping.";

  const steps = [
    {
      step: "1",
      title: "Wait for the sale",
      text: "We announce upcoming sale dates on this page. Item photos appear when the sale goes live.",
    },
    {
      step: "2",
      title: "Claim or bid",
      text: "During an active sale, tap Claim or place a bid. You need a free account so the shop owner knows who you are.",
    },
    {
      step: "3",
      title: "Pay when done",
      text: "Open My Cart when you are finished shopping and pay online. Items are marked sold after payment.",
    },
  ];

  return (
    <div className="container-page page-stack py-2 sm:py-3">
      <WelcomeBanner message={welcomeMessage} />

      <UpcomingSales
        sales={upcomingSales.map(toSaleEventListing)}
        activeSale={saleStatus.activeSale ? toSaleEventListing(saleStatus.activeSale) : null}
        upcomingSale={
          saleStatus.upcomingSale ? toSaleEventListing(saleStatus.upcomingSale) : null
        }
      />

      <section className="space-y-4">
        <div className="page-header">
          <h2 className="section-title text-2xl">How it works</h2>
          <p className="page-description">
            Three steps. No Facebook comments or direct messages to keep track of.
          </p>
        </div>

        <ol className="grid gap-4 sm:grid-cols-3">
          {steps.map(({ step, title, text }) => (
            <li key={step} className="panel-interactive p-6">
              <span
                className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-base font-bold text-white"
                aria-hidden="true"
              >
                {step}
              </span>
              <h3 className="mb-2 text-lg font-semibold text-slate-900">{title}</h3>
              <p className="text-base leading-relaxed text-slate-700">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section-block">
        <div className="section-block-body">
          <h2 className="section-title">First time here?</h2>
          <p className="mt-2 max-w-lg text-base leading-relaxed text-slate-700">
            We wrote a short guide that explains accounts, claiming items, and checkout.
          </p>
          <Link href="/how-it-works" className="mt-4 inline-block">
            <Button variant="outline">Read the guide</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
