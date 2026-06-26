import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminNav } from "@/components/admin/AdminNav";
import { BackLink } from "@/components/ui/BackLink";
import { SaleEventForm } from "@/components/admin/SaleEventForm";

export default async function EditSaleEventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;

  const sale = await prisma.saleEvent.findUnique({ where: { id } });
  if (!sale) notFound();

  return (
    <div className="container-page max-w-2xl page-stack">
      <BackLink href={`/admin/sale-events/${id}`}>Back to sale</BackLink>

      <AdminNav />
      <SaleEventForm sale={sale} />
    </div>
  );
}
