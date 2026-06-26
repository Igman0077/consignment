import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { bootstrapDatabase } from "@/lib/bootstrap-database";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const setupSecret = process.env.SETUP_SECRET?.trim();
  if (!setupSecret) {
    return NextResponse.json(
      { error: "SETUP_SECRET is not configured on the server." },
      { status: 503 }
    );
  }

  let body: { secret?: string; password?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.secret !== setupSecret) {
    return NextResponse.json({ error: "Invalid setup secret" }, { status: 403 });
  }

  const password = body.password?.trim();
  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const email = (body.email || "owner@shop.com").toLowerCase().trim();
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: Role.OWNER,
      name: "Shop Owner",
    },
    create: {
      email,
      passwordHash,
      role: Role.OWNER,
      name: "Shop Owner",
    },
  });

  await bootstrapDatabase();

  return NextResponse.json({
    success: true,
    message: `Owner account ready. Log in with ${email} and your new password.`,
  });
}
