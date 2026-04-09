// ─── GoalsSummaryCard ─────────────────────────────────────────────────────────
//
// Displays the user's goals extracted from their coaching profile.
// Goals are populated after the first INITIAL session ends.

export default function GoalsSummaryCard({ goals }: { goals: string[] }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Your Goals
      </h2>

      {goals.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Goals will appear here after your first coaching session.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {goals.map((goal, i) => (
            <li
              key={i}
              className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300"
            >
              <span className="mt-0.5 shrink-0 text-emerald-500" aria-hidden="true">
                ✓
              </span>
              <span>{goal}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
