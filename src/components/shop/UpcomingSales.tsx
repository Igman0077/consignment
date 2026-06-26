import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { CalendarDays, Eye } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SaleEventListing } from "@/lib/sale-events";

type SalePreview = SaleEventListing;

export function UpcomingSales({
  sales,
  activeSale,
  upcomingSale,
}: {
  sales: SalePreview[];
  activeSale: SalePreview | null;
  upcomingSale: SalePreview | null;
}) {
  const displaySales =
    sales.length > 0 ? sales : upcomingSale ? [upcomingSale] : [];

  const hasPreviewable = displaySales.some((sale) => sale.allowPreview);

  if (displaySales.length === 0 && !activeSale) {
    return (
      <section className="section-block">
        <div className="section-block-body">
          <h2 className="section-title flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-brand-600" />
            Upcoming sales
          </h2>
          <p className="mt-2 text-slate-600">No sales are scheduled yet. Check back soon!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-block">
      <div className="section-block-body space-y-4">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-brand-600" />
            {activeSale ? "Current & upcoming sales" : "Upcoming sales"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {hasPreviewable
              ? "Some upcoming sales offer a preview — browse items before the sale opens."
              : "Item photos appear when each sale begins. Until then, read the details below."}
          </p>
        </div>

        <ul className="space-y-4">
          {activeSale && (
            <li className="rounded-xl border-2 border-brand-300 bg-brand-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-700">Live now</p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">{activeSale.title}</h3>
              <p className="mt-1 text-sm text-slate-600">Ends {formatDate(activeSale.endsAt)}</p>
              <Link href="/shop" className="mt-3 inline-block">
                <Button size="sm">Shop now</Button>
              </Link>
            </li>
          )}

          {displaySales.map((sale) => (
            <li key={sale.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-bold text-slate-900">{sale.title}</h3>
              <p className="mt-1 text-sm font-medium text-brand-700">
                {formatDate(sale.startsAt)} — {formatDate(sale.endsAt)}
              </p>
              {sale.customerMessage && (
                <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-slate-700">
                  {sale.customerMessage}
                </p>
              )}
              {sale.allowPreview && (
                <Link href={`/shop/preview/${sale.id}`} className="mt-4 inline-block">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                    Preview items
                  </Button>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
