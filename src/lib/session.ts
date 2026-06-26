import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login?message=Please sign in to continue");
  }
  return session;
}

export async function requireOwner() {
  const session = await requireAuth();
  if (session.user.role !== Role.OWNER) {
    redirect("/shop");
  }
  return session;
}

export async function getShopSettings() {
  const { prisma } = await import("./prisma");
  let settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });
  if (!settings) {
    settings = await prisma.shopSettings.create({ data: {} });
  }
  return settings;
}
