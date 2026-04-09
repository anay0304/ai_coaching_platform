import type { Resource } from "@/types";
import { prisma } from "@/lib/prisma";

// ─── getResources ─────────────────────────────────────────────────────────────

/**
 * Returns all Resource records ordered newest-first.
 * Called by the (auth)/resources page so that page never imports Prisma directly.
 */
export async function getResources(): Promise<Resource[]> {
  return prisma.resource.findMany({
    orderBy: { createdAt: "desc" },
  });
}
