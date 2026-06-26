import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getSaleWindowForShop } from "@/lib/sale-window";
import { CartClient } from "@/components/shop/CartClient";
import { Alert } from "@/components/ui/Alert";

export const metadata = { title: "My Cart" };

export default async function CartPage() {
  const session = await requireAuth();
  const { status } = await getSaleWindowForShop();

  const items = await prisma.cartItem.findMany({
    where: { userId: session.user.id },
    include: { item: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container-page page-stack">
      {!status.isBrowseable && (
        <Alert variant="info">{status.message}</Alert>
      )}
      <CartClient items={items} saleOpen={status.isBrowseable} />
    </div>
  );
}
