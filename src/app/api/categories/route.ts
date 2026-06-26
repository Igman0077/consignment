import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(60),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { items: true } } },
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const name = parsed.data.name.trim();
  const existing = await prisma.category.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "A category with this name already exists" }, { status: 400 });
  }

  const maxSort = await prisma.category.aggregate({ _max: { sortOrder: true } });

  const category = await prisma.category.create({
    data: {
      name,
      sortOrder: parsed.data.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  return NextResponse.json(category);
}
