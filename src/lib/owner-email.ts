import { Role } from "@prisma/client";
import { prisma } from "./prisma";

export async function getOwnerNotificationEmail(): Promise<string | null> {
  const settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });
  if (settings?.ownerNotificationEmail?.trim()) {
    return settings.ownerNotificationEmail.trim();
  }

  const owner = await prisma.user.findFirst({
    where: { role: Role.OWNER },
    orderBy: { createdAt: "asc" },
  });

  return owner?.email ?? null;
}
