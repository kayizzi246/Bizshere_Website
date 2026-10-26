import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export async function audit(actorId: string | null, action: string, entityType: string, entityId?: string, details?: Prisma.InputJsonValue) {
  await prisma.auditLog.create({ data: { actorId, action, entityType, entityId, details } });
}
