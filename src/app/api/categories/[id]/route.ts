import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  sortOrder: z.number().int().optional(),
});

async function requireOwner() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "OWNER") return null;
  return session;
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
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const data = parsed.data;
  if (data.name) {
    const duplicate = await prisma.category.findFirst({
      where: { name: data.name.trim(), NOT: { id } },
    });
    if (duplicate) {
      return NextResponse.json({ error: "A category with this name already exists" }, { status: 400 });
    }
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name.trim() }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  });

  return NextResponse.json(category);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireOwner();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const count = await prisma.item.count({ where: { categoryId: id } });
  if (count > 0) {
    return NextResponse.json(
      { error: `Cannot delete — ${count} item${count === 1 ? "" : "s"} use this category` },
      { status: 400 }
    );
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
