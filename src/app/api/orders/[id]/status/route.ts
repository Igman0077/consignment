import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { setOrderStatus } from "@/lib/orders";
import { OrderStatus } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  status: z.nativeEnum(OrderStatus),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    await setOrderStatus(id, parsed.data.status);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Could not update order" }, { status: 500 });
  }
}
