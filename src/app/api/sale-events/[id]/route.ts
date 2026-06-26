import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expireSaleEvent } from "@/lib/sale-events";
import { SaleEventStatus } from "@prisma/client";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  customerMessage: z.string().optional().nullable(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  allowPreview: z.boolean().optional(),
});

async function requireOwner() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "OWNER") return null;
  return session;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sale = await prisma.saleEvent.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { title: "asc" },
        include: { categoryRef: true },
      },
      _count: { select: { items: true } },
    },
  });
  if (!sale) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sale);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireOwner();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid sale data" }, { status: 400 });
  }

  const existing = await prisma.saleEvent.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : existing.startsAt;
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : existing.endsAt;

  if (endsAt <= startsAt) {
    return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
  }

  const sale = await prisma.saleEvent.update({
    where: { id },
    data: {
      ...(parsed.data.title && { title: parsed.data.title.trim() }),
      ...(parsed.data.customerMessage !== undefined && {
        customerMessage: parsed.data.customerMessage?.trim() || null,
      }),
      ...(parsed.data.allowPreview !== undefined && {
        allowPreview: parsed.data.allowPreview,
      }),
      startsAt,
      endsAt,
    },
  });

  return NextResponse.json(sale);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireOwner();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sale = await prisma.saleEvent.findUnique({ where: { id } });
  if (!sale) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (sale.status === SaleEventStatus.ACTIVE) {
    return NextResponse.json({ error: "Cannot delete an active sale" }, { status: 400 });
  }

  await prisma.item.updateMany({
    where: { saleEventId: id },
    data: { saleEventId: null },
  });

  await prisma.saleEvent.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireOwner();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { action, itemIds, targetSaleId } = body;

  const sale = await prisma.saleEvent.findUnique({ where: { id } });
  if (!sale) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "add-items" && Array.isArray(itemIds)) {
    await prisma.item.updateMany({
      where: { id: { in: itemIds } },
      data: { saleEventId: id },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "remove-items" && Array.isArray(itemIds)) {
    await prisma.item.updateMany({
      where: { id: { in: itemIds }, saleEventId: id },
      data: { saleEventId: null },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "move-items" && Array.isArray(itemIds)) {
    if (!targetSaleId || typeof targetSaleId !== "string") {
      return NextResponse.json({ error: "Target sale is required" }, { status: 400 });
    }
    if (targetSaleId === id) {
      return NextResponse.json({ error: "Choose a different sale" }, { status: 400 });
    }

    const targetSale = await prisma.saleEvent.findUnique({ where: { id: targetSaleId } });
    if (!targetSale) {
      return NextResponse.json({ error: "Target sale not found" }, { status: 404 });
    }
    if (targetSale.status === SaleEventStatus.ENDED) {
      return NextResponse.json({ error: "Cannot move items to an ended sale" }, { status: 400 });
    }

    await prisma.item.updateMany({
      where: { id: { in: itemIds }, saleEventId: id },
      data: { saleEventId: targetSaleId },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "end-now") {
    if (sale.status !== SaleEventStatus.ACTIVE) {
      return NextResponse.json({ error: "Sale is not active" }, { status: 400 });
    }
    await expireSaleEvent(id);
    await prisma.saleEvent.update({
      where: { id },
      data: { status: SaleEventStatus.ENDED, endsAt: new Date() },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
