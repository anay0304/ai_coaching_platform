import { prisma } from "@/lib/prisma";
import ResourceCard from "@/components/resources/ResourceCard";

// ─── ResourcesPage ────────────────────────────────────────────────────────────
//
// Server Component — fetches all Resource records from the database and renders
// a card for each one. Auth is enforced by (auth)/layout.tsx so no session
// check is needed here.

export default async function ResourcesPage() {
  const resources = await prisma.resource.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        Resources
      </h1>

      {resources.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No resources available yet. Check back soon!
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  );
}
