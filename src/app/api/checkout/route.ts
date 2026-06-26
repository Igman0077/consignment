import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { completeOrder } from "@/lib/orders";
import { getShopSaleStatus } from "@/lib/sale-events";
import { OrderStatus } from "@prisma/client";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  }

  const saleStatus = await getShopSaleStatus();
  if (!saleStatus.isBrowseable) {
    return NextResponse.json(
      { error: "The sale has ended. Checkout is no longer available." },
      { status: 403 }
    );
  }

  const cartItems = await prisma.cartItem.findMany({
    where: { userId: session.user.id },
    include: { item: true },
  });

  if (cartItems.length === 0) {
    return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
  }

  const total = cartItems.reduce((sum, ci) => sum + ci.price * ci.quantity, 0);
  const settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });

  const order = await prisma.order.create({
    data: {
      userId: session.user.id,
      total,
      status: OrderStatus.PENDING,
      items: {
        create: cartItems.map((ci) => ({
          itemId: ci.itemId,
          price: ci.price,
          title: ci.item.title,
          quantity: ci.quantity,
        })),
      },
    },
  });

  if (!settings?.requirePaymentOnline || !stripe) {
    await completeOrder(order.id);
    return NextResponse.json({ orderId: order.id });
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: session.user.email,
    line_items: cartItems.map((ci) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: ci.item.title,
          images: [],
        },
        unit_amount: Math.round(ci.price * 100),
      },
      quantity: ci.quantity,
    })),
    metadata: { orderId: order.id, userId: session.user.id },
    success_url: `${baseUrl}/account/orders/${order.id}?paid=1`,
    cancel_url: `${baseUrl}/cart?cancelled=1`,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: checkoutSession.id },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
