import type { SessionSummaryResult } from "@/services/ai.service";

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${accent}`}>
        {title}
      </h3>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <span className="mt-0.5 shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── SessionSummaryCard ───────────────────────────────────────────────────────

export default function SessionSummaryCard({
  nextActionSteps,
  strugglesDiscussed,
  backupPlans,
}: SessionSummaryResult) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
        Session Summary
      </h2>

      <div className="space-y-5">
        <Section
          title="Your Next Steps"
          items={nextActionSteps}
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <Section
          title="Struggles We Discussed"
          items={strugglesDiscussed}
          accent="text-amber-600 dark:text-amber-400"
        />
        <Section
          title="Backup Plans"
          items={backupPlans}
          accent="text-sky-600 dark:text-sky-400"
        />
      </div>

      {nextActionSteps.length === 0 &&
        strugglesDiscussed.length === 0 &&
        backupPlans.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No summary data available for this session.
          </p>
        )}
    </div>
  );
}
