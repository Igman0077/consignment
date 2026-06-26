import { requireOwner } from "@/lib/session";
import { AdminNav } from "@/components/admin/AdminNav";
import { SaleEventForm } from "@/components/admin/SaleEventForm";

export const metadata = { title: "Schedule Sale" };

export default async function NewSaleEventPage() {
  await requireOwner();

  return (
    <div className="container-page max-w-2xl page-stack">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Schedule a Sale</h1>
        <p className="mt-2 text-slate-600">
          Pick the date and time, then add inventory items to this sale.
        </p>
      </div>
      <AdminNav />
      <SaleEventForm />
    </div>
  );
}
