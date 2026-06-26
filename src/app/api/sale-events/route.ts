import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SaleEventStatus } from "@prisma/client";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(120),
  customerMessage: z.string().optional(),
  startsAt: z.string(),
  endsAt: z.string(),
  allowPreview: z.boolean().optional(),
});

export async function GET() {
  const sales = await prisma.saleEvent.findMany({
    orderBy: { startsAt: "desc" },
    include: { _count: { select: { items: true } } },
  });
  return NextResponse.json(sales);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid sale data" }, { status: 400 });
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);

  if (endsAt <= startsAt) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  const active = await prisma.saleEvent.findFirst({
    where: { status: SaleEventStatus.ACTIVE },
  });
  const now = new Date();
  let status: SaleEventStatus = SaleEventStatus.SCHEDULED;
  if (!active && startsAt <= now && endsAt > now) {
    status = SaleEventStatus.ACTIVE;
  }

  const sale = await prisma.saleEvent.create({
    data: {
      title: parsed.data.title.trim(),
      customerMessage: parsed.data.customerMessage?.trim() || null,
      startsAt,
      endsAt,
      status,
      allowPreview: parsed.data.allowPreview ?? false,
    },
  });

  return NextResponse.json(sale);
}
